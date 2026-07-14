/**
 * `pnpm shop` — grade the committed OKX.AI marketplace snapshot and print the
 * board to the terminal. Same rating engine the site serves, driven from the
 * CLI, over REAL marketplace data (src/data/agents.raw.json). Refresh the
 * snapshot with `node scripts/fetch-agents.mjs` (needs OKX access).
 */
import { rateAgent, type RawAgent } from "../src/engine/rate";
import { CATEGORY_LABELS } from "../src/lib/rubrics";
import snapshot from "../src/data/agents.raw.json" with { type: "json" };

const C = {
  reset: "\x1b[0m",
  dim: "\x1b[2m",
  bold: "\x1b[1m",
  gold: "\x1b[38;5;179m",
  green: "\x1b[38;5;79m",
  cyan: "\x1b[38;5;80m",
  orange: "\x1b[38;5;215m",
  red: "\x1b[38;5;203m",
};

function gradeColor(grade: string): string {
  if (["S", "A"].includes(grade)) return C.green;
  if (grade === "B") return C.cyan;
  if (grade === "C") return C.gold;
  if (grade === "D") return C.orange;
  return C.red;
}

function pad(s: string, n: number): string {
  return s.length >= n ? s.slice(0, n) : s + " ".repeat(n - s.length);
}

function main() {
  const snap = snapshot as unknown as { fetchedAt: string; agents: RawAgent[] };
  process.stdout.write(`\n${C.gold}${C.bold}  VOUCH${C.reset} ${C.dim}· the ratings authority for the agent economy${C.reset}\n`);
  process.stdout.write(`${C.dim}  Grading ${snap.agents.length} real OKX.AI agents · snapshot ${snap.fetchedAt}${C.reset}\n\n`);

  const rated = snap.agents
    .map((a) => rateAgent(a, snap.fetchedAt))
    .sort(
      (a, b) =>
        b.score - a.score ||
        Number(b.proven) - Number(a.proven) ||
        b.reliability - a.reliability ||
        b.signals.serviceCount - a.signals.serviceCount ||
        Number(a.id) - Number(b.id),
    );
  rated.forEach((r, i) => (r.rank = i + 1));

  process.stdout.write(
    `  ${C.dim}${pad("#", 5)}${pad("AGENT", 26)}${pad("CATEGORY", 14)}${pad("SCORE", 7)}${pad("CONF", 8)}GRADE${C.reset}\n`,
  );
  process.stdout.write(`  ${C.dim}${"─".repeat(66)}${C.reset}\n`);

  for (const r of rated.slice(0, 30)) {
    const col = gradeColor(r.grade);
    const seal = r.certified ? `${C.gold}✶${C.reset}` : " ";
    process.stdout.write(
      `  ${pad("" + r.rank, 4)}${seal}${pad(r.name, 26)}${C.dim}${pad(CATEGORY_LABELS[r.category], 14)}${C.reset}${pad("" + r.score, 7)}${C.dim}${pad(r.confidence, 8)}${C.reset}${col}${C.bold}${r.grade}${C.reset}\n`,
    );
  }

  const proven = rated.filter((r) => r.proven).length;
  const certified = rated.filter((r) => r.certified).length;
  const online = rated.filter((r) => r.signals.online).length;

  process.stdout.write(`\n  ${C.dim}${"─".repeat(66)}${C.reset}\n`);
  process.stdout.write(
    `  ${C.bold}${rated.length}${C.reset} agents rated · ` +
      `${C.bold}${proven}${C.reset} proven on real jobs · ` +
      `${C.green}${certified}${C.reset} Vouch Certified · ` +
      `${C.cyan}${online}${C.reset} live now\n`,
  );
  process.stdout.write(`  ${C.dim}(showing top 30 of ${rated.length} — the full board renders on the site)${C.reset}\n\n`);
}

main();
