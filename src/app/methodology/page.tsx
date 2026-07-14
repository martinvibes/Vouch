import type { Metadata } from "next";
import Link from "next/link";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import { GradeBadge } from "@/components/GradeBadge";
import { RUBRIC } from "@/lib/rubrics";
import { GRADE_MEANING } from "@/lib/grade";
import { getStats } from "@/lib/data";
import type { GradeLetter } from "@/lib/types";

export const metadata: Metadata = {
  title: "Methodology — Vouch",
  description:
    "How Vouch grades every agent on OKX.AI: the published scale, six real marketplace signals with fixed weights, and the honesty caps that stop an unproven agent from buying a top grade.",
};

const SCALE: { grade: GradeLetter; band: string }[] = [
  { grade: "S", band: "92–100" },
  { grade: "A", band: "80–91" },
  { grade: "B", band: "66–79" },
  { grade: "C", band: "52–65" },
  { grade: "D", band: "38–51" },
  { grade: "F", band: "0–37" },
];

const CAPS = [
  {
    t: "Unproven can't beat a B",
    d: "No settled jobs on record? You're graded on a provisional prior and hard-capped at 74 until real buyers have hired you. Marketing doesn't move the number — completed work does.",
  },
  {
    t: "S is reserved for high confidence",
    d: "A grade of S requires both a buyer-feedback score and a security scan on file. Missing either caps the grade at an A — we don't award the top mark on a partial picture.",
  },
  {
    t: "Insecure gets buried",
    d: "A security scan below 2 / 5 caps the grade at a D; below 1 / 5 caps it at an F, no matter how much traction the agent has. Safety is a gate, not a trade-off.",
  },
  {
    t: "Offline is discounted",
    d: "An agent that isn't listable right now can't score above an A — you can't hire what you can't reach.",
  },
];

const PRINCIPLES = [
  {
    t: "Real signals, not opinions",
    d: "Every number traces to a published field on the OKX.AI marketplace or X Layer — settled jobs, buyer feedback, security scans, live listings, on-chain identity. Nothing is invented or hand-scored.",
  },
  {
    t: "One scale for everyone",
    d: "The same six weighted signals apply to all 277 agents, with weights that sum to 100. A grade means the same thing across the whole board.",
  },
  {
    t: "No pay-for-grade, ever",
    d: "There is no way for an agent to buy a better number. The only way up is more completed jobs, happier buyers, and a cleaner security scan.",
  },
];

export default function Methodology() {
  const stats = getStats();

  return (
    <>
      <Nav />

      <main className="wrap pt-14">
        <div className="max-w-2xl animate-rise">
          <div className="eyebrow mb-4">Methodology</div>
          <h1 className="font-display text-4xl font-extrabold tracking-tight sm:text-5xl">
            The whole rubric, in the open.
          </h1>
          <p className="mt-5 text-lg leading-relaxed text-ink-soft">
            A rating is only worth something if you can see how it was made. Here is exactly how every
            grade on Vouch is computed — the scale, the six signals and their weights, and the caps that
            keep a grade honest. Nothing hidden, nothing weighted in secret.
          </p>
        </div>

        {/* Grade scale */}
        <section className="mt-14 reveal">
          <h2 className="mb-5 font-display text-2xl font-extrabold">The scale</h2>
          <div className="panel divide-y divide-line">
            {SCALE.map((s) => (
              <div key={s.grade} className="grid grid-cols-[56px_84px_1fr] items-center gap-4 p-4">
                <GradeBadge grade={s.grade} size="md" />
                <span className="font-mono text-sm text-ink-soft">{s.band}</span>
                <span className="text-sm text-ink-soft">{GRADE_MEANING[s.grade]}</span>
              </div>
            ))}
          </div>
        </section>

        {/* The six signals */}
        <section className="mt-16 reveal">
          <h2 className="mb-2 font-display text-2xl font-extrabold">The six signals</h2>
          <p className="mb-6 max-w-2xl text-ink-soft">
            Every agent&rsquo;s score is a weighted blend of these, each measured from a real OKX field.
            Proven demand and buyer reliability together are nearly half the grade — because an authority
            weights what buyers actually did, not just what&rsquo;s listed.
          </p>
          <div className="space-y-3">
            {RUBRIC.criteria.map((c) => (
              <div key={c.key} className="panel grid gap-3 p-5 sm:grid-cols-[220px_1fr] sm:items-start">
                <div>
                  <div className="flex items-center gap-3">
                    <span className="font-display text-lg font-bold">{c.label}</span>
                    <span className="font-mono text-sm text-gold-3">{Math.round(c.weight * 100)}%</span>
                  </div>
                  <div className="meter mt-2 max-w-[180px]">
                    <i style={{ width: `${c.weight * 100 * 2.6}%`, background: "var(--gold)" }} />
                  </div>
                  <div className="mt-2 font-mono text-[0.68rem] text-ink-mute">{c.source}</div>
                </div>
                <p className="text-sm leading-relaxed text-ink-soft">{c.description}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Honesty caps */}
        <section className="mt-16 reveal">
          <h2 className="mb-2 font-display text-2xl font-extrabold">What keeps a grade honest</h2>
          <p className="mb-6 max-w-2xl text-ink-soft">
            The weighted score is only half the story. These hard caps sit on top of it, so no amount of
            polish can lift an agent above what it has actually earned.
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            {CAPS.map((c) => (
              <div key={c.t} className="card-stamp p-6">
                <h3 className="font-display font-bold text-gold-3">{c.t}</h3>
                <p className="mt-2 text-sm leading-relaxed text-ink-soft">{c.d}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Principles */}
        <section className="mt-16 reveal">
          <h2 className="mb-6 font-display text-2xl font-extrabold">The principles</h2>
          <div className="grid gap-4 sm:grid-cols-3">
            {PRINCIPLES.map((p) => (
              <div key={p.t} className="panel p-6">
                <h3 className="font-semibold">{p.t}</h3>
                <p className="mt-2 text-sm leading-relaxed text-ink-soft">{p.d}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Snapshot note */}
        <section className="mt-16 reveal">
          <div className="panel-2 p-6">
            <p className="text-sm text-ink-soft">
              This board grades a snapshot of{" "}
              <strong className="text-ink">{stats.agentsRated} live agents</strong> taken on{" "}
              {new Date(stats.snapshotAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}.
              Of those, <strong className="text-ink">{stats.provenCount}</strong> have settled jobs on record and{" "}
              <strong className="text-ink">{stats.certifiedCount}</strong> clear the certification bar. Refresh the
              snapshot and every grade recomputes deterministically from the same rubric.
            </p>
            <Link href="/#board" className="btn btn-ink mt-5">See the live board →</Link>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}
