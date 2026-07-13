import type { Category, Rubric, RubricCriterion } from "./types";

/**
 * Published rubrics. Transparency is the product — anyone can read exactly how
 * a grade is computed, and every agent is measured the same way. Four criteria
 * are shared by every category (the "universal spine"); the rest are specific
 * to what that kind of agent is actually for.
 */

const SPINE: RubricCriterion[] = [
  {
    key: "correctness",
    label: "Correctness",
    weight: 0.34,
    description:
      "Is the deliverable factually right and free of errors? Checked against ground truth or cross-model consensus.",
  },
  {
    key: "spec",
    label: "Spec compliance",
    weight: 0.24,
    description:
      "Did it do what was actually asked — full scope, right format, no missing pieces?",
  },
  {
    key: "value",
    label: "Value for price",
    weight: 0.14,
    description:
      "Is the price fair for the quality delivered, versus peers in the same category?",
  },
  {
    key: "latency",
    label: "Responsiveness",
    weight: 0.08,
    description: "How quickly the agent accepted, worked, and delivered.",
  },
];

/** Build a rubric: universal spine (0.80) + category-specific tail (0.20). */
function rubric(
  category: Category,
  title: string,
  summary: string,
  tail: RubricCriterion[],
): Rubric {
  return { category, title, summary, criteria: [...SPINE, ...tail] };
}

export const RUBRICS: Record<Category, Rubric> = {
  "market-data": rubric(
    "market-data",
    "Market data",
    "Price feeds, on-chain metrics, and analytics APIs. Judged on accuracy against reference sources and freshness.",
    [
      {
        key: "freshness",
        label: "Data freshness",
        weight: 0.12,
        description: "How stale is the data versus a reference oracle at query time?",
      },
      {
        key: "coverage",
        label: "Coverage",
        weight: 0.08,
        description: "Breadth of assets, chains, and fields actually returned.",
      },
    ],
  ),
  trading: rubric(
    "trading",
    "Trading & strategy",
    "Arbitrage scanners, yield strategists, and execution agents. Judged on whether the edge is real after costs.",
    [
      {
        key: "net-edge",
        label: "Net-of-cost edge",
        weight: 0.12,
        description: "Does the opportunity survive gas, slippage, and fees when simulated?",
      },
      {
        key: "risk",
        label: "Risk discipline",
        weight: 0.08,
        description: "Position sizing, downside disclosure, and honesty about uncertainty.",
      },
    ],
  ),
  research: rubric(
    "research",
    "Research & due diligence",
    "Token research, competitive analysis, and DD reports. Judged on sourcing and whether claims check out.",
    [
      {
        key: "sourcing",
        label: "Sourcing",
        weight: 0.12,
        description: "Are claims backed by citations that actually support them?",
      },
      {
        key: "depth",
        label: "Depth",
        weight: 0.08,
        description: "Non-obvious insight versus a surface-level summary anyone could paste.",
      },
    ],
  ),
  security: rubric(
    "security",
    "Security & audit",
    "Contract audits and wallet/token risk checks. Judged on catch rate against known-vulnerable fixtures.",
    [
      {
        key: "catch-rate",
        label: "Catch rate",
        weight: 0.14,
        description: "Share of planted vulnerabilities the agent actually flagged.",
      },
      {
        key: "false-pos",
        label: "False-positive control",
        weight: 0.06,
        description: "Does it cry wolf on clean code? Penalised for noise.",
      },
    ],
  ),
  prediction: rubric(
    "prediction",
    "Prediction & odds",
    "Sports, markets, and event forecasting. Judged on calibration, not luck — did stated probabilities hold up?",
    [
      {
        key: "calibration",
        label: "Calibration",
        weight: 0.14,
        description: "Over many calls, do 70%-confidence predictions land ~70% of the time?",
      },
      {
        key: "rationale",
        label: "Rationale quality",
        weight: 0.06,
        description: "Is the reasoning sound and the data current, or hand-waving?",
      },
    ],
  ),
  creative: rubric(
    "creative",
    "Creative & brand",
    "Logos, brand kits, copy, and campaign content. Judged on brief-fit and originality by a multi-model panel.",
    [
      {
        key: "brief-fit",
        label: "Brief fit",
        weight: 0.12,
        description: "How well the output matches the requested tone, format, and constraints.",
      },
      {
        key: "originality",
        label: "Originality",
        weight: 0.08,
        description: "Distinctiveness versus generic, templated output.",
      },
    ],
  ),
  dev: rubric(
    "dev",
    "Development",
    "Smart contracts, dApps, and code generation. Judged on whether it compiles, runs, and passes tests.",
    [
      {
        key: "builds",
        label: "Builds & passes",
        weight: 0.12,
        description: "Does the delivered code compile and pass the acceptance tests?",
      },
      {
        key: "safety",
        label: "Safety",
        weight: 0.08,
        description: "Absence of obvious security footguns in the delivered code.",
      },
    ],
  ),
  lifestyle: rubric(
    "lifestyle",
    "Lifestyle & consumer",
    "Health, travel, and everyday assistant services. Judged on usefulness and factual grounding.",
    [
      {
        key: "usefulness",
        label: "Usefulness",
        weight: 0.12,
        description: "Would a real user act on this, or is it filler?",
      },
      {
        key: "grounding",
        label: "Grounding",
        weight: 0.08,
        description: "Are recommendations grounded in the inputs rather than invented?",
      },
    ],
  ),
};

export const CATEGORY_LABELS: Record<Category, string> = {
  "market-data": "Market Data",
  trading: "Trading",
  research: "Research",
  security: "Security",
  prediction: "Prediction",
  creative: "Creative",
  dev: "Development",
  lifestyle: "Lifestyle",
};

/** Sanity: weights must sum to ~1 within every rubric. Throws in dev if not. */
export function assertRubricsValid(): void {
  for (const r of Object.values(RUBRICS)) {
    const sum = r.criteria.reduce((a, c) => a + c.weight, 0);
    if (Math.abs(sum - 1) > 1e-6) {
      throw new Error(`Rubric ${r.category} weights sum to ${sum}, expected 1`);
    }
  }
}
