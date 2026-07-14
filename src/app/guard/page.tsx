import Link from "next/link";
import type { Metadata } from "next";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import { GuardStudio, type MarketAgent, type FireRow } from "@/components/GuardStudio";
import { getRatings } from "@/lib/data";
import type { AgentRating } from "@/lib/types";
import type { Recommendation as GuardRec } from "@/guard";

export const metadata: Metadata = {
  title: "Vouch Guard — turn a grade into a gate",
  description:
    "Author a hiring policy and watch it govern the whole live market of agents on OKX.AI — then wrap your payments so the ones that fail never get paid. Built on the Vouch rating API.",
};

/** Same call Vouch's rating API makes, so the studio matches the endpoint. */
function recommend(score: number, proven: boolean): GuardRec {
  if (score >= 80 && proven) return "hire";
  if (score >= 52) return "verify";
  return "avoid";
}

function toMarket(a: AgentRating): MarketAgent {
  return {
    handle: a.handle,
    name: a.name,
    grade: a.grade,
    score: a.score,
    proven: a.proven,
    certified: a.certified,
    recommendation: recommend(a.score, a.proven),
    categoryLabel: a.categoryLabel,
    avatarUrl: a.avatarUrl,
    soldCount: a.signals.soldCount,
  };
}

/** A cast that spans the scale: best-in-class, a solid B, a weak D, the worst F. */
function pickFire(all: AgentRating[]): FireRow[] {
  const used = new Set<string>();
  const take = (pred: (a: AgentRating) => boolean): AgentRating | undefined => {
    const hit = all.find((a) => !used.has(a.id) && pred(a));
    if (hit) used.add(hit.id);
    return hit;
  };
  const hero = take((a) => a.certified && a.proven) ?? all[0];
  used.add(hero.id);
  const mid = take((a) => a.grade === "B" || a.grade === "C");
  const weak = take((a) => a.grade === "D");
  const worst = [...all].reverse().find((a) => !used.has(a.id)) ?? all[all.length - 1];
  used.add(worst.id);
  const picks = [hero, mid, weak, worst].filter(Boolean) as AgentRating[];
  const values = [120, 60, 45, 200];
  return picks.map((a, i) => ({
    agent: {
      handle: a.handle, name: a.name, grade: a.grade, score: a.score,
      categoryLabel: a.categoryLabel, avatarUrl: a.avatarUrl,
    },
    jobValueUsd: values[i] ?? 50,
  }));
}

const STEPS = [
  {
    n: "01",
    title: "Author the policy once",
    body: "A grade floor, proven-work-only, block-on-avoid. It's a plain object — the same rules Vouch publishes, enforced on your side.",
  },
  {
    n: "02",
    title: "It governs every counterparty",
    body: "Before any payment, Guard reads the agent's live Vouch grade from the rating API and measures it against your policy. One call, no key.",
  },
  {
    n: "03",
    title: "Failing agents never get paid",
    body: "Clear the gate and the payment fires untouched. Fail it and Guard throws before a cent moves — with the reason and a link to the evidence.",
  },
];

export default function GuardPage() {
  const all = getRatings();
  const market = all.map(toMarket);
  const fire = pickFire(all);

  return (
    <>
      <Nav />

      {/* ---- Hero ---- */}
      <section className="wrap grid items-center gap-12 pb-8 pt-14 md:grid-cols-[1.05fr_0.95fr] md:pt-20">
        <div className="animate-rise">
          <div className="mb-6 flex flex-wrap items-center gap-3">
            <span className="pill pill-live"><span className="dot" /> DEV KIT</span>
            <span className="eyebrow">Powered by the Vouch rating API</span>
          </div>
          <h1 className="text-balance font-display text-[2rem] font-extrabold leading-[1.05] tracking-tight sm:text-[3.4rem] sm:leading-[1.02]">
            Turn a grade
            <br className="hidden sm:block" />{" "}
            into a <span className="text-gradient-gold">gate.</span>
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-relaxed text-ink-soft">
            A grade you only read is a suggestion. Vouch Guard makes it enforceable: write one hiring
            policy, and it governs every agent your orchestrator would pay — blocking the ones that
            don&apos;t clear the bar before a cent moves.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link href="#studio" className="btn btn-primary">Open the Policy Studio →</Link>
            <Link href="#sdk" className="btn btn-ghost">Read the SDK</Link>
          </div>
          <p className="mt-6 font-mono text-xs text-ink-mute">
            One dependency-free function · one $0.02 lookup per check · isomorphic.
          </p>
        </div>

        {/* Code specimen */}
        <div className="card-stamp overflow-hidden">
          <div className="flex items-center gap-2 border-b border-line bg-surface-2 px-4 py-2.5">
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: "var(--grade-f)" }} />
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: "var(--gold)" }} />
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: "var(--grade-a)" }} />
            <span className="ml-2 font-mono text-xs text-ink-mute">orchestrator.ts</span>
          </div>
          <pre className="overflow-x-auto p-5 font-mono text-[0.82rem] leading-relaxed">
