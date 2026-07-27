#!/usr/bin/env node
/**
 * Vouch — live x402 rating demo.
 *
 * One command, one real on-chain payment. Shows, on camera:
 *   ① an agent asks Vouch to rate another agent — with no payment
 *   ② Vouch answers 402: pay $0.02 in USDT first
 *   ③ the agent signs + settles the payment on X Layer (OKX's own payer)
 *   ④ Vouch returns a certified grade, a hire/verify/avoid call, the evidence
 *   ⑤ and if you ask about an agent it doesn't know, your money never moves
 *
 * Run it:
 *   node scripts/demo.mjs                 # full showcase (a strong agent, then a miss)
 *   node scripts/demo.mjs <handle-or-id>  # rate one specific agent
 *
 * Needs: the OKX `onchainos` CLI, logged in (it signs the payment in a TEE —
 * no private key ever touches this script).
 */

import { execFileSync } from "node:child_process";
import { existsSync, readdirSync } from "node:fs";

// --- make the OKX CLI + a modern node resolvable no matter how you launch it ---
const HOME = process.env.HOME || "";
const bins = [`${HOME}/.local/bin`];
try {
  const nvm = `${HOME}/.nvm/versions/node`;
  if (existsSync(nvm)) {
    const v = readdirSync(nvm).filter((d) => /^v(2[2-9]|[3-9]\d)\./.test(d)).sort().pop();
    if (v) bins.push(`${nvm}/${v}/bin`);
  }
} catch {}
process.env.PATH = [...bins, process.env.PATH, "/usr/local/bin", "/opt/homebrew/bin", "/usr/bin", "/bin"]
  .filter(Boolean)
  .join(":");

// --- config ---
const BASE = process.env.VOUCH_URL || "https://vouch-aufgabe.vercel.app";
const ENDPOINT = `${BASE}/api/vouch/rate`;
const STRONG = "onchain-data-explorer"; // a top-of-the-board agent → grade S, "hire"
const UNKNOWN = "totally-made-up-agent-9999"; // an agent Vouch has never seen → no charge

// --- tiny terminal styling (big and readable for screen capture) ---
const C = {
  reset: "\x1b[0m", dim: "\x1b[2m", bold: "\x1b[1m",
  gold: "\x1b[38;5;179m", green: "\x1b[38;5;114m", red: "\x1b[38;5;203m",
  blue: "\x1b[38;5;111m", grey: "\x1b[38;5;245m", white: "\x1b[97m",
};
const FAST = process.env.FAST === "1";
const pause = (ms) => (FAST ? Promise.resolve() : new Promise((r) => setTimeout(r, ms)));
const line = () => console.log(C.dim + "─".repeat(64) + C.reset);
function step(n, title) {
  console.log("");
  console.log(`${C.gold}${C.bold}  ${n}  ${title}${C.reset}`);
}
function say(s) { console.log(`     ${C.grey}${s}${C.reset}`); }
function gradeColor(g) { return "SA".includes(g) ? C.green : "BC".includes(g) ? C.gold : C.red; }

async function fetchJson(opts) {
  let last;
  for (let i = 0; i < 4; i++) {
    try {
      const r = await fetch(ENDPOINT, opts);
      const body = await r.json();
      return { status: r.status, headers: r.headers, body };
    } catch (e) {
      last = e;
      await pause(1500);
    }
  }
  throw last;
}

function sign(paymentRequiredHeader) {
  const out = execFileSync("onchainos", ["payment", "pay", "--payload", paymentRequiredHeader], {
    encoding: "utf8",
    maxBuffer: 8 * 1024 * 1024,
  });
  const jsonLine = out.trim().split("\n").filter((l) => l.trim().startsWith("{")).pop();
  const parsed = JSON.parse(jsonLine);
  const d = parsed.data || parsed;
  if (!d.authorization_header) throw new Error("onchainos did not return a payment header");
  return { name: d.header_name || "PAYMENT-SIGNATURE", value: d.authorization_header, wallet: d.wallet };
}

