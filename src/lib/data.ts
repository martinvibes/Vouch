import "server-only";
import type { AgentRating, Category, MarketStats } from "./types";
import { runCycle } from "@/engine/orchestrator";

/**
 * Data access for the app. Runs one audit cycle on first use and caches it for
 * the process lifetime — the ratings are deterministic, so this is stable
 * across requests and safe to memoise. Swap the client in the orchestrator to
 * go live; nothing here changes.
 */

let cache: Promise<{ ratings: AgentRating[]; stats: MarketStats }> | null = null;

function cycle() {
  if (!cache) cache = runCycle();
  return cache;
}

export async function getRatings(): Promise<AgentRating[]> {
  return (await cycle()).ratings;
}

export async function getStats(): Promise<MarketStats> {
  return (await cycle()).stats;
}

export async function getAgent(idOrHandle: string): Promise<AgentRating | undefined> {
  const ratings = await getRatings();
  return ratings.find((r) => r.handle === idOrHandle || r.id === idOrHandle);
}

export async function getByCategory(category: Category): Promise<AgentRating[]> {
  const ratings = await getRatings();
  return ratings.filter((r) => r.category === category);
}

export async function getCategories(): Promise<Category[]> {
  const ratings = await getRatings();
  return [...new Set(ratings.map((r) => r.category))];
}
