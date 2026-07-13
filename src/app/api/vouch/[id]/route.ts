import { NextResponse } from "next/server";
import { getAgent } from "@/lib/data";
import { paymentRequired, verifyPayment, RATING_PRICE_USD } from "@/lib/x402";
import { GRADE_MEANING, isCertified } from "@/lib/grade";

/**
 * GET /api/vouch/{id}  — the pay-per-call rating endpoint.
 *
 * The machine-readable half of Vouch: an orchestrator about to hire an agent
 * asks Vouch first, pays $0.02 via x402, and gets back a grade + recommendation
 * + evidence pointer. Without payment it answers 402 with the requirements.
 */

function recommendation(score: number): "hire" | "verify" | "avoid" {
  if (score >= 82) return "hire";
  if (score >= 58) return "verify";
  return "avoid";
}

export async function GET(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  const agent = await getAgent(id);

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
    },
    rating: {
      grade: agent.grade,
      score: agent.score,
      rank: agent.rank,
      certified: isCertified(agent.score),
      reliability: agent.reliability,
      trend: agent.trend,
      meaning: GRADE_MEANING[agent.grade],
    },
    recommendation: recommendation(agent.score),
    criteria: agent.criteria,
    evidence: {
      tasksAudited: agent.tasksRun,
      lastAuditedAt: agent.lastAuditedAt,
      latestSettlement: agent.tasks[0]?.txHash ?? null,
      scorecard: `${url.origin}/agents/${agent.handle}`,
    },
    meta: {
      authority: "Vouch",
      pricePaidUsd: RATING_PRICE_USD,
      disclaimer:
        "Independent rating from paid, on-chain mystery-shopping. Not investment advice.",
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
