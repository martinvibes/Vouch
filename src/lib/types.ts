/**
 * Vouch domain model — REAL edition.
 *
 * Vouch rates real agents listed on the OKX.AI marketplace. Every grade is
 * computed from published, verifiable signals: buyer feedback on settled
 * escrow jobs, OKX security scans, the agent's live service listings and
 * pricing, availability, and its on-chain identity on X Layer. Nothing here is
 * invented — an agent with no track record is graded provisionally and flagged.
 */

export type GradeLetter = "S" | "A" | "B" | "C" | "D" | "F";

/** Real OKX.AI marketplace categories. */
export type Category =
  | "finance"
  | "software"
  | "art"
  | "lifestyle"
  | "prediction"
  | "other";

export type ServiceType = "A2A" | "A2MCP";

export type Confidence = "high" | "medium" | "low";

/** One weighted line item in the published rubric. */
export interface RubricCriterion {
  key: string;
  label: string;
  weight: number; // 0..1; weights sum to 1
  description: string;
  source: string; // the real signal this is measured from
}

export interface Rubric {
  title: string;
  summary: string;
  criteria: RubricCriterion[];
}

export interface CriterionScore {
  key: string;
  score: number; // 0..100
}

/** A single, real, verifiable piece of evidence behind a grade. */
export interface Evidence {
  label: string;
  value: string;
  detail?: string;
  kind: "positive" | "neutral" | "negative" | "onchain";
}

/** A real service the agent lists on the marketplace. */
export interface RatedService {
  name: string;
  description: string;
  type: ServiceType;
  feeUsd: number | null;
  endpoint: string | null;
}

/** The raw real signals pulled from the marketplace for one agent. */
export interface AgentSignals {
  feedbackRate: number | null; // 0..100, buyer satisfaction on settled jobs
  securityRate: number | null; // 0..5, OKX security scan
  online: boolean;
  serviceCount: number;
  minPriceUsd: number | null;
  hasAvatar: boolean;
  descLen: number;
  soldCount: number | null;
  communicationAddress: string;
}

export interface AgentRating {
  id: string; // ERC-8004 on-chain agent id (the marketplace #)
  name: string;
  handle: string; // URL slug
  category: Category;
  categoryLabel: string;
  serviceType: ServiceType;
  blurb: string;
  avatarUrl: string | null;
  okxUrl: string; // deep link to the agent on okx.ai
  communicationAddress: string;
  priceModel: string; // human-readable

  score: number; // 0..100 aggregate
  grade: GradeLetter;
  rank: number; // 1-indexed overall
  confidence: Confidence;
  proven: boolean; // has real buyer feedback on settled jobs
  reliability: number; // 0..100 (feedbackRate, or 0 if unproven)
  certified: boolean; // proven AND score >= threshold

  criteria: CriterionScore[]; // per rubric criterion
  evidence: Evidence[]; // the real receipts
  services: RatedService[];
  signals: AgentSignals;
  snapshotAt: string; // ISO — when the marketplace was sampled
}

/** Marketplace-wide totals shown on the leaderboard header. */
export interface MarketStats {
  agentsRated: number;
  provenCount: number; // agents with real buyer feedback
  certifiedCount: number;
  online: number;
  categories: number;
  medianScore: number;
  snapshotAt: string;
}
