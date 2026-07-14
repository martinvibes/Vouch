import { NextResponse } from "next/server";
import { getAgent } from "@/lib/data";
import { paymentRequired, verifyPayment, RATING_PRICE_USD } from "@/lib/x402";
import { GRADE_MEANING } from "@/lib/grade";

/**
 * GET /api/vouch/{id}  — the pay-per-call rating endpoint.
 *
 * The machine-readable half of Vouch: an orchestrator about to hire an agent
 * asks Vouch first, settles $0.02 in USDC via x402, and gets back a grade, a
 * one-word recommendation, and the real signals behind it. Without payment it
 * answers 402 with the x402 requirements (payTo = Vouch's real ASP wallet).
 */

function recommendation(score: number, proven: boolean): "hire" | "verify" | "avoid" {
  if (score >= 80 && proven) return "hire";
  if (score >= 52) return "verify";
  return "avoid";
}

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const agent = getAgent(id);

  if (!agent) {
    return NextResponse.json(
      { error: `No agent found for '${id}'. Use a marketplace handle or agent id.` },
      { status: 404 },
    );
  }

  const url = new URL(req.url);
  const resource = `${url.origin}/api/vouch/${id}`;

  // x402: require payment unless a valid X-PAYMENT header is present.
  const settlement = verifyPayment(req.headers.get("x-payment"));
  if (!settlement) {
    return NextResponse.json(
      paymentRequired(resource, `Vouch rating for ${agent.name} (${agent.handle})`),
      { status: 402 },
    );
  }

  const body = {
    agent: {
      id: agent.id,
      name: agent.name,
      handle: agent.handle,
      category: agent.category,
      serviceType: agent.serviceType,
      priceModel: agent.priceModel,
      communicationAddress: agent.communicationAddress || null,
    },
    rating: {
      grade: agent.grade,
      score: agent.score,
      rank: agent.rank,
      certified: agent.certified,
      confidence: agent.confidence,
      proven: agent.proven,
      meaning: GRADE_MEANING[agent.grade],
    },
    recommendation: recommendation(agent.score, agent.proven),
    criteria: agent.criteria,
    evidence: {
      completedJobs: agent.signals.soldCount,
      feedbackRate: agent.signals.feedbackRate,
      securityRate: agent.signals.securityRate,
      online: agent.signals.online,
      receipts: agent.evidence,
      scorecard: `${url.origin}/agents/${agent.handle}`,
      snapshotAt: agent.snapshotAt,
    },
    meta: {
      authority: "Vouch",
      asp: "#5434",
      network: "x-layer",
      pricePaidUsd: RATING_PRICE_USD,
      disclaimer:
        "Independent rating computed from real, published OKX.AI marketplace signals. Not investment advice.",
    },
  };

  return NextResponse.json(body, {
    status: 200,
    headers: {
      // x402 settlement receipt for the caller.
      "X-Payment-Response": Buffer.from(JSON.stringify(settlement)).toString("base64"),
      "Cache-Control": "no-store",
    },
  });
}
