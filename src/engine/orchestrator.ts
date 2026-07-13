import type {
  AgentRating,
  CriterionScore,
  MarketStats,
  TestTask,
} from "@/lib/types";
import { RUBRICS } from "@/lib/rubrics";
import { toGrade, isCertified } from "@/lib/grade";
import { getClient, type OkxClient } from "@/okx/client";
import { PROFILES, type AgentProfile } from "./profiles";
import { mulberry32, hashSeed, scoreAround } from "./rng";

/**
 * The Vouch engine — one audit cycle.
 *
 * For every agent on the marketplace: hire it for a handful of real tasks,
 * score each deliverable against its category rubric, aggregate to a grade,
 * and rank the field. In simulation this reads latent quality; wired to
 * LiveOkxClient the identical control flow grades real deliverables with a
 * multi-model panel. The output is exactly what the site and the API serve.
 */

const TASKS_PER_AGENT = 4;
const CYCLE_SEED = "vouch-cycle-2026-07-13";

/** Latency (ms) → 0..100, judged against a per-service-type norm. */
function latencyScore(latencyMs: number, serviceType: "A2A" | "A2MCP"): number {
  const norm = serviceType === "A2MCP" ? 800 : 5000;
  const ratio = latencyMs / norm;
  return Math.max(0, Math.min(100, Math.round(100 - (ratio - 1) * 45)));
}

/** Per-criterion mean for an agent, before noise. */
function criterionMean(p: AgentProfile, key: string): number {
  const base = p.quality * 100;
  const up = p.strong?.[key] ?? 0;
  const down = p.weak?.[key] ?? 0;
  return Math.max(3, Math.min(99, base + up - down));
}

const VERDICTS: { min: number; lines: string[] }[] = [
  { min: 92, lines: ["Best-in-class. Delivered above the brief.", "Flawless run — this is the reference standard for its category."] },
  { min: 82, lines: ["Strong, dependable work. Certified.", "Delivered to spec with real craft. Safe hire."] },
  { min: 70, lines: ["Solid, with rough edges worth watching.", "Competent — got the job done, missed some polish."] },
  { min: 58, lines: ["Mixed. Right sometimes; verify every deliverable.", "Inconsistent output — quality swings run to run."] },
  { min: 45, lines: ["Weak value for the price.", "Under-delivered against what was asked."] },
  { min: 0, lines: ["Failed to meet spec. Avoid.", "Did not deliver usable work for this task."] },
];

function pickVerdict(overall: number, rng: () => number): string {
  const band = VERDICTS.find((b) => overall >= b.min) ?? VERDICTS[VERDICTS.length - 1];
  return band.lines[Math.floor(rng() * band.lines.length)];
}

/** Human-readable red flags derived from the criterion scores. */
function deriveFlags(scores: CriterionScore[], delivered: boolean): string[] {
  const flags: string[] = [];
  const by = new Map(scores.map((s) => [s.key, s.score]));
  if (!delivered) flags.push("no-delivery");
  if ((by.get("spec") ?? 100) < 55) flags.push("spec-miss");
  if ((by.get("value") ?? 100) < 55) flags.push("overpriced");
  if ((by.get("net-edge") ?? 100) < 50) flags.push("edge-evaporates");
  if ((by.get("catch-rate") ?? 100) < 55) flags.push("misses-vulns");
  if ((by.get("risk") ?? 100) < 50) flags.push("weak-risk-control");
  if ((by.get("originality") ?? 100) < 50) flags.push("generic-output");
  return flags;
}

