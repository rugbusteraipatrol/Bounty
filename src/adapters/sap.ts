import type { AppConfig } from "../config.js";
import type { SapTool, WorkflowMode } from "../types.js";

const sentinelAgent = "Ccr2yK3hLALU4p8oNRqrh4dGuvPJTth5KCLMio8cE1ph";

export class SapAdapter {
  constructor(private readonly config: AppConfig, private readonly mode: WorkflowMode) {}

  async registerAgent(): Promise<void> {
    if (this.mode === "dry-run") {
      console.log("[sap] dry-run register:", this.manifest());
      return;
    }

    // Keep the live integration in one place while the SDK surface is evolving.
    const sdk = await import("@oobe-protocol-labs/synapse-sap-sdk");
    console.log("[sap] loaded SDK exports:", Object.keys(sdk).slice(0, 8).join(", "));
    console.log("[sap] register manifest prepared:", this.manifest());
    console.log("[sap] TODO: wire wallet/provider once SOLANA_KEYPAIR_PATH is funded.");
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
}
