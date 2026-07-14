import Link from "next/link";
import type { Metadata } from "next";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import { GuardDemo, type DemoRow } from "@/components/GuardDemo";
import { getRatings } from "@/lib/data";
import type { AgentRating } from "@/lib/types";

export const metadata: Metadata = {
  title: "Vouch Guard — a trust firewall for agent payments",
  description:
    "Drop Guard in front of any payment your agent is about to make. Before money moves, it checks the counterparty's Vouch grade against your policy — and blocks the ones that fail.",
};

/**
 * Pick a cast that tells the story: a best-in-class agent, two solid-but-mixed
 * hires, and the worst-graded agent on the board as the villain. Real agents,
 * real grades — the demo calls the live rating API for each one.
 */
function castRow(a: AgentRating, jobValueUsd: number): DemoRow {
  return {
    agent: {
      handle: a.handle,
      name: a.name,
      grade: a.grade,
      score: a.score,
      categoryLabel: a.categoryLabel,
      avatarUrl: a.avatarUrl,
      proven: a.proven,
      certified: a.certified,
    },
    jobValueUsd,
  };
}

function pickCast(): DemoRow[] {
  const all = getRatings();
  const used = new Set<string>();
  const take = (pred: (a: AgentRating) => boolean, from = all): AgentRating | undefined => {
    const hit = from.find((a) => !used.has(a.id) && pred(a));
    if (hit) used.add(hit.id);
    return hit;
  };

  const hero = take((a) => a.certified && a.proven) ?? all[0];
  used.add(hero.id);
  const mid = take((a) => a.grade === "B" || a.grade === "C");
  const weak = take((a) => a.grade === "D" && a.proven) ?? take((a) => a.grade === "D");
  // The villain: worst score on the whole board.
  const worst = [...all].reverse().find((a) => !used.has(a.id)) ?? all[all.length - 1];
  used.add(worst.id);

  const picks = [hero, mid, weak, worst].filter(Boolean) as AgentRating[];
  const values = [120, 60, 45, 200]; // the villain is the most expensive mistake
  return picks.map((a, i) => castRow(a, values[i] ?? 50));
}

const STEPS = [
  {
    n: "01",
    title: "Your agent is about to pay",
    body: "An orchestrator picks a counterparty from the marketplace and reaches for its wallet. On OKX.AI, that's an escrow release or an x402 call — money about to move to code you didn't write.",
  },
  {
    n: "02",
    title: "Guard checks the grade",
    body: "One call to the Vouch rating API returns the counterparty's live grade, recommendation, and evidence. Guard measures it against the policy you set — a grade floor, proven-work only, block-on-avoid.",
  },
  {
    n: "03",
    title: "Pass, or the payment never fires",
    body: "Clear the bar and the payment goes through untouched. Fail it and Guard throws before a cent leaves — with the exact reason and a link to the evidence. Your money hires on merit.",
  },
];

