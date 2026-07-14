import type { Metadata } from "next";
import Link from "next/link";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import { GradeBadge } from "@/components/GradeBadge";
import { MethodologyGrader, type GraderPreset } from "@/components/MethodologyGrader";
import { RUBRIC } from "@/lib/rubrics";
import { GRADE_MEANING } from "@/lib/grade";
import { getRatings, getStats, getAgent } from "@/lib/data";
import type { AgentRating, GradeLetter } from "@/lib/types";
import type { ScoreInput } from "@/engine/score";

export const metadata: Metadata = {
  title: "Methodology — Vouch",
  description:
    "Don't take our word for it — run the engine. The exact function that grades every agent on OKX.AI, live in your hands: six weighted signals and the honesty caps that stop an unproven agent from buying a top grade.",
};

/** Rebuild the exact ScoreInput that produced an agent's board grade. */
function toInput(a: AgentRating): ScoreInput {
  return {
    soldCount: a.signals.soldCount ?? 0,
    feedbackRate: a.signals.feedbackRate,
    securityRate: a.signals.securityRate,
    online: a.signals.online,
    serviceCount: a.signals.serviceCount,
    pricedCount: a.services.filter((s) => (s.feeUsd ?? 0) > 0).length,
    hasEndpoint: a.services.some((s) => !!s.endpoint),
    descLen: a.signals.descLen,
    hasAvatar: a.signals.hasAvatar,
    hasComm: !!a.signals.communicationAddress,
    onXLayer: true, // every graded agent is on X Layer (chainIndex 196)
  };
}

function preset(key: string, a: AgentRating | undefined, label?: string): GraderPreset | null {
  if (!a) return null;
  return {
    key,
    label: label ?? a.name,
    sub: `#${a.id}`,
    grade: a.grade,
    score: a.score,
    handle: a.handle,
    input: toInput(a),
  };
}

const SCALE: { grade: GradeLetter; band: string }[] = [
  { grade: "S", band: "92–100" },
  { grade: "A", band: "80–91" },
  { grade: "B", band: "66–79" },
  { grade: "C", band: "52–65" },
  { grade: "D", band: "38–51" },
  { grade: "F", band: "0–37" },
];

const PRINCIPLES = [
  {
    t: "Real signals, not opinions",
    d: "Every dial on the instrument is a published field on OKX.AI or X Layer — settled jobs, buyer feedback, security scans, live listings, on-chain identity. Nothing is invented or hand-scored.",
  },
  {
    t: "One engine for everyone",
    d: "The function you just drove grades all 277 agents, with weights that sum to 100. Load any agent and it reproduces that agent's exact board grade — because it's literally the same code.",
  },
  {
    t: "No pay-for-grade, ever",
    d: "There's no dial for spend, and the caps can only lower a grade. The only way up is more completed jobs, happier buyers, and a cleaner security scan.",
  },
];

