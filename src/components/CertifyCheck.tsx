"use client";

import { useState } from "react";
import Link from "next/link";
import type { GradeLetter } from "@/lib/types";
import { GradeBadge } from "./GradeBadge";

export interface CheckEntry {
  handle: string;
  name: string;
  grade: GradeLetter;
  score: number;
  certified: boolean;
  proven: boolean;
  weakest: { label: string; score: number };
}

const THRESHOLD = 80;

/**
 * Self-check. An agent builder picks their listing and instantly sees their
 * public grade, whether they're certified, and the single criterion costing
 * them the most — the honest hook for improving before ordering a re-grade.
 */
export function CertifyCheck({ agents }: { agents: CheckEntry[] }) {
  const [handle, setHandle] = useState(agents[0]?.handle ?? "");
  const agent = agents.find((a) => a.handle === handle) ?? agents[0];
  const gap = Math.max(0, THRESHOLD - agent.score);

  return (
    <div className="card-stamp overflow-hidden">
      <div className="flex flex-wrap items-center gap-3 border-b border-line p-4">
        <span className="font-mono text-sm text-ink-mute">Your agent</span>
        <select
          value={handle}
          onChange={(e) => setHandle(e.target.value)}
          className="rounded-lg border border-line-strong bg-surface-2 px-3 py-2 font-mono text-sm text-ink outline-none focus:border-gold-3"
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
              style={{ color: agent.certified ? "var(--gold-3)" : "var(--ink-mute)" }}
            >
              {agent.certified ? "✶ Vouch Certified" : agent.proven ? "Not yet certified" : "Unproven — no settled jobs"}
            </div>
          </div>
        </div>

        <div className="sm:border-l sm:border-line sm:pl-6">
          {agent.certified ? (
            <p className="text-ink-soft">
              You&rsquo;ve earned the seal. Your weakest signal is{" "}
              <strong className="text-ink">{agent.weakest.label}</strong> at {agent.weakest.score}/100 —
              lift it and you&rsquo;re on the path to an S.
            </p>
          ) : !agent.proven ? (
            <p className="text-ink-soft">
              You have no settled jobs yet, so you&rsquo;re graded provisionally and capped at a B until
              buyers have actually hired you. The fastest path to certification is real completed work —
              then your <strong className="text-ink">{agent.weakest.label}</strong> ({agent.weakest.score}/100) is next.
            </p>
          ) : (
            <p className="text-ink-soft">
              You&rsquo;re <strong className="text-ink">{gap} point{gap === 1 ? "" : "s"}</strong> from
              certification. Your biggest opportunity is{" "}
              <strong className="text-ink">{agent.weakest.label}</strong>, scoring just {agent.weakest.score}/100.
            </p>
          )}
          <Link href={`/agents/${agent.handle}`} className="mt-4 inline-flex text-sm text-gold-3 hover:underline">
            See the full scorecard →
          </Link>
        </div>
      </div>
    </div>
  );
}
