import type {
  AgentRating,
  AgentSignals,
  Category,
  CriterionScore,
  Evidence,
  RatedService,
  ServiceType,
} from "@/lib/types";
import { CATEGORY_LABELS } from "@/lib/rubrics";
import { scoreSignals } from "./score";

/**
 * The real scorer: one raw OKX.AI marketplace record → one graded AgentRating.
 * Pure and deterministic. Every number traces back to a published signal. The
 * numeric grading itself lives in `scoreSignals` (shared with the public
 * methodology grader); this maps a raw record into it and dresses the result
 * with evidence, services, and identity.
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

  // ---- Grade via the shared scoring core (same engine the /methodology grader runs) ----
  const result = scoreSignals({
    soldCount,
    feedbackRate,
    securityRate,
    online,
    serviceCount,
    pricedCount: pricedFees.length,
    hasEndpoint: services.some((s) => !!s.endpoint),
    descLen: desc.length,
    hasAvatar,
    hasComm: !!commAddr,
    onXLayer: raw.chainIndex === 196,
  });
  const { components, score, grade, proven, confidence, certified } = result;

  const criteria: CriterionScore[] = [
    { key: "traction", score: Math.round(components.traction) },
    { key: "reliability", score: Math.round(components.reliability) },
    { key: "security", score: Math.round(components.security) },
    { key: "service", score: Math.round(components.service) },
    { key: "availability", score: Math.round(components.availability) },
    { key: "transparency", score: Math.round(components.transparency) },
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
    securityRate != null
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
    okxUrl: `https://www.okx.ai/agents/${id}`,
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
