import type {
  AgentRating,
  AgentSignals,
  Category,
  Confidence,
  CriterionScore,
  Evidence,
  RatedService,
  ServiceType,
} from "@/lib/types";
import { CATEGORY_LABELS } from "@/lib/rubrics";
import { toGrade, CERTIFY_THRESHOLD } from "@/lib/grade";

/**
 * The real scorer: one raw OKX.AI marketplace record → one graded AgentRating.
 * Pure and deterministic. Every number traces back to a published signal.
 */

export interface RawService {
  serviceName?: string | null;
  serviceDescription?: string | null;
  serviceType?: string | null;
  feeAmount?: number | null;
  feeToken?: string | null;
  endpoint?: string | null;
  contractAddress?: string | null;
}

export interface RawAgent {
  agentId: string;
  name?: string | null;
  profileDescription?: string | null;
  profilePicture?: string | null;
  categoryCode?: string[] | null;
  categoryName?: string[] | null;
  feedbackRate?: number | null;
  securityRate?: number | null;
  onlineStatus?: number | null;
  status?: number | null;
  services?: RawService[] | null;
  serviceMinPrice?: number | null;
  totalServiceCount?: number | null;
  soldCount?: number | null;
  buyerCount?: number | null;
  communicationAddress?: string | null;
  chainIndex?: number | null;
}

const CATEGORY_MAP: Record<string, Category> = {
  FINANCE: "finance",
  SOFTWARE_SERVICES: "software",
  ART_CREATION: "art",
  LIFESTYLE: "lifestyle",
  WORLD_CUP: "prediction",
  OTHER: "other",
};

const UNPROVEN_RELIABILITY_PRIOR = 46; // no feedback → provisional, mid-low
const UNKNOWN_SECURITY_PRIOR = 55; // not scanned → mild neutral
const TRACTION_CEIL = 1500; // ~ the busiest agent in the market; anchors the log scale

const clamp = (n: number, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, n));

/**
 * Proven demand, log-scaled. soldCount is the market's own verdict — the number
 * of jobs buyers actually paid for and completed. It's the one signal that
 * truly separates a workhorse (1,400+ jobs) from a listing with a single happy
 * customer, so it carries real weight. 0 jobs → 0; the busiest agents → ~100.
 */
function tractionScore(sold: number): number {
  if (sold <= 0) return 0;
  return clamp(12 + (Math.log10(sold + 1) / Math.log10(TRACTION_CEIL)) * 88);
}

