import "dotenv/config";
import { readFile } from "node:fs/promises";
import { Connection, PublicKey } from "@solana/web3.js";
import { getAssociatedTokenAddress, getAccount } from "@solana/spl-token";

const envText = await readFile("keys/deal-scout-burner.env.local.txt", "utf8");
const address = envText.match(/^SOLANA_BURNER_PUBLIC_KEY=(.+)$/m)?.[1]?.trim();
if (!address) throw new Error("SOLANA_BURNER_PUBLIC_KEY not found.");

const rpc = process.env.SYNAPSE_RPC_URL || "https://api.mainnet-beta.solana.com";
const connection = new Connection(rpc, "confirmed");
const owner = new PublicKey(address);
const usdcMint = new PublicKey("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v");

const sol = (await connection.getBalance(owner, "confirmed")) / 1e9;
let usdc = 0;
try {
  const ata = await getAssociatedTokenAddress(usdcMint, owner);
  const account = await getAccount(connection, ata);
  usdc = Number(account.amount) / 1e6;
} catch {
  usdc = 0;
}

console.log(`Address: ${address}`);
console.log(`SOL: ${sol}`);
console.log(`USDC: ${usdc}`);