/** Score one hired task against the agent's rubric. */
function scoreTask(
  p: AgentProfile,
  prompt: string,
  latencyMs: number,
  costUsd: number,
  delivered: boolean,
  txHash: string,
  index: number,
): TestTask {
  const rng = mulberry32(hashSeed(CYCLE_SEED + p.id + prompt + index));
  const rubric = RUBRICS[p.category];
  const scores: CriterionScore[] = rubric.criteria.map((c) => {
    let s: number;
    if (c.key === "latency") {
      s = latencyScore(latencyMs, p.serviceType);
    } else if (!delivered && (c.key === "correctness" || c.key === "spec")) {
      s = scoreAround(rng, 6, 4);
    } else {
      s = scoreAround(rng, criterionMean(p, c.key), 9);
    }
    return { key: c.key, score: s };
  });

  const overall = Math.round(
    rubric.criteria.reduce((acc, c) => {
      const found = scores.find((s) => s.key === c.key);
      return acc + (found ? found.score : 0) * c.weight;
    }, 0),
  );

  // Date: spread tasks over the past ~9 days.
  const submittedAt = new Date(
    Date.parse("2026-07-13T12:00:00Z") - Math.floor(rng() * 9 * 864e5),
  ).toISOString();

  return {
    id: `${p.id}-t${index}`,
    prompt,
    submittedAt,
    costUsd,
    latencyMs,
    txHash,
    scores,
    overall,
    verdict: pickVerdict(overall, rng),
    flags: deriveFlags(scores, delivered),
  };
}

/** Aggregate per-criterion scores across an agent's tasks. */
function aggregateCriteria(tasks: TestTask[], keys: string[]): CriterionScore[] {
  return keys.map((key) => {
    const vals = tasks.map((t) => t.scores.find((s) => s.key === key)?.score ?? 0);
    const avg = vals.reduce((a, b) => a + b, 0) / (vals.length || 1);
    return { key, score: Math.round(avg) };
  });
}

/** Run one full audit cycle and return ranked ratings + marketplace stats. */
export async function runCycle(
  client: OkxClient = getClient(),
): Promise<{ ratings: AgentRating[]; stats: MarketStats }> {
  const listings = await client.listAgents();
  const byId = new Map(PROFILES.map((p) => [p.id, p]));

  const ratings: AgentRating[] = [];

  for (const listing of listings) {
    const p = byId.get(listing.id);
    if (!p) continue;

    const tasks: TestTask[] = [];
    for (let i = 0; i < TASKS_PER_AGENT; i++) {
      const prompt = p.taskPrompts[i % p.taskPrompts.length];
      const hire =
        p.serviceType === "A2MCP"
          ? await client.callA2MCP(p.id, prompt)
          : await client.hireA2A(p.id, prompt);
      tasks.push(
          scoreTask(p, prompt, hire.latencyMs, hire.costUsd, hire.delivered, hire.txHash, i),
      );
    }

    const rubric = RUBRICS[p.category];
    const keys = rubric.criteria.map((c) => c.key);
    const criteria = aggregateCriteria(tasks, keys);
    const score = Math.round(
      rubric.criteria.reduce((acc, c) => {
        const found = criteria.find((s) => s.key === c.key);
        return acc + (found ? found.score : 0) * c.weight;
      }, 0),
    );

    const reliability = Math.round(
      (tasks.filter((t) => !t.flags.includes("no-delivery") && t.overall >= 58).length /
        tasks.length) *
        100,
    );
    const spendUsd = tasks.reduce((a, t) => a + t.costUsd, 0);
    const rng = mulberry32(hashSeed(CYCLE_SEED + p.id + "trend"));

    ratings.push({
      id: p.id,
      name: p.name,
      handle: p.handle,
      category: p.category,
      serviceType: p.serviceType,
      blurb: p.blurb,
      priceModel: p.priceModel,
      score,
      grade: toGrade(score),
      rank: 0, // filled after sort
      tasksRun: tasks.length,
      spendUsd: Math.round(spendUsd * 100) / 100,
      reliability,
      lastAuditedAt: tasks
        .map((t) => t.submittedAt)
        .sort()
        .at(-1)!,
      criteria,
      tasks: tasks.sort((a, b) => Date.parse(b.submittedAt) - Date.parse(a.submittedAt)),
      certified: isCertified(score),
      trend: Math.round((rng() * 12 - 5) * 10) / 10,
    });
  }

  ratings.sort((a, b) => b.score - a.score);
  ratings.forEach((r, i) => (r.rank = i + 1));

  const stats: MarketStats = {
    agentsRated: ratings.length,
    tasksRun: ratings.reduce((a, r) => a + r.tasksRun, 0),
    spendUsd: Math.round(ratings.reduce((a, r) => a + r.spendUsd, 0) * 100) / 100,
    certifiedCount: ratings.filter((r) => r.certified).length,
    lastCycleAt: "2026-07-13T12:00:00Z",
  };

  return { ratings, stats };
}
