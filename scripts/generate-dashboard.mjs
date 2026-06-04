import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";

const root = process.cwd();
const settlementsPath = join(root, "logs", "x402_settlements.md");
const dashboardPath = join(root, "dashboard", "index.html");
const outputPath = resolve(root, "..", "outputs", "deal-scout-dashboard.html");

const raw = await readFile(settlementsPath, "utf8");
const rows = raw
  .split(/\r?\n/)
  .filter((line) => line.startsWith("| 20"))
  .map(parseRow)
  .filter((row) => row.note.includes("x402 settlement detected"));

const stats = buildStats(rows);
stats.credits = await buildCreditStats();
const recentRows = rows.slice().reverse();
const cleanRows = rows.filter((row) => row.status === 200).slice().reverse();
const latestRun = recentRows[0]?.run ?? "deal-scout-live";

const html = renderHtml({ rows: recentRows, cleanRows, stats, latestRun });

await mkdir(dirname(dashboardPath), { recursive: true });
await mkdir(dirname(outputPath), { recursive: true });
await writeFile(dashboardPath, html);
await writeFile(outputPath, html);

console.log(`Dashboard generated: ${dashboardPath}`);
console.log(`Output copy: ${outputPath}`);
console.log(`Settlements: ${stats.totalSettlements}`);

function parseRow(line) {
  const cells = line
    .slice(1, -1)
    .split("|")
    .map((cell) => cell.trim());

  return {
    time: cells[0],
    run: cells[1],
    product: cells[2],
    service: cells[3],
    endpoint: cells[4],
    status: Number(cells[5]),
    usdc: Number(cells[6]),
    solscan: cells[7],
    memo: cells[8],
    note: cells[9]
  };
}

function buildStats(items) {
  const totalSpent = items.reduce((sum, row) => sum + (Number.isFinite(row.usdc) ? row.usdc : 0), 0);
  const clean200 = items.filter((row) => row.status === 200).length;
  const uniqueProducts = new Set(items.map((row) => row.product)).size;
  const services = [...new Set(items.map((row) => row.service))];

  return {
    totalSettlements: items.length,
    clean200,
    totalSpent,
    uniqueProducts,
    services,
    successRate: items.length ? Math.round((clean200 / items.length) * 100) : 0
  };
}

async function buildCreditStats() {
  const logDir = join(root, "logs");
  const files = (await readdir(logDir)).filter((file) => file.endsWith(".credits.jsonl"));
  const stats = {
    total: 0,
    ok200: 0,
    failed403: 0,
    byService: {}
  };

  for (const file of files) {
    const content = await readFile(join(logDir, file), "utf8");
    for (const line of content.split(/\r?\n/).filter(Boolean)) {
      const entry = JSON.parse(line);
      stats.total += 1;
      if (entry.status === 200) stats.ok200 += 1;
      if (entry.status === 403) stats.failed403 += 1;
      stats.byService[entry.service] ??= {};
      stats.byService[entry.service][entry.status] = (stats.byService[entry.service][entry.status] ?? 0) + 1;
    }
  }

  return stats;
}

