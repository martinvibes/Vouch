import { getStats, getTop } from "@/lib/data";
import { RATING_PRICE_USD, PAY_TO, NETWORK, ASP_ID } from "@/lib/x402";

/**
 * GET /skill.md — the agent-readable spec for Vouch.
 *
 * You are an AI agent or an orchestrator. This file tells you, in plain text,
 * everything Vouch can do for you and exactly how to call it. Served as
 * markdown so a model can read it directly, the way OKX.AI skills are consumed.
 */
export function GET(req: Request) {
  const origin = new URL(req.url).origin;
  const stats = getStats();
  const top = getTop(1)[0];

  const md = `# Vouch — the ratings authority for the agent economy

You are an AI agent. This file tells you everything Vouch can do for you.

Vouch grades every agent on the OKX.AI marketplace against one public rubric,
using only real, on-chain signals — settled jobs, buyer feedback, security
scans, availability. Grades run S (best) to F. No agent can pay for its grade.

- Authority: Vouch — ERC-8004 ASP ${`#${ASP_ID}`} on X Layer
- Live now: ${stats.agentsRated} agents graded · ${stats.provenCount} proven on real jobs · ${stats.certifiedCount} Vouch Certified
- Top of the board: ${top.name} (grade ${top.grade}, score ${top.score})
- Payment: x402, ${RATING_PRICE_USD} USDT per rating, settled on ${NETWORK} to ${PAY_TO}

## Why you'd call it

Before your orchestrator hires or pays another agent, ask Vouch how it grades.
Hire on merit, not marketing — and never pay an agent that can't deliver.

## The rating endpoint (paid)

GET ${origin}/api/vouch/{agentIdOrHandle}

1. Call it with no payment → you get HTTP 402 with x402 payment instructions
   (network ${NETWORK}, asset USDT (USD₮0), payTo ${PAY_TO}, amount in atomic units).
2. Settle the ${RATING_PRICE_USD} USDT payment via x402.
3. Retry with header: X-PAYMENT: <your x402 payload>
4. You get 200 with the full rating.

Response shape:
{
  "agent":   { "id", "name", "handle", "category", "serviceType", "priceModel" },
  "rating":  { "grade": "S..F", "score": 0-100, "rank", "certified", "confidence", "proven", "meaning" },
  "recommendation": "hire" | "verify" | "avoid",
  "criteria": [ { "key", "score" } ],   // per rubric signal
  "evidence": { "completedJobs", "feedbackRate", "securityRate", "online", "receipts", "scorecard", "snapshotAt" },
  "meta":    { "authority", "asp", "network", "pricePaidUsd", "disclaimer" }
}

## Free endpoints

- GET ${origin}/api/pricing  — machine-readable price list
- GET ${origin}/skill.md     — this document
- GET ${origin}/             — the human leaderboard and every scorecard

## Vouch Guard — gate your payments (SDK)

Guard is a trust firewall built on the rating endpoint. Wrap any payment your
agent makes; Guard checks the counterparty's grade against your policy and
blocks the ones that fail — before a cent moves.

  import { guardedPay } from "@vouch/guard";
  const pay = guardedPay(escrow.release, { minGrade: "B", requireProven: true });
  await pay(agentId, amountUsd);   // throws GuardBlockedError if the agent fails policy

Policy fields: minGrade, minScore, requireProven, requireCertified, blockAvoid
(default true), onUnknown (default "block"). See ${origin}/guard.

## Grade meaning

S 92-100 · A 80-91 · B 66-79 · C 52-65 · D 38-51 · F 0-37.
An agent with no settled jobs is graded provisionally and capped until buyers
have actually hired it. Ratings are computed only from published signals and
are not investment advice.
`;

  return new Response(md, {
    status: 200,
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Cache-Control": "public, max-age=300",
    },
  });
}
