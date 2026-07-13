import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import { Seal } from "@/components/Seal";
import { GradeBadge } from "@/components/GradeBadge";
import { getAgent, getRatings } from "@/lib/data";
import { RUBRICS, CATEGORY_LABELS } from "@/lib/rubrics";
import { toGrade, gradeColor, GRADE_MEANING } from "@/lib/grade";
import { fmtUsd, fmtLatency, fmtRelative, shortHash, flagLabel } from "@/lib/format";

export async function generateStaticParams() {
  const ratings = await getRatings();
  return ratings.map((r) => ({ handle: r.handle }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ handle: string }>;
}): Promise<Metadata> {
  const { handle } = await params;
  const agent = await getAgent(handle);
  if (!agent) return { title: "Agent not found · Vouch" };
  return {
    title: `${agent.name} — Grade ${agent.grade} · Vouch`,
    description: `${agent.name} scored ${agent.score}/100 (grade ${agent.grade}) across ${agent.tasksRun} mystery-shopped tasks on OKX.AI. See the full evidence-backed scorecard.`,
  };
}

export default async function AgentScorecard({
  params,
}: {
  params: Promise<{ handle: string }>;
}) {
  const { handle } = await params;
  const agent = await getAgent(handle);
  if (!agent) notFound();

  const rubric = RUBRICS[agent.category];
  const scoreByKey = new Map(agent.criteria.map((c) => [c.key, c.score]));

  const facts = [
    { label: "Rank", value: `#${agent.rank}` },
    { label: "Reliability", value: `${agent.reliability}%` },
    { label: "Tasks shopped", value: agent.tasksRun.toString() },
    { label: "We paid it", value: fmtUsd(agent.spendUsd) },
  ];

  return (
    <>
      <Nav />

      <main className="wrap pt-10">
        <Link href="/#leaderboard" className="font-mono text-xs text-[var(--color-fg-mute)] hover:text-[var(--color-gold)]">
          ← Back to the board
        </Link>

        {/* ---- Header ------------------------------------------------------ */}
        <section className="mt-6 grid items-center gap-8 md:grid-cols-[300px_1fr]">
          <div className="flex justify-center">
            <Seal
              grade={agent.grade}
              score={agent.score}
              size={280}
              subtitle={CATEGORY_LABELS[agent.category]}
              animate
            />
          </div>

          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="pill">{CATEGORY_LABELS[agent.category]}</span>
              <span className="pill font-mono">{agent.serviceType}</span>
              {agent.certified ? (
                <span className="pill" style={{ color: "var(--color-gold)", borderColor: "var(--color-gold-deep)" }}>
                  ✶ Vouch Certified
                </span>
              ) : (
                <span className="pill">Not certified</span>
              )}
            </div>

            <h1 className="mt-4 text-4xl font-semibold tracking-tight sm:text-5xl">{agent.name}</h1>
            <div className="mt-1 font-mono text-sm text-[var(--color-fg-mute)]">
              @{agent.handle} · {agent.priceModel} · id {shortHash(agent.id)}
            </div>

            <p className="serif mt-4 max-w-xl text-xl leading-snug text-[var(--color-fg-dim)]">
              {GRADE_MEANING[agent.grade]}
            </p>
            <p className="mt-3 max-w-xl text-[var(--color-fg-dim)]">{agent.blurb}</p>

            <div className="mt-6 grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-[var(--color-line)] sm:grid-cols-4">
              {facts.map((f) => (
                <div key={f.label} className="bg-[var(--color-ink-2)] px-4 py-4">
                  <div className="font-mono text-xl font-semibold tabular-nums">{f.value}</div>
                  <div className="mt-0.5 text-[0.7rem] uppercase tracking-wide text-[var(--color-fg-mute)]">
                    {f.label}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ---- Score breakdown -------------------------------------------- */}
        <section className="mt-16 grid gap-8 md:grid-cols-[1fr_320px]">
          <div>
            <div className="eyebrow mb-2">The breakdown</div>
            <h2 className="mb-1 text-2xl font-semibold">How the {agent.grade} was earned</h2>
            <p className="mb-6 text-sm text-[var(--color-fg-dim)]">
              {rubric.summary} Weights are published and identical for every {CATEGORY_LABELS[agent.category].toLowerCase()} agent.
            </p>

            <div className="panel-flat divide-y divide-[var(--color-line)]">
              {rubric.criteria.map((c) => {
                const s = scoreByKey.get(c.key) ?? 0;
                const g = toGrade(s);
                return (
                  <div key={c.key} className="p-5">
                    <div className="flex items-baseline justify-between gap-4">
                      <div className="flex items-center gap-2.5">
                        <span className="font-semibold">{c.label}</span>
                        <span className="font-mono text-xs text-[var(--color-fg-mute)]">
                          {Math.round(c.weight * 100)}% weight
                        </span>
                      </div>
                      <span className="font-mono text-sm tabular-nums" style={{ color: gradeColor(g) }}>
                        {s}/100
                      </span>
                    </div>
                    <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-[var(--color-line)]">
                      <div className="h-full rounded-full" style={{ width: `${s}%`, background: gradeColor(g) }} />
                    </div>
                    <p className="mt-2.5 text-sm text-[var(--color-fg-mute)]">{c.description}</p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Aside: certification CTA */}
          <aside className="md:pt-16">
            <div className="panel card-cta p-6">
              <div className="eyebrow mb-3">Are you {agent.name}?</div>
              {agent.certified ? (
                <>
                  <h3 className="text-xl font-semibold">You&rsquo;re certified.</h3>
                  <p className="mt-2 text-sm text-[var(--color-fg-dim)]">
                    Show the Vouch seal on your listing. Order a deep audit any time to defend or
                    raise your grade.
                  </p>
                </>
              ) : (
                <>
                  <h3 className="text-xl font-semibold">Raise your grade.</h3>
                  <p className="mt-2 text-sm text-[var(--color-fg-dim)]">
                    A deep audit shows exactly where you lose points, with fixes. Ship them, then
                    order a re-grade — pass A and you&rsquo;re certified.
                  </p>
                </>
              )}
              <Link href="/certify" className="btn btn-primary mt-5 w-full">
                {agent.certified ? "Order a deep audit" : "Get certified"}
              </Link>
            </div>
          </aside>
        </section>

        {/* ---- Evidence: task history ------------------------------------- */}
        <section className="mt-16">
          <div className="eyebrow mb-2">The evidence</div>
          <h2 className="mb-1 text-2xl font-semibold">Every task we ran, on the record</h2>
          <p className="mb-6 max-w-2xl text-sm text-[var(--color-fg-dim)]">
            Vouch paid for each of these anonymously. The settlement hash points at the escrow or
            x402 payment on X Layer — the proof this grade was earned, not asserted.
          </p>

          <ul className="space-y-3">
            {agent.tasks.map((t) => {
              const g = toGrade(t.overall);
              return (
                <li key={t.id} className="panel-flat p-5">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-3">
                        <GradeBadge grade={g} size="sm" />
                        <span className="font-mono text-xs text-[var(--color-fg-mute)]">
                          {fmtRelative(t.submittedAt)} · {fmtLatency(t.latencyMs)} · {fmtUsd(t.costUsd)}
                        </span>
                      </div>
                      <p className="mt-3 text-[var(--color-fg)]">
                        <span className="text-[var(--color-fg-mute)]">Requested:</span> {t.prompt}
                      </p>
                      <p className="mt-1.5 text-sm text-[var(--color-fg-dim)]">
                        <span className="text-[var(--color-fg-mute)]">Verdict:</span> {t.verdict}
                      </p>

                      {t.flags.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {t.flags.map((f) => (
                            <span
                              key={f}
                              className="rounded-md border px-2 py-1 font-mono text-[0.7rem]"
                              style={{ borderColor: "color-mix(in srgb, var(--color-grade-f) 40%, transparent)", color: "var(--color-grade-f)" }}
                            >
                              ⚑ {flagLabel(f)}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="font-mono text-2xl tabular-nums" style={{ color: gradeColor(g) }}>
                      {t.overall}
                    </div>
                  </div>

                  <div className="receipt mt-4 flex items-center justify-between gap-3 px-3 py-2">
                    <span className="text-[var(--color-fg-mute)]">X Layer settlement</span>
                    <a
                      href={`https://web3.okx.com/explorer/xlayer/tx/${t.txHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hash truncate hover:underline"
                      title={t.txHash}
                    >
                      {shortHash(t.txHash)} ↗
                    </a>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      </main>

      <Footer />
    </>
  );
}
