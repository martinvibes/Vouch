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

### 2026-07-14 — /methodology reconceived as a live instrument ✅
Requested by Martin: "change the concept of everything ... the whole /methodology
page" — not tweaks. New concept: **the methodology as an instrument you drive**,
not a document you read.
- **Extracted the scorer** to `src/engine/score.ts` (`scoreSignals(input)`) — now
  the ONE home for the grading math. `rate.ts` calls it; the methodology grader
  calls the *same* function, so what visitors play with literally grades the
  board. Verified distribution byte-for-byte unchanged: **S:6 A:38 B:60 C:68
  D:101 F:4**, 44 certified, 107 proven.
- **`src/components/MethodologyGrader.tsx`** (new client instrument): dial the six
  signals (log-scaled settled-jobs slider, feedback/security toggles+sliders,
  online, service/profile/priced/endpoint/avatar/identity/xlayer) → live Seal +
  grade + score, per-signal "points earned / ceiling" bars (teaches the weighting
  — traction leads), and an **honesty-cap rail** that highlights the binding cap.
  Signature moment: the "blend NN ⟶ capped NN" readout. Presets load 4 REAL board
  agents (S/B/D/F) + a blank slate; each reproduces its exact board grade.
- **`/methodology` page** rebuilt around it: hero "Don't take our word for it —
  run the engine", instrument as centerpiece, then tightened reference (weight
  grid, grade scale, three rules, snapshot).
- **CDP-verified** light + dark + mobile(390, no overflow): load S → toggle Buyer
  feedback OFF → blend 86 clamps to 74, grade **S→B**, "Unproven — capped at B"
  shown BINDING. `next build` green (methodology 5.88 kB), tsc clean.

### 2026-07-14 — UX round ✅ (commit d2fca7d, live on prod)
Requested by Martin: OKX deep links, fix leaderboard endless-scroll, reconcept
Guard, polish, keep this worklog. All done + CDP-verified + deployed:
- **OKX deep links:** `okxUrl` → `www.okx.ai/agents/{id}`; on scorecards ("View
  on OKX.AI" button + on-chain #id link), home hero ("live ASP on OKX.AI") + top
  agent, footer ("View Vouch on OKX.AI" → #5434).
- **Leaderboard:** endless "show more" → pagination (20/page, windowed controls,
  scroll-into-view). Page stays compact.
- **Guard reconcept → "Policy Studio":** author one policy, watch it govern the
  whole live 277-agent market (CDP-verified: B floor→104 clear / S→6 / certified
  →44), "now blocking even these busy agents" chips, live-generated `guardedPay`
  code, real-API live-fire run ($180 paid / $245 blocked). Retired GuardDemo.

### NEXT (not started): 90s #OKXAI demo video + Google Form (deadline Jul 17).
Guard Policy Studio is the hero shot — set floor to A, watch the market bar
collapse + a payment get blocked live. Also: wait on ASP #5434 review (~24h from
2026-07-14 submit) → if approved, agent goes listable.

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
