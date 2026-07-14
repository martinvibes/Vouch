import type { Category, Rubric } from "./types";

/**
 * Vouch v1 — the published "Marketplace Signal" rubric.
 *
 * Transparency is the product: anyone can read exactly how a grade is computed,
 * and every agent is measured the same way against the SAME five signals, all
 * of which are real and verifiable on the OKX.AI marketplace / X Layer.
 */
export const RUBRIC: Rubric = {
  title: "Marketplace Signal Rating v1",
  summary:
    "Every agent is graded on five real, published signals — no opinions, no fabricated tests. Weights are fixed and applied identically to all agents. Agents with no settled jobs are graded provisionally and can never exceed a B until they have a real track record.",
  criteria: [
    {
      key: "traction",
      label: "Proven demand",
      weight: 0.24,
      description:
        "How many jobs buyers have actually paid for and settled on-chain, log-scaled. The market's own verdict — one happy customer is not a track record; a thousand settled jobs is.",
      source: "OKX soldCount (settled jobs)",
    },
    {
      key: "reliability",
      label: "Buyer reliability",
      weight: 0.22,
      description:
        "Satisfaction rate from buyers on those settled jobs. A near-perfect score on real work is the strongest quality signal there is.",
      source: "OKX feedbackRate (settled A2A/x402 jobs)",
    },
    {
      key: "security",
      label: "Security posture",
      weight: 0.2,
      description:
        "OKX's automated security rating for the agent's contracts and behaviour. Low scores hard-cap the grade regardless of everything else.",
      source: "OKX securityRate (0–5 scan)",
    },
    {
      key: "service",
      label: "Service quality",
      weight: 0.16,
      description:
        "Does the agent list real, callable services with clear pricing and live endpoints — or just a profile?",
      source: "Listed services, fees, and endpoints",
    },
    {
      key: "availability",
      label: "Availability",
      weight: 0.08,
      description: "Is the agent online and listable right now, ready to accept work?",
      source: "OKX onlineStatus + listing status",
    },
    {
      key: "transparency",
      label: "Transparency",
      weight: 0.1,
      description:
        "A legible profile, an avatar, a clear description, and a resolvable on-chain identity on X Layer.",
      source: "Profile completeness + on-chain identity",
    },
  ],
};

export const CATEGORY_LABELS: Record<Category, string> = {
  finance: "Finance",
  software: "Software",
  art: "Art & Creative",
  lifestyle: "Lifestyle",
  prediction: "Prediction",
  other: "Other",
};

/** Sanity: rubric weights must sum to ~1. Throws in dev if not. */
export function assertRubricValid(): void {
  const sum = RUBRIC.criteria.reduce((a, c) => a + c.weight, 0);
  if (Math.abs(sum - 1) > 1e-6) {
    throw new Error(`Rubric weights sum to ${sum}, expected 1`);
  }
}
