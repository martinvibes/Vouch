import "server-only";
import type { AgentRating, Category, MarketStats } from "./types";
import { rateAgent, type RawAgent } from "@/engine/rate";
import snapshotJson from "@/data/agents.raw.json";

/**
 * The real catalog. Loads the committed marketplace snapshot, grades every
 * agent through the published rubric, ranks them, and memoises the result for
 * the process lifetime (the snapshot is static, so this is stable and cheap).
 * Refresh the snapshot with `pnpm shop` / `node scripts/fetch-agents.mjs`.
 */

interface Snapshot {
  fetchedAt: string;
  count: number;
  agents: RawAgent[];
}

const snapshot = snapshotJson as unknown as Snapshot;

function build(): { ratings: AgentRating[]; stats: MarketStats } {
  const snapshotAt = snapshot.fetchedAt;
  const rated = snapshot.agents.map((a) => rateAgent(a, snapshotAt));

  // Rank: score desc, then proven, then feedback, then more services, then id.
  rated.sort(
    (a, b) =>
      b.score - a.score ||
      Number(b.proven) - Number(a.proven) ||
      b.reliability - a.reliability ||
      b.signals.serviceCount - a.signals.serviceCount ||
      Number(a.id) - Number(b.id),
  );

  // Assign ranks + dedupe URL handles.
  const seen = new Map<string, number>();
  rated.forEach((r, i) => {
    r.rank = i + 1;
    const n = seen.get(r.handle) ?? 0;
    seen.set(r.handle, n + 1);
    if (n > 0) r.handle = `${r.handle}-${r.id}`;
  });

  const scores = rated.map((r) => r.score).sort((a, b) => a - b);
  const median = scores.length
    ? scores.length % 2
      ? scores[(scores.length - 1) / 2]
      : Math.round((scores[scores.length / 2 - 1] + scores[scores.length / 2]) / 2)
    : 0;

  const stats: MarketStats = {
    agentsRated: rated.length,
    provenCount: rated.filter((r) => r.proven).length,
    certifiedCount: rated.filter((r) => r.certified).length,
    online: rated.filter((r) => r.signals.online).length,
    categories: new Set(rated.map((r) => r.category)).size,
    medianScore: median,
    snapshotAt,
  };

  return { ratings: rated, stats };
}

let cache: { ratings: AgentRating[]; stats: MarketStats } | null = null;
function data() {
  if (!cache) cache = build();
  return cache;
}

export function getRatings(): AgentRating[] {
  return data().ratings;
}

export function getStats(): MarketStats {
  return data().stats;
}

export function getAgent(idOrHandle: string): AgentRating | undefined {
  return data().ratings.find((r) => r.handle === idOrHandle || r.id === idOrHandle);
}

export function getByCategory(category: Category): AgentRating[] {
  return data().ratings.filter((r) => r.category === category);
}

export function getCategories(): Category[] {
  const order: Category[] = ["finance", "software", "art", "lifestyle", "prediction", "other"];
  const present = new Set(data().ratings.map((r) => r.category));
  return order.filter((c) => present.has(c));
}

export function getTop(n: number): AgentRating[] {
  return data().ratings.slice(0, n);
}

export function getCertified(): AgentRating[] {
  return data().ratings.filter((r) => r.certified);
}

export function searchRatings(q: string): AgentRating[] {
  const s = q.trim().toLowerCase();
  if (!s) return data().ratings;
  return data().ratings.filter(
    (r) =>
      r.name.toLowerCase().includes(s) ||
      r.blurb.toLowerCase().includes(s) ||
      r.categoryLabel.toLowerCase().includes(s) ||
      r.id === s,
  );
}
