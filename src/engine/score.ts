import type { Confidence, GradeLetter } from "@/lib/types";
import { toGrade, CERTIFY_THRESHOLD } from "@/lib/grade";

/**
 * The scoring core — the exact math behind every Vouch grade, isolated as a
 * pure function so it has ONE home. `rateAgent` (server) and the public
 * methodology grader (client) both call this, so what visitors can play with is
 * literally the engine that grades the board, never a lookalike.
 *
 * Given the real, published signals for one agent, it returns the six component
 * scores, the weighted raw, the honesty caps (and which ones bind), and the
 * final capped score, grade, confidence, and certification.
 */

export const UNPROVEN_RELIABILITY_PRIOR = 46; // no feedback → provisional, mid-low
export const UNKNOWN_SECURITY_PRIOR = 55; // not scanned → mild neutral
export const TRACTION_CEIL = 1500; // ~ the busiest agent in the market; anchors the log scale

/** Fixed rubric weights, keyed to the six criteria. Sum to 1. */
export const WEIGHTS = {
  traction: 0.24,
  reliability: 0.22,
  security: 0.2,
  service: 0.16,
  availability: 0.08,
  transparency: 0.1,
} as const;

export const clamp = (n: number, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, n));

/**
 * Proven demand, log-scaled. soldCount is the market's own verdict — the number
 * of jobs buyers actually paid for and completed. 0 jobs → 0; the busiest
 * agents → ~100.
 */
export function tractionScore(sold: number): number {
  if (sold <= 0) return 0;
  return clamp(12 + (Math.log10(sold + 1) / Math.log10(TRACTION_CEIL)) * 88);
}

/** The raw, published signals that drive a grade. */
export interface ScoreInput {
  soldCount: number; // settled jobs, >= 0
  feedbackRate: number | null; // 0..100 buyer satisfaction, or null (unproven)
  securityRate: number | null; // 0..5 OKX scan, or null (not scanned)
  online: boolean;
  serviceCount: number;
  pricedCount: number; // services with a real fee
  hasEndpoint: boolean; // at least one callable endpoint
  descLen: number; // profile description length
  hasAvatar: boolean;
  hasComm: boolean; // resolvable communication address
  onXLayer: boolean; // chainIndex === 196
}

export interface CapRule {
  key: string;
  label: string;
  ceiling: number;
  active: boolean;
}

export interface ScoreResult {
  components: Record<keyof typeof WEIGHTS, number>; // 0..100 each
  contributions: Record<keyof typeof WEIGHTS, number>; // component * weight
  weightedRaw: number; // 0..100 before caps
  caps: CapRule[]; // every rule + whether it binds
  cap: number; // the binding ceiling (min of active), else 100
  cappedBy: CapRule | null; // the rule that actually lowered the score, if any
  score: number; // final 0..100
  grade: GradeLetter;
  proven: boolean;
  confidence: Confidence;
  certified: boolean;
}

export function scoreSignals(input: ScoreInput): ScoreResult {
  const {
    soldCount,
    feedbackRate,
    securityRate,
    online,
    serviceCount,
    pricedCount,
    hasEndpoint,
    descLen,
    hasAvatar,
    hasComm,
    onXLayer,
  } = input;

  // ---- Component scores (0..100) ----
  const traction = tractionScore(Math.max(0, soldCount));
  const reliability = feedbackRate ?? UNPROVEN_RELIABILITY_PRIOR;
  const security = securityRate != null ? (securityRate / 5) * 100 : UNKNOWN_SECURITY_PRIOR;

  let service = 20;
  if (serviceCount >= 1) service = 66;
  if (serviceCount >= 2) service = 78;
  if (serviceCount >= 3) service = 86;
  if (pricedCount > 0) service += 8;
  if (hasEndpoint) service += 6;
  service = clamp(service);

  const availability = online ? 100 : 40;

  let transparency = 30;
  if (descLen >= 140) transparency += 32;
  else if (descLen >= 60) transparency += 20;
  else if (descLen >= 20) transparency += 8;
  if (hasAvatar) transparency += 20;
  if (hasComm) transparency += 14;
  if (onXLayer) transparency += 4;
  transparency = clamp(transparency);

  const components = { traction, reliability, security, service, availability, transparency };

  // ---- Weighted aggregate ----
  const contributions = {
    traction: traction * WEIGHTS.traction,
    reliability: reliability * WEIGHTS.reliability,
    security: security * WEIGHTS.security,
    service: service * WEIGHTS.service,
    availability: availability * WEIGHTS.availability,
    transparency: transparency * WEIGHTS.transparency,
  };
  const weightedRaw =
    contributions.traction +
    contributions.reliability +
    contributions.security +
    contributions.service +
    contributions.availability +
    contributions.transparency;

  const proven = feedbackRate != null;
  const hasSec = securityRate != null;
  const confidence: Confidence = proven && hasSec ? "high" : proven || hasSec ? "medium" : "low";

  // ---- Honesty caps (hard ceilings that can only lower a grade) ----
  const caps: CapRule[] = [
    { key: "unproven", label: "Unproven — no settled jobs, capped at B", ceiling: 74, active: !proven },
    { key: "confidence", label: "Partial signals — S needs feedback + a scan, capped at A", ceiling: 88, active: confidence !== "high" },
    { key: "offline", label: "Offline — can't hire what you can't reach, capped at A", ceiling: 85, active: !online },
    { key: "insecure2", label: "Security below 2/5 — capped at D", ceiling: 50, active: securityRate != null && securityRate < 2 },
    { key: "insecure1", label: "Security below 1/5 — capped at F", ceiling: 40, active: securityRate != null && securityRate < 1 },
  ];
  const activeCaps = caps.filter((c) => c.active);
  const cap = activeCaps.length ? Math.min(...activeCaps.map((c) => c.ceiling)) : 100;

  const score = Math.round(clamp(Math.min(weightedRaw, cap)));
  // The cap only "binds" if it actually pulled the score below the raw blend.
  const cappedBy =
    Math.round(weightedRaw) > score
      ? activeCaps.reduce<CapRule | null>((lo, c) => (!lo || c.ceiling < lo.ceiling ? c : lo), null)
      : null;

  const grade = toGrade(score);
  const certified = proven && score >= CERTIFY_THRESHOLD;

  return {
    components,
    contributions,
    weightedRaw,
    caps,
    cap,
    cappedBy,
    score,
    grade,
    proven,
    confidence,
    certified,
  };
}
