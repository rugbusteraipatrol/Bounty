import { createHash } from "node:crypto";
import { appendFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { Connection, Keypair, PublicKey, Transaction, TransactionInstruction } from "@solana/web3.js";
import bs58 from "bs58";
import type { AppConfig } from "../config.js";
import type { WorkflowMode } from "../types.js";

const MEMO_PROGRAM_ID = new PublicKey("MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr");

export async function writeMemoReceipt(
  config: AppConfig,
  mode: WorkflowMode,
  runId: string,
  productId: string,
  decisionPayload: unknown
): Promise<string | undefined> {
  const hash = createHash("sha256").update(JSON.stringify(decisionPayload)).digest("hex");
  const memo = `deal-scout:${runId}:${productId}:${hash}`;

  if (mode === "dry-run" || !config.MEMO_RECEIPTS_ENABLED) {
    await mkdir(config.OUTPUT_DIR, { recursive: true });
    await appendFile(
      join(config.OUTPUT_DIR, `${runId}.memos.jsonl`),
      `${JSON.stringify({ ts: new Date().toISOString(), mode, productId, memo, sent: false })}\n`
    );
    return undefined;
  }

  if (!config.X402B_SOLANA_PAYER_PRIVATE_KEY) throw new Error("Missing X402B_SOLANA_PAYER_PRIVATE_KEY.");
  const payer = Keypair.fromSecretKey(bs58.decode(config.X402B_SOLANA_PAYER_PRIVATE_KEY));
  const connection = new Connection(config.SYNAPSE_RPC_URL ?? "https://api.mainnet-beta.solana.com", "confirmed");
  const tx = new Transaction().add(
    new TransactionInstruction({
      keys: [{ pubkey: payer.publicKey, isSigner: true, isWritable: false }],
      programId: MEMO_PROGRAM_ID,
      data: Buffer.from(memo, "utf8")
    })
  );

  const signature = await connection.sendTransaction(tx, [payer], { skipPreflight: false });
  await appendFile(
    join(config.OUTPUT_DIR, `${runId}.memos.jsonl`),
    `${JSON.stringify({ ts: new Date().toISOString(), mode, productId, memo, sent: true, signature })}\n`
  );
  return signature;
}
