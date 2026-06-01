import "dotenv/config";
import { z } from "zod";

const booleanEnv = z
  .union([z.boolean(), z.string()])
  .transform((value) => (typeof value === "boolean" ? value : value.toLowerCase() === "true"));

const envSchema = z.object({
  AGENT_NAME: z.string().default("Deal Scout Agent"),
  AGENT_DESCRIPTION: z.string().default("Autonomous SAP + Ace x402 bounty agent."),
  SYNAPSE_RPC_URL: z.string().url().optional(),
  SOLANA_KEYPAIR_PATH: z.string().optional(),
  ACE_NETWORK: z.enum(["solana", "base", "skale"]).default("solana"),
  ACE_API_BASE_URL: z.string().url().default("https://api.acedata.cloud"),
  X402_PAYMENT_MODE: z.enum(["pre_submit", "facilitator_submit"]).default("pre_submit"),
  CHAT_API_PATH: z.string().default("/v1/chat/completions"),
  SEARCH_API_PATH: z.string().default("/serp/google"),
  IMAGE_API_PATH: z.string().default("/flux/images"),
  EMBEDDINGS_API_PATH: z.string().default("/openai/embeddings"),
  X402B_SOLANA_PAYER_PRIVATE_KEY: z.string().optional(),
  X402B_SOLANA_FACILITATOR_ADDRESS: z.string().default("3SPm6qbgsDkj24MuR8Ss4sH97fziqyCiqFKDyeVU2igq"),
  MAX_SPEND_USD: z.coerce.number().positive().default(3),
  MAX_ITEMS: z.coerce.number().int().positive().default(10),
  START_INDEX: z.coerce.number().int().nonnegative().default(0),
  MIN_SOL_BALANCE: z.coerce.number().nonnegative().default(0.015),
  MIN_USDC_BALANCE: z.coerce.number().nonnegative().default(1),
  MAX_CONCURRENCY: z.coerce.number().int().positive().default(1),
  MEMO_RECEIPTS_ENABLED: booleanEnv.default(false),
  LIVE_CONFIRM: z.string().optional(),
  DEAL_MARKET: z.string().default("Serbia electronics deals"),
  OUTPUT_DIR: z.string().default("logs")
});

export type AppConfig = z.infer<typeof envSchema>;

export function loadConfig(): AppConfig {
  return envSchema.parse(process.env);
}

export function missingLiveConfig(config: AppConfig): string[] {
  const missing: string[] = [];

  if (!config.SYNAPSE_RPC_URL) missing.push("SYNAPSE_RPC_URL");
  if (!config.SOLANA_KEYPAIR_PATH) missing.push("SOLANA_KEYPAIR_PATH");

  if (config.ACE_NETWORK === "solana" && !config.X402B_SOLANA_PAYER_PRIVATE_KEY) {
    missing.push("X402B_SOLANA_PAYER_PRIVATE_KEY");
  }

  if (config.LIVE_CONFIRM !== "I_UNDERSTAND_X402_SPEND") {
    missing.push("LIVE_CONFIRM=I_UNDERSTAND_X402_SPEND");
  }

  return missing;
}
