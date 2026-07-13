import Link from "next/link";
import type { AgentRating } from "@/lib/types";
import { CATEGORY_LABELS } from "@/lib/rubrics";
import { gradeColor } from "@/lib/grade";
import { GradeBadge } from "./GradeBadge";

function Trend({ value }: { value: number }) {
  const up = value >= 0;
  return (
    <span
      className="font-mono text-xs"
      style={{ color: up ? "var(--color-grade-a)" : "var(--color-grade-f)" }}
      title="Change since last audit cycle"
    >
      {up ? "▲" : "▼"} {Math.abs(value).toFixed(1)}
    </span>
  );
}

function ScoreBar({ score, grade }: { score: number; grade: AgentRating["grade"] }) {
  return (
    <div className="flex items-center gap-2.5">
      <div className="h-1.5 w-24 overflow-hidden rounded-full bg-[var(--color-line)]">
        <div
          className="h-full rounded-full"
          style={{ width: `${score}%`, background: gradeColor(grade) }}
        />
      </div>
      <span className="font-mono text-sm tabular-nums text-[var(--color-fg-dim)]">{score}</span>
    </div>
  );
}

/**
 * The ranked board — the product's centrepiece and its viral artifact. Rank is
 * a true ordering, so the leading numeral carries real information.
 */
export function LeaderboardTable({ ratings }: { ratings: AgentRating[] }) {
  return (
    <div className="panel-flat overflow-hidden">
      {/* Column header — hidden on small screens */}
      <div className="hidden grid-cols-[48px_1fr_150px_130px_120px_70px] items-center gap-4 border-b border-[var(--color-line)] px-5 py-3 text-[0.7rem] uppercase tracking-[0.15em] text-[var(--color-fg-mute)] md:grid">
        <span>#</span>
        <span>Agent</span>
        <span>Score</span>
        <span>Price</span>
        <span>Reliability</span>
        <span className="text-right">Grade</span>
      </div>

      <ul>
        {ratings.map((r) => (
          <li key={r.id} className="border-b border-[var(--color-line)] last:border-0">
            <Link
              href={`/agents/${r.handle}`}
              className="group grid grid-cols-[36px_1fr_auto] items-center gap-3 px-4 py-4 transition-colors hover:bg-[rgba(230,178,60,0.04)] md:grid-cols-[48px_1fr_150px_130px_120px_70px] md:gap-4 md:px-5"
            >
              {/* Rank */}
              <span className="font-mono text-lg tabular-nums text-[var(--color-fg-mute)] group-hover:text-[var(--color-gold)]">
                {r.rank}
              </span>

              {/* Agent identity */}
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="truncate font-semibold">{r.name}</span>
                  {r.certified && (
                    <span className="hidden shrink-0 text-[var(--color-gold)] sm:inline" title="Vouch Certified">✶</span>
                  )}
                </div>
                <div className="mt-0.5 flex items-center gap-2 text-xs text-[var(--color-fg-mute)]">
                  <span className="rounded bg-[var(--color-line)] px-1.5 py-0.5 text-[0.68rem]">
                    {CATEGORY_LABELS[r.category]}
                  </span>
                  <span className="font-mono">{r.serviceType}</span>
                  {/* Score inline on mobile */}
                  <span className="font-mono md:hidden">· {r.score}/100</span>
                </div>
              </div>

              {/* Score bar (md+) */}
              <div className="hidden md:block">
                <ScoreBar score={r.score} grade={r.grade} />
              </div>

              {/* Price (md+) */}
              <span className="hidden font-mono text-sm text-[var(--color-fg-dim)] md:block">
                {r.priceModel}
              </span>

              {/* Reliability (md+) */}
              <div className="hidden items-center gap-2 md:flex">
                <span className="font-mono text-sm tabular-nums">{r.reliability}%</span>
                <Trend value={r.trend} />
              </div>

              {/* Grade */}
              <div className="justify-self-end">
                <GradeBadge grade={r.grade} size="md" />
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
