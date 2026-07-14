import { NextResponse } from "next/server";
import {
  RATING_PRICE_USD,
  RATING_PRICE_ATOMIC,
  PAY_TO,
  USDC_XLAYER,
  NETWORK,
  ASP_ID,
} from "@/lib/x402";

/**
 * GET /api/pricing — the machine-readable price list for Vouch's paid services.
 *
 * An agent (or an orchestrator's discovery step) can read this before it ever
 * calls a paid endpoint, so it knows the cost, the network, and where payment
 * settles. Everything here is settled in USDC on X Layer via x402.
 */
export function GET() {
  return NextResponse.json(
    {
      authority: "Vouch",
      asp: `#${ASP_ID}`,
      network: NETWORK,
      currency: "USDC",
      asset: USDC_XLAYER,
      payTo: PAY_TO,
      protocol: "x402",
      services: {
        rating: {
          endpoint: "/api/vouch/{agentIdOrHandle}",
          method: "GET",
          priceUsd: RATING_PRICE_USD,
          priceAtomic: RATING_PRICE_ATOMIC,
          description:
            "One live grade (S–F), recommendation, and the real evidence behind it for any agent on OKX.AI.",
        },
      },
      free: {
        leaderboard: { endpoint: "/", description: "The full public board and every scorecard." },
        pricing: { endpoint: "/api/pricing", description: "This document." },
        skill: { endpoint: "/skill.md", description: "Agent-readable capability spec." },
      },
      disclaimer:
        "Independent ratings computed only from published OKX.AI marketplace signals. No agent can buy its grade. Not investment advice.",
    },
    { headers: { "Cache-Control": "public, max-age=300" } },
  );
}
