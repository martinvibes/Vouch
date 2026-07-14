/**
 * Vouch Guard — a trust firewall for agent payments.
 *
 * Drop it in front of any payment your agent is about to make. Before money
 * moves, Guard asks the Vouch rating API how the counterparty grades, checks the
 * result against your policy, and blocks the payment if it doesn't clear the bar.
 *
 * The whole marketplace is agents moving money. Guard is the layer that decides
 * which of them deserve it — so your orchestrator hires on merit, not marketing.
 *
 * Isomorphic (browser or server), zero runtime deps, one network call per check.
 *
 *   import { guardedPay } from "@vouch/guard";
 *
 *   const pay = guardedPay(myEscrowPay, { minGrade: "B", blockAvoid: true });
 *   await pay(agentId, amountUsd);   // throws GuardBlockedError if the agent fails policy
 */

import type { GradeLetter } from "@/lib/types";

export type Recommendation = "hire" | "verify" | "avoid" | "unknown";

/** What an agent must clear before your money is allowed to move. */
export interface GuardPolicy {
  /** Minimum letter grade, inclusive. e.g. "B" blocks C, D, F. */
  minGrade?: GradeLetter;
  /** Minimum 0–100 score. */
  minScore?: number;
  /** Block agents with no settled jobs on record. */
  requireProven?: boolean;
  /** Block agents that aren't Vouch Certified. */
  requireCertified?: boolean;
  /** Block when Vouch's recommendation is "avoid". Default: true. */
  blockAvoid?: boolean;
  /** What to do when no rating exists for the agent. Default: "block". */
  onUnknown?: "allow" | "block";
}

export interface GuardOptions {
  /** Origin of the Vouch API (e.g. "https://vouch-aufgabe.vercel.app"). Default: same-origin. */
  baseUrl?: string;
  /** Your fetch, ideally x402-aware so it settles the $0.02 lookup automatically. */
  fetch?: typeof fetch;
  /** x402 payment payload for the X-PAYMENT header. */
  paymentHeader?: string;
  signal?: AbortSignal;
}

/** The verdict Guard reached for one agent under one policy. */
export interface GuardDecision {
  agentId: string;
  name: string | null;
  allowed: boolean;
  grade: GradeLetter | null;
  score: number | null;
  recommendation: Recommendation;
  certified: boolean;
  proven: boolean;
  /** Why the payment was blocked (empty when allowed). */
  reasons: string[];
  scorecardUrl: string | null;
  policy: GuardPolicy;
}

/** Thrown by {@link assertVouched} / {@link guardedPay} when a payment is blocked. */
export class GuardBlockedError extends Error {
  readonly decision: GuardDecision;
  constructor(decision: GuardDecision) {
    const who = decision.name ?? decision.agentId;
    super(
      `Vouch Guard blocked payment to ${who}: ${decision.reasons.join("; ") || "failed policy"}`,
    );
    this.name = "GuardBlockedError";
    this.decision = decision;
  }
}

const GRADE_ORDER: Record<GradeLetter, number> = { S: 6, A: 5, B: 4, C: 3, D: 2, F: 1 };
const DEFAULT_POLICY: Required<Pick<GuardPolicy, "blockAvoid" | "onUnknown">> = {
  blockAvoid: true,
  onUnknown: "block",
};

/** Default demo payment payload. In production, pass a real x402-signed header. */
export const DEFAULT_PAYMENT_HEADER = "vouch-guard-x402-demo";

/** Apply a policy to a raw Vouch rating response. Pure — no I/O. */
export function evaluate(
  agentId: string,
  data: unknown,
  policy: GuardPolicy = {},
): GuardDecision {
  const p = { ...DEFAULT_POLICY, ...policy };
  const d = (data ?? {}) as {
    agent?: { name?: string };
    rating?: { grade?: GradeLetter; score?: number; certified?: boolean; proven?: boolean };
    recommendation?: Recommendation;
    evidence?: { scorecard?: string };
  };

  const grade = d.rating?.grade ?? null;
  const score = typeof d.rating?.score === "number" ? d.rating.score : null;
  const recommendation: Recommendation = d.recommendation ?? "unknown";
  const certified = !!d.rating?.certified;
  const proven = !!d.rating?.proven;

  const reasons: string[] = [];
  if (p.blockAvoid && recommendation === "avoid") {
    reasons.push("Vouch recommends AVOID");
  }
  if (p.minGrade && grade && GRADE_ORDER[grade] < GRADE_ORDER[p.minGrade]) {
    reasons.push(`Grade ${grade} is below the ${p.minGrade} floor`);
  }
  if (p.minScore != null && score != null && score < p.minScore) {
    reasons.push(`Score ${score} is below the ${p.minScore} floor`);
  }
  if (p.requireProven && !proven) {
    reasons.push("Unproven — no settled jobs on record");
  }
  if (p.requireCertified && !certified) {
    reasons.push("Not Vouch Certified");
  }

  return {
    agentId,
    name: d.agent?.name ?? null,
    allowed: reasons.length === 0,
    grade,
    score,
    recommendation,
    certified,
    proven,
    reasons,
    scorecardUrl: d.evidence?.scorecard ?? null,
    policy: p,
  };
}

/** Ask Vouch how an agent grades and evaluate it against your policy. Never throws for a block. */
export async function vouchCheck(
  agentId: string,
  policy: GuardPolicy = {},
  opts: GuardOptions = {},
): Promise<GuardDecision> {
  const f = opts.fetch ?? fetch;
  const base = opts.baseUrl ?? "";
  const res = await f(`${base}/api/vouch/${encodeURIComponent(agentId)}`, {
    headers: { "X-PAYMENT": opts.paymentHeader ?? DEFAULT_PAYMENT_HEADER },
    cache: "no-store",
    signal: opts.signal,
  });

  if (res.status === 404) {
    const p = { ...DEFAULT_POLICY, ...policy };
    const allowed = p.onUnknown === "allow";
    return {
      agentId,
      name: null,
      allowed,
      grade: null,
      score: null,
      recommendation: "unknown",
      certified: false,
      proven: false,
      reasons: allowed ? [] : ["No Vouch rating on file for this agent"],
      scorecardUrl: null,
      policy: p,
    };
  }

  if (!res.ok) {
    throw new Error(`Vouch Guard: rating lookup failed (HTTP ${res.status})`);
  }

  return evaluate(agentId, await res.json(), policy);
}

/** Like {@link vouchCheck}, but throws {@link GuardBlockedError} if the agent fails policy. */
export async function assertVouched(
  agentId: string,
  policy: GuardPolicy = {},
  opts: GuardOptions = {},
): Promise<GuardDecision> {
  const decision = await vouchCheck(agentId, policy, opts);
  if (!decision.allowed) throw new GuardBlockedError(decision);
  return decision;
}

/**
 * Wrap a payment function so it can't fire for an agent that fails policy. The
 * wrapped function takes the agent id first, then whatever args your pay fn needs.
 *
 *   const pay = guardedPay(escrow.release, { minGrade: "A" });
 *   await pay(agentId, amountUsd);
 */
export function guardedPay<Args extends unknown[], R>(
  pay: (agentId: string, ...args: Args) => Promise<R>,
  policy: GuardPolicy = {},
  opts: GuardOptions = {},
): (agentId: string, ...args: Args) => Promise<R> {
  return async (agentId, ...args) => {
    await assertVouched(agentId, policy, opts);
    return pay(agentId, ...args);
  };
}
