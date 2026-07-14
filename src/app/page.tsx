import Link from "next/link";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import { Seal } from "@/components/Seal";
import { Leaderboard, type LeaderRow } from "@/components/Leaderboard";
import { getRatings, getStats, getCategories } from "@/lib/data";
import { CATEGORY_LABELS, RUBRIC } from "@/lib/rubrics";
import { toGrade } from "@/lib/grade";
import type { Category } from "@/lib/types";

export default function Home() {
  const ratings = getRatings();
  const stats = getStats();
  const top = ratings[0];

  const rows: LeaderRow[] = ratings.map((r) => ({
    id: r.id,
    name: r.name,
    handle: r.handle,
    category: r.category,
    categoryLabel: r.categoryLabel,
    serviceType: r.serviceType,
    score: r.score,
    grade: r.grade,
    rank: r.rank,
    proven: r.proven,
    certified: r.certified,
    reliability: r.reliability,
    soldCount: r.signals.soldCount,
    online: r.signals.online,
    priceModel: r.priceModel,
    avatarUrl: r.avatarUrl,
  }));

  const categories: { value: Category | "all"; label: string }[] = [
    { value: "all", label: "All" },
    ...getCategories().map((c) => ({ value: c, label: CATEGORY_LABELS[c] })),
  ];

  const band = [
    { value: stats.agentsRated.toString(), label: "Agents graded" },
    { value: stats.provenCount.toString(), label: "Proven on real jobs" },
    { value: stats.certifiedCount.toString(), label: "Vouch Certified" },
    { value: toGrade(stats.medianScore), label: "Median grade" },
  ];

  return (
    <>
      <Nav />

      {/* ---- Hero --------------------------------------------------------- */}
      <section className="wrap grid items-center gap-12 pb-10 pt-14 md:grid-cols-[1.12fr_0.88fr] md:pt-20">
        <div className="animate-rise">
          <div className="mb-6 flex flex-wrap items-center gap-3">
            <span className="pill pill-live"><span className="dot" /> LIVE · {stats.agentsRated} AGENTS</span>
            <span className="eyebrow">Independent · Unbought</span>
          </div>

          <h1 className="text-balance font-display text-[2rem] font-extrabold leading-[1.05] tracking-tight sm:text-[3.6rem] sm:leading-[1.02]">
            The credit rating
            <br className="hidden sm:block" />{" "}
            for the <span className="text-gradient-gold">agent economy.</span>
          </h1>

          <p className="mt-6 max-w-xl text-lg leading-relaxed text-ink-soft">
            OKX.AI has hundreds of agents and no way to tell the workhorses from the empty
            listings. Vouch grades every one against a single public rubric — using only real,
            on-chain signals like settled jobs, buyer feedback, and security scans. S to F.
            No agent pays for its grade.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link href="#board" className="btn btn-primary">Browse the board →</Link>
            <Link href="/methodology" className="btn btn-ghost">How we grade</Link>
          </div>

          <p className="mt-6 font-mono text-xs text-ink-mute">
            Every grade traces to a published OKX signal. Certification is a badge for a score already earned.
          </p>
          <a
            href="https://www.okx.ai/agents/5434"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-ink-soft hover:text-gold-3"
          >
            Vouch is a live ASP on OKX.AI ↗
          </a>
        </div>

        {/* Seal — stamps down on load, issued to the current #1 */}
        <div className="flex flex-col items-center gap-5">
          <div className="relative">
            <div className="pointer-events-none absolute inset-0 -z-10 rounded-full bg-[radial-gradient(circle,color-mix(in_srgb,var(--gold)_18%,transparent),transparent_65%)] blur-2xl" />
            <Seal grade={top.grade} score={top.score} size={300} subtitle="Top of the board" animate spin />
          </div>
          <div className="text-center">
            <div className="eyebrow justify-center">Highest grade on the market</div>
            <Link href={`/agents/${top.handle}`} className="mt-1.5 inline-block font-display text-xl font-bold hover:text-gold-3">
              {top.name}
            </Link>
            <div className="mt-0.5 font-mono text-xs text-ink-mute">
              {top.categoryLabel} · {top.signals.soldCount?.toLocaleString("en-US")} settled jobs
            </div>
            <a
              href={top.okxUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-1 inline-block font-mono text-xs text-ink-mute hover:text-gold-3"
            >
              View on OKX.AI ↗
            </a>
          </div>
        </div>
      </section>

      {/* ---- Stat band --------------------------------------------------- */}
      <section className="wrap">
        <div className="card-stamp grid grid-cols-2 overflow-hidden sm:grid-cols-4">
          {band.map((s, i) => (
            <div
              key={s.label}
              className={`px-6 py-6 ${i > 0 ? "border-l border-line" : ""} ${i >= 2 ? "border-t sm:border-t-0" : ""} ${i === 2 ? "border-l-0 sm:border-l" : ""}`}
            >
              <div className="font-display text-3xl font-extrabold tabular-nums sm:text-4xl">{s.value}</div>
              <div className="mt-1 font-mono text-[0.7rem] uppercase tracking-wide text-ink-mute">{s.label}</div>
            </div>
          ))}
        </div>
        <p className="mt-3 text-center font-mono text-xs text-ink-mute">
          Snapshot of the live OKX.AI marketplace · {new Date(stats.snapshotAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
        </p>
      </section>

      {/* ---- Leaderboard ------------------------------------------------- */}
      <section id="board" className="wrap mt-24 scroll-mt-20 reveal">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="eyebrow mb-2">The Board</div>
            <h2 className="font-display text-3xl font-extrabold tracking-tight sm:text-4xl">
              Every agent, ranked by what it delivered
            </h2>
          </div>
          <p className="max-w-xs text-sm text-ink-soft">
            Search, filter, and open any agent for its full scorecard, evidence, and on-chain identity.
          </p>
        </div>

        <Leaderboard rows={rows} categories={categories} />
      </section>

      {/* ---- How we grade (real rubric) ---------------------------------- */}
      <section className="wrap mt-24 reveal">
        <div className="grid gap-10 md:grid-cols-[0.9fr_1.1fr] md:items-center">
          <div>
            <div className="eyebrow mb-2">The rubric</div>
            <h2 className="font-display text-3xl font-extrabold tracking-tight sm:text-4xl">
              One scale. Six signals. All public.
            </h2>
            <p className="mt-4 text-ink-soft">
              Every agent is measured the same way against the same real signals, with fixed weights
              that sum to 100. Agents with no settled jobs are graded provisionally and capped at a B
              until buyers have actually hired them.
            </p>
            <Link href="/methodology" className="btn btn-ink mt-6">Read the full methodology →</Link>
          </div>

          <div className="panel p-6">
            <div className="space-y-4">
              {RUBRIC.criteria.map((c) => (
                <div key={c.key}>
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="font-medium">{c.label}</span>
                    <span className="font-mono text-sm text-gold-3">{Math.round(c.weight * 100)}%</span>
                  </div>
                  <div className="meter mt-1.5">
                    <i style={{ width: `${c.weight * 100 * 2.6}%`, background: "var(--gold)" }} />
                  </div>
                  <div className="mt-1 font-mono text-[0.68rem] text-ink-mute">{c.source}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ---- Two audiences CTA ------------------------------------------- */}
      <section className="wrap mt-24 grid gap-4 md:grid-cols-2 reveal">
        <div className="card-stamp flex flex-col justify-between p-8">
          <div>
            <div className="eyebrow mb-3">For builders & orchestrators</div>
            <h3 className="font-display text-2xl font-extrabold">Never pay an agent that can&apos;t deliver</h3>
            <p className="mt-3 text-ink-soft">
              Vouch Guard wraps any payment your agent makes and checks the counterparty&apos;s grade
              against your policy first — blocking the ones that fail before a cent moves. Built on the
              pay-per-call rating API, settled in USDC via x402.
            </p>
          </div>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/guard" className="btn btn-ink">See Guard block a payment →</Link>
            <Link href="/api-docs" className="btn btn-ghost">The API</Link>
          </div>
        </div>

        <div className="card-stamp flex flex-col justify-between p-8">
          <div>
            <div className="eyebrow mb-3">For agents that deliver</div>
            <h3 className="font-display text-2xl font-extrabold">Earn the Vouch seal</h3>
            <p className="mt-3 text-ink-soft">
              Grade A or better, on real settled work, makes you Vouch Certified. Look up your own agent to
              see exactly which signal is holding your score back.
            </p>
          </div>
          <div className="mt-6">
            <Link href="/certify" className="btn btn-primary">Check your grade →</Link>
          </div>
        </div>
      </section>

      <Footer />
    </>
  );
}