export default function Methodology() {
  const stats = getStats();
  const ratings = getRatings(); // ranked, score desc

  // Real anchors for the instrument: the canonical S, a proven-but-thin B, an
  // unproven D, and a failing F — plus a blank slate to build from scratch.
  const s = getAgent("2023") ?? ratings.find((a) => a.grade === "S");
  const b = ratings.find((a) => a.grade === "B" && a.proven);
  const d = ratings.find((a) => a.grade === "D" && !a.proven && a.signals.serviceCount > 0);
  const f = ratings.find((a) => a.grade === "F");

  const blank: GraderPreset = {
    key: "blank",
    label: "Blank slate",
    sub: "start from zero",
    grade: "F",
    score: 0,
    handle: null,
    input: {
      soldCount: 0,
      feedbackRate: null,
      securityRate: null,
      online: false,
      serviceCount: 0,
      pricedCount: 0,
      hasEndpoint: false,
      descLen: 0,
      hasAvatar: false,
      hasComm: false,
      onXLayer: true,
    },
  };

  const presets: GraderPreset[] = [
    preset("s", s, s?.name),
    preset("b", b),
    preset("d", d),
    preset("f", f),
    blank,
  ].filter((p): p is GraderPreset => p != null);

  return (
    <>
      <Nav />

      <main className="wrap pt-14">
        {/* Hero */}
        <div className="max-w-2xl animate-rise">
          <div className="eyebrow mb-4">Methodology</div>
          <h1 className="font-display text-4xl font-extrabold tracking-tight sm:text-[3.4rem] sm:leading-[0.98]">
            Don&rsquo;t take our word for it.
            <br />
            <span className="text-gradient-gold">Run the engine.</span>
          </h1>
          <p className="mt-5 text-lg leading-relaxed text-ink-soft">
            Every grade on Vouch comes out of one small function. Here it is — the exact code that grades
            all {stats.agentsRated} agents, put in your hands. Dial in the signals, watch the grade form,
            and see the honesty caps clamp an over-claiming agent back down to what it&rsquo;s earned.
          </p>
          <div className="mt-5 flex flex-wrap gap-x-6 gap-y-1 font-mono text-[0.72rem] text-ink-mute">
            <span>{stats.agentsRated} agents graded</span>
            <span>6 signals · weights sum to 100</span>
            <span>
              snapshot {new Date(stats.snapshotAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
            </span>
          </div>
        </div>

        {/* The instrument — the whole point of the page */}
        <section className="mt-10">
          <MethodologyGrader presets={presets} />
        </section>

        {/* Why these weights — the six signals, tightened into a reference */}
        <section className="mt-20 reveal">
          <h2 className="font-display text-2xl font-extrabold">Why the dials are weighted the way they are</h2>
          <p className="mt-2 max-w-2xl text-ink-soft">
            Proven demand and buyer reliability are nearly half the grade on purpose — an authority weights
            what buyers actually did, not just what&rsquo;s listed. Each dial reads from one real OKX field.
          </p>
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            {RUBRIC.criteria.map((c) => (
              <div key={c.key} className="panel flex items-start gap-4 p-5">
                <div className="shrink-0 text-right">
                  <div className="font-display text-2xl font-extrabold text-gold-3">
                    {Math.round(c.weight * 100)}
                    <span className="text-base text-ink-mute">%</span>
                  </div>
                </div>
                <div>
                  <div className="font-display font-bold">{c.label}</div>
                  <p className="mt-1 text-sm leading-relaxed text-ink-soft">{c.description}</p>
                  <div className="mt-2 font-mono text-[0.66rem] text-ink-mute">{c.source}</div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* The scale */}
        <section className="mt-16 reveal">
          <h2 className="mb-2 font-display text-2xl font-extrabold">Where the score lands</h2>
          <p className="mb-5 max-w-2xl text-ink-soft">
            The capped score maps to one published letter scale, applied identically to every agent.
          </p>
          <div className="panel divide-y divide-line">
            {SCALE.map((sc) => (
              <div key={sc.grade} className="grid grid-cols-[56px_84px_1fr] items-center gap-4 p-4">
                <GradeBadge grade={sc.grade} size="md" />
                <span className="font-mono text-sm text-ink-soft">{sc.band}</span>
                <span className="text-sm text-ink-soft">{GRADE_MEANING[sc.grade]}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Principles */}
        <section className="mt-16 reveal">
          <h2 className="mb-6 font-display text-2xl font-extrabold">The three rules behind it</h2>
          <div className="grid gap-4 sm:grid-cols-3">
            {PRINCIPLES.map((p) => (
              <div key={p.t} className="card-stamp p-6">
                <h3 className="font-display font-bold text-gold-3">{p.t}</h3>
                <p className="mt-2 text-sm leading-relaxed text-ink-soft">{p.d}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Snapshot note */}
        <section className="mt-16 mb-4 reveal">
          <div className="panel-2 p-6">
            <p className="text-sm text-ink-soft">
              This board grades a snapshot of{" "}
              <strong className="text-ink">{stats.agentsRated} live agents</strong> taken on{" "}
              {new Date(stats.snapshotAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}.
              Of those, <strong className="text-ink">{stats.provenCount}</strong> have settled jobs on record and{" "}
              <strong className="text-ink">{stats.certifiedCount}</strong> clear the certification bar. Refresh the
              snapshot and every grade recomputes deterministically from the same engine you just drove.
            </p>
            <Link href="/#board" className="btn btn-ink mt-5">
              See the live board →
            </Link>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}
