#!/usr/bin/env node
/**
 * Vouch — real marketplace snapshot.
 *
 * Pulls REAL agents from the OKX.AI marketplace via the `onchainos` CLI
 * (`agent search`), across a broad set of queries, dedupes by agentId, and
 * writes them to src/data/agents.raw.json. This runs locally with the VPN on;
 * the committed snapshot is what the deployed app rates — no live dependency.
 *
 * Usage: node scripts/fetch-agents.mjs
 */
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { writeFile, mkdir } from "node:fs/promises";
import { homedir } from "node:os";
import path from "node:path";

const exec = promisify(execFile);
const CLI = path.join(homedir(), ".local/bin/onchainos");

// Broad coverage across the marketplace's real categories.
const QUERIES = [
  "trading", "signal", "perp", "market", "market data", "price", "chart",
  "security", "audit", "risk", "smart contract", "token", "scan",
  "defi", "yield", "staking", "liquidity", "bridge", "swap",
  "nft", "art", "design", "image", "meme", "pixel",
  "research", "analytics", "data", "on-chain", "wallet", "portfolio",
  "content", "writing", "thread", "social", "kol", "news",
  "prediction", "sports", "agent", "assistant", "code", "dev",
];

async function search(query, page) {
  const args = ["agent", "search", "--query", query, "--page", String(page), "--page-size", "20"];
  try {
    const { stdout } = await exec(CLI, args, { maxBuffer: 1024 * 1024 * 16, timeout: 60000 });
    const json = JSON.parse(stdout);
    if (!json.ok) return [];
    return json.data?.list ?? [];
  } catch (e) {
    process.stderr.write(`  ! ${query} p${page}: ${String(e.message).slice(0, 80)}\n`);
    return [];
  }
}

async function main() {
  const byId = new Map();
  for (const q of QUERIES) {
    let page = 1;
    let got = 0;
    // paginate until a page returns nothing (cap at 5 pages/query)
    while (page <= 5) {
      const list = await search(q, page);
      if (!list.length) break;
      for (const a of list) {
        if (a?.agentId && !byId.has(a.agentId)) byId.set(a.agentId, a);
      }
      got += list.length;
      if (list.length < 20) break;
      page++;
    }
    process.stdout.write(`  ${q.padEnd(16)} +${got}  (unique so far: ${byId.size})\n`);
  }

  const agents = [...byId.values()];
  const outDir = path.join(process.cwd(), "src/data");
  await mkdir(outDir, { recursive: true });
  const out = path.join(outDir, "agents.raw.json");
  await writeFile(out, JSON.stringify({ fetchedAt: new Date().toISOString(), count: agents.length, agents }, null, 2));
  process.stdout.write(`\n✅ ${agents.length} unique real agents → ${out}\n`);
}

main().catch((e) => { console.error(e); process.exit(1); });