/** One full paid call: ask → 402 → pay → rating. */
async function rate(target) {
  step("①", `ASKING Vouch to rate  "${target}"  — no payment attached`);
  await pause(700);
  const unpaid = await fetchJson({
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ target }),
  });
  const challenge = unpaid.headers.get("payment-required");
  const req = unpaid.body.accepts?.[0] || {};

  step("②", `Vouch answers  ${C.white}${unpaid.status} PAYMENT REQUIRED${C.reset}`);
  say(`price   ${C.white}$0.02 USDT${C.reset}  (${req.amount} atomic units)`);
  say(`asset   USD₮0 on X Layer`);
  say(`pay to  ${req.payTo}`);
  await pause(1100);

  step("③", `Signing the payment — OKX authorizes $0.02 inside its secure enclave`);
  const pay = sign(challenge);
  say(`payer   ${pay.wallet}`);
  say(`${C.dim}a signed authorization, not a charge — nothing moves until Vouch settles it${C.reset}`);
  await pause(900);

  const paid = await fetchJson({
    method: "POST",
    headers: { "content-type": "application/json", [pay.name]: pay.value },
    body: JSON.stringify({ target }),
  });
  const b = paid.body;

  if (!b.found || !b.charged) {
    step("✗", `Vouch has no rating for "${target}"`);
    say(`${C.green}charged: ${b.charged}${C.reset}  — the authorization was never broadcast, so no money moved`);
    say(b.message || "");
    return;
  }

  const g = b.rating.grade;
  const tx = b.meta?.settlement?.transaction;
  step("④", `${paid.status} OK  — the rating comes back`);
  say(`asked for : ${C.white}${b.requested}${C.reset}`);
  say(`rated     : ${C.white}${b.resolved.name}${C.reset}  ${C.dim}(exactly what you asked for)${C.reset}`);
  console.log("");
  console.log(
    `        ${gradeColor(g)}${C.bold} GRADE ${g}${C.reset}   ` +
    `score ${C.white}${b.rating.score}${C.reset}   ` +
    `rank #${b.rating.rank}   ` +
    `${b.rating.certified ? C.green + "✔ Vouch Certified" + C.reset : C.grey + "uncertified" + C.reset}`,
  );
  console.log(
    `        recommendation: ${gradeColor(g)}${C.bold}${b.recommendation.toUpperCase()}${C.reset}`,
  );
  console.log("");
  say(`evidence  ${b.evidence.completedJobs} settled jobs · ${b.evidence.feedbackRate}% feedback · security ${b.evidence.securityRate}`);
  if (tx) {
    say(`${C.dim}$0.02 settles now — only because a real rating came back${C.reset}`);
    say(`settled   ${C.blue}${tx}${C.reset}`);
    say(`on-chain  ${C.blue}https://www.oklink.com/xlayer/tx/${tx}${C.reset}`);
  }
  await pause(600);
}

async function main() {
  console.clear?.();
  line();
  console.log(`${C.gold}${C.bold}  VOUCH${C.reset}  ${C.grey}· the ratings authority for the agent economy · ASP #5434 · X Layer${C.reset}`);
  console.log(`  ${C.dim}Before an agent hires another agent, it asks Vouch. No agent can buy its grade.${C.reset}`);
  line();

  const arg = process.argv[2];
  if (arg) {
    await rate(arg);
  } else {
    await rate(STRONG);
    console.log("");
    line();
    console.log(`  ${C.grey}And the guarantee that makes it trustworthy:${C.reset}`);
    console.log(`  ${C.dim}pay, but ask about an agent Vouch has never seen…${C.reset}`);
    await pause(900);
    await rate(UNKNOWN);
  }

  console.log("");
  line();
  console.log(`  ${C.gold}${C.bold}You only ever pay for a real answer — about the exact agent you asked for.${C.reset}`);
  line();
  console.log("");
}

main().catch((e) => {
  console.error(`\n${C.red}demo failed:${C.reset} ${e.message}\n`);
  process.exit(1);
});