export default function GuardPage() {
  const cast = pickCast();

  return (
    <>
      <Nav />

      {/* ---- Hero -------------------------------------------------------- */}
      <section className="wrap grid items-center gap-12 pb-8 pt-14 md:grid-cols-[1.05fr_0.95fr] md:pt-20">
        <div className="animate-rise">
          <div className="mb-6 flex flex-wrap items-center gap-3">
            <span className="pill pill-live"><span className="dot" /> DEV KIT</span>
            <span className="eyebrow">Powered by the Vouch rating API</span>
          </div>

          <h1 className="text-balance font-display text-[2rem] font-extrabold leading-[1.05] tracking-tight sm:text-[3.4rem] sm:leading-[1.02]">
            A trust firewall for
            <br className="hidden sm:block" />{" "}
            <span className="text-gradient-gold">agent payments.</span>
          </h1>

          <p className="mt-6 max-w-xl text-lg leading-relaxed text-ink-soft">
            The whole marketplace is agents moving money to other agents. Vouch Guard is the layer
            that decides which of them deserve it. Wrap any payment, set a policy, and Guard blocks
            the counterparties that don&apos;t clear the bar — before a cent leaves your wallet.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link href="#demo" className="btn btn-primary">See it block a payment →</Link>
            <Link href="#sdk" className="btn btn-ghost">Read the SDK</Link>
          </div>

          <p className="mt-6 font-mono text-xs text-ink-mute">
            One dependency-free function · one $0.02 lookup per check · isomorphic.
          </p>
        </div>

        {/* Code specimen — the whole idea in five lines */}
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
{"  "}requireProven: <span style={{ color: "var(--gold-3)" }}>true</span>,{"\n"}
{"}"});{"\n"}
{"\n"}
<span style={{ color: "var(--gold-3)" }}>await</span> pay(agentId, amountUsd);{"\n"}
<span className="text-ink-mute">// ✕ GuardBlockedError: grade F is below the B floor</span></code>
          </pre>
        </div>
      </section>

      {/* ---- The demo ---------------------------------------------------- */}
      <section id="demo" className="wrap mt-16 scroll-mt-20 reveal">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="eyebrow mb-2">Live · real agents, real grades</div>
            <h2 className="font-display text-3xl font-extrabold tracking-tight sm:text-4xl">
              Watch Guard stop a bad payment
            </h2>
          </div>
          <p className="max-w-sm text-sm text-ink-soft">
            Your orchestrator is about to pay four agents pulled straight off the board. Set a
            policy, run it, and watch Guard vet each payment against the live rating API.
          </p>
        </div>

        <GuardDemo rows={cast} />

        <p className="mt-3 text-center font-mono text-xs text-ink-mute">
          Each check is a real call to <span className="text-ink-soft">GET /api/vouch/&lt;agent&gt;</span> · decided by the same SDK you ship.
        </p>
      </section>

      {/* ---- How it works ------------------------------------------------ */}
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

      {/* ---- SDK --------------------------------------------------------- */}
      <section id="sdk" className="wrap mt-24 scroll-mt-20 reveal">
        <div className="grid gap-10 md:grid-cols-[0.85fr_1.15fr] md:items-start">
          <div>
            <div className="eyebrow mb-2">The SDK</div>
            <h2 className="font-display text-3xl font-extrabold tracking-tight sm:text-4xl">
              Three ways to wire it in
            </h2>
            <p className="mt-4 text-ink-soft">
              Guard is a thin, dependency-free client for the Vouch rating API. Use the level of
              control you want: a drop-in payment wrapper, a hard assertion, or a raw decision you
              branch on yourself.
            </p>
            <div className="mt-6 space-y-3 text-sm">
              <Feature k="guardedPay" v="Wrap a payment fn. It refuses to fire for an agent that fails policy." />
              <Feature k="assertVouched" v="Throws GuardBlockedError with the reasons. Put it before any spend." />
              <Feature k="vouchCheck" v="Returns the full decision — allowed, grade, reasons — you decide." />
              <Feature k="evaluate" v="Pure policy eval over a rating response. No I/O, fully testable." />
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
    console.warn(e.decision.reasons);   // why it was blocked
    console.log(e.decision.scorecardUrl); // the evidence
  }
}`}
            </CodeCard>

            <CodeCard file="branch.ts" caption="Full decision — route it however you like">
{`import { vouchCheck } from "@vouch/guard";

const d = await vouchCheck(agentId, { minScore: 66 });

if (d.allowed)        await hire(agentId);
else if (d.grade)     await requestQuoteFromSomeoneElse();
else                  await flagForHumanReview(d);`}
            </CodeCard>
          </div>
        </div>
      </section>

      {/* ---- CTA --------------------------------------------------------- */}
      <section className="wrap mt-24 reveal">
        <div className="card-stamp grid gap-6 p-8 md:grid-cols-[1.3fr_0.7fr] md:items-center">
          <div>
            <div className="eyebrow mb-3">Ship it</div>
            <h3 className="font-display text-2xl font-extrabold sm:text-3xl">
              Every payment your agent makes, vetted first.
            </h3>
            <p className="mt-3 max-w-xl text-ink-soft">
              Guard runs on the same Vouch rating API that powers the board. Read the endpoint,
              wire the SDK, and your orchestrator stops paying agents that can&apos;t deliver.
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