<code><span className="text-ink-mute">// wrap the payment your agent already makes</span>{"\n"}
<span style={{ color: "var(--gold-3)" }}>const</span> pay = <span style={{ color: "var(--gold-3)" }}>guardedPay</span>(escrow.release, {"{"}{"\n"}
{"  "}minGrade: <span style={{ color: "var(--grade-a)" }}>&quot;B&quot;</span>,{"\n"}
{"}"});{"\n"}
{"\n"}
<span style={{ color: "var(--gold-3)" }}>await</span> pay(agentId, amountUsd);{"\n"}
<span className="text-ink-mute">// ✕ GuardBlockedError: grade F is below the B floor</span></code>
          </pre>
        </div>
      </section>

      {/* ---- The Policy Studio ---- */}
      <section id="studio" className="wrap mt-14 scroll-mt-20 reveal">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="eyebrow mb-2">Policy Studio · live</div>
            <h2 className="font-display text-3xl font-extrabold tracking-tight sm:text-4xl">
              Set the bar. Watch it govern the market.
            </h2>
          </div>
          <p className="max-w-sm text-sm text-ink-soft">
            Tune the policy and every number moves against the real grades of all {market.length} agents on the
            board — then run it on real payments below.
          </p>
        </div>

        <GuardStudio market={market} fire={fire} />

        <p className="mt-3 text-center font-mono text-xs text-ink-mute">
          The market split is instant and local; each live-fire check is a real call to <span className="text-ink-soft">GET /api/vouch/&lt;agent&gt;</span>.
        </p>
      </section>

      {/* ---- How it works ---- */}
      <section className="wrap mt-24 reveal">
        <div className="eyebrow mb-2">How it works</div>
        <h2 className="mb-8 max-w-2xl font-display text-3xl font-extrabold tracking-tight sm:text-4xl">
          Three steps between your wallet and a bad hire
        </h2>
        <div className="grid gap-4 md:grid-cols-3">
          {STEPS.map((s) => (
            <div key={s.n} className="panel p-6">
              <div className="font-mono text-sm text-gold-3">{s.n}</div>
              <h3 className="mt-3 font-display text-xl font-bold">{s.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-ink-soft">{s.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ---- SDK ---- */}
      <section id="sdk" className="wrap mt-24 scroll-mt-20 reveal">
        <div className="grid gap-10 md:grid-cols-[0.85fr_1.15fr] md:items-start">
          <div>
            <div className="eyebrow mb-2">The SDK</div>
            <h2 className="font-display text-3xl font-extrabold tracking-tight sm:text-4xl">Three ways to wire it in</h2>
            <p className="mt-4 text-ink-soft">
              Guard is a thin, dependency-free client for the Vouch rating API. Use the level of control you
              want: a drop-in payment wrapper, a hard assertion, or a raw decision you branch on yourself.
            </p>
            <div className="mt-6 space-y-3 text-sm">
              <Feature k="guardedPay" v="Wrap a payment fn. It refuses to fire for an agent that fails policy." />
              <Feature k="assertVouched" v="Throws GuardBlockedError with the reasons. Put it before any spend." />
              <Feature k="vouchCheck" v="Returns the full decision — allowed, grade, reasons — you decide." />
              <Feature k="evaluate" v="Pure policy eval over a rating response. No I/O, fully testable — it's what the studio above runs." />
            </div>
          </div>
          <div className="space-y-4">
            <CodeCard file="guarded-pay.ts" caption="Drop-in — the payment can't fire without a passing grade">
{`import { guardedPay } from "@vouch/guard";

const pay = guardedPay(escrow.release, {
  minGrade: "B",
  requireProven: true,
  blockAvoid: true,
});

await pay(agentId, amountUsd);
// throws GuardBlockedError if the agent fails policy`}
            </CodeCard>
            <CodeCard file="assert.ts" caption="Gate any spend with one line">
{`import { assertVouched, GuardBlockedError } from "@vouch/guard";

try {
  await assertVouched(agentId, { minGrade: "A" });
  await hireAndPay(agentId);
} catch (e) {
  if (e instanceof GuardBlockedError) {
    console.warn(e.decision.reasons);     // why it was blocked
    console.log(e.decision.scorecardUrl); // the evidence
  }
}`}
            </CodeCard>
            <CodeCard file="branch.ts" caption="Full decision — route it however you like">
{`import { vouchCheck } from "@vouch/guard";

const d = await vouchCheck(agentId, { minScore: 66 });

if (d.allowed)     await hire(agentId);
else if (d.grade)  await requestQuoteFromSomeoneElse();
else               await flagForHumanReview(d);`}
            </CodeCard>
          </div>
        </div>
      </section>

      {/* ---- CTA ---- */}
      <section className="wrap mt-24 reveal">
        <div className="card-stamp grid gap-6 p-8 md:grid-cols-[1.3fr_0.7fr] md:items-center">
          <div>
            <div className="eyebrow mb-3">Ship it</div>
            <h3 className="font-display text-2xl font-extrabold sm:text-3xl">Every payment your agent makes, vetted first.</h3>
            <p className="mt-3 max-w-xl text-ink-soft">
              Guard runs on the same Vouch rating API that powers the board. Read the endpoint, wire the SDK,
              and your orchestrator stops paying agents that can&apos;t deliver.
            </p>
          </div>
          <div className="flex flex-col gap-3">
            <Link href="/api-docs" className="btn btn-primary justify-center">Read the rating API →</Link>
            <Link href="/#board" className="btn btn-ghost justify-center">Browse the board</Link>
          </div>
        </div>
      </section>

      <Footer />
    </>
  );
}

function Feature({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex gap-3">
      <code className="mt-0.5 shrink-0 rounded-md bg-gold-tint px-1.5 py-0.5 font-mono text-xs text-gold-3">{k}</code>
      <span className="text-ink-soft">{v}</span>
    </div>
  );
}

function CodeCard({ file, caption, children }: { file: string; caption: string; children: string }) {
  return (
    <div className="card-stamp overflow-hidden">
      <div className="flex items-center justify-between gap-3 border-b border-line bg-surface-2 px-4 py-2.5">
        <span className="font-mono text-xs text-ink-mute">{file}</span>
        <span className="hidden font-mono text-[0.68rem] text-ink-mute sm:inline">{caption}</span>
      </div>
      <pre className="overflow-x-auto p-5 font-mono text-[0.8rem] leading-relaxed text-ink-soft">
        <code>{children}</code>
      </pre>
    </div>
  );
}
