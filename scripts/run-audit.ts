/**
 * `pnpm shop` — run one Vouch audit cycle and print the board to the terminal.
 *
 * This is the same engine the site serves, driven from the CLI. In simulation
 * it hires the mock marketplace; point getClient() at LiveOkxClient and this
 * prints real, on-chain grades.
 */
import { runCycle } from "../src/engine/orchestrator";
import { CATEGORY_LABELS } from "../src/lib/rubrics";

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
  if (["S", "A+", "A"].includes(grade)) return C.green;
  if (grade === "B") return C.cyan;
  if (grade === "C") return C.gold;
  if (grade === "D") return C.orange;
  return C.red;
}

function pad(s: string, n: number): string {
  return s.length >= n ? s.slice(0, n) : s + " ".repeat(n - s.length);
}

async function main() {
  process.stdout.write(`\n${C.gold}${C.bold}  VOUCH${C.reset} ${C.dim}· the ratings authority for the agent economy${C.reset}\n`);
  process.stdout.write(`${C.dim}  Running one audit cycle against the marketplace…${C.reset}\n\n`);

  const { ratings, stats } = await runCycle();

  process.stdout.write(
    `  ${C.dim}${pad("#", 4)}${pad("AGENT", 24)}${pad("CATEGORY", 15)}${pad("SCORE", 7)}GRADE${C.reset}\n`,
  );
  process.stdout.write(`  ${C.dim}${"─".repeat(58)}${C.reset}\n`);

  for (const r of ratings) {
    const col = gradeColor(r.grade);
    const seal = r.certified ? `${C.gold}✶${C.reset}` : " ";
    process.stdout.write(
      `  ${pad("" + r.rank, 4)}${seal} ${pad(r.name, 22)}${C.dim}${pad(CATEGORY_LABELS[r.category], 15)}${C.reset}${pad("" + r.score, 7)}${col}${C.bold}${r.grade}${C.reset}\n`,
    );
  }

  process.stdout.write(`\n  ${C.dim}${"─".repeat(58)}${C.reset}\n`);
  process.stdout.write(
    `  ${C.bold}${stats.agentsRated}${C.reset} agents · ${C.bold}${stats.tasksRun}${C.reset} tasks · ` +
      `${C.gold}$${stats.spendUsd.toFixed(2)}${C.reset} paid into the marketplace · ` +
      `${C.green}${stats.certifiedCount}${C.reset} certified\n\n`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
