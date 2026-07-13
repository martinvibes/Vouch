# Vouch — Go-Live Guide

How to get the three credentials that switch Vouch from the offline demo to the
live OKX.AI marketplace. Nothing here is needed to run or record the demo — the
app is fully functional on the deterministic mock.

> **You never paste secrets to anyone.** Put every value in `.env.local` (which
> is gitignored). The code reads them from the environment; the actual strings
> only ever live on your machine and in your deploy host's secret manager.

**Time:** ~30–45 min. **Cost:** ~$25–60 (a small stablecoin float + gas).
**Recommended order:** model key → Agentic Wallet → Dev Portal key → fund wallet.

---

## 1. OKX Onchain OS API credentials

These let Vouch's backend call OKX's Onchain OS REST APIs (wallet, market data,
payments). You get four values: **Project ID, API Key, Secret Key, Passphrase.**

1. Go to the **OKX Web3 Developer Portal**: <https://web3.okx.com/dev-portal>
   (also reachable from web3.okx.com/onchainos → "Dev Portal").
2. Sign in with your OKX account (or connect a wallet) and complete any
   verification it asks for.
3. Click **Create new project**, name it `vouch`, submit → you now have a
   **Project ID**.
4. Open the project, click **Manage**, then **Create API key**.
5. Enter a key **name** and a **Passphrase** (make one up — save it; it cannot be
   recovered). Confirm.
6. Copy the three secrets shown: **API Key**, **Secret Key**, **Passphrase**.
7. If the portal offers an **IP allowlist**, add your machine's IP (and your
   deploy host's) or leave open while testing. Enable the Wallet / DEX / Payments
   API scopes if it asks which to turn on.
8. Put them in `.env.local`:
   ```
   OKX_PROJECT_ID=...
   OKX_API_KEY=...
   OKX_SECRET_KEY=...
   OKX_PASSPHRASE=...
   ```

---

## 2. Vouch's on-chain agent wallet (X Layer)

This wallet **is** Vouch's identity: it hires agents, pays them, and earns the
reputation. Two ways to get one — pick **A** for the marketplace-native path.

### Path A — OKX Agentic Wallet (recommended)

1. Go to <https://www.okx.ai> and **log in with email**. An Agentic Wallet is
   created instantly — no seed phrase. Its keys are held in a **TEE**: the agent
   can pay, but the raw private key is never exported (this is the secure,
   intended design).
2. This same login is where you'll **register Vouch as an ASP** and get its
   **ERC-8004 agent identity** — so do it here regardless.
3. Copy the wallet's **deposit address** (for funding, step below) and the
   **agent session token** the dashboard/skill gives you:
   ```
   OKX_AGENT_SESSION=...
   ```

### Path B — self-custodial hot wallet (only if you want to sign x402 yourself)

1. Install MetaMask and **create a brand-new account** used for nothing else.
   ⚠️ Never use a wallet that holds your real funds.
2. Add **X Layer**: easiest via <https://chainlist.org> (search "X Layer",
   connect, Add). Manual details if needed:
   - Network name: `X Layer` · **Chain ID: `196`**
   - RPC: `https://rpc.xlayer.tech` (backup `https://xlayerrpc.okx.com`)
   - Currency symbol: **`OKB`** (gas is paid in OKB, not ETH)
   - Explorer: `https://web3.okx.com/explorer/xlayer`
3. Export that account's private key (MetaMask → Account details → Show private
   key) and put it in `.env.local`:
   ```
   OKX_AGENT_PRIVATE_KEY=0x...
   ```

### Fund the wallet (either path)

Vouch needs **OKB for gas** + a **stablecoin float** to hire agents.

- **Easiest:** on the OKX exchange, buy OKB and USDC, then **Withdraw** each to
  your wallet address choosing the **X Layer** network. Since X Layer is OKX's
  own chain, withdrawals are fast and cheap.
- **Or bridge** from another chain via the OKX bridge or Rhino.fi.
- **Start small:** ~$25–50 USDC (or USDG) + a couple dollars of OKB for gas.

Official X Layer token addresses (already wired into `src/lib/x402.ts`):

| Token | Address | Decimals |
| --- | --- | --- |
| USDC | `0x74b7F16337b8972027F6196A17a631aC6dE26d22` | 6 |
| USDG | `0x4ae46a509F6b1D9056937BA4500cb143933D2dc8` | 6 |
| WOKB | `0xe538905cf8410324e03A5A23C1c177a474D59b2b` | 18 |
| OKB (gas) | native | 18 |

---

## 3. Model API key (the scoring panel)

Grades real deliverables with an LLM panel.

- **Anthropic (recommended):** <https://console.anthropic.com> → **API Keys** →
  **Create Key**. Add a payment method under Billing. Vouch will default to a
  current Claude model.
- **OpenAI (alternative):** <https://platform.openai.com/api-keys> → **Create new
  secret key**.
- Put it in `.env.local`:
  ```
  VOUCH_LLM_API_KEY=...
  ```

---

## 4. Hand it back to the build

1. `cp .env.example .env.local` and fill in what you gathered.
2. Tell the assistant it's set. It will implement `LiveOkxClient` against
   `okx/onchainos-skills` (`okx-ai` + `okx-agent-payments-protocol`) and flip the
   switch in `src/okx/client.ts` — no other code changes.
3. Separately, still on <https://www.okx.ai>: **submit Vouch's ASP listing for
   review** (≈24h) so it's live and hackathon-eligible. Ask the assistant for the
   listing copy — it's ready to generate.

---

### Which credential unlocks what

| Credential | Without it | With it |
| --- | --- | --- |
| Onchain OS API key | mock marketplace | real agent discovery + data |
| Agent wallet + float | simulated hires | real A2A/x402 payments on X Layer |
| Model key | seeded scores | real multi-model grading of deliverables |
