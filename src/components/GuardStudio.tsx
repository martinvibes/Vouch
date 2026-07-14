"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { AgentAvatar } from "./AgentAvatar";
import { GradeBadge } from "./GradeBadge";
import { CopyButton } from "./CopyButton";
import {
  evaluate,
  DEFAULT_PAYMENT_HEADER,
  type GuardPolicy,
  type GuardDecision,
  type Recommendation,
} from "@/guard";
import type { GradeLetter } from "@/lib/types";

/** Compact projection of one rated agent, enough to re-decide client-side. */
export interface MarketAgent {
  handle: string;
  name: string;
  grade: GradeLetter;
  score: number;
  proven: boolean;
  certified: boolean;
  recommendation: Recommendation;
  categoryLabel: string;
  avatarUrl: string | null;
  soldCount: number | null;
}

export interface FireAgent {
  handle: string;
  name: string;
  grade: GradeLetter;
  score: number;
  categoryLabel: string;
  avatarUrl: string | null;
}
export interface FireRow {
  agent: FireAgent;
  jobValueUsd: number;
}

const GRADE_FLOORS: (GradeLetter | null)[] = [null, "D", "C", "B", "A", "S"];
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Shape a compact market agent into the rating-response the SDK evaluates. */
function asRating(a: MarketAgent) {
  return {
    agent: { name: a.name },
    rating: { grade: a.grade, score: a.score, certified: a.certified, proven: a.proven },
    recommendation: a.recommendation,
    evidence: { scorecard: `/agents/${a.handle}` },
  };
}

function policyCode(p: GuardPolicy): string {
  const lines: string[] = [];
  if (p.minGrade) lines.push(`  minGrade: "${p.minGrade}",`);
  if (p.requireProven) lines.push(`  requireProven: true,`);
  if (p.requireCertified) lines.push(`  requireCertified: true,`);
  if (p.blockAvoid) lines.push(`  blockAvoid: true,`);
  const body = lines.length ? `{\n${lines.join("\n")}\n}` : `{}`;
  return `import { guardedPay } from "@vouch/guard";\n\nconst pay = guardedPay(escrow.release, ${body});\n\nawait pay(agentId, amountUsd);`;
}

type Status = "idle" | "checking" | "allowed" | "blocked";
interface RowState {
  status: Status;
  decision: GuardDecision | null;
}

