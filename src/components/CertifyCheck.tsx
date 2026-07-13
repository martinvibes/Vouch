"use client";

import { useState } from "react";
import type { GradeLetter } from "@/lib/types";
import { GradeBadge } from "./GradeBadge";

export interface CheckEntry {
  handle: string;
  name: string;
  grade: GradeLetter;
  score: number;
  certified: boolean;
  weakest: { label: string; score: number };
}

/**
 * Self-check. An agent builder picks their listing and instantly sees their
 * public grade, whether they're certified, and the single criterion costing
 * them the most — the hook for ordering a deep audit.
 */
export function CertifyCheck({ agents }: { agents: CheckEntry[] }) {
  const [handle, setHandle] = useState(agents[0]?.handle ?? "");
  const agent = agents.find((a) => a.handle === handle) ?? agents[0];
  const gap = 82 - agent.score;

  return (
    <div className="panel-flat overflow-hidden">
      <div className="flex flex-wrap items-center gap-3 border-b border-[var(--color-line)] p-4">
        <span className="font-mono text-sm text-[var(--color-fg-mute)]">Your agent</span>
        <select
          value={handle}
          onChange={(e) => setHandle(e.target.value)}
          className="rounded-lg border border-[var(--color-line-strong)] bg-[var(--color-ink)] px-3 py-2 font-mono text-sm text-[var(--color-fg)]"
        >
          {agents.map((a) => (
            <option key={a.handle} value={a.handle}>
              {a.name}
            </option>
          ))}
        </select>
      </div>

      <div className="grid gap-6 p-6 sm:grid-cols-[auto_1fr] sm:items-center">
        <div className="flex items-center gap-4">
          <GradeBadge grade={agent.grade} size="xl" />
          <div>
            <div className="font-mono text-2xl font-semibold tabular-nums">{agent.score}/100</div>
            <div
              className="mt-1 text-sm font-medium"
              style={{ color: agent.certified ? "var(--color-gold)" : "var(--color-fg-mute)" }}
            >
              {agent.certified ? "✶ Vouch Certified" : "Not yet certified"}
            </div>
          </div>
        </div>

        <div className="sm:border-l sm:border-[var(--color-line)] sm:pl-6">
          {agent.certified ? (
            <p className="text-[var(--color-fg-dim)]">
              You&rsquo;ve earned the seal. Your weakest area is{" "}
              <strong className="text-[var(--color-fg)]">{agent.weakest.label}</strong> at{" "}
              {agent.weakest.score}/100 — a deep audit shows how to push it toward an S.
            </p>
          ) : (
            <p className="text-[var(--color-fg-dim)]">
              You&rsquo;re <strong className="text-[var(--color-fg)]">{gap} point{gap === 1 ? "" : "s"}</strong>{" "}
              from certification. Your biggest opportunity is{" "}
              <strong className="text-[var(--color-fg)]">{agent.weakest.label}</strong>, scoring just{" "}
              {agent.weakest.score}/100. A deep audit pinpoints the fixes.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
