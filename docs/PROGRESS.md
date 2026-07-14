# Vouch — build worklog

Living doc so any session can pick up exactly where the last one stopped. Newest
entries at the top. Cross-session memory of record also lives in Claude's memory
(`okx-ai-genesis-hackathon.md`); this is the human-readable mirror in the repo.

**What Vouch is:** the credit rating / ratings authority for the agent economy.
Grades all 277 real OKX.AI marketplace agents from published on-chain signals
(S–F), publishes a public leaderboard, sells a pay-per-call x402 rating API, and
ships **Vouch Guard** — a trust firewall that gates agent payments on those
grades.

**Live:** https://vouch-aufgabe.vercel.app (Vercel `aufgabe/vouch`, auto-deploys
on push to `master`). Repo: https://github.com/martinvibes/Vouch (`master`).
Local: `/Users/admin/.pg/Vouch`. Stack: Next.js 15 App Router, React 19, TS,
Tailwind v4, pnpm.

**On-chain:** Vouch = ERC-8004 ASP **#5434** on X Layer (chainId 196), wallet
`0x6f1b837d7c27f62e4b1bc72a41d02118e30e9af1`. Service #33353 "Agent Trust Rating"
(A2MCP x402, $0.02) → endpoint `/api/vouch/onchain-data-explorer`. Status:
**Listing under review** (submitted 2026-07-14). Deadline: hackathon closes
**July 17 2026**; 90s #OKXAI demo video + Google Form still to do.

---

## Ops cheat-sheet (things that bite)

- **OKX CLI needs a VPN on.** Home network SNI-blocks `web3.okx.com` (curl → 000
  off-VPN, 200 on-VPN). Nothing OKX-side works without it.
- **`okx-a2a` needs Node ≥22.13.** Default is v20.20.2 (fails). Run
  `export NVM_DIR="$HOME/.nvm"; . "$NVM_DIR/nvm.sh"; nvm use 22.22.1` first.
- Before any `onchainos agent update/activate`: `okx-a2a doctor --fix` (starts the
  local A2A daemon).
- Redeploy = `git push origin master` (Vercel auto-builds). Verify with a new
  route returning 200 on the prod URL.
- Never paste secrets in chat; they live in `.env.local` (gitignored). The creds
  pasted during setup should be **rotated post-hackathon**.
- Heavy `grep -oE` over OKX's minified HTML/JS bundles hangs the shell — probe
  with `curl --max-time` + targeted `node` instead.

## Key facts learned

- Every rated agent's OKX page = `https://www.okx.ai/agents/{agentId}`, and our
  snapshot `id` **is** the OKX agentId (Onchain Data Explorer = 2023, CertiK =
  1965). Vouch's own = `/agents/5434` (404s until the listing is approved).
- Rating engine: 6-signal rubric (traction .24 / reliability .22 / security .20 /
  service .16 / availability .08 / transparency .10) + honesty caps. `soldCount`
  (log-scaled) is the real discriminator. Distribution S:6 A:38 B:60 C:68 D:101 F:4.

---

## Log

### 2026-07-14 — UX round (in progress)
Requested by Martin: (1) add OKX deep links to the app; (2) fix leaderboard
"show more" endless-scroll; (3) reconcept the Guard page (he didn't like it);
(4) overall polish; (5) keep this worklog.
- [in progress] real OKX deep links, leaderboard pagination, Guard → "Policy
  Studio" reconcept, verify + redeploy.

### 2026-07-14 — Submitted for review ✅
- Added agent-discoverable `GET /skill.md` + `GET /api/pricing`; "Discover it
  first" section on /api-docs.
- Repointed service #33353 from dead `/api/vouch/arbhawk` (404s in new build) to
  `/api/vouch/onchain-data-explorer` (update txHash `0x7b3b2d1f…`); ran
  `activate` → status **Listing under review**.
- Committed full rebuild (commit `1069652`) + pushed → prod verified live.

### 2026-07-13 — Rebuild + Vouch Guard
- De-mocked entirely (deleted mock engine); graded 277 real agents.
- New "Trust Stamp" design system, light+dark, interactive leaderboard, real x402
  rating API to the real ASP wallet.
- Built Vouch Guard SDK (`src/guard`) + `/guard` demo (CDP-verified: blocks the
  F/D agents, "$245 prevented").
