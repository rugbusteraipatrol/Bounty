import { loadConfig, missingLiveConfig } from "./config.js";
import { SapAdapter } from "./adapters/sap.js";
import { runDealScoutWorkflow } from "./workflow/dealScout.js";
import type { WorkflowMode } from "./types.js";

const command = process.argv[2] ?? "doctor";
const dryRun = process.argv.includes("--dry-run");
const mode: WorkflowMode = dryRun ? "dry-run" : "live";
const config = loadConfig();

async function main() {
  if (command === "doctor") {
    const missing = missingLiveConfig(config);
    console.log("Agent:", config.AGENT_NAME);
    console.log("Market:", config.DEAL_MARKET);
    console.log("Max items:", config.MAX_ITEMS);
    console.log("Start index:", config.START_INDEX);
    console.log("Max spend USD:", config.MAX_SPEND_USD);
    console.log("Max concurrency:", config.MAX_CONCURRENCY);
    console.log("Memo receipts:", config.MEMO_RECEIPTS_ENABLED ? "enabled" : "disabled");
    console.log("Mode ready:", missing.length === 0 ? "live" : "dry-run only");
    if (missing.length) console.log("Missing live env:", missing.join(", "));
    return;
  }

  if (command === "register") {
    await new SapAdapter(config, mode).registerAgent();
    return;
  }

  if (command === "run") {
    if (mode === "live") {
      const missing = missingLiveConfig(config);
      if (missing.length) {
        throw new Error(`Missing live env: ${missing.join(", ")}. Use --dry-run until credentials are set.`);
      }
    }

    const evidence = await runDealScoutWorkflow(config, mode);
    console.log(JSON.stringify({
      runId: evidence.runId,
      mode: evidence.mode,
      tools: evidence.selectedTools.length,
      aceCalls: evidence.aceCalls.map((call) => call.service),
      output: `${config.OUTPUT_DIR}/${evidence.runId}.json`
    }, null, 2));
    return;
  }

  throw new Error(`Unknown command: ${command}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
