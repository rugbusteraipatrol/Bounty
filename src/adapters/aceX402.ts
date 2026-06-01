import { appendFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import {
  ComputeBudgetProgram,
  Connection,
  Keypair,
  PublicKey,
  Transaction,
  TransactionMessage,
  VersionedTransaction
} from "@solana/web3.js";
import {
  createAssociatedTokenAccountIdempotentInstruction,
  createTransferCheckedInstruction,
  getAccount,
  getAssociatedTokenAddress
} from "@solana/spl-token";
import bs58 from "bs58";
import type { AppConfig } from "../config.js";
import type { AceCallResult, WorkflowMode } from "../types.js";
import { appendSettlement, extractSettlementTx } from "./settlementLog.js";

interface PaymentRequirement {
  scheme: string;
  network: string;
  maxAmountRequired: string;
  maxTimeoutSeconds?: number;
  resource: string;
  payTo: string;
  asset: string;
  extra?: {
    decimals?: number;
    computeUnitLimit?: number;
    computeUnitPriceMicroLamports?: number;
    rpcUrl?: string;
  };
}

interface PaidCallInput {
  service: string;
  endpoint: string;
  body: Record<string, unknown>;
  prompt: string;
  runId: string;
  productId: string;
}

export class AceX402Client {
  private spentUsd = 0;

  constructor(private readonly config: AppConfig, private readonly mode: WorkflowMode) {}

  get remainingUsd(): number {
    return Math.max(0, this.config.MAX_SPEND_USD - this.spentUsd);
  }

  async call(input: PaidCallInput): Promise<AceCallResult> {
    if (this.mode === "dry-run") {
      const dryPrice = this.mockPrice(input.service);
      this.reserveSpend(dryPrice);
      await this.logBeforePayment(input, {
        dryRun: true,
        quotedUsd: dryPrice,
        remainingUsd: this.remainingUsd
      });
      await appendSettlement(this.config, {
        runId: input.runId,
        productId: input.productId,
        service: input.service,
        endpoint: input.endpoint,
        status: 200,
        amountUsd: dryPrice,
        note: "dry-run; no payment sent"
      });

      return {
        service: input.service,
        endpoint: input.endpoint,
        prompt: input.prompt,
        quotedUsd: dryPrice,
        status: 200,
        output: this.mockOutput(input.service, input.productId)
      };
    }

    const payer = this.loadPayer();
    const first = await fetch(`${this.config.ACE_API_BASE_URL}${input.endpoint}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input.body)
    });

    if (first.status !== 402) {
      const text = await first.text();
      throw new Error(`Expected x402 402 for ${input.endpoint}, got ${first.status}: ${text.slice(0, 300)}`);
    }

    const body402 = (await first.json()) as { accepts?: PaymentRequirement[] };
    const requirement = body402.accepts?.find((entry) => entry.network === "solana");
    if (!requirement) throw new Error(`No Solana x402 requirement returned for ${input.endpoint}.`);

    const quotedUsd = Number(BigInt(requirement.maxAmountRequired)) / 1e6;
    this.reserveSpend(quotedUsd);
    await this.assertBalances(payer, requirement);
    await this.logBeforePayment(input, {
      dryRun: false,
      quotedUsd,
      spentUsd: this.spentUsd,
      remainingUsd: this.remainingUsd,
      requirement: this.safeRequirement(requirement),
      payer: payer.publicKey.toBase58()
    });

    const payment = await this.withRetry(
      () => this.buildSolanaPaymentHeader(payer, requirement),
      `x402 payment ${input.productId}/${input.service}`
    );
    console.log(`[x402] ${input.productId} ${input.service} tx: ${payment.txHash ?? "(facilitator-submit)"}`);
    const paid = await this.withRetry(
      () =>
        fetch(`${this.config.ACE_API_BASE_URL}${input.endpoint}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Payment": payment.xPayment
          },
          body: JSON.stringify(input.body)
        }),
      `Ace retry ${input.productId}/${input.service}`
    );

    const headers: Record<string, string> = {};
    paid.headers.forEach((value, key) => {
      headers[key] = key.toLowerCase() === "x-payment" ? "<redacted>" : value;
    });
    const text = await paid.text();
    const txHash = payment.txHash ?? extractSettlementTx(text, headers);
    await appendSettlement(this.config, {
      runId: input.runId,
      productId: input.productId,
      service: input.service,
      endpoint: input.endpoint,
      status: paid.status,
      amountAtomic: requirement.maxAmountRequired,
      amountUsd: quotedUsd,
      txHash,
      note: txHash ? "x402 settlement detected" : "x402 response received; tx hash not exposed in response"
    });

    return {
      service: input.service,
      endpoint: input.endpoint,
      prompt: input.prompt,
      quotedUsd,
      status: paid.status,
      output: text.slice(0, 4000),
      payment: {
        transaction: txHash,
        amount: requirement.maxAmountRequired,
        rawHeaders: headers
      }
    };
  }

  private reserveSpend(quotedUsd: number): void {
    if (this.spentUsd + quotedUsd > this.config.MAX_SPEND_USD) {
      throw new Error(
        `MAX_SPEND_USD reached. Tried ${quotedUsd.toFixed(6)} with ${this.spentUsd.toFixed(6)} already reserved.`
      );
    }

    this.spentUsd += quotedUsd;
  }

  private async buildSolanaPaymentHeader(
    payer: Keypair,
    requirement: PaymentRequirement
  ): Promise<{ xPayment: string; txHash?: string }> {
    if (this.config.X402_PAYMENT_MODE === "pre_submit") {
      return this.buildPreSubmitSolanaPaymentHeader(payer, requirement);
    }

    const connection = new Connection(requirement.extra?.rpcUrl ?? this.config.SYNAPSE_RPC_URL ?? "https://api.mainnet-beta.solana.com", "confirmed");
    const facilitator = new PublicKey(this.config.X402B_SOLANA_FACILITATOR_ADDRESS);
    const payTo = new PublicKey(requirement.payTo);
    const mint = new PublicKey(requirement.asset);
    const amount = BigInt(requirement.maxAmountRequired);
    const decimals = requirement.extra?.decimals ?? 6;

    const payerAta = await getAssociatedTokenAddress(mint, payer.publicKey);
    const payToAta = await getAssociatedTokenAddress(mint, payTo);
    const { blockhash } = await connection.getLatestBlockhash("confirmed");

    const instructions = [
      ComputeBudgetProgram.setComputeUnitLimit({ units: requirement.extra?.computeUnitLimit ?? 100_000 }),
      ComputeBudgetProgram.setComputeUnitPrice({
        microLamports: requirement.extra?.computeUnitPriceMicroLamports ?? 5000
      }),
      createAssociatedTokenAccountIdempotentInstruction(payer.publicKey, payToAta, payTo, mint),
      createTransferCheckedInstruction(payerAta, mint, payToAta, payer.publicKey, amount, decimals)
    ];

    const message = new TransactionMessage({
      payerKey: facilitator,
      recentBlockhash: blockhash,
      instructions
    }).compileToV0Message();
    const transaction = new VersionedTransaction(message);
    transaction.sign([payer]);

    const envelope = {
      x402Version: 2,
      scheme: requirement.scheme || "exact",
      network: "solana",
      payload: {
        serializedTransaction: Buffer.from(transaction.serialize()).toString("base64")
      }
    };

    return { xPayment: Buffer.from(JSON.stringify(envelope), "utf8").toString("base64") };
  }

  private async buildPreSubmitSolanaPaymentHeader(
    payer: Keypair,
    requirement: PaymentRequirement
  ): Promise<{ xPayment: string; txHash: string }> {
    const connection = new Connection(
      requirement.extra?.rpcUrl ?? this.config.SYNAPSE_RPC_URL ?? "https://api.mainnet-beta.solana.com",
      "confirmed"
    );
    const payTo = new PublicKey(requirement.payTo);
    const mint = new PublicKey(requirement.asset);
    const amount = BigInt(requirement.maxAmountRequired);
    const decimals = requirement.extra?.decimals ?? 6;
    const payerAta = await getAssociatedTokenAddress(mint, payer.publicKey);
    const payToAta = await getAssociatedTokenAddress(mint, payTo);

    const tx = new Transaction().add(
      ComputeBudgetProgram.setComputeUnitLimit({ units: requirement.extra?.computeUnitLimit ?? 100_000 }),
      ComputeBudgetProgram.setComputeUnitPrice({
        microLamports: requirement.extra?.computeUnitPriceMicroLamports ?? 5000
      }),
      createAssociatedTokenAccountIdempotentInstruction(payer.publicKey, payToAta, payTo, mint),
      createTransferCheckedInstruction(payerAta, mint, payToAta, payer.publicKey, amount, decimals)
    );
    tx.feePayer = payer.publicKey;
    const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash("confirmed");
    tx.recentBlockhash = blockhash;
    tx.sign(payer);

    const signature = await connection.sendRawTransaction(tx.serialize(), { skipPreflight: false });
    await connection.confirmTransaction({ signature, blockhash, lastValidBlockHeight }, "confirmed");

    const envelope = {
      x402Version: 2,
      scheme: requirement.scheme || "exact",
      network: "solana",
      payload: { signature }
    };

    return {
      xPayment: Buffer.from(JSON.stringify(envelope), "utf8").toString("base64"),
      txHash: signature
    };
  }

  private async withRetry<T>(fn: () => Promise<T>, label: string, attempts = 3): Promise<T> {
    let lastError: unknown;

    for (let attempt = 1; attempt <= attempts; attempt += 1) {
      try {
        return await fn();
      } catch (error) {
        lastError = error;
        const message = error instanceof Error ? error.message : String(error);
        if (attempt === attempts || !this.isRetryableError(message)) break;
        const delayMs = 800 * attempt;
        console.warn(`[retry] ${label} failed (${message}). Retrying in ${delayMs}ms...`);
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }

    throw lastError;
  }

  private isRetryableError(message: string): boolean {
    return /blockhash|timeout|temporarily|429|502|503|504|network|fetch failed/i.test(message);
  }

  private async assertBalances(payer: Keypair, requirement: PaymentRequirement): Promise<void> {
    const connection = new Connection(requirement.extra?.rpcUrl ?? this.config.SYNAPSE_RPC_URL ?? "https://api.mainnet-beta.solana.com", "confirmed");
    const sol = (await connection.getBalance(payer.publicKey, "confirmed")) / 1e9;
    if (sol < this.config.MIN_SOL_BALANCE) {
      throw new Error(`SOL balance too low: ${sol}. Minimum is ${this.config.MIN_SOL_BALANCE}.`);
    }

    const mint = new PublicKey(requirement.asset);
    const payerAta = await getAssociatedTokenAddress(mint, payer.publicKey);
    const tokenAccount = await getAccount(connection, payerAta);
    const usdc = Number(tokenAccount.amount) / 1e6;
    const quoted = Number(BigInt(requirement.maxAmountRequired)) / 1e6;
    if (usdc < Math.max(this.config.MIN_USDC_BALANCE, quoted)) {
      throw new Error(`USDC balance too low: ${usdc}. Need at least ${Math.max(this.config.MIN_USDC_BALANCE, quoted)}.`);
    }
  }

  private loadPayer(): Keypair {
    if (!this.config.X402B_SOLANA_PAYER_PRIVATE_KEY) {
      throw new Error("Missing X402B_SOLANA_PAYER_PRIVATE_KEY.");
    }

    return Keypair.fromSecretKey(bs58.decode(this.config.X402B_SOLANA_PAYER_PRIVATE_KEY));
  }

  private async logBeforePayment(input: PaidCallInput, data: Record<string, unknown>): Promise<void> {
    await mkdir(this.config.OUTPUT_DIR, { recursive: true });
    const entry = {
      ts: new Date().toISOString(),
      phase: "before_payment",
      runId: input.runId,
      productId: input.productId,
      service: input.service,
      endpoint: input.endpoint,
      prompt: input.prompt,
      body: input.body,
      ...data
    };
    await appendFile(join(this.config.OUTPUT_DIR, `${input.runId}.payments.jsonl`), `${JSON.stringify(entry)}\n`);
  }

  private safeRequirement(requirement: PaymentRequirement): Record<string, unknown> {
    return {
      scheme: requirement.scheme,
      network: requirement.network,
      maxAmountRequired: requirement.maxAmountRequired,
      resource: requirement.resource,
      payTo: requirement.payTo,
      asset: requirement.asset,
      extra: requirement.extra
    };
  }

  private mockPrice(service: string): number {
    if (service === "image") return 0.025708;
    if (service === "embedding") return 0.005;
    if (service === "search") return 0.01;
    return 0.020568;
  }

  private mockOutput(service: string, productId: string): string {
    if (service === "search") return `Search results found live retailer candidates for ${productId}.`;
    if (service === "embedding") return `Generated semantic deal fingerprint embedding for ${productId}.`;
    if (service === "image") return `Generated a compact visual deal card prompt/result for ${productId}.`;
    return `Deal analysis for ${productId}: plausible discount, buyer caveats, and short recommendation.`;
  }
}
