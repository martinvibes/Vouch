# Vouch — Demo Kit

Everything to shoot the required ≤90s #OKXAI demo and post the launch thread.

## 90-second video script

**[0:00–0:10] The hook.** Land on the homepage. Read the headline aloud:
> "OKX.AI has hundreds of agents and no way to know which to trust. So we built the ratings authority. We hire every agent — and grade it."

Let the gold seal stamp down on the current #1.

**[0:10–0:30] The Board.** Scroll the leaderboard slowly, top to bottom.
> "Every agent, mystery-shopped with real paid work, graded S to F on a published rubric. CertiK Sentinel earns an S. Watch what happens at the bottom."

Stop on the F grades.

**[0:30–0:55] The cautionary tale.** Click **AuditBot Zero** (grade F).
> "AuditBot Zero is the cheapest security agent on the marketplace. Here's why that's dangerous: catch rate — seven out of a hundred. It misses the vulnerabilities that drain you. And here's the proof — every task we paid for, on-chain, with the settlement hash."

Scroll the evidence receipts.

**[0:55–1:20] The machine layer.** Go to **API**. Click **Send (no payment)** →
402. Then **Pay $0.02 & retry** → 200 with the rating JSON.
> "The leaderboard is for humans. This is for the agents doing the hiring. One x402 call, two cents, and your orchestrator gets a grade, a hire-or-avoid verdict, and the evidence — before it spends a dollar on a bad agent."

**[1:20–1:30] The close.** Back to the seal.
> "Vouch. The ratings authority for the agent economy. One agent. It employs all the others."

## Shot list / B-roll
- Homepage seal stamp-down (reload to re-trigger the animation).
- Leaderboard green→red gradient scroll.
- AuditBot Zero scorecard: catch-rate bar + red flags + tx receipt.
- API try-it: the 402 → 200 flip on screen.
- `pnpm shop` in a terminal for a "the engine is real" cutaway.

## X launch thread (#OKXAI)

**1/**
OKX.AI has hundreds of agents and no way to tell the good from the dangerous.

So we built the ratings authority for the agent economy.

Vouch hires every agent on the marketplace — and grades it. 🧵 #OKXAI

**2/**
One loop: Hire → Verify → Publish.

We mystery-shop each agent with real, paid work, score it against a published
rubric, and put the grade *and every task's on-chain settlement hash* on the
public record.

No agent can pay for its grade.

**3/**
The result: a live leaderboard, S to F.

CertiK Sentinel earns an S.
AuditBot Zero — the cheapest "security" agent — earns an F, catching 7% of the
vulnerabilities it's paid to find.

That's the difference between a review and a receipt.

**4/**
The leaderboard is for humans. The API is for the agents doing the hiring.

`GET /api/vouch/{agent}` → pay $0.02 over x402 → get a grade, a hire/verify/avoid
call, and a link to the evidence. Your orchestrator checks the reference before
it spends a cent.

**5/**
Every dollar Vouch spends auditing is volume *into* the marketplace — we grow
OKX.AI, we don't compete with it.

One agent. It employs all the others.

Vouch → [link]
Built on @okx X Layer · escrow + x402 · ERC-8004 #OKXAI

## Local recording setup

```bash
pnpm build && pnpm start     # or: pnpm dev
# open http://localhost:3000, record at 1440-wide for crisp capture
```
