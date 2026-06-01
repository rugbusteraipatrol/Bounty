import { mkdir, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { Keypair } from "@solana/web3.js";
import bs58 from "bs58";

const keysDir = join(process.cwd(), "keys");
const keypairPath = join(keysDir, "deal-scout-burner.json");
const envPath = join(keysDir, "deal-scout-burner.env.local.txt");

if (existsSync(keypairPath) || existsSync(envPath)) {
  console.error("Burner key files already exist. Refusing to overwrite:");
  console.error(`- ${keypairPath}`);
  console.error(`- ${envPath}`);
  process.exit(1);
}

const keypair = Keypair.generate();
const secretBytes = Array.from(keypair.secretKey);
const privateKeyBase58 = bs58.encode(keypair.secretKey);
const publicKey = keypair.publicKey.toBase58();

await mkdir(keysDir, { recursive: true });
await writeFile(keypairPath, `${JSON.stringify(secretBytes)}\n`, { mode: 0o600 });
await writeFile(
  envPath,
  [
    "# Local secret for Deal Scout burner wallet. Do not commit or share.",
    `X402B_SOLANA_PAYER_PRIVATE_KEY=${privateKeyBase58}`,
    `SOLANA_BURNER_PUBLIC_KEY=${publicKey}`
  ].join("\n") + "\n",
  { mode: 0o600 }
);

console.log("Created Deal Scout burner wallet.");
console.log(`Public address: ${publicKey}`);
console.log("");
console.log("Send a small amount of SOL and USDC on Solana to this address from Phantom.");
console.log(`Keypair JSON: ${keypairPath}`);
console.log(`Env snippet:  ${envPath}`);
