import Link from "next/link";
import { ThemeToggle } from "./ThemeToggle";

/** The little rosette mark used as the wordmark glyph. */
function Mark({ size = 28 }: { size?: number }) {
  const teeth = Array.from({ length: 28 }, (_, i) => {
    const a = (i / 28) * Math.PI * 2;
    return (
      <line
        key={i}
        x1={12 + 9 * Math.cos(a)}
        y1={12 + 9 * Math.sin(a)}
        x2={12 + 11 * Math.cos(a)}
        y2={12 + 11 * Math.sin(a)}
        stroke="var(--gold)"
        strokeWidth={i % 7 === 0 ? 1.8 : 1}
        strokeLinecap="round"
      />
    );
  });
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden>
      {teeth}
      <circle cx="12" cy="12" r="8" fill="none" stroke="var(--gold)" strokeWidth="1" opacity="0.6" />
      <text
        x="12"
        y="15.5"
        textAnchor="middle"
        fill="var(--gold-3)"
        style={{ fontFamily: "var(--font-display)", fontSize: "11px", fontWeight: 800 }}
      >
        V
      </text>
    </svg>
  );
}

export function Nav() {
  return (
    <header className="sticky top-0 z-50 border-b border-line bg-[color-mix(in_srgb,var(--bg)_80%,transparent)] backdrop-blur-xl">
      <nav className="wrap flex h-16 items-center justify-between gap-4">
        <Link href="/" className="group flex items-center gap-2.5">
          <span className="transition-transform group-hover:rotate-[18deg]">
            <Mark />
          </span>
          <span className="font-display text-[1.15rem] font-extrabold tracking-tight">Vouch</span>
          <span className="pill ml-1 hidden sm:inline-flex">Ratings Authority</span>
        </Link>

        <div className="flex items-center gap-1 sm:gap-1.5">
          <Link href="/#board" className="hidden px-3 py-2 text-sm text-ink-soft transition-colors hover:text-ink sm:inline">
            Leaderboard
          </Link>
          <Link href="/methodology" className="hidden px-3 py-2 text-sm text-ink-soft transition-colors hover:text-ink sm:inline">
            Methodology
          </Link>
          <Link href="/guard" className="hidden px-3 py-2 text-sm text-ink-soft transition-colors hover:text-ink sm:inline">
            Guard
          </Link>
          <Link href="/api-docs" className="hidden px-3 py-2 text-sm text-ink-soft transition-colors hover:text-ink sm:inline">
            API
          </Link>
          <ThemeToggle />
          <Link href="/certify" className="btn btn-primary h-10 px-4 text-sm">
            Get certified
          </Link>
        </div>
      </nav>
    </header>
  );
}
