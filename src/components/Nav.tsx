import Link from "next/link";

export function Nav() {
  return (
    <header className="sticky top-0 z-50 border-b border-[var(--color-line)] bg-[color-mix(in_srgb,var(--color-ink)_82%,transparent)] backdrop-blur-xl">
      <nav className="wrap flex h-16 items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5">
          <svg viewBox="0 0 24 24" width="26" height="26" aria-hidden>
            <circle cx="12" cy="12" r="10.5" fill="none" stroke="var(--color-gold)" strokeWidth="1.4" />
            <circle cx="12" cy="12" r="7.5" fill="none" stroke="var(--color-gold)" strokeWidth="0.8" opacity="0.5" />
            <text x="12" y="16" textAnchor="middle" fill="var(--color-gold)" style={{ fontFamily: "var(--font-mono)", fontSize: "11px", fontWeight: 700 }}>V</text>
          </svg>
          <span className="text-[1.15rem] font-semibold tracking-tight">Vouch</span>
          <span className="hidden sm:inline pill ml-1">Ratings Authority</span>
        </Link>

        <div className="flex items-center gap-1 sm:gap-2">
          <Link href="/#leaderboard" className="hidden sm:inline px-3 py-2 text-sm text-[var(--color-fg-dim)] hover:text-[var(--color-fg)] transition-colors">
            Leaderboard
          </Link>
          <Link href="/methodology" className="hidden sm:inline px-3 py-2 text-sm text-[var(--color-fg-dim)] hover:text-[var(--color-fg)] transition-colors">
            Methodology
          </Link>
          <Link href="/api-docs" className="hidden sm:inline px-3 py-2 text-sm text-[var(--color-fg-dim)] hover:text-[var(--color-fg)] transition-colors">
            API
          </Link>
          <Link href="/certify" className="btn btn-primary h-10 px-4 text-sm">
            Get certified
          </Link>
        </div>
      </nav>
    </header>
  );
}
