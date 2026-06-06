# Deal Scout Agent

Autonomous Deal Scout for the OOBE Protocol x Ace Data Cloud bounty.

Primary category: **Ace Data Cloud Usage (x402 Facilitator)**.

## Live Evidence

- Public dashboard: https://rugbusteraipatrol.github.io/Bounty/dashboard/
- SAP agent PDA: `3QFF3jzskQcCagkQLc9c4mno6HvWD5xmdgdXfMigTt9m`
- SAP registration tx: https://solscan.io/tx/2UdKHkCphzbBitMnMERWAQ1YdydGKu12sbFXs426nsqx6jsZvMtMsscKdoDAistkjJ1KuUcVfFLgsHaCbsiZUoFL
- x402 settlements: `764` real on-chain Solana payments
- x402 USDC settled: `$30.2325`
- x402 settlements logged in `logs/x402_settlements.md`

## Why This Agent

Deal Scout creates legitimate repeat usage: each product gets its own workflow and each workflow uses distinct Ace Data Cloud services. It avoids artificial loops while still producing meaningful x402 volume.

## x402 Rules

- No Ace API token is used in live mode.
- First request is sent without `Authorization`.
- Ace returns `402 Payment Required` with `accepts[]`.
- The agent selects the Solana requirement, builds a `TransferChecked` transaction, signs it with the burner wallet, and retries with `X-Payment`.
- Video endpoints are intentionally avoided because current guidance says video does not reliably settle on-chain.

## Workflow

For each product:

1. SAP discovery/Sentinel context.
2. Ace web search: `POST /serp/google`.
3. Ace chat completion: `POST /v1/chat/completions`.
4. Ace Flux image generation: `POST /flux/images`.
5. Optional SPL Memo receipt per product cycle.
6. Pre-payment JSONL evidence before every paid call.
7. Final JSON run report and `x402_settlements.md`.

## Safety

Live spending is blocked unless all of these are configured:

- `MAX_SPEND_USD`
- `MAX_ITEMS`
- `MIN_SOL_BALANCE`
- `MIN_USDC_BALANCE`
- `LIVE_CONFIRM=I_UNDERSTAND_X402_SPEND`

Dry-run is the default development path:

```powershell
npm run dev
```

## Setup

```powershell
npm install
Copy-Item .env.example .env
npm run doctor
```

Fill `.env` with the burner wallet and Synapse RPC values. Do not paste a seed phrase into chat or commit `.env`.

## Commands

```powershell
npm run doctor
npm run register -- --dry-run
npm run dev
npm run run
```
