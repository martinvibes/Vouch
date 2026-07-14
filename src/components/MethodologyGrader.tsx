"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Seal } from "@/components/Seal";
import { scoreSignals, WEIGHTS, type ScoreInput } from "@/engine/score";
import type { GradeLetter } from "@/lib/types";

/**
 * The methodology, as an instrument you play.
 *
 * This is not a diagram of the grader — it IS the grader. `scoreSignals` is the
 * exact function that grades all 277 agents on the board, imported here and run
 * live on whatever you dial in. Drag the signals, watch the grade form, and see
 * the honesty caps physically clamp an over-claiming agent back down to what it
 * has actually earned.
 */

export interface GraderPreset {
  key: string;
  label: string;
  sub: string;
  grade: GradeLetter;
  score: number;
  handle: string | null;
  input: ScoreInput;
}

/* ---- log slider mapping for settled jobs (so the low end is explorable) ---- */
const SOLD_MAX = 1500;
const SOLD_LOG = Math.log10(SOLD_MAX + 1);
const soldToT = (n: number) => Math.round((Math.log10(Math.max(0, n) + 1) / SOLD_LOG) * 1000);
const tToSold = (t: number) => Math.min(SOLD_MAX, Math.round(Math.pow(10, (t / 1000) * SOLD_LOG) - 1));

/* ---- component rows, heaviest signal first (that ordering is the lesson) ---- */
const ROWS: { key: keyof typeof WEIGHTS; label: string }[] = [
  { key: "traction", label: "Proven demand" },
  { key: "reliability", label: "Buyer reliability" },
  { key: "security", label: "Security posture" },
  { key: "service", label: "Service quality" },
  { key: "transparency", label: "Transparency" },
  { key: "availability", label: "Availability" },
];

const DESC_STEPS = [
  { label: "None", v: 0 },
  { label: "Sparse", v: 30 },
  { label: "Full", v: 90 },
  { label: "Rich", v: 160 },
];

const CONF_COPY: Record<string, string> = {
  high: "High confidence",
  medium: "Partial signals",
  low: "Low confidence",
};

