"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { AgentAvatar } from "./AgentAvatar";
import { GradeBadge } from "./GradeBadge";
import type { Category, GradeLetter } from "@/lib/types";

/** The trimmed, serializable row the board renders. Built server-side. */
export interface LeaderRow {
  id: string;
  name: string;
  handle: string;
  category: Category;
  categoryLabel: string;
  serviceType: string;
  score: number;
  grade: GradeLetter;
  rank: number;
  proven: boolean;
  certified: boolean;
  reliability: number;
  soldCount: number | null;
  online: boolean;
  priceModel: string;
  avatarUrl: string | null;
}

const PAGE = 40;

function demand(row: LeaderRow): string {
  if (row.soldCount && row.soldCount > 0) {
    return `${row.soldCount.toLocaleString("en-US")} job${row.soldCount === 1 ? "" : "s"}`;
  }
  return "Unproven";
}

export function Leaderboard({
  rows,
  categories,
}: {
  rows: LeaderRow[];
  categories: { value: Category | "all"; label: string }[];
}) {
  const [query, setQuery] = useState("");
  const [cat, setCat] = useState<Category | "all">("all");
  const [provenOnly, setProvenOnly] = useState(false);
  const [visible, setVisible] = useState(PAGE);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((r) => {
      if (cat !== "all" && r.category !== cat) return false;
      if (provenOnly && !r.proven) return false;
      if (q && !(`${r.name} ${r.categoryLabel} ${r.serviceType}`.toLowerCase().includes(q))) return false;
      return true;
    });
  }, [rows, query, cat, provenOnly]);

  const shown = filtered.slice(0, visible);

  function reset(next: () => void) {
    next();
    setVisible(PAGE);
  }

  return (
    <div>
      {/* Controls */}
      <div className="mb-5 flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[220px]">
            <svg
              className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-mute"
              width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden
            >
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-3.5-3.5" strokeLinecap="round" />
            </svg>
            <input
              value={query}
              onChange={(e) => reset(() => setQuery(e.target.value))}
              placeholder="Search 277 agents by name or category…"
              className="h-11 w-full rounded-[12px] border border-line-strong bg-surface pl-10 pr-4 text-sm text-ink outline-none transition-colors placeholder:text-ink-mute focus:border-gold-3"
            />
          </div>
          <button
            onClick={() => reset(() => setProvenOnly((v) => !v))}
            aria-pressed={provenOnly}
            className={`inline-flex h-11 items-center gap-2 rounded-[12px] border px-4 text-sm transition-colors ${
              provenOnly
                ? "border-gold-3 bg-gold-tint text-gold-3"
                : "border-line-strong text-ink-soft hover:border-gold-3"
            }`}
          >
            <span className={`dot ${provenOnly ? "" : "opacity-40"}`} style={{ background: "var(--grade-a)" }} />
            Proven only
          </button>
        </div>

        <div className="flex flex-wrap gap-2">
          {categories.map((c) => (
            <button
              key={c.value}
              onClick={() => reset(() => setCat(c.value))}
              className={`rounded-full border px-3.5 py-1.5 font-mono text-xs transition-colors ${
                cat === c.value
                  ? "border-transparent bg-ink text-bg"
                  : "border-line-strong text-ink-soft hover:border-ink"
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>

      {/* Board */}
      <div className="card-stamp overflow-hidden">
        <div className="hidden grid-cols-[52px_1fr_140px_180px_60px] items-center gap-4 border-b border-line px-5 py-3 font-mono text-[0.68rem] uppercase tracking-[0.16em] text-ink-mute md:grid">
          <span>Rank</span>
          <span>Agent</span>
          <span>Proven demand</span>
          <span>Score</span>
          <span className="text-right">Grade</span>
        </div>

        {shown.length === 0 ? (
          <div className="px-5 py-16 text-center text-ink-soft">
            No agents match that filter. <button className="text-gold-3 underline" onClick={() => reset(() => { setQuery(""); setCat("all"); setProvenOnly(false); })}>Clear filters</button>
          </div>
        ) : (
          <ul>
            {shown.map((r) => (
              <li key={r.id} className="border-b border-line last:border-0">
                <Link
                  href={`/agents/${r.handle}`}
                  className="group grid grid-cols-[36px_1fr_auto] items-center gap-3 px-4 py-3.5 transition-colors hover:bg-[color-mix(in_srgb,var(--gold)_7%,transparent)] md:grid-cols-[52px_1fr_140px_180px_60px] md:gap-4 md:px-5"
                >
                  <span className="font-mono text-lg tabular-nums text-ink-mute group-hover:text-gold-3">
                    {r.rank}
                  </span>

                  <div className="flex min-w-0 items-center gap-3">
                    <AgentAvatar name={r.name} url={r.avatarUrl} size={38} />
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="truncate font-semibold">{r.name}</span>
                        {r.certified && (
                          <span className="shrink-0 text-gold" title="Vouch Certified">✶</span>
                        )}
                        {r.online && <span className="dot shrink-0" style={{ background: "var(--grade-a)" }} title="Online" />}
                      </div>
                      <div className="mt-0.5 flex items-center gap-2 text-xs text-ink-mute">
                        <span className="rounded bg-[color-mix(in_srgb,var(--ink)_8%,transparent)] px-1.5 py-0.5 text-[0.66rem]">
                          {r.categoryLabel}
                        </span>
                        <span className="font-mono">{r.serviceType}</span>
                        <span className="font-mono md:hidden">· {r.score}</span>
                      </div>
                    </div>
                  </div>

                  <span className="hidden font-mono text-sm text-ink-soft md:block">{demand(r)}</span>

                  <div className="hidden items-center gap-2.5 md:flex">
                    <div className="meter w-24" style={{ ["--g" as string]: `var(--grade-${r.grade.toLowerCase()})` }}>
                      <i style={{ width: `${r.score}%` }} />
                    </div>
                    <span className="font-mono text-sm tabular-nums text-ink-soft">{r.score}</span>
                  </div>

                  <div className="justify-self-end">
                    <GradeBadge grade={r.grade} size="md" />
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Count + load more */}
      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 text-sm text-ink-mute">
        <span className="font-mono">
          Showing {shown.length} of {filtered.length}
          {filtered.length !== rows.length ? ` (filtered from ${rows.length})` : " agents"}
        </span>
        {visible < filtered.length && (
          <button onClick={() => setVisible((v) => v + PAGE)} className="btn btn-ghost h-10 px-5 text-sm">
            Show more
          </button>
        )}
      </div>
    </div>
  );
}
