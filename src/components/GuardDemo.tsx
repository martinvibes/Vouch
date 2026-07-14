"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { AgentAvatar } from "./AgentAvatar";
import { GradeBadge } from "./GradeBadge";
import { evaluate, DEFAULT_PAYMENT_HEADER, type GuardPolicy, type GuardDecision } from "@/guard";
import type { GradeLetter } from "@/lib/types";

export interface GuardAgent {
  handle: string;
  name: string;
  grade: GradeLetter;
  score: number;
  categoryLabel: string;
  avatarUrl: string | null;
  proven: boolean;
  certified: boolean;
}

export interface DemoRow {
  agent: GuardAgent;
  jobValueUsd: number;
}

type Status = "idle" | "checking" | "allowed" | "blocked";
interface RowState {
  status: Status;
  decision: GuardDecision | null;
}

const GRADE_FLOORS: (GradeLetter | null)[] = [null, "D", "C", "B", "A", "S"];
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export function GuardDemo({ rows }: { rows: DemoRow[] }) {
  const [minGrade, setMinGrade] = useState<GradeLetter | null>("B");
  const [requireProven, setRequireProven] = useState(false);
  const [blockAvoid, setBlockAvoid] = useState(true);
  const [running, setRunning] = useState(false);
  const [states, setStates] = useState<RowState[]>(rows.map(() => ({ status: "idle", decision: null })));

  // Raw rating responses, cached after a run so policy tweaks re-decide instantly.
  const rawRef = useRef<Record<string, unknown>>({});
  const runIdRef = useRef(0);

  const policy: GuardPolicy = useMemo(
    () => ({ minGrade: minGrade ?? undefined, requireProven, blockAvoid }),
    [minGrade, requireProven, blockAvoid],
  );

  // Re-evaluate cached results whenever the policy changes (no re-fetch, no animation).
  const applyPolicy = useCallback(
    (next: GuardPolicy) => {
      if (running) return;
      setStates((prev) =>
        prev.map((s, i) => {
          const raw = rawRef.current[rows[i].agent.handle];
          if (!raw) return s;
          const decision = evaluate(rows[i].agent.handle, raw, next);
          return { status: decision.allowed ? "allowed" : "blocked", decision };
        }),
      );
    },
    [rows, running],
  );

  function setFloor(g: GradeLetter | null) {
    setMinGrade(g);
    applyPolicy({ minGrade: g ?? undefined, requireProven, blockAvoid });
  }
  function toggleProven() {
    const v = !requireProven;
    setRequireProven(v);
    applyPolicy({ minGrade: minGrade ?? undefined, requireProven: v, blockAvoid });
  }
  function toggleAvoid() {
    const v = !blockAvoid;
    setBlockAvoid(v);
    applyPolicy({ minGrade: minGrade ?? undefined, requireProven, blockAvoid: v });
  }

  async function run() {
    if (running) return;
    const runId = ++runIdRef.current;
    setRunning(true);
    setStates(rows.map(() => ({ status: "idle", decision: null })));
    await sleep(200);

    for (let i = 0; i < rows.length; i++) {
      if (runIdRef.current !== runId) return;
      const { handle } = rows[i].agent;
      setStates((prev) => prev.map((s, j) => (j === i ? { ...s, status: "checking" } : s)));
      await sleep(620);

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
          agentId: handle,
          name: rows[i].agent.name,
          allowed: false,
          grade: rows[i].agent.grade,
          score: rows[i].agent.score,
          recommendation: "unknown",
          certified: false,
          proven: false,
          reasons: ["Rating lookup failed"],
          scorecardUrl: null,
          policy,
        };
      }
      if (runIdRef.current !== runId) return;
      setStates((prev) =>
        prev.map((s, j) =>
          j === i ? { status: decision.allowed ? "allowed" : "blocked", decision } : s,
        ),
      );
      await sleep(260);
    }
    if (runIdRef.current === runId) setRunning(false);
  }

  const done = states.some((s) => s.status === "allowed" || s.status === "blocked") && !running;
  const allowed = states.filter((s) => s.status === "allowed");
  const blocked = states.filter((s) => s.status === "blocked");
  const prevented = rows.reduce((sum, r, i) => sum + (states[i].status === "blocked" ? r.jobValueUsd : 0), 0);
  const paid = rows.reduce((sum, r, i) => sum + (states[i].status === "allowed" ? r.jobValueUsd : 0), 0);

  return (
    <div className="card-stamp overflow-hidden">
      {/* Policy bar */}
      <div className="border-b border-line bg-surface-2 p-5">
        <div className="flex flex-wrap items-end gap-x-8 gap-y-4">
          <div>
            <div className="mb-2 font-mono text-[0.68rem] uppercase tracking-wide text-ink-mute">Grade floor</div>
            <div className="flex flex-wrap gap-1.5">
              {GRADE_FLOORS.map((g) => (
                <button
                  key={g ?? "off"}
                  onClick={() => setFloor(g)}
                  aria-pressed={minGrade === g}
                  className={`min-w-9 rounded-lg border px-2.5 py-1.5 font-mono text-sm transition-colors ${
                    minGrade === g
                      ? "border-transparent bg-ink text-bg"
                      : "border-line-strong text-ink-soft hover:border-ink"
                  }`}
                >
                  {g ?? "Off"}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Toggle on={blockAvoid} onClick={toggleAvoid} label={'Block "avoid"'} />
            <Toggle on={requireProven} onClick={toggleProven} label="Require proven" />
          </div>

          <button onClick={run} disabled={running} className="btn btn-primary ml-auto h-11 px-5 disabled:opacity-60">
            {running ? "Running…" : done ? "Re-run orchestrator" : "Run orchestrator →"}
          </button>
        </div>
        <p className="mt-3 font-mono text-xs text-ink-mute">
          Your orchestrator is about to pay {rows.length} agents. Guard vets each payment against this policy first.
        </p>
      </div>

      {/* Pipeline */}
      <ul>
        {rows.map((row, i) => {
          const st = states[i];
          const a = row.agent;
          return (
            <li key={a.handle} className="border-b border-line last:border-0">
              <div className="flex flex-wrap items-center gap-3 px-5 py-4">
                <StatusGlyph status={st.status} />
                <AgentAvatar name={a.name} url={a.avatarUrl} size={40} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <Link href={`/agents/${a.handle}`} className="truncate font-semibold hover:text-gold-3">
                      {a.name}
                    </Link>
                    {a.certified && <span className="text-gold" title="Vouch Certified">✶</span>}
                  </div>
                  <div className="mt-0.5 font-mono text-xs text-ink-mute">
                    {a.categoryLabel} · about to receive ${row.jobValueUsd}
                  </div>
                </div>
                <GradeBadge grade={a.grade} size="sm" />
                <div className="w-[172px] text-right">
                  <StatusPill status={st.status} amount={row.jobValueUsd} />
                </div>
              </div>
              {st.status === "blocked" && st.decision && (
                <div className="animate-rise bg-[color-mix(in_srgb,var(--grade-f)_9%,transparent)] px-5 pb-4 pl-14">
                  <div className="font-mono text-xs" style={{ color: "var(--grade-f)" }}>
                    ⛔ Payment refused — {st.decision.reasons.join(" · ")}
                  </div>
                  {st.decision.scorecardUrl && (
                    <Link href={`/agents/${a.handle}`} className="mt-1 inline-block font-mono text-xs text-ink-mute underline hover:text-ink">
                      inspect the evidence →
                    </Link>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ul>

      {/* Summary */}
      <div className="grid grid-cols-2 border-t border-line sm:grid-cols-4">
        <Stat label="Payments vetted" value={running || done ? String(allowed.length + blocked.length) : "—"} />
        <Stat label="Approved" value={done || running ? String(allowed.length) : "—"} color="var(--grade-a)" border />
        <Stat label="Blocked" value={done || running ? String(blocked.length) : "—"} color="var(--grade-f)" border />
        <Stat
          label="Risky spend prevented"
          value={done || running ? `$${prevented}` : "—"}
          color="var(--gold-3)"
          border
        />
      </div>
      {done && (
        <div className="border-t border-line bg-surface-2 px-5 py-3 text-center font-mono text-xs text-ink-soft">
          {blocked.length > 0 ? (
            <>Guard let ${paid} through to {allowed.length} vetted agent{allowed.length === 1 ? "" : "s"} and stopped ${prevented} from reaching {blocked.length} that failed your policy.</>
          ) : (
            <>Every agent cleared your policy — ${paid} released to {allowed.length} vetted agents. Tighten the grade floor to see Guard bite.</>
          )}
        </div>
      )}
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
  if (status === "checking") return <span className="font-mono text-xs text-gold-3">Guard checking…</span>;
  if (status === "allowed")
    return <span className="font-mono text-xs" style={{ color: "var(--grade-a)" }}>✓ Paid ${amount}</span>;
  if (status === "blocked")
    return <span className="font-mono text-xs font-semibold" style={{ color: "var(--grade-f)" }}>✕ Blocked</span>;
  return <span className="font-mono text-xs text-ink-mute">· waiting</span>;
}

function Stat({ label, value, color, border }: { label: string; value: string; color?: string; border?: boolean }) {
  return (
    <div className={`px-5 py-4 ${border ? "border-l border-line" : ""}`}>
      <div className="font-display text-2xl font-extrabold tabular-nums" style={color ? { color } : undefined}>
        {value}
      </div>
      <div className="mt-0.5 font-mono text-[0.66rem] uppercase tracking-wide text-ink-mute">{label}</div>
    </div>
  );
}
