import { appendFile, mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { AppConfig } from "../config.js";

export interface SettlementEntry {
  runId: string;
  productId: string;
  service: string;
  endpoint: string;
  status: number;
  amountAtomic?: string;
  amountUsd?: number;
  txHash?: string;
  memoTxHash?: string;
  note?: string;
}

export async function appendSettlement(config: AppConfig, entry: SettlementEntry): Promise<void> {
  await mkdir(config.OUTPUT_DIR, { recursive: true });
  const path = join(config.OUTPUT_DIR, "x402_settlements.md");

  try {
    await readFile(path, "utf8");
  } catch {
    await writeFile(
      path,
      [
        "# x402 Settlements",
        "",
        "Every row is produced by Deal Scout after an Ace Data Cloud call that went through the no-API-key x402 path.",
        "",
        "| Time | Run | Product | Service | Endpoint | Status | USDC | Solscan | Memo | Note |",
        "|---|---|---|---|---|---:|---:|---|---|---|"
      ].join("\n") + "\n"
    );
  }

  const explorer = entry.txHash ? `https://solscan.io/tx/${entry.txHash}` : "";
  const memo = entry.memoTxHash ? `https://solscan.io/tx/${entry.memoTxHash}` : "";
  const row = [
    new Date().toISOString(),
    entry.runId,
    entry.productId,
    entry.service,
    entry.endpoint,
    String(entry.status),
    entry.amountUsd === undefined ? "" : entry.amountUsd.toFixed(6),
    explorer,
    memo,
    entry.note ?? ""
  ].map(escapeCell).join(" | ");

  await appendFile(path, `| ${row} |\n`);
}

function escapeCell(value: string): string {
  return value.replaceAll("|", "\\|").replace(/\r?\n/g, " ");
}

export function extractSettlementTx(responseText: string, headers: Record<string, string>): string | undefined {
  for (const value of Object.values(headers)) {
    const match = value.match(/[1-9A-HJ-NP-Za-km-z]{64,88}/);
    if (match) return match[0];
  }

  try {
    const json = JSON.parse(responseText) as unknown;
    return findTxHash(json);
  } catch {
    const match = responseText.match(/x402_tx['"]?\s*[:=]\s*['"]([1-9A-HJ-NP-Za-km-z]{64,88})['"]/);
    return match?.[1];
  }
}

function findTxHash(value: unknown): string | undefined {
  if (!value || typeof value !== "object") return undefined;
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = findTxHash(item);
      if (found) return found;
    }
    return undefined;
  }

  for (const [key, nested] of Object.entries(value)) {
    if ((key === "x402_tx" || key === "txHash" || key === "transactionHash") && typeof nested === "string") {
      return nested;
    }
    const found = findTxHash(nested);
    if (found) return found;
  }

  return undefined;
}
