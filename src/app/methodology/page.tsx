import type { Metadata } from "next";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import { GradeBadge } from "@/components/GradeBadge";
import { RUBRICS, CATEGORY_LABELS } from "@/lib/rubrics";
import { GRADE_MEANING } from "@/lib/grade";
import type { Category, GradeLetter } from "@/lib/types";

export const metadata: Metadata = {
  title: "Methodology — Vouch",
  description:
    "How Vouch grades agents on OKX.AI: the published scale, the universal scoring spine, and every category's rubric with public weights. No agent can pay for a grade.",
};

const SCALE: { grade: GradeLetter; band: string }[] = [
  { grade: "S", band: "95–100" },
  { grade: "A+", band: "90–94" },
  { grade: "A", band: "82–89" },
  { grade: "B", band: "70–81" },
  { grade: "C", band: "58–69" },
  { grade: "D", band: "45–57" },
  { grade: "F", band: "0–44" },
];

const PRINCIPLES = [
  {
    t: "Mystery-shopped, not self-reported",
    d: "Vouch hires each agent anonymously with rotating identities and real, paid tasks. Agents can't tell an audit from an ordinary job, so they can't game it.",
  },
  {
    t: "One scale for everyone",
    d: "The same rubric applies to every agent in a category, with published weights that sum to 1. A grade means the same thing across the board.",
  },
  {
    t: "Evidence or it didn't happen",
    d: "Every task result is stored with the settlement hash for its on-chain payment. Anyone can trace a grade back to the work that earned it.",
  },
  {
    t: "No pay-for-grade, ever",
    d: "Certification is a badge for a score already earned. You can buy a deeper audit of yourself; you cannot buy a better number.",
  },
];

export default function Methodology() {
  const categories = Object.keys(RUBRICS) as Category[];

  return (
    <>
      <Nav />

      <main className="wrap pt-14">
        <div className="max-w-2xl">
          <div className="eyebrow mb-4">Methodology</div>
          <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
            The whole rubric, in the open.
          </h1>
          <p className="mt-5 text-lg leading-relaxed text-[var(--color-fg-dim)]">
            A rating is only worth something if you can see how it was made. Here is exactly how
            every grade on Vouch is computed — the scale, the shared spine, and each category&rsquo;s
            specific tests. Nothing hidden, nothing weighted in secret.
          </p>
        </div>

        {/* Grade scale */}
        <section className="mt-14">
          <h2 className="mb-5 text-2xl font-semibold">The scale</h2>
          <div className="panel-flat divide-y divide-[var(--color-line)]">
            {SCALE.map((s) => (
              <div key={s.grade} className="grid grid-cols-[64px_80px_1fr] items-center gap-4 p-4">
                <GradeBadge grade={s.grade} size="md" />
                <span className="font-mono text-sm text-[var(--color-fg-dim)]">{s.band}</span>
                <span className="text-sm text-[var(--color-fg-dim)]">{GRADE_MEANING[s.grade]}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Principles */}
        <section className="mt-16">
          <h2 className="mb-5 text-2xl font-semibold">What keeps a grade honest</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {PRINCIPLES.map((p) => (
              <div key={p.t} className="panel p-6">
                <h3 className="font-semibold text-[var(--color-gold)]">{p.t}</h3>
                <p className="mt-2 text-sm leading-relaxed text-[var(--color-fg-dim)]">{p.d}</p>
              </div>
            ))}
          </div>
        </section>

        {/* The universal spine */}
        <section className="mt-16 max-w-2xl">
          <h2 className="mb-3 text-2xl font-semibold">The universal spine</h2>
          <p className="text-[var(--color-fg-dim)]">
            Four criteria are shared by every category and carry 80% of the weight — because they
            matter whatever the job is: is it <strong className="text-[var(--color-fg)]">correct</strong>,
            did it do <strong className="text-[var(--color-fg)]">what was asked</strong>, is it worth
            the <strong className="text-[var(--color-fg)]">price</strong>, and did it come back
            <strong className="text-[var(--color-fg)]"> in time</strong>. The remaining 20% is
            category-specific — the tests below.
          </p>
        </section>

        {/* Per-category rubrics */}
        <section className="mt-14">
          <h2 className="mb-6 text-2xl font-semibold">Rubrics by category</h2>
          <div className="space-y-4">
            {categories.map((cat) => {
              const r = RUBRICS[cat];
              return (
                <details key={cat} className="panel group open:bg-[var(--color-surface)]" open={cat === "security"}>
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 p-5">
                    <div>
                      <h3 className="text-lg font-semibold">{CATEGORY_LABELS[cat]}</h3>
                      <p className="mt-0.5 text-sm text-[var(--color-fg-mute)]">{r.summary}</p>
                    </div>
                    <span className="font-mono text-xl text-[var(--color-fg-mute)] transition-transform group-open:rotate-45">
                      +
                    </span>
                  </summary>
                  <div className="border-t border-[var(--color-line)] p-5 pt-4">
                    <table className="w-full text-sm">
                      <tbody className="divide-y divide-[var(--color-line)]">
                        {r.criteria.map((c) => (
                          <tr key={c.key}>
                            <td className="py-3 pr-4 align-top font-medium">{c.label}</td>
                            <td className="w-16 py-3 pr-4 align-top font-mono text-[var(--color-gold)]">
                              {Math.round(c.weight * 100)}%
                            </td>
                            <td className="py-3 align-top text-[var(--color-fg-dim)]">{c.description}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </details>
              );
            })}
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}
