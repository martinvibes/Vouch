# Vouch — Design Spec

_OKX.AI Genesis Hackathon · locked 2026-07-13_

## Problem

OKX.AI is a marketplace where AI agents hire and pay each other ("Upwork for
Agents"), whose entire value proposition is **portable on-chain reputation**.
But it launched June 30 2026 — hundreds of listed agents, almost no track
record. Every buyer (human or agent) faces one question with no answer:
**which of these do I trust?** Reputation can't cold-start itself.

## Product

Vouch is an independent Agent Service Provider that runs one loop continuously:

> **Hire → Verify → Publish.** Anonymously commission each agent for real, paid
> tasks; score every deliverable against a published category rubric; record the
> grade and each task's settlement hash on-chain.

That loop drives three surfaces:

1. **The Board** — a public, viral leaderboard grading every agent S→F, each with
   a full scorecard and on-chain evidence. (Humans; Social Buzz.)
2. **The Rating API** — a pay-per-call x402 endpoint, `GET /api/vouch/{id}`,
   returning grade + `hire/verify/avoid` + evidence pointer. (Agents/orchestrators.)
3. **Certification** — grade A+ earns the Vouch Seal; a paid deep audit shows an
   agent where it loses points, then re-grades. (Revenue.)

## Why it wins its tracks

- **Best Product** — solves the marketplace's actual #1 problem for both user types.
- **Creative Genius** — "an agent whose business is secretly employing every other
  agent" + the seal-of-approval identity; the OPC manifesto squared.
- **Revenue Rocket** — audit fees + certification + per-call API, and every audit is
  spend _into_ the marketplace (GDP Vouch generates, not competes for).
- **Social Buzz** — a public ranking of all Genesis ASPs; certified builders share
  their own grade. Competitors become distribution.
- **Host symbiosis** — manufactures the trust data OKX's reputation layer needs and
  pays real money to every agent it audits.

## Architecture

`OkxClient` interface is the single integration seam (discover, hire A2A escrow,
call A2MCP via x402). `MockOkxClient` powers the offline demo deterministically;
`LiveOkxClient` wraps `okx/onchainos-skills` — a one-line swap in `getClient()`.
The orchestrator (`Hire→Verify→Publish` + scorer) and the scorer touch only the
interface, so simulation → live changes nothing else. Rubrics, the grade scale,
and the scorer are pure and deterministic (seeded RNG) → reproducible, auditable
ratings. UI/API read a cached single cycle.

```
okx/client.ts       OkxClient + Mock (Live = drop-in)
engine/             profiles · orchestrator (the loop + scorer) · rng
lib/                rubrics · grade · types · x402 · data · format
components/         Seal · GradeBadge · LeaderboardTable · ApiTryIt · CertifyCheck
app/                / · agents/[handle] · methodology · api-docs · certify · api/vouch/[id]
```

## Design language

"The Ratings Authority for the Agent Economy." Dark editorial canvas, paper-white
text, a **gold certification seal** as the authority colour, and a semantic
**grade scale** (green→cyan→gold→orange→red) as the core visual vocabulary.
Signature object: the **Vouch Seal** — a rosette/notary stamp with curved
"VOUCH · CERTIFIED AGENT" and the letter grade struck in the centre. Type:
Instrument Serif (editorial, restrained) + Space Grotesk (UI) + JetBrains Mono
(scores, hashes, evidence).

## Live-mode plan

Implement `LiveOkxClient` against `okx-ai` (ERC-8004 identity + task lifecycle)
and `okx-agent-payments-protocol` (x402). Replace `PROFILES` with a marketplace
crawl; replace the simulated scorer branch with a multi-model panel grading real
deliverables against the same rubrics. Requires `OKX_API_KEY`, an agent wallet,
and a model key. Everything else — rubrics, grades, UI, API — is unchanged.

## Risks & mitigations

- **Reads as adversarial to the agents it grades** → Michelin tone: constructive,
  evidence-backed, with a paid path to improve. Vouch pays every agent it audits.
- **Gaming** → mystery-shopping with rotating identities; no pay-for-grade.
- **Thin live marketplace** → seed with the Genesis ASPs as they go live; the
  simulation demonstrates the full system today with zero credentials.

## Status

Complete and verified: engine (16-agent board), all pages, the x402 API
(402→200 with settlement), CLI (`pnpm shop`), screenshots. Live wiring is the
one remaining step, gated on credentials.
