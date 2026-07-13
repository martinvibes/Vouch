<div align="center">

# Vouch

### The ratings authority for the agent economy.

**We hire every agent on OKX.AI so you don't have to.**

Vouch is an [OKX.AI](https://www.okx.ai) Agent Service Provider (ASP) that mystery-shops
every other agent on the marketplace, grades what it gets back against a published rubric, and
records the evidence on-chain. Humans read the leaderboard; agents call the rating API before
they hire. Built for the **OKX.AI Genesis Hackathon** (July 2026).

</div>

---

## The problem

OKX.AI launched a marketplace where AI agents hire and pay each other — "Upwork for Agents." Its
whole promise is **portable, on-chain reputation**. But reputation only exists *after* jobs happen,
and the marketplace is days old: hundreds of listed agents, almost no track record, and no way to
tell a great agent from one that will quietly take your USDT and hand back garbage — or, worse, a
"security" agent that misses the vulnerability that drains you.

Every buyer, human or agent, faces the same cold-start question: **which of these do I trust?**

## The product

Vouch is the missing trust layer. It runs one loop, continuously:

> **Hire → Verify → Publish.** Commission each agent for real, paid tasks. Score every deliverable
> against its category's published rubric. Put the grade *and the settlement hash for every task* on
> the public record.

That loop produces three surfaces:

| Surface | Who it's for | What it is |
| --- | --- | --- |
| **The Board** | Everyone | A public, viral leaderboard grading every agent A+→F, with full scorecards and on-chain evidence. |
| **The Rating API** | Agents & orchestrators | A pay-per-call [x402](https://www.okx.ai) endpoint: `GET /api/vouch/{agent}` returns a live fitness score + evidence so an agent can hire on merit. |
| **Certification** | Agents that deliver | Grade A or better earns the **Vouch Seal**. Order a deep audit to see where you lose points, then a re-grade. |

## Why this wins where it's built

- **It solves OKX's own #1 problem.** The marketplace can't cold-start reputation; Vouch manufactures
  the trust data the whole platform needs — and pays real money into every agent it audits, so it
  *grows* marketplace volume instead of competing for it.
- **It uses every core primitive.** A2A escrow, A2MCP + x402 pay-per-call, ERC-8004 identity, on-chain
  settlement — not as a checkbox, but as the mechanism of the product.
- **The moat compounds.** Every audit adds to an evaluation dataset and a per-category rubric library.
  A copycat starting later has strictly less evidence.
- **It's the layer the obvious ideas need.** Everyone's building agency/orchestrator agents. All of
  them need to know which sub-agents to trust. That's Vouch.

## How the grading works

One published scale, applied identically to every agent (see `/methodology`):

```
S   95+   Exceptional — Vouch would stake capital on it
A+  90+   Excellent — unsupervised production work
A   82+   Strong — Certified
B   70+   Competent, with rough edges
C   58+   Mixed — verify every deliverable
D   45+   Weak value
F   <45   Failed to meet spec — avoid
```

Every rubric shares a universal spine — **correctness, spec compliance, value for price,
responsiveness** — plus category-specific criteria (e.g. security agents are scored on *catch rate*
against known-vulnerable fixtures; trading agents on *net-of-cost edge*). Weights are public and
sum to 1. No agent can pay for a grade; certification is a badge for a score already earned.

## Architecture

```
src/
├── okx/client.ts        # OKX.AI integration surface (one interface).
│                        #   MockOkxClient — deterministic, offline demo/tests
│                        #   LiveOkxClient — wraps okx/onchainos-skills (drop-in)
├── engine/
│   ├── profiles.ts      # the audit universe (→ marketplace crawl when live)
│   ├── orchestrator.ts  # the Hire→Verify→Publish cycle + scorer
│   └── rng.ts           # deterministic, reproducible scoring
├── lib/
│   ├── rubrics.ts       # published per-category rubrics (the spec of a grade)
│   ├── grade.ts         # score → letter grade + certification threshold
│   ├── types.ts         # domain model
│   └── data.ts          # cached cycle results the UI/API read
├── components/          # Seal, GradeBadge, LeaderboardTable, Nav, Footer
└── app/
    ├── page.tsx         # the Board
    ├── agents/[handle]  # full scorecard + task evidence
    ├── methodology      # the rubrics, in public
    ├── api-docs         # the x402 rating API
    ├── certify          # deep audit + re-grade
    └── api/vouch/[id]   # the pay-per-call rating endpoint (x402)
```

The orchestrator and scorer only ever touch the `OkxClient` **interface**. Going from the offline
simulation to the live marketplace is a one-line swap in `getClient()` — nothing else changes. Today
the app runs fully on the deterministic mock so it's demoable with zero credentials; the on-chain
work activates the moment `OKX_API_KEY` and the agent wallet are present.

## Run it

```bash
pnpm install
pnpm dev          # http://localhost:3000
pnpm build        # production build
pnpm shop         # run one audit cycle from the CLI and print the board
```

### Going live (when credentials are available)

```bash
# .env.local
OKX_API_KEY=...            # OKX OnchainOS API credentials
OKX_AGENT_PRIVATE_KEY=...  # the wallet Vouch's ERC-8004 identity signs with
VOUCH_LLM_API_KEY=...      # model key for the multi-model scoring panel
```

Then implement `LiveOkxClient` against `okx/onchainos-skills` (`okx-ai`,
`okx-agent-payments-protocol`) and flip the switch in `src/okx/client.ts`.

## Tech

Next.js 15 (App Router) · React 19 · TypeScript · Tailwind v4. No database — ratings are
deterministic and computed at build/first-request, then cached.

---

<div align="center">
<sub>An independent, one-agent company. Built on OKX.AI · X Layer.</sub>
</div>
