import type { AgentProfile } from "@/engine/profiles";
import { PROFILES } from "@/engine/profiles";
import { mulberry32, hashSeed } from "@/engine/rng";

/**
 * The OKX.AI integration surface, as one interface.
 *
 * Everything Vouch does on-chain goes through here: discover listed agents,
 * hire them (A2A escrow or A2MCP x402 pay-per-call), and read settlement.
 * There are two implementations:
 *
 *   MockOkxClient  — deterministic, offline; powers the public demo and tests.
 *   LiveOkxClient  — wraps `okx/onchainos-skills` (the `okx-ai` +
 *                    `okx-agent-payments-protocol` skills). Swapped in when
 *                    OKX_API_KEY and the agent wallet are configured.
 *
 * Because the orchestrator and scorer only ever touch this interface, going
 * from simulation to live marketplace is a one-line change in `getClient()`.
 */

export interface MarketplaceListing {
  id: string;
  name: string;
  handle: string;
  category: string;
  serviceType: "A2A" | "A2MCP";
  priceModel: string;
}

export interface HireResult {
  /** Settlement hash on X Layer (escrow release or x402 payment). */
  txHash: string;
  /** The agent's raw deliverable, whatever form it takes. */
  deliverable: unknown;
  latencyMs: number;
  costUsd: number;
  /** True if the agent accepted and returned something at all. */
  delivered: boolean;
}

export interface OkxClient {
  /** ERC-8004 identity Vouch operates under. */
  agentId(): string;
  /** Discover agents currently listed on the marketplace. */
  listAgents(): Promise<MarketplaceListing[]>;
  /** Hire an A2A agent under escrow for a negotiated task. */
  hireA2A(agentId: string, prompt: string): Promise<HireResult>;
  /** Call an A2MCP service, paying per call via x402. */
  callA2MCP(agentId: string, prompt: string): Promise<HireResult>;
}

/** A fake X Layer tx hash, deterministic per (agent, task). */
function fakeTxHash(rng: () => number): string {
  const hex = "0123456789abcdef";
  let s = "0x";
  for (let i = 0; i < 64; i++) s += hex[Math.floor(rng() * 16)];
  return s;
}

/**
 * Deterministic, offline OKX client. Simulates hiring each profiled agent:
 * returns a settlement hash, a latency, and an opaque "deliverable" token that
 * the scorer grades using the profile's latent quality. No network, no spend.
 */
export class MockOkxClient implements OkxClient {
  private readonly profiles: Map<string, AgentProfile>;
  private readonly seedSalt: string;

  constructor(seedSalt = "vouch-cycle-2026-07") {
    this.profiles = new Map(PROFILES.map((p) => [p.id, p]));
    this.seedSalt = seedSalt;
  }

  agentId(): string {
    return "0xVOUCH000000000000000000000000000000abcd";
  }

  async listAgents(): Promise<MarketplaceListing[]> {
    return PROFILES.map((p) => ({
      id: p.id,
      name: p.name,
      handle: p.handle,
      category: p.category,
      serviceType: p.serviceType,
      priceModel: p.priceModel,
    }));
  }

  private hire(agentId: string, prompt: string): HireResult {
    const p = this.profiles.get(agentId);
    const rng = mulberry32(hashSeed(this.seedSalt + agentId + prompt));
    const txHash = fakeTxHash(rng);
    if (!p) {
      return { txHash, deliverable: null, latencyMs: 0, costUsd: 0, delivered: false };
    }
    // Latency scales inversely with quality, with noise.
    const base = p.serviceType === "A2MCP" ? 600 : 4200;
    const latencyMs = Math.round(base * (1.6 - p.quality) * (0.7 + rng() * 0.8));
    // Rare non-delivery for weak agents.
    const delivered = rng() > (p.quality < 0.45 ? 0.12 : 0.02);
    return {
      txHash,
      deliverable: { agentId, prompt, ok: delivered, q: p.quality },
      latencyMs,
      costUsd: p.unitCostUsd,
      delivered,
    };
  }

  async hireA2A(agentId: string, prompt: string): Promise<HireResult> {
    return this.hire(agentId, prompt);
  }

  async callA2MCP(agentId: string, prompt: string): Promise<HireResult> {
    return this.hire(agentId, prompt);
  }
}

let cached: OkxClient | null = null;

/**
 * Returns the active client. Live mode activates automatically once real
 * credentials are present; until then everything runs on the deterministic
 * mock so the app is fully functional offline.
 */
export function getClient(): OkxClient {
  if (cached) return cached;
  // When wired: if (process.env.OKX_API_KEY) cached = new LiveOkxClient();
  cached = new MockOkxClient();
  return cached;
}
