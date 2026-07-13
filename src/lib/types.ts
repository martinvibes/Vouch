/**
 * Vouch domain model.
 *
 * The whole product is one loop: hire an agent → collect its deliverable →
 * score it against a published rubric → record the evidence on-chain → publish
 * a grade. These types describe the output of that loop.
 */

export type GradeLetter = "S" | "A+" | "A" | "B" | "C" | "D" | "F";

export type Category =
  | "market-data"
  | "trading"
  | "research"
  | "security"
  | "prediction"
  | "creative"
  | "dev"
  | "lifestyle";

export type ServiceType = "A2A" | "A2MCP";

/** One weighted line item in a category's scoring rubric. */
export interface RubricCriterion {
  key: string;
  label: string;
  weight: number; // 0..1; weights within a rubric sum to 1
  description: string;
}

export interface Rubric {
  category: Category;
  title: string;
  summary: string;
  criteria: RubricCriterion[];
}

export interface CriterionScore {
  key: string;
  score: number; // 0..100
}

/**
 * A single mystery-shop: Vouch anonymously hired the agent for one real task
 * and scored what came back. Every field here is meant to be verifiable — the
 * settlement hash points at the escrow/x402 payment on X Layer.
 */
export interface TestTask {
  id: string;
  prompt: string; // exactly what Vouch requested
  submittedAt: string; // ISO
  costUsd: number; // what Vouch paid for this task
  latencyMs: number;
  txHash: string; // settlement on X Layer
  scores: CriterionScore[];
  overall: number; // 0..100
  verdict: string; // one-line note in the guide's voice
  flags: string[]; // machine-detected concerns, e.g. "spec-miss", "overpriced"
}

export interface AgentRating {
  id: string; // ERC-8004 on-chain agent id
  name: string;
  handle: string; // marketplace handle, no leading @
  category: Category;
  serviceType: ServiceType;
  blurb: string;
  priceModel: string; // human-readable, e.g. "$0.02 / call" or "escrow · negotiated"
  score: number; // 0..100 aggregate
  grade: GradeLetter;
  rank: number; // 1-indexed, overall
  tasksRun: number;
  spendUsd: number; // total Vouch has paid this agent (marketplace GDP we generated)
  reliability: number; // 0..100, share of tasks that met spec
  lastAuditedAt: string; // ISO
  criteria: CriterionScore[]; // aggregate, per rubric criterion
  tasks: TestTask[]; // recent mystery-shops
  certified: boolean; // score >= certification threshold
  trend: number; // point change vs previous cycle (+/-)
}

/** Public marketplace-wide totals shown on the leaderboard header. */
export interface MarketStats {
  agentsRated: number;
  tasksRun: number;
  spendUsd: number; // total we've paid into the marketplace
  certifiedCount: number;
  lastCycleAt: string;
}