function renderHtml({ rows, cleanRows, stats, latestRun }) {
  const rowsJson = JSON.stringify(rows);
  const cleanJson = JSON.stringify(cleanRows.slice(0, 12));
  const statsJson = JSON.stringify(stats);
  const latestRunJson = JSON.stringify(latestRun);

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Deal Scout Agent Dashboard</title>
  <style>
    :root {
      color-scheme: dark;
      --bg: #06070a;
      --panel: #11141b;
      --panel-2: #171b24;
      --line: #2a3140;
      --text: #f5f7fb;
      --muted: #9aa4b2;
      --green: #52e0a2;
      --cyan: #5bc8ff;
      --amber: #ffc857;
      --purple: #a979ff;
      --red: #ff647c;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      background: radial-gradient(circle at 15% 10%, rgba(82, 224, 162, 0.10), transparent 30%),
        radial-gradient(circle at 85% 0%, rgba(169, 121, 255, 0.10), transparent 28%), var(--bg);
      color: var(--text);
      font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      letter-spacing: 0;
    }
    .topbar {
      height: 44px;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 12px;
      color: #dfe7ef;
      background: linear-gradient(90deg, rgba(169, 121, 255, .18), rgba(82, 224, 162, .16), rgba(255, 200, 87, .18));
      border-bottom: 1px solid rgba(255,255,255,.08);
      font-size: 14px;
      font-weight: 700;
    }
    .app {
      max-width: 1500px;
      margin: 0 auto;
      padding: 28px;
    }
    header {
      display: grid;
      grid-template-columns: 1fr auto;
      gap: 24px;
      align-items: end;
      margin-bottom: 24px;
    }
    .eyebrow {
      color: var(--green);
      font-size: 13px;
      font-weight: 800;
      letter-spacing: .18em;
      text-transform: uppercase;
      margin-bottom: 10px;
    }
    h1 {
      margin: 0;
      font-size: 56px;
      line-height: 1.02;
      letter-spacing: 0;
    }
    .subtitle {
      margin: 12px 0 0;
      color: var(--muted);
      font-size: 18px;
      max-width: 820px;
      line-height: 1.55;
    }
    .status-pill {
      display: inline-flex;
      align-items: center;
      gap: 10px;
      padding: 12px 16px;
      border: 1px solid rgba(82,224,162,.38);
      border-radius: 999px;
      background: rgba(82,224,162,.09);
      color: var(--green);
      font-weight: 800;
      white-space: nowrap;
    }
    .dot {
      width: 10px;
      height: 10px;
      background: var(--green);
      border-radius: 999px;
      box-shadow: 0 0 18px var(--green);
    }
    .stats {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 16px;
      margin-bottom: 24px;
    }
    .card, .panel {
      background: linear-gradient(180deg, rgba(255,255,255,.045), rgba(255,255,255,.018)), var(--panel);
      border: 1px solid rgba(255,255,255,.09);
      border-radius: 8px;
      box-shadow: 0 18px 60px rgba(0,0,0,.28);
    }
    .card {
      min-height: 140px;
      padding: 22px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
    }
    .label {
      color: var(--muted);
      font-size: 13px;
      font-weight: 800;
      letter-spacing: .08em;
      text-transform: uppercase;
    }
    .value {
      font-size: 42px;
      font-weight: 900;
      line-height: 1;
      margin-top: 12px;
    }
    .hint {
      color: var(--muted);
      font-size: 14px;
      margin-top: 8px;
    }
    .value.green { color: var(--green); }
    .value.amber { color: var(--amber); }
    .value.cyan { color: var(--cyan); }
    .value.purple { color: var(--purple); }
    .grid {
      display: grid;
      grid-template-columns: minmax(360px, 0.84fr) 1.16fr;
      gap: 18px;
      align-items: start;
    }
    .panel-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      padding: 20px 22px;
      border-bottom: 1px solid rgba(255,255,255,.08);
    }
    .panel-title {
      margin: 0;
      font-size: 20px;
      font-weight: 900;
    }
    .panel-subtitle {
      margin: 4px 0 0;
      color: var(--muted);
      font-size: 14px;
    }
    .settled {
      color: var(--green);
      border: 1px solid rgba(82,224,162,.32);
      background: rgba(82,224,162,.08);
      border-radius: 999px;
      padding: 7px 10px;
      font-size: 12px;
      font-weight: 900;
      white-space: nowrap;
    }
    .trace {
      display: grid;
      gap: 12px;
      padding: 18px;
    }
    .step {
      display: grid;
      grid-template-columns: 48px 1fr auto;
      gap: 14px;
      align-items: start;
      padding: 16px;
      background: rgba(0,0,0,.22);
      border: 1px solid rgba(255,255,255,.07);
      border-radius: 8px;
    }
    .step-no {
      color: var(--muted);
      font-weight: 900;
      font-variant-numeric: tabular-nums;
    }
    .step h3 {
      margin: 0 0 6px;
      font-size: 16px;
    }
    .step p {
      margin: 0;
      color: var(--muted);
      line-height: 1.45;
      font-size: 14px;
    }
    code {
      display: block;
      margin-top: 12px;
      padding: 13px;
      border: 1px solid rgba(255,255,255,.08);
      border-radius: 8px;
      background: #050609;
      color: #dbeafe;
      overflow: hidden;
      white-space: pre-wrap;
      font-size: 12px;
      line-height: 1.55;
    }
    .table-wrap {
      max-height: 680px;
      overflow: auto;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 13px;
    }
    th, td {
      padding: 13px 14px;
      border-bottom: 1px solid rgba(255,255,255,.07);
      text-align: left;
      vertical-align: middle;
    }
    th {
      position: sticky;
      top: 0;
      background: #10131a;
      color: var(--muted);
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: .08em;
      z-index: 1;
    }
    .service {
      display: inline-flex;
      min-width: 70px;
      justify-content: center;
      padding: 6px 9px;
      border-radius: 999px;
      background: rgba(91,200,255,.1);
      color: var(--cyan);
      font-weight: 800;
    }
    .ok { color: var(--green); font-weight: 900; }
    .warn { color: var(--amber); font-weight: 900; }
    a {
      color: var(--green);
      text-decoration: none;
      font-weight: 800;
    }
    a:hover { text-decoration: underline; }
    .hash {
      font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
      font-size: 12px;
    }
    .footer {
      display: flex;
      justify-content: space-between;
      gap: 20px;
      color: var(--muted);
      margin-top: 18px;
      font-size: 13px;
    }
    @media (max-width: 980px) {
      header, .grid { grid-template-columns: 1fr; }
      .stats { grid-template-columns: repeat(2, minmax(0, 1fr)); }
      h1 { font-size: 42px; }
    }
  </style>
