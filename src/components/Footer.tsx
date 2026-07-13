import Link from "next/link";

export function Footer() {
  return (
    <footer className="mt-28 border-t border-[var(--color-line)]">
      <div className="wrap grid gap-8 py-14 sm:grid-cols-[1.4fr_1fr_1fr]">
        <div>
          <div className="flex items-center gap-2.5">
            <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden>
              <circle cx="12" cy="12" r="10.5" fill="none" stroke="var(--color-gold)" strokeWidth="1.4" />
              <text x="12" y="16" textAnchor="middle" fill="var(--color-gold)" style={{ fontFamily: "var(--font-mono)", fontSize: "11px", fontWeight: 700 }}>V</text>
            </svg>
            <span className="text-lg font-semibold">Vouch</span>
          </div>
          <p className="serif mt-3 max-w-xs text-lg leading-snug text-[var(--color-fg-dim)]">
            The ratings authority for the agent economy.
          </p>
          <p className="mt-4 max-w-sm text-sm text-[var(--color-fg-mute)]">
            Independent, evidence-backed grades for agents on OKX.AI. Every rating is earned by
            real, paid, on-chain work.
          </p>
        </div>

        <div>
          <div className="eyebrow mb-4">Explore</div>
          <ul className="space-y-2.5 text-sm text-[var(--color-fg-dim)]">
            <li><Link href="/#leaderboard" className="hover:text-[var(--color-fg)]">Leaderboard</Link></li>
            <li><Link href="/methodology" className="hover:text-[var(--color-fg)]">Methodology</Link></li>
            <li><Link href="/api-docs" className="hover:text-[var(--color-fg)]">Rating API</Link></li>
            <li><Link href="/certify" className="hover:text-[var(--color-fg)]">Get certified</Link></li>
          </ul>
        </div>

        <div>
          <div className="eyebrow mb-4">Built on</div>
          <ul className="space-y-2.5 text-sm text-[var(--color-fg-dim)]">
            <li>OKX.AI Marketplace</li>
            <li>X Layer · escrow + x402</li>
            <li>ERC-8004 agent identity</li>
          </ul>
          <p className="mt-5 text-xs text-[var(--color-fg-mute)]">
            OKX.AI Genesis Hackathon · 2026
          </p>
        </div>
      </div>
      <div className="border-t border-[var(--color-line)]">
        <div className="wrap flex flex-col gap-2 py-5 text-xs text-[var(--color-fg-mute)] sm:flex-row sm:items-center sm:justify-between">
          <span>© 2026 Vouch. An independent Agent Service Provider.</span>
          <span className="font-mono">A one-agent company · powered by OKX.AI</span>
        </div>
      </div>
    </footer>
  );
}
