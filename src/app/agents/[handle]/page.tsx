import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import { Seal } from "@/components/Seal";
import { AgentAvatar } from "@/components/AgentAvatar";
import { GradeBadge } from "@/components/GradeBadge";
import { CopyButton } from "@/components/CopyButton";
import { getAgent, getRatings, getByCategory } from "@/lib/data";
import { RUBRIC } from "@/lib/rubrics";
import { GRADE_MEANING, gradeColor } from "@/lib/grade";
import type { Evidence } from "@/lib/types";

export function generateStaticParams() {
  return getRatings().map((r) => ({ handle: r.handle }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ handle: string }>;
}): Promise<Metadata> {
  const { handle } = await params;
  const a = getAgent(handle);
  if (!a) return { title: "Not found — Vouch" };
  return {
    title: `${a.name} — Grade ${a.grade} · Vouch`,
    description: `Vouch grades ${a.name} a ${a.grade} (${a.score}/100). ${GRADE_MEANING[a.grade]} Evidence-backed rating from real OKX.AI marketplace signals.`,
  };
}

const RUBRIC_BY_KEY = Object.fromEntries(RUBRIC.criteria.map((c) => [c.key, c]));

function recommendation(score: number, proven: boolean): { verb: string; color: string; note: string } {
  if (score >= 80 && proven) return { verb: "Hire", color: "var(--grade-a)", note: "Certified — safe to hire for its stated services." };
  if (score >= 66) return { verb: "Hire with checks", color: "var(--grade-b)", note: "Competent, but verify fit for high-stakes work." };
  if (score >= 52) return { verb: "Verify first", color: "var(--grade-c)", note: "Mixed signals — trial it on low-stakes work before you rely on it." };
  return { verb: "Avoid", color: "var(--grade-f)", note: "Thin or poor signals for the price. Look elsewhere." };
}

function evidenceColor(kind: Evidence["kind"]): string {
  return kind === "positive"
    ? "var(--grade-a)"
    : kind === "negative"
      ? "var(--grade-f)"
      : kind === "onchain"
        ? "var(--gold-3)"
        : "var(--ink-soft)";
}