</head>
<body>
  <div class="topbar">Powered by <strong>OOBE Protocol</strong> × <strong>Ace Data Cloud</strong> × <strong>x402 Micropayments</strong> — Superteam Bounty Demo</div>
  <main class="app">
    <header>
      <div>
        <div class="eyebrow">Deal Scout Agent</div>
        <h1>Autonomous Buyer Assistant</h1>
        <p class="subtitle">Scans real product categories, pays Ace Data Cloud via x402 for web search, deal reasoning, and Flux visuals, then logs every settlement on Solana mainnet.</p>
        <p class="subtitle small">SAP registered agent: <a href="https://solscan.io/tx/2UdKHkCphzbBitMnMERWAQ1YdydGKu12sbFXs426nsqx6jsZvMtMsscKdoDAistkjJ1KuUcVfFLgsHaCbsiZUoFL" target="_blank" rel="noreferrer">3QFF...Tt9m</a></p>
      </div>
      <div class="status-pill"><span class="dot"></span> REAL ON-CHAIN • NOT SIMULATED</div>
    </header>

    <section class="stats" id="stats"></section>

    <section class="grid">
      <div class="panel">
        <div class="panel-header">
          <div>
            <h2 class="panel-title">Agent Execution Trace</h2>
            <p class="panel-subtitle">trigger → SAP discovery → x402 payment → Ace result → done</p>
          </div>
          <span class="settled">SETTLED on-chain</span>
        </div>
        <div class="trace" id="trace"></div>
      </div>

      <div class="panel">
        <div class="panel-header">
          <div>
            <h2 class="panel-title">x402 Settlement Ledger</h2>
            <p class="panel-subtitle">Every row is a real Solana transaction with a Solscan link.</p>
          </div>
          <span class="settled" id="count-pill"></span>
        </div>
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Product</th>
                <th>Service</th>
                <th>Status</th>
                <th>USDC</th>
                <th>Solscan</th>
              </tr>
            </thead>
            <tbody id="settlements"></tbody>
          </table>
        </div>
      </div>
    </section>

    <div class="footer">
      <span>Latest run: <strong id="latest-run"></strong></span>
      <span>No API key. Pre-submit x402 payment. Solana mainnet.</span>
    </div>
  </main>
  <script>
    const rows = ${rowsJson};
    const cleanRows = ${cleanJson};
    const stats = ${statsJson};
    const latestRun = ${latestRunJson};
    const combinedSuccessfulCalls = stats.totalSettlements + stats.credits.ok200;

    const statCards = [
      ["Total Agent Calls", combinedSuccessfulCalls, "green", "x402 settlements + successful Ace credits"],
      ["Total Settlements", stats.totalSettlements, "green", "Real x402 payments on Solana"],
      ["Clean 200 OK", stats.clean200, "cyan", stats.successRate + "% service fulfillment"],
      ["USDC Spent", "$" + stats.totalSpent.toFixed(4), "amber", "Paid through x402, no API key"],
      ["Services Used", stats.services.length, "purple", stats.services.join(", ")],
      ["SAP Registered", "YES", "green", "Agent PDA 3QFF...Tt9m"],
      ["Ace Credits 200", stats.credits.ok200, "cyan", stats.credits.total + " API-key credit calls tested"]
    ];
    document.getElementById("stats").innerHTML = statCards.map(([label, value, color, hint]) => \`
      <article class="card">
        <div>
          <div class="label">\${label}</div>
          <div class="value \${color}">\${value}</div>
        </div>
        <div class="hint">\${hint}</div>
      </article>
    \`).join("");

    const traceRows = [
      ["01", "Trigger received", "Deal Scout starts a bounded product scan with MAX_SPEND and MAX_ITEMS controls.", { market: "Serbia electronics deals", products: stats.uniqueProducts }],
      ["02", "SAP tool discovery", "Agent touches the Synapse Agent Protocol layer before execution.", { discoveredTools: ["Synapse Sentinel", "Ace SERP", "Ace Chat", "Ace Flux"] }],
      ["03", "x402 payment submitted", "Each Ace call is paid by a pre-submitted Solana USDC transfer, then retried with X-Payment.", { rail: "x402", network: "solana", asset: "USDC", status: "SETTLED" }],
      ["04", "Ace services executed", "Search, reasoning, and image-generation results are tied to independent product workflows.", { services: stats.services, clean200: stats.clean200 }],
      ["05", "Supplemental credits usage", "After the x402 run, Ace app credits were tested separately through API-key mode. This is logged separately and not counted as x402 settlement evidence.", { successfulCreditCalls: stats.credits.ok200, totalCreditCalls: stats.credits.total, byService: stats.credits.byService }],
      ["06", "Evidence written", "The agent writes JSON logs and a settlement ledger with Solscan links for evaluator review.", { settlements: stats.totalSettlements, latestRun }]
    ];
    document.getElementById("trace").innerHTML = traceRows.map(([no, title, body, payload]) => \`
      <div class="step">
        <div class="step-no">\${no}</div>
        <div>
          <h3><span class="ok">[ok]</span> \${title}</h3>
          <p>\${body}</p>
          <code>\${JSON.stringify(payload, null, 2)}</code>
        </div>
        <span class="settled">SETTLED</span>
      </div>
    \`).join("");

    document.getElementById("count-pill").textContent = stats.totalSettlements + " SETTLED";
    document.getElementById("latest-run").textContent = latestRun;
    document.getElementById("settlements").innerHTML = rows.map((row) => {
      const statusClass = row.status === 200 ? "ok" : "warn";
      const hash = row.solscan.split("/").pop() || "";
      return \`
        <tr>
          <td>\${row.product}</td>
          <td><span class="service">\${row.service}</span></td>
          <td><span class="\${statusClass}">\${row.status}</span> <span class="settled">SETTLED</span></td>
          <td>\${row.usdc.toFixed(6)}</td>
          <td><a class="hash" href="\${row.solscan}" target="_blank" rel="noreferrer">\${hash.slice(0, 10)}...\${hash.slice(-6)}</a></td>
        </tr>
      \`;
    }).join("");
  </script>
</body>
</html>`;
}
