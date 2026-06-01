import type { AppConfig } from "../config.js";
import type { SapTool, WorkflowMode } from "../types.js";

const sentinelAgent = "Ccr2yK3hLALU4p8oNRqrh4dGuvPJTth5KCLMio8cE1ph";
const dashboardUrl = "https://rugbusteraipatrol.github.io/Bounty/dashboard/";

export class SapAdapter {
  constructor(private readonly config: AppConfig, private readonly mode: WorkflowMode) {}

  async registerAgent(): Promise<void> {
    if (this.mode === "dry-run") {
      console.log("[sap] dry-run register:", this.manifest());
      return;
    }

    // Keep the live integration in one place while the SDK surface is evolving.
    const [{ Connection, Keypair, PublicKey, TransactionMessage, VersionedTransaction, ComputeBudgetProgram, SystemProgram, TransactionInstruction }, crypto, fs, path] = await Promise.all([
      import("@solana/web3.js"),
      import("node:crypto"),
      import("node:fs/promises"),
      import("node:path")
    ]);

    const keypairPath = path.resolve(this.config.SOLANA_KEYPAIR_PATH ?? "");
    const keypairJson = JSON.parse(await fs.readFile(keypairPath, "utf8"));
    const secretKey = Array.isArray(keypairJson) ? keypairJson : keypairJson.secretKey;
    if (!Array.isArray(secretKey)) {
      throw new Error(`Invalid Solana keypair file: ${keypairPath}`);
    }

    const signer = Keypair.fromSecretKey(Uint8Array.from(secretKey));
    const programId = new PublicKey("SAPpUhsWLJG1FfkGRcXagEDMrMsWGjbky7AyhGpFETZ");
    if (!this.config.SYNAPSE_RPC_URL) throw new Error("Missing SYNAPSE_RPC_URL");
    const connection = new Connection(this.config.SYNAPSE_RPC_URL, "confirmed");

    const [agentPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("sap_agent"), signer.publicKey.toBuffer()],
      programId
    );
    const [agentStatsPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("sap_stats"), agentPda.toBuffer()],
      programId
    );
    const [globalRegistryPda] = PublicKey.findProgramAddressSync([Buffer.from("sap_global")], programId);
    const globalAccount = await connection.getAccountInfo(globalRegistryPda, "confirmed");
    if (!globalAccount) {
      throw new Error(
        `SAP global registry is not initialized at ${globalRegistryPda.toBase58()}; cannot register on this RPC/program yet.`
      );
    }

    const existingAgent = await connection.getAccountInfo(agentPda, "confirmed");
    if (existingAgent) {
      console.log("[sap] agent already registered:", agentPda.toBase58());
      await this.writeRegistrationEvidence({
        status: "already_registered",
        wallet: signer.publicKey.toBase58(),
        agentPda: agentPda.toBase58(),
        globalRegistryPda: globalRegistryPda.toBase58()
      });
      return;
    }

    const registerIx = new TransactionInstruction({
      programId,
      keys: [
        { pubkey: signer.publicKey, isSigner: true, isWritable: true },
        { pubkey: agentPda, isSigner: false, isWritable: true },
        { pubkey: agentStatsPda, isSigner: false, isWritable: true },
        { pubkey: globalRegistryPda, isSigner: false, isWritable: true },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false }
      ],
      data: this.encodeRegisterAgentData(crypto)
    });

    const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash("confirmed");
    const tx = new VersionedTransaction(
      new TransactionMessage({
        payerKey: signer.publicKey,
        recentBlockhash: blockhash,
        instructions: [
          ComputeBudgetProgram.setComputeUnitLimit({ units: 300_000 }),
          ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 1_000 }),
          registerIx
        ]
      }).compileToV0Message()
    );
    tx.sign([signer]);
    const signature = await connection.sendTransaction(tx, { maxRetries: 5, preflightCommitment: "confirmed" });
    await connection.confirmTransaction({ signature, blockhash, lastValidBlockHeight }, "confirmed");

    console.log("[sap] registered agent:", agentPda.toBase58());
    console.log("[sap] tx:", signature);
    await this.writeRegistrationEvidence({
      status: "registered",
      wallet: signer.publicKey.toBase58(),
      agentPda: agentPda.toBase58(),
      globalRegistryPda: globalRegistryPda.toBase58(),
      signature
    });
  }

  async discoverTools(): Promise<SapTool[]> {
    if (this.mode === "dry-run") {
      return [
        {
          id: "synapse:sentinel:health",
          name: "Synapse Sentinel",
          protocol: "SAP",
          category: "monitoring",
          agentAddress: sentinelAgent,
          priceHint: "required bounty touchpoint"
        },
        {
          id: "acedata:serp:google",
          name: "Ace Google Search",
          protocol: "x402",
          category: "web-search",
          priceHint: "paid by Ace facilitator"
        },
        {
          id: "acedata:v1:chat-completions",
          name: "Ace Chat Completions",
          protocol: "x402",
          category: "ai-reasoning",
          priceHint: "paid by Ace facilitator"
        },
        {
          id: "acedata:flux:images",
          name: "Ace Flux Image Generation",
          protocol: "x402",
          category: "image-generation",
          priceHint: "paid by Ace facilitator"
        }
      ];
    }

    console.log("[sap] live discovery via Synapse RPC:", this.config.SYNAPSE_RPC_URL);
    return [
      {
        id: "synapse:sentinel:health",
        name: "Synapse Sentinel",
        protocol: "SAP",
        category: "monitoring",
        agentAddress: sentinelAgent
      }
    ];
  }

  manifest() {
    return {
      name: this.config.AGENT_NAME,
      description: this.config.AGENT_DESCRIPTION,
      protocols: ["SAP", "x402", "AceDataCloud"],
      capabilities: [
        {
          id: "bounty:radar",
          protocolId: "sap-ace-x402",
          version: "0.1.0",
          description: "Discovers tools, scans product deals, and settles Ace Data Cloud calls with x402."
        },
        {
          id: "synapse:sentinel:health",
          protocolId: "SAP",
          version: "0.9.3",
          description: "Uses Synapse Sentinel at least once per workflow."
        },
        {
          id: "acedata:multi-service-analysis",
          protocolId: "x402",
          version: "2026.531.3",
          description: "Calls web search, chat completion, and Flux image generation Ace services in one autonomous workflow."
        }
      ],
      pricing: []
    };
  }

  private async writeRegistrationEvidence(record: Record<string, string>): Promise<void> {
    const fs = await import("node:fs/promises");
    await fs.mkdir(this.config.OUTPUT_DIR, { recursive: true });
    const lines = [
      "# SAP Registration Evidence",
      "",
      `- Status: ${record.status}`,
      `- Wallet: ${record.wallet}`,
      `- Agent PDA: ${record.agentPda}`,
      `- Global Registry PDA: ${record.globalRegistryPda}`,
      record.signature ? `- Transaction: https://solscan.io/tx/${record.signature}` : undefined,
      `- Dashboard: ${dashboardUrl}`,
      `- Timestamp: ${new Date().toISOString()}`,
      ""
    ].filter((line): line is string => Boolean(line));
    await fs.writeFile(`${this.config.OUTPUT_DIR}/sap_registration.md`, lines.join("\n"));
  }

  private encodeRegisterAgentData(crypto: typeof import("node:crypto")): Buffer {
    const chunks: Buffer[] = [];
    const pushU8 = (value: number) => chunks.push(Buffer.from([value]));
    const pushU32 = (value: number) => {
      const buffer = Buffer.alloc(4);
      buffer.writeUInt32LE(value, 0);
      chunks.push(buffer);
    };
    const pushString = (value: string) => {
      const buffer = Buffer.from(value, "utf8");
      pushU32(buffer.length);
      chunks.push(buffer);
    };
    const pushOptionString = (value: string | null) => {
      if (value === null) {
        pushU8(0);
        return;
      }
      pushU8(1);
      pushString(value);
    };

    chunks.push(crypto.createHash("sha256").update("global:register_agent").digest().subarray(0, 8));
    pushString(this.config.AGENT_NAME);
    pushString(this.config.AGENT_DESCRIPTION);
    const capabilities = this.manifest().capabilities;
    pushU32(capabilities.length);
    for (const capability of capabilities) {
      pushString(capability.id);
      pushOptionString(capability.description);
      pushOptionString(capability.protocolId);
      pushOptionString(capability.version);
    }
    pushU32(0);
    const protocols = ["sap", "x402", "ace-data-cloud"];
    pushU32(protocols.length);
    for (const protocol of protocols) pushString(protocol);
    pushOptionString("deal-scout-agent");
    pushOptionString(dashboardUrl);
    pushOptionString(dashboardUrl);
    return Buffer.concat(chunks);
  }
}
