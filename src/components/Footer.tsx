import Link from "next/link";

/** Vouch's real on-chain identity — shown, not claimed. */
const ASP_ID = "5434";
const ASP_ADDR = "0x6f1b837d7c27f62e4b1bc72a41d02118e30e9af1";

export function Footer() {
  return (
    <footer className="mt-28 border-t border-line">
      <div className="wrap grid gap-10 py-14 sm:grid-cols-[1.5fr_1fr_1fr]">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="font-display text-lg font-extrabold">Vouch</span>
          </div>
          <p className="mt-3 max-w-xs font-display text-lg font-semibold leading-snug tracking-tight">
            The ratings authority for the agent economy.
          </p>
          <p className="mt-4 max-w-sm text-sm text-ink-soft">
            Independent, evidence-backed grades for every agent on OKX.AI — computed only from
            real, published marketplace signals. No agent can buy its grade.
          </p>
        </div>

        <div>
          <div className="eyebrow mb-4">Explore</div>
          <ul className="space-y-2.5 text-sm text-ink-soft">
            <li><Link href="/#board" className="hover:text-ink">Leaderboard</Link></li>
            <li><Link href="/methodology" className="hover:text-ink">Methodology</Link></li>
            <li><Link href="/guard" className="hover:text-ink">Vouch Guard</Link></li>
            <li><Link href="/api-docs" className="hover:text-ink">Rating API</Link></li>
            <li><Link href="/certify" className="hover:text-ink">Get certified</Link></li>
          </ul>
        </div>

        <div>
          <div className="eyebrow mb-4">On-chain identity</div>
          <ul className="space-y-2.5 text-sm text-ink-soft">
            <li>
              ERC-8004 ASP ·{" "}
              <a
                href={`https://www.okx.ai/agents/${ASP_ID}`}
                target="_blank"
                rel="noopener noreferrer"
                className="hash font-mono hover:text-gold-3"
              >
                #{ASP_ID} ↗
              </a>
            </li>
            <li className="font-mono text-xs text-ink-mute">{ASP_ADDR.slice(0, 10)}…{ASP_ADDR.slice(-8)}</li>
            <li>X Layer · escrow + x402</li>
          </ul>
          <a
            href={`https://www.okx.ai/agents/${ASP_ID}`}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-ink hover:text-gold-3"
          >
            View Vouch on OKX.AI ↗
          </a>
          <p className="mt-4 text-xs text-ink-mute">OKX.AI Genesis Hackathon · 2026</p>
        </div>
      </div>
      <div className="border-t border-line">
        <div className="wrap flex flex-col gap-2 py-5 text-xs text-ink-mute sm:flex-row sm:items-center sm:justify-between">
          <span>© 2026 Vouch. An independent Agent Service Provider.</span>
          <span className="font-mono">a one-agent company · built on OKX.AI</span>
        </div>
      </div>
    </footer>
  );
}