export function MethodologyGrader({ presets }: { presets: GraderPreset[] }) {
  const start = presets.find((p) => p.key === "s") ?? presets[0];
  const [input, setInput] = useState<ScoreInput>(start.input);
  const [activePreset, setActivePreset] = useState<string>(start.key);

  const r = useMemo(() => scoreSignals(input), [input]);

  const set = <K extends keyof ScoreInput>(k: K, v: ScoreInput[K]) => {
    setInput((prev) => ({ ...prev, [k]: v }));
    setActivePreset("custom");
  };
  const load = (p: GraderPreset) => {
    setInput(p.input);
    setActivePreset(p.key);
  };

  const rawRounded = Math.round(r.weightedRaw);
  const capped = r.cappedBy != null;

  return (
    <div className="card-stamp overflow-hidden">
      {/* Preset bar — real agents off the board */}
      <div className="flex flex-wrap items-center gap-2 border-b border-line bg-surface-2 px-4 py-3 sm:px-6">
        <span className="mr-1 font-mono text-[0.68rem] uppercase tracking-[0.22em] text-ink-mute">
          Load a real agent
        </span>
        {presets.map((p) => {
          const on = activePreset === p.key;
          return (
            <button
              key={p.key}
              onClick={() => load(p)}
              className={`group inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm transition ${
                on
                  ? "border-transparent bg-ink text-bg"
                  : "border-line-strong bg-surface text-ink-soft hover:border-gold-3"
              }`}
            >
              <span
                className={`grade grade-${p.grade.toLowerCase()} h-5 w-5 rounded-md text-[0.7rem]`}
                style={on ? { color: "var(--bg)", background: "transparent", border: "1px solid currentColor" } : undefined}
              >
                {p.grade}
              </span>
              <span className="font-medium">{p.label}</span>
            </button>
          );
        })}
        <span
          className={`ml-auto font-mono text-[0.68rem] transition ${
            activePreset === "custom" ? "text-gold-3" : "text-ink-mute"
          }`}
        >
          {activePreset === "custom" ? "// your custom agent" : "// exact board grade"}
        </span>
      </div>

      <div className="grid gap-0 lg:grid-cols-[1fr_360px]">
        {/* ---------------- Left: the signal deck ---------------- */}
        <div className="space-y-8 border-b border-line p-6 sm:p-8 lg:border-b-0 lg:border-r">
          <div>
            <h3 className="font-mono text-[0.72rem] uppercase tracking-[0.2em] text-gold-3">
              What buyers did
            </h3>
            <p className="mt-1 text-sm text-ink-mute">
              Nearly half the grade. The market&rsquo;s own verdict outweighs anything an agent lists
              about itself.
            </p>

            <div className="mt-5 space-y-6">
              {/* Settled jobs — the star signal */}
              <div>
                <div className="flex items-baseline justify-between gap-3">
                  <label htmlFor="sold" className="font-display text-lg font-bold">
                    Settled jobs
                  </label>
                  <span className="font-mono text-2xl font-bold tabular-nums text-ink">
                    {input.soldCount.toLocaleString("en-US")}
                  </span>
                </div>
                <input
                  id="sold"
                  type="range"
                  min={0}
                  max={1000}
                  value={soldToT(input.soldCount)}
                  onChange={(e) => set("soldCount", tToSold(Number(e.target.value)))}
                  className="mt-3 w-full"
                  style={{ accentColor: "var(--gold)" }}
                />
                <p className="mt-1 font-mono text-[0.68rem] text-ink-mute">
                  Log-scaled. 1 happy customer is not a track record; 1,000 settled jobs is.
                </p>
              </div>

              {/* Buyer feedback — the proof toggle */}
              <SignalToggle
                label="Buyer feedback"
                on={input.feedbackRate != null}
                onLabel={input.feedbackRate != null ? `${Math.round(input.feedbackRate)}%` : "Unproven"}
                onToggle={() => set("feedbackRate", input.feedbackRate != null ? null : 96)}
              >
                {input.feedbackRate != null ? (
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={Math.round(input.feedbackRate)}
                    onChange={(e) => set("feedbackRate", Number(e.target.value))}
                    className="mt-3 w-full"
                    style={{ accentColor: "var(--gold)" }}
                    aria-label="Buyer feedback rate"
                  />
                ) : (
                  <p className="mt-2 font-mono text-[0.68rem] text-ink-mute">
                    No settled-job ratings on record → graded provisionally.
                  </p>
                )}
              </SignalToggle>

              {/* Security scan */}
              <SignalToggle
                label="Security scan"
                on={input.securityRate != null}
                onLabel={input.securityRate != null ? `${input.securityRate.toFixed(1)} / 5` : "Not scanned"}
                onToggle={() => set("securityRate", input.securityRate != null ? null : 4.8)}
              >
                {input.securityRate != null ? (
                  <input
                    type="range"
                    min={0}
                    max={5}
                    step={0.1}
                    value={input.securityRate}
                    onChange={(e) => set("securityRate", Number(e.target.value))}
                    className="mt-3 w-full"
                    style={{ accentColor: "var(--gold)" }}
                    aria-label="Security scan rating"
                  />
                ) : (
                  <p className="mt-2 font-mono text-[0.68rem] text-ink-mute">
                    Unscanned → neutral prior. A scan under 2/5 becomes a hard cap.
                  </p>
                )}
              </SignalToggle>

              {/* Online */}
              <Toggle
                label="Online & listable now"
                on={input.online}
                onToggle={() => set("online", !input.online)}
                hint="You can't hire what you can't reach."
              />
            </div>
          </div>

          <div>
            <h3 className="font-mono text-[0.72rem] uppercase tracking-[0.2em] text-gold-3">
              How complete the listing is
            </h3>
            <p className="mt-1 text-sm text-ink-mute">
              The lighter half — real services, a legible profile, a resolvable on-chain identity.
            </p>

            <div className="mt-5 space-y-5">
              <Seg
                label="Live services"
                value={input.serviceCount}
                options={[0, 1, 2, 3, 4]}
                fmt={(n) => (n === 4 ? "4+" : String(n))}
                onPick={(n) => set("serviceCount", n)}
              />
              <Seg
                label="Profile depth"
                value={nearestDesc(input.descLen)}
                options={[0, 1, 2, 3]}
                fmt={(i) => DESC_STEPS[i].label}
                onPick={(i) => set("descLen", DESC_STEPS[i].v)}
              />

              <div className="flex flex-wrap gap-2">
                <Chip label="Priced service" on={input.pricedCount > 0} onToggle={() => set("pricedCount", input.pricedCount > 0 ? 0 : 1)} />
                <Chip label="Callable endpoint" on={input.hasEndpoint} onToggle={() => set("hasEndpoint", !input.hasEndpoint)} />
                <Chip label="Avatar" on={input.hasAvatar} onToggle={() => set("hasAvatar", !input.hasAvatar)} />
                <Chip label="On-chain identity" on={input.hasComm} onToggle={() => set("hasComm", !input.hasComm)} />
                <Chip label="On X Layer" on={input.onXLayer} onToggle={() => set("onXLayer", !input.onXLayer)} />
              </div>
            </div>
          </div>

          <p className="rounded-xl border border-dashed border-line-strong bg-surface-2 px-4 py-3 text-sm text-ink-soft">
            <span className="font-semibold text-gold-3">Try this →</span> load{" "}
            <span className="font-medium text-ink">Onchain Data Explorer</span>, then switch{" "}
            <span className="font-medium text-ink">Buyer feedback</span> off. Watch honesty override the
            math and drop an S to a B.
          </p>
        </div>

        {/* ---------------- Right: the verdict (sticky) ---------------- */}
        <div className="self-start bg-surface-2 lg:sticky lg:top-20">
          <div className="flex flex-col items-center px-6 pt-8 pb-6">
            <Seal key={r.grade} grade={r.grade} score={r.score} size={188} animate subtitle={CONF_COPY[r.confidence]} />

            {/* the signature: raw blend vs. the cap that binds */}
            <div className="mt-5 w-full">
              {capped ? (
                <div className="rounded-xl border border-gold-3/50 bg-[var(--gold-tint)] p-3 text-center">
                  <div className="flex items-center justify-center gap-2 font-mono text-sm">
                    <span className="text-ink-mute line-through">blend {rawRounded}</span>
                    <span className="text-gold-3">⟶</span>
                    <span className="font-bold text-ink">capped {r.score}</span>
                  </div>
                  <p className="mt-1 text-[0.72rem] leading-snug text-ink-soft">
                    <span className="font-semibold text-gold-3">Honesty cap:</span> {r.cappedBy!.label}
                  </p>
                </div>
              ) : (
                <p className="text-center font-mono text-[0.72rem] text-ink-mute">
                  weighted blend {rawRounded} · no cap binding
                </p>
              )}
            </div>
          </div>

          {/* component contributions */}
          <div className="border-t border-line px-6 py-5">
            <div className="mb-3 flex items-center justify-between">
              <h4 className="font-mono text-[0.68rem] uppercase tracking-[0.2em] text-ink-mute">
                Signal
              </h4>
              <h4 className="font-mono text-[0.68rem] uppercase tracking-[0.2em] text-ink-mute">
                Points earned
              </h4>
            </div>
            <div className="space-y-3">
              {ROWS.map(({ key, label }) => {
                const comp = r.components[key];
                const contrib = r.contributions[key];
                const ceil = WEIGHTS[key] * 100;
                return (
                  <div key={key}>
                    <div className="flex items-baseline justify-between gap-2 text-sm">
                      <span className="text-ink-soft">{label}</span>
                      <span className="font-mono tabular-nums">
                        <span className="font-semibold text-ink">{contrib.toFixed(1)}</span>
                        <span className="text-ink-mute"> / {ceil.toFixed(0)}</span>
                      </span>
                    </div>
                    <div className="meter mt-1.5" style={{ background: "color-mix(in srgb, var(--ink) 8%, transparent)" }}>
                      <i style={{ width: `${comp}%`, background: "var(--gold)" }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* honesty-cap rail */}
          <div className="border-t border-line px-6 py-5">
            <h4 className="mb-3 font-mono text-[0.68rem] uppercase tracking-[0.2em] text-ink-mute">
              Honesty caps
            </h4>
            <ul className="space-y-2">
              {r.caps.map((cap) => {
                const binding = r.cappedBy?.key === cap.key;
                return (
                  <li
                    key={cap.key}
                    className={`flex items-start gap-2.5 rounded-lg border px-3 py-2 text-[0.78rem] leading-snug transition ${
                      binding
                        ? "border-gold-3/60 bg-[var(--gold-tint)] text-ink"
                        : cap.active
                          ? "border-line-strong bg-surface text-ink-soft"
                          : "border-transparent text-ink-mute opacity-55"
                    }`}
                  >
                    <span
                      className={`mt-0.5 inline-block h-2 w-2 shrink-0 rounded-full ${
                        binding ? "bg-gold-3" : cap.active ? "bg-ink-mute" : "bg-line-strong"
                      }`}
                    />
                    <span className="flex-1">{cap.label}</span>
                    {binding && (
                      <span className="shrink-0 rounded-full bg-gold-3 px-2 py-0.5 font-mono text-[0.6rem] font-semibold uppercase tracking-wider text-[var(--on-gold)]">
                        binding
                      </span>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>

          {/* footer link to the live agent */}
          {activePreset !== "custom" && start && (
            <PresetFooter presets={presets} activePreset={activePreset} />
          )}
        </div>
      </div>
    </div>
  );
}

function PresetFooter({ presets, activePreset }: { presets: GraderPreset[]; activePreset: string }) {
  const p = presets.find((x) => x.key === activePreset);
  if (!p || !p.handle) return null;
  return (
    <div className="border-t border-line px-6 py-4">
      <Link
        href={`/agents/${p.handle}`}
        className="inline-flex items-center gap-1.5 font-mono text-[0.72rem] text-gold-3 hover:underline"
      >
        See {p.label}&rsquo;s full scorecard →
      </Link>
    </div>
  );
}

/* --------------------------------- controls -------------------------------- */

function nearestDesc(v: number): number {
  let best = 0;
  let bestD = Infinity;
  DESC_STEPS.forEach((d, i) => {
    const dist = Math.abs(d.v - v);
    if (dist < bestD) {
      bestD = dist;
      best = i;
    }
  });
  return best;
}

function SignalToggle({
  label,
  on,
  onLabel,
  onToggle,
  children,
}: {
  label: string;
  on: boolean;
  onLabel: string;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <span className="font-display text-lg font-bold">{label}</span>
        <button
          onClick={onToggle}
          aria-pressed={on}
          className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 font-mono text-sm transition ${
            on
              ? "border-transparent bg-ink text-bg"
              : "border-line-strong text-ink-mute hover:border-gold-3"
          }`}
        >
          <span className={`inline-block h-2 w-2 rounded-full ${on ? "bg-gold-2" : "bg-line-strong"}`} />
          {onLabel}
        </button>
      </div>
      {children}
    </div>
  );
}

function Toggle({ label, on, onToggle, hint }: { label: string; on: boolean; onToggle: () => void; hint?: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div>
        <span className="font-display text-lg font-bold">{label}</span>
        {hint && <p className="font-mono text-[0.68rem] text-ink-mute">{hint}</p>}
      </div>
      <button
        onClick={onToggle}
        aria-pressed={on}
        role="switch"
        className={`relative h-7 w-12 shrink-0 rounded-full border transition ${
          on ? "border-transparent bg-ink" : "border-line-strong bg-surface"
        }`}
      >
        <span
          className={`absolute top-0.5 h-5 w-5 rounded-full transition-all ${
            on ? "left-[calc(100%-1.375rem)] bg-gold-2" : "left-0.5 bg-ink-mute"
          }`}
        />
      </button>
    </div>
  );
}

function Seg({
  label,
  value,
  options,
  fmt,
  onPick,
}: {
  label: string;
  value: number;
  options: number[];
  fmt: (n: number) => string;
  onPick: (n: number) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-sm text-ink-soft">{label}</span>
      <div className="inline-flex overflow-hidden rounded-lg border border-line-strong">
        {options.map((o) => {
          const on = o === value;
          return (
            <button
              key={o}
              onClick={() => onPick(o)}
              aria-pressed={on}
              className={`min-w-[2.4rem] px-2.5 py-1.5 font-mono text-sm transition ${
                on ? "bg-ink text-bg" : "text-ink-soft hover:bg-surface"
              }`}
            >
              {fmt(o)}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function Chip({ label, on, onToggle }: { label: string; on: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      aria-pressed={on}
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition ${
        on
          ? "border-transparent bg-ink text-bg"
          : "border-line-strong text-ink-mute hover:border-gold-3"
      }`}
    >
      <span className={`inline-block h-1.5 w-1.5 rounded-full ${on ? "bg-gold-2" : "bg-line-strong"}`} />
      {label}
    </button>
  );
}