export function GuardStudio({ market, fire }: { market: MarketAgent[]; fire: FireRow[] }) {
  const [minGrade, setMinGrade] = useState<GradeLetter | null>("B");
  const [blockAvoid, setBlockAvoid] = useState(true);
  const [requireProven, setRequireProven] = useState(false);
  const [requireCertified, setRequireCertified] = useState(false);

  const policy: GuardPolicy = useMemo(
    () => ({
      minGrade: minGrade ?? undefined,
      blockAvoid,
      requireProven,
      requireCertified,
    }),
    [minGrade, blockAvoid, requireProven, requireCertified],
  );

  // ---- The gate: apply the policy to the whole live market, instantly. ----
  const gate = useMemo(() => {
    let allowed = 0;
    let hireGrade = 0;
    const blocked: MarketAgent[] = [];
    for (const a of market) {
      const d = evaluate(a.handle, asRating(a), policy);
      if (d.allowed) {
        allowed++;
        if (a.recommendation === "hire") hireGrade++;
      } else {
        blocked.push(a);
      }
    }
    // Most-trafficked agents your policy would still block — the striking ones.
    const notable = [...blocked]
      .sort((x, y) => (y.soldCount ?? 0) - (x.soldCount ?? 0))
      .slice(0, 6);
    return { total: market.length, allowed, blocked: blocked.length, hireGrade, notable };
  }, [market, policy]);

  const allowedPct = gate.total ? (gate.allowed / gate.total) * 100 : 0;

  // ---- Live fire: run the policy against real payments via the rating API. ----
  const [states, setStates] = useState<RowState[]>(fire.map(() => ({ status: "idle", decision: null })));
  const [running, setRunning] = useState(false);
  const rawRef = useRef<Record<string, unknown>>({});
  const runIdRef = useRef(0);

  const reEvaluateFire = useCallback(() => {
    setStates((prev) =>
      prev.map((s, i) => {
        const raw = rawRef.current[fire[i].agent.handle];
        if (!raw) return s;
        const decision = evaluate(fire[i].agent.handle, raw, policy);
        return { status: decision.allowed ? "allowed" : "blocked", decision };
      }),
    );
  }, [fire, policy]);

  // Re-decide already-fetched rows the moment the policy changes.
  const patch = (fn: () => void) => {
    fn();
    if (!running) queueMicrotask(reEvaluateFire);
  };

  async function run() {
    if (running) return;
    const runId = ++runIdRef.current;
    setRunning(true);
    setStates(fire.map(() => ({ status: "idle", decision: null })));
    await sleep(180);
    for (let i = 0; i < fire.length; i++) {
      if (runIdRef.current !== runId) return;
      const { handle } = fire[i].agent;
      setStates((prev) => prev.map((s, j) => (j === i ? { ...s, status: "checking" } : s)));
      await sleep(600);
      let decision: GuardDecision;
      try {
        const res = await fetch(`/api/vouch/${handle}`, {
          headers: { "X-PAYMENT": DEFAULT_PAYMENT_HEADER },
          cache: "no-store",
        });
        const json = await res.json();
        rawRef.current[handle] = json;
        decision = evaluate(handle, json, policy);
      } catch {
        decision = {
          agentId: handle, name: fire[i].agent.name, allowed: false,
          grade: fire[i].agent.grade, score: fire[i].agent.score,
          recommendation: "unknown", certified: false, proven: false,
          reasons: ["Rating lookup failed"], scorecardUrl: null, policy,
        };
      }
      if (runIdRef.current !== runId) return;
      setStates((prev) => prev.map((s, j) => (j === i ? { status: decision.allowed ? "allowed" : "blocked", decision } : s)));
      await sleep(240);
    }
    if (runIdRef.current === runId) setRunning(false);
  }

  const fired = states.some((s) => s.status !== "idle");
  const paid = fire.reduce((sum, r, i) => sum + (states[i].status === "allowed" ? r.jobValueUsd : 0), 0);
  const prevented = fire.reduce((sum, r, i) => sum + (states[i].status === "blocked" ? r.jobValueUsd : 0), 0);

  return (
    <div className="space-y-4">
      {/* ---- Policy bar (governs everything below) ---- */}
      <div className="card-stamp p-5">
        <div className="flex flex-wrap items-end gap-x-8 gap-y-4">
          <div>
            <div className="mb-2 font-mono text-[0.68rem] uppercase tracking-wide text-ink-mute">Minimum grade</div>
            <div className="flex flex-wrap gap-1.5">
              {GRADE_FLOORS.map((g) => (
                <button
                  key={g ?? "off"}
                  onClick={() => patch(() => setMinGrade(g))}
                  aria-pressed={minGrade === g}
                  className={`min-w-9 rounded-lg border px-2.5 py-1.5 font-mono text-sm transition-colors ${
                    minGrade === g ? "border-transparent bg-ink text-bg" : "border-line-strong text-ink-soft hover:border-ink"
                  }`}
                >
                  {g ?? "Off"}
                </button>
              ))}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Toggle on={blockAvoid} onClick={() => patch(() => setBlockAvoid((v) => !v))} label={'Block "avoid"'} />
            <Toggle on={requireProven} onClick={() => patch(() => setRequireProven((v) => !v))} label="Require proven" />
            <Toggle on={requireCertified} onClick={() => patch(() => setRequireCertified((v) => !v))} label="Certified only" />
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
        {/* ---- The gate: policy applied to the whole live market ---- */}
        <div className="card-stamp flex flex-col p-6">
          <div className="flex items-baseline justify-between gap-3">
            <div className="eyebrow">Your gate · live market</div>
            <span className="font-mono text-xs text-ink-mute">{gate.total} agents</span>
          </div>

          <div className="mt-4">
            <div className="flex items-end gap-2">
              <span className="font-display text-5xl font-extrabold tabular-nums" style={{ color: "var(--grade-a)" }}>
                {gate.allowed}
              </span>
              <span className="mb-1.5 text-ink-soft">of {gate.total} agents clear your gate</span>
            </div>

            {/* Segmented bar */}
            <div className="mt-3 flex h-3.5 overflow-hidden rounded-full bg-[color-mix(in_srgb,var(--grade-f)_22%,transparent)]">
              <div
                className="h-full rounded-full transition-[width] duration-500 ease-out"
                style={{ width: `${allowedPct}%`, background: "var(--grade-a)" }}
              />
            </div>
            <div className="mt-2 flex justify-between font-mono text-xs">
              <span style={{ color: "var(--grade-a)" }}>✓ {gate.allowed} allowed · {gate.hireGrade} hire-grade</span>
              <span style={{ color: "var(--grade-f)" }}>{gate.blocked} blocked ✕</span>
            </div>
          </div>

          <div className="mt-6">
            <div className="font-mono text-[0.68rem] uppercase tracking-wide text-ink-mute">
              {gate.notable.length ? "Now blocking — even these busy agents" : "Nothing blocked"}
            </div>
            {gate.notable.length > 0 ? (
              <div className="mt-3 flex flex-wrap gap-2">
                {gate.notable.map((a) => (
                  <Link
                    key={a.handle}
                    href={`/agents/${a.handle}`}
                    title={`${a.name} — grade ${a.grade}${a.soldCount ? ` · ${a.soldCount.toLocaleString("en-US")} jobs` : ""}`}
                    className="group flex items-center gap-2 rounded-full border border-line py-1 pl-1 pr-2.5 transition-colors hover:border-line-strong"
                  >
                    <AgentAvatar name={a.name} url={a.avatarUrl} size={24} />
                    <span className="max-w-[110px] truncate text-xs text-ink-soft group-hover:text-ink">{a.name}</span>
                    <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: `var(--grade-${a.grade.toLowerCase()})` }} />
                  </Link>
                ))}
              </div>
            ) : (
              <p className="mt-2 text-sm text-ink-soft">Loosen the policy and popular low-graded agents reappear here.</p>
            )}
          </div>

          <p className="mt-auto pt-6 font-mono text-xs text-ink-mute">
            Every count is the real Vouch grade for a real OKX.AI agent, re-decided by the shipped SDK as you tune the policy.
          </p>
        </div>

        {/* ---- Generated code ---- */}
        <div className="card-stamp flex flex-col overflow-hidden">
          <div className="flex items-center justify-between gap-3 border-b border-line bg-surface-2 px-4 py-2.5">
            <span className="font-mono text-xs text-ink-mute">your-orchestrator.ts</span>
            <CopyButton value={policyCode(policy)} label="code" />
          </div>
          <pre className="flex-1 overflow-x-auto p-5 font-mono text-[0.8rem] leading-relaxed text-ink-soft">
            <code>{policyCode(policy)}</code>
          </pre>
          <div className="border-t border-line px-4 py-3 font-mono text-[0.68rem] text-ink-mute">
            This is the exact policy above, as code. Ship it and the payment can&apos;t fire for a blocked agent.
          </div>
        </div>
      </div>

      {/* ---- Live fire: real payments through the gate ---- */}
      <div className="card-stamp overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line bg-surface-2 px-5 py-4">
          <div>
            <div className="eyebrow">Live fire · real API calls</div>
            <p className="mt-1 text-sm text-ink-soft">
              Your orchestrator is about to pay {fire.length} agents. Run it through the gate above.
            </p>
          </div>
          <button onClick={run} disabled={running} className="btn btn-primary h-11 px-5 disabled:opacity-60">
            {running ? "Running…" : fired ? "Re-run" : "Run orchestrator →"}
          </button>
        </div>

        <ul>
          {fire.map((row, i) => {
            const st = states[i];
            const a = row.agent;
            return (
              <li key={a.handle} className="border-b border-line last:border-0">
                <div className="flex flex-wrap items-center gap-3 px-5 py-4">
                  <StatusGlyph status={st.status} />
                  <AgentAvatar name={a.name} url={a.avatarUrl} size={40} />
                  <div className="min-w-0 flex-1">
                    <Link href={`/agents/${a.handle}`} className="truncate font-semibold hover:text-gold-3">{a.name}</Link>
                    <div className="mt-0.5 font-mono text-xs text-ink-mute">{a.categoryLabel} · about to receive ${row.jobValueUsd}</div>
                  </div>
                  <GradeBadge grade={a.grade} size="sm" />
                  <div className="w-[150px] text-right"><StatusPill status={st.status} amount={row.jobValueUsd} /></div>
                </div>
                {st.status === "blocked" && st.decision && (
                  <div className="animate-rise bg-[color-mix(in_srgb,var(--grade-f)_9%,transparent)] px-5 pb-4 pl-14">
                    <div className="font-mono text-xs" style={{ color: "var(--grade-f)" }}>
                      ⛔ Payment refused — {st.decision.reasons.join(" · ")}
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </ul>

        {fired && !running && (
          <div className="border-t border-line bg-surface-2 px-5 py-3 text-center font-mono text-xs text-ink-soft">
            {prevented > 0 ? (
              <>Guard released ${paid} to vetted agents and stopped <span style={{ color: "var(--grade-f)" }}>${prevented}</span> from reaching agents that failed your policy.</>
            ) : (
              <>Everyone cleared your gate — ${paid} released. Raise the grade floor to see Guard bite.</>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function Toggle({ on, onClick, label }: { on: boolean; onClick: () => void; label: string }) {
  return (
    <button
      onClick={onClick}
      aria-pressed={on}
      className={`inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm transition-colors ${
        on ? "border-gold-3 bg-gold-tint text-gold-3" : "border-line-strong text-ink-soft hover:border-ink"
      }`}
    >
      <span
        className="grid h-4 w-4 place-items-center rounded-[5px] border"
        style={{ borderColor: on ? "var(--gold-3)" : "var(--line-strong)", background: on ? "var(--gold-3)" : "transparent" }}
      >
        {on && (
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="var(--on-gold)" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 6 9 17l-5-5" />
          </svg>
        )}
      </span>
      {label}
    </button>
  );
}

function StatusGlyph({ status }: { status: Status }) {
  if (status === "checking") {
    return (
      <svg className="animate-spin text-gold-3" width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
        <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2.5" opacity="0.25" />
        <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      </svg>
    );
  }
  if (status === "allowed") {
    return (
      <span className="grid h-5 w-5 place-items-center rounded-full" style={{ background: "var(--grade-a)" }}>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--bg)" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
      </span>
    );
  }
  if (status === "blocked") {
    return (
      <span className="grid h-5 w-5 place-items-center rounded-full" style={{ background: "var(--grade-f)" }}>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--bg)" strokeWidth="3.5" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12" /></svg>
      </span>
    );
  }
  return <span className="h-5 w-5 rounded-full border-2 border-line-strong" aria-hidden />;
}

function StatusPill({ status, amount }: { status: Status; amount: number }) {
  if (status === "checking") return <span className="font-mono text-xs text-gold-3">checking…</span>;
  if (status === "allowed") return <span className="font-mono text-xs" style={{ color: "var(--grade-a)" }}>✓ Paid ${amount}</span>;
  if (status === "blocked") return <span className="font-mono text-xs font-semibold" style={{ color: "var(--grade-f)" }}>✕ Blocked</span>;
  return <span className="font-mono text-xs text-ink-mute">· waiting</span>;
}