export function slugify(name: string, id: string): string {
  const s = (name || "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return s.length >= 2 ? s : `agent-${id}`;
}

function svcType(s: RawService): ServiceType {
  const t = (s.serviceType || "").toUpperCase();
  if (t.includes("A2MCP") || t.includes("MCP")) return "A2MCP";
  if (t.includes("A2A")) return "A2A";
  return s.endpoint ? "A2MCP" : "A2A";
}

function mapServices(raw: RawService[]): RatedService[] {
  return raw.map((s) => ({
    name: (s.serviceName || "Service").trim(),
    description: (s.serviceDescription || "").trim(),
    type: svcType(s),
    feeUsd: typeof s.feeAmount === "number" ? s.feeAmount : null,
    endpoint: s.endpoint || null,
  }));
}

function shortAddr(a: string): string {
  return a && a.length > 12 ? `${a.slice(0, 6)}…${a.slice(-4)}` : a;
}

export function rateAgent(raw: RawAgent, snapshotAt: string): AgentRating {
  const id = String(raw.agentId);
  const name = (raw.name || `Agent #${id}`).trim();
  const desc = (raw.profileDescription || "").trim();
  const services = mapServices(raw.services || []);
  const serviceCount = services.length;

  const feedbackRate =
    typeof raw.feedbackRate === "number" && raw.feedbackRate > 0 ? raw.feedbackRate : null;
  const securityRate = typeof raw.securityRate === "number" ? raw.securityRate : null;
  const online = raw.onlineStatus === 1;
  const hasAvatar = !!raw.profilePicture;
  const commAddr = raw.communicationAddress || "";

  const pricedFees = services.map((s) => s.feeUsd).filter((f): f is number => typeof f === "number" && f > 0);
  const minPriceUsd =
    typeof raw.serviceMinPrice === "number" && raw.serviceMinPrice > 0
      ? raw.serviceMinPrice
      : pricedFees.length
        ? Math.min(...pricedFees)
        : null;

  const soldCount = typeof raw.soldCount === "number" && raw.soldCount > 0 ? raw.soldCount : 0;

  // ---- Component scores (0..100) ----
  const tracScore = tractionScore(soldCount);
  const relScore = feedbackRate ?? UNPROVEN_RELIABILITY_PRIOR;
  const secScore = securityRate != null ? (securityRate / 5) * 100 : UNKNOWN_SECURITY_PRIOR;

  let serviceScore = 20;
  if (serviceCount >= 1) serviceScore = 66;
  if (serviceCount >= 2) serviceScore = 78;
  if (serviceCount >= 3) serviceScore = 86;
  if (pricedFees.length) serviceScore += 8;
  if (services.some((s) => s.endpoint)) serviceScore += 6;
  serviceScore = clamp(serviceScore);

  const availScore = online ? 100 : 40;

  let transScore = 30;
  if (desc.length >= 140) transScore += 32;
  else if (desc.length >= 60) transScore += 20;
  else if (desc.length >= 20) transScore += 8;
  if (hasAvatar) transScore += 20;
  if (commAddr) transScore += 14;
  if (raw.chainIndex === 196) transScore += 4;
  transScore = clamp(transScore);

  // ---- Weighted aggregate (rubric weights) ----
  // Proven demand + buyer reliability together are ~half the grade: an
  // authority weights what buyers actually did, not just what's listed.
  const raw100 =
    0.24 * tracScore +
    0.22 * relScore +
    0.2 * secScore +
    0.16 * serviceScore +
    0.08 * availScore +
    0.1 * transScore;

  const proven = feedbackRate != null;
  const hasSec = securityRate != null;
  const confidence: Confidence = proven && hasSec ? "high" : proven || hasSec ? "medium" : "low";

  // ---- Honesty caps ----
  let cap = 100;
  if (!proven) cap = Math.min(cap, 74); // unproven can't exceed a B
  if (confidence !== "high") cap = Math.min(cap, 88); // S is reserved for high-confidence
  if (!online) cap = Math.min(cap, 85);
  if (securityRate != null && securityRate < 2) cap = Math.min(cap, 50);
  if (securityRate != null && securityRate < 1) cap = Math.min(cap, 40);

  const score = Math.round(clamp(Math.min(raw100, cap)));
  const grade = toGrade(score);
  const certified = proven && score >= CERTIFY_THRESHOLD;

  const criteria: CriterionScore[] = [
    { key: "traction", score: Math.round(tracScore) },
    { key: "reliability", score: Math.round(relScore) },
    { key: "security", score: Math.round(secScore) },
    { key: "service", score: Math.round(serviceScore) },
    { key: "availability", score: Math.round(availScore) },
    { key: "transparency", score: Math.round(transScore) },
  ];

  // ---- Evidence (real receipts) ----
  const evidence: Evidence[] = [];
  evidence.push(
    soldCount > 0
      ? {
          label: "Completed jobs",
          value: soldCount.toLocaleString("en-US"),
          detail: "Paid jobs buyers settled on-chain — the market's own verdict",
          kind: soldCount >= 50 ? "positive" : soldCount >= 5 ? "neutral" : "negative",
        }
      : {
          label: "Completed jobs",
          value: "0",
          detail: "No settled jobs yet — graded provisionally",
          kind: "negative",
        },
  );
  evidence.push(
    proven
      ? {
          label: "Buyer feedback",
          value: `${Math.round(feedbackRate!)}%`,
          detail: "Satisfaction across settled escrow jobs",
          kind: feedbackRate! >= 90 ? "positive" : feedbackRate! >= 70 ? "neutral" : "negative",
        }
      : {
          label: "Buyer feedback",
          value: "Unrated",
          detail: "No buyer ratings on record yet",
          kind: "neutral",
        },
  );
  evidence.push(
    hasSec
      ? {
          label: "Security scan",
          value: `${securityRate}/5`,
          detail: "OKX automated security rating",
          kind: securityRate! >= 4 ? "positive" : securityRate! >= 2.5 ? "neutral" : "negative",
        }
      : { label: "Security scan", value: "Not scanned", kind: "neutral" },
  );
  evidence.push({
    label: "Services",
    value: serviceCount ? `${serviceCount} live` : "None",
    detail:
      minPriceUsd != null ? `from $${minPriceUsd} · x402/A2A` : serviceCount ? "listed" : undefined,
    kind: serviceCount > 0 ? "positive" : "negative",
  });
  evidence.push({
    label: "Availability",
    value: online ? "Online" : "Offline",
    kind: online ? "positive" : "neutral",
  });
  if (commAddr) {
    evidence.push({
      label: "On-chain identity",
      value: `#${id}`,
      detail: `${shortAddr(commAddr)} · X Layer`,
      kind: "onchain",
    });
  }

  const catCode = (raw.categoryCode && raw.categoryCode[0]) || "OTHER";
  const category: Category = CATEGORY_MAP[catCode] || "other";
  const serviceType: ServiceType = services.some((s) => s.type === "A2MCP") ? "A2MCP" : "A2A";
  const priceModel =
    minPriceUsd != null
      ? `from $${minPriceUsd} / call`
      : serviceCount > 0
        ? "escrow · negotiated"
        : "—";

  const signals: AgentSignals = {
    feedbackRate,
    securityRate,
    online,
    serviceCount,
    minPriceUsd,
    hasAvatar,
    descLen: desc.length,
    soldCount: soldCount > 0 ? soldCount : null,
    communicationAddress: commAddr,
  };

  return {
    id,
    name,
    handle: slugify(name, id),
    category,
    categoryLabel: CATEGORY_LABELS[category],
    serviceType,
    blurb: desc || "No description provided.",
    avatarUrl: raw.profilePicture || null,
    okxUrl: "https://www.okx.ai",
    communicationAddress: commAddr,
    priceModel,
    score,
    grade,
    rank: 0, // assigned in the catalog after sorting
    confidence,
    proven,
    reliability: feedbackRate ?? 0,
    certified,
    criteria,
    evidence,
    services,
    signals,
    snapshotAt,
  };
}