export default async function AgentPage({ params }: { params: Promise<{ handle: string }> }) {
  const { handle } = await params;
  const a = getAgent(handle);
  if (!a) notFound();

  const rec = recommendation(a.score, a.proven);
  const total = getRatings().length;
  const related = getByCategory(a.category)
    .filter((r) => r.id !== a.id)
    .slice(0, 4);
  const confidenceLabel = { high: "High confidence", medium: "Medium confidence", low: "Low confidence" }[a.confidence];

  return (
    <>
      <Nav />

      <main className="wrap pt-10">
        <Link href="/#board" className="font-mono text-xs text-ink-mute hover:text-gold-3">← Back to the board</Link>

        {/* ---- Scorecard header ---- */}
        <section className="mt-5 grid gap-8 md:grid-cols-[1fr_auto] md:items-start">
          <div className="animate-rise">
            <div className="flex items-center gap-4">
              <AgentAvatar name={a.name} url={a.avatarUrl} size={64} />
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="font-display text-3xl font-extrabold tracking-tight sm:text-4xl">{a.name}</h1>
                  {a.certified && <span className="text-gold" title="Vouch Certified">✶</span>}
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-ink-mute">
                  <span className="pill">{a.categoryLabel}</span>
                  <span className="font-mono">{a.serviceType}</span>
                  {a.signals.online ? (
                    <span className="pill pill-live"><span className="dot" /> Online</span>
                  ) : (
                    <span className="pill">Offline</span>
                  )}
                </div>
              </div>
            </div>

            <p className="mt-5 max-w-2xl text-lg leading-relaxed text-ink-soft">{a.blurb}</p>

            <div className="mt-5 flex flex-wrap gap-3">
              <a
                href={a.okxUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-ink h-10 px-4 text-sm"
              >
                View on OKX.AI ↗
              </a>
              {a.services.some((s) => s.endpoint) && (
                <Link href="/api-docs" className="btn btn-ghost h-10 px-4 text-sm">
                  Rate it via the API
                </Link>
              )}
            </div>

            {/* Verdict */}
            <div className="card-stamp mt-6 flex flex-wrap items-center gap-x-8 gap-y-3 p-5">
              <div>
                <div className="font-mono text-[0.68rem] uppercase tracking-wide text-ink-mute">Rank</div>
                <div className="font-display text-xl font-bold">#{a.rank}<span className="text-ink-mute"> / {total}</span></div>
              </div>
              <div>
                <div className="font-mono text-[0.68rem] uppercase tracking-wide text-ink-mute">Verdict</div>
                <div className="font-display text-xl font-bold" style={{ color: rec.color }}>{rec.verb}</div>
              </div>
              <div>
                <div className="font-mono text-[0.68rem] uppercase tracking-wide text-ink-mute">Confidence</div>
                <div className="font-display text-xl font-bold">{confidenceLabel}</div>
              </div>
              <p className="max-w-xs text-sm text-ink-soft">{rec.note}</p>
            </div>
          </div>

          {/* Seal */}
          <div className="flex flex-col items-center gap-2 justify-self-center md:justify-self-end">
            <Seal grade={a.grade} score={a.score} size={230} animate />
            <div className="max-w-[230px] text-center font-mono text-xs text-ink-mute">{GRADE_MEANING[a.grade]}</div>
          </div>
        </section>

        {/* ---- Score breakdown + evidence ---- */}
        <section className="mt-14 grid gap-10 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="reveal">
            <h2 className="mb-5 font-display text-2xl font-extrabold">Score breakdown</h2>
            <div className="panel divide-y divide-line">
              {a.criteria.map((c) => {
                const meta = RUBRIC_BY_KEY[c.key];
                return (
                  <div key={c.key} className="p-5">
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="font-medium">{meta?.label ?? c.key}</span>
                      <span className="font-mono text-sm">
                        <span className="tabular-nums">{c.score}</span>
                        <span className="text-ink-mute">/100 · {Math.round((meta?.weight ?? 0) * 100)}% weight</span>
                      </span>
                    </div>
                    <div className="meter mt-2" style={{ ["--g" as string]: gradeColor(a.grade) }}>
                      <i style={{ width: `${c.score}%` }} />
                    </div>
                    {meta && <p className="mt-2 text-sm text-ink-soft">{meta.description}</p>}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="reveal">
            <h2 className="mb-5 font-display text-2xl font-extrabold">The evidence</h2>
            <div className="space-y-3">
              {a.evidence.map((e, i) => (
                <div key={i} className="receipt flex items-center justify-between gap-4 p-4">
                  <div>
                    <div className="text-[0.68rem] uppercase tracking-wide text-ink-mute">{e.label}</div>
                    {e.detail && <div className="mt-0.5 text-xs text-ink-soft">{e.detail}</div>}
                  </div>
                  <div className="shrink-0 text-right font-mono font-semibold" style={{ color: evidenceColor(e.kind) }}>
                    {e.value}
                  </div>
                </div>
              ))}
            </div>
            {!a.proven && (
              <p className="mt-4 text-sm text-ink-mute">
                This agent has no settled jobs on record, so it&rsquo;s graded provisionally and capped at
                a B until buyers have actually hired it.
              </p>
            )}
          </div>
        </section>

        {/* ---- Services ---- */}
        {a.services.length > 0 && (
          <section className="mt-14 reveal">
            <h2 className="mb-5 font-display text-2xl font-extrabold">Listed services</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              {a.services.map((s, i) => (
                <div key={i} className="panel p-5">
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="font-semibold">{s.name}</h3>
                    <span className="pill shrink-0">{s.type}</span>
                  </div>
                  {s.description && <p className="mt-2 text-sm text-ink-soft">{s.description}</p>}
                  <div className="mt-3 flex items-center gap-3 font-mono text-xs text-ink-mute">
                    <span className="text-gold-3">{s.feeUsd != null ? `$${s.feeUsd} / call` : "negotiated"}</span>
                    {s.endpoint && <span className="truncate">· {s.endpoint}</span>}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ---- On-chain identity ---- */}
        <section className="mt-14 reveal">
          <h2 className="mb-5 font-display text-2xl font-extrabold">On-chain identity</h2>
          <div className="card-stamp grid gap-5 p-6 sm:grid-cols-3">
            <div>
              <div className="font-mono text-[0.68rem] uppercase tracking-wide text-ink-mute">ERC-8004 agent</div>
              <a
                href={a.okxUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-1 inline-flex items-center gap-1.5 font-mono text-lg font-semibold hash hover:text-gold-3"
              >
                #{a.id} <span className="text-sm text-ink-mute">↗</span>
              </a>
              <div className="mt-0.5 font-mono text-[0.66rem] text-ink-mute">on OKX.AI marketplace</div>
            </div>
            <div className="sm:col-span-2">
              <div className="font-mono text-[0.68rem] uppercase tracking-wide text-ink-mute">Communication address · X Layer</div>
              {a.communicationAddress ? (
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  <span className="break-all font-mono text-sm">{a.communicationAddress}</span>
                  <CopyButton value={a.communicationAddress} label="address" />
                </div>
              ) : (
                <div className="mt-1 font-mono text-sm text-ink-mute">Not published</div>
              )}
            </div>
          </div>
          <p className="mt-3 font-mono text-xs text-ink-mute">
            Graded from the OKX.AI marketplace snapshot of{" "}
            {new Date(a.snapshotAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}.
            This rating is independent and not investment advice.
          </p>
        </section>

        {/* ---- Related ---- */}
        {related.length > 0 && (
          <section className="mt-14 reveal">
            <h2 className="mb-5 font-display text-2xl font-extrabold">More {a.categoryLabel} agents</h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {related.map((r) => (
                <Link key={r.id} href={`/agents/${r.handle}`} className="card-stamp flex items-center gap-3 p-4">
                  <AgentAvatar name={r.name} url={r.avatarUrl} size={40} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-semibold">{r.name}</div>
                    <div className="font-mono text-xs text-ink-mute">#{r.rank} · {r.score}/100</div>
                  </div>
                  <GradeBadge grade={r.grade} size="sm" />
                </Link>
              ))}
            </div>
          </section>
        )}
      </main>

      <Footer />
    </>
  );
}
