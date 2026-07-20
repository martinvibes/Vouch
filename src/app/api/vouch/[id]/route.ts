import { NextResponse } from "next/server";
import { getAgent } from "@/lib/data";
import {
  paymentRequired,
  legacyBodyFields,
  encodeChallenge,
  settlePayment,
  RATING_PRICE_USD,
  NETWORK,
} from "@/lib/x402";
import { GRADE_MEANING } from "@/lib/grade";

// On-chain settlement (broadcast + 1 confirmation) needs more than the default
// serverless window; must run on the Node runtime for ethers.
export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * /api/vouch/{id} — the pay-per-call rating endpoint.
 *
 * The machine-readable half of Vouch: an orchestrator about to hire an agent
 * asks Vouch first, settles $0.02 in USDT0 via x402, and gets back a grade, a
 * one-word recommendation, and the real signals behind it.
 *
 * The one inviolable rule here: **an unpaid request always answers 402 with the
 * challenge** — every method, every body, every id. Marketplace validators
 * fuzz this endpoint (malformed JSON, wrong content-type, garbage payment
 * headers, bare GETs), and any other status reads to them as "the endpoint
 * does not implement x402" and fails the listing. Equally, nothing after a
 * successful payment may 4xx: the buyer's money is already spent on-chain, so
 * even a miss resolves to a 200 that says so.
 */

function recommendation(score: number, proven: boolean): "hire" | "verify" | "avoid" {
  if (score >= 80 && proven) return "hire";
  if (score >= 52) return "verify";
  return "avoid";
}

/**
 * Public origin of this request. Behind Railway's proxy the inbound URL is
 * internal, so the forwarded headers are the source of truth — the challenge's
 * `resource.url` has to match the endpoint registered on the listing.
 */
function publicOrigin(req: Request): string {
  const url = new URL(req.url);
  const host = req.headers.get("x-forwarded-host") || req.headers.get("host") || url.host;
  const proto = (req.headers.get("x-forwarded-proto") || url.protocol.replace(":", "")).split(",")[0].trim();
  return `${proto}://${host}`;
}

const EXPOSE_HEADERS =
  "Payment-Required, X-Payment-Required, Payment-Response, X-Payment-Response";

async function handle(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const agent = getAgent(id);

  const resource = `${publicOrigin(req)}/api/vouch/${id}`;
  const description = agent
    ? `Vouch rating for ${agent.name} (${agent.handle})`
    : `Vouch rating lookup for '${id}'`;

  // Build the challenge before anything can fail. An unknown id is NOT a 404
  // here: the challenge is served first and the lookup result is delivered
  // after payment, so a probe against any path shape still sees valid x402.
  const challenge = paymentRequired(resource, description);
  const encoded = encodeChallenge(challenge);
  const challengeHeaders = {
    // Both spellings: OKX's SDK reads the unprefixed name, older clients the X- one.
    "PAYMENT-REQUIRED": encoded,
    "X-PAYMENT-REQUIRED": encoded,
    "Access-Control-Expose-Headers": EXPOSE_HEADERS,
    "Cache-Control": "no-store",
  };
  const challengeBody = { ...legacyBodyFields(resource, description), ...challenge };

  // OKX's own buyer client (`onchainos payment pay-local`) returns the
  // authorization under header_name PAYMENT-SIGNATURE; the x402 reference
  // clients use X-PAYMENT. Accept either.
  const paymentHeader =
    req.headers.get("x-payment") || req.headers.get("payment-signature");

  if (!paymentHeader) {
    return NextResponse.json(challengeBody, { status: 402, headers: challengeHeaders });
  }

  const outcome = await settlePayment(paymentHeader);
  if (!outcome.ok) {
    // A payment that can't settle gets a fresh challenge, never a 400 — the
    // reason rides along so a compliant client can correct and retry.
    return NextResponse.json(
      { ...challengeBody, error: "Payment verification failed", reason: outcome.reason },
      { status: 402, headers: challengeHeaders },
    );
  }
  const settlement = outcome.settlement;
  const receipt = Buffer.from(JSON.stringify(settlement)).toString("base64");
  const paidHeaders = {
    "PAYMENT-RESPONSE": receipt,
    "X-Payment-Response": receipt,
    "Access-Control-Expose-Headers": EXPOSE_HEADERS,
    "Cache-Control": "no-store",
  };

  const meta = {
    authority: "Vouch",
    asp: "#5434",
    network: NETWORK,
    pricePaidUsd: RATING_PRICE_USD,
    settlement: { transaction: settlement.transaction, payer: settlement.payer },
    disclaimer:
      "Independent rating computed from real, published OKX.AI marketplace signals. Not investment advice.",
  };

  // Paid, but nothing on file for that id. The lookup was performed and the
  // payment is already settled on-chain, so this answers 200 with an explicit
  // negative result rather than burning the buyer with a 404.
  if (!agent) {
    return NextResponse.json(
      {
        found: false,
        query: id,
        rating: null,
        message: `No rating on file for '${id}'. Vouch grades agents published on the OKX.AI marketplace — pass a marketplace handle or agent id.`,
        meta,
      },
      { status: 200, headers: paidHeaders },
    );
  }

  const body = {
    found: true,
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
      scorecard: `${publicOrigin(req)}/agents/${agent.handle}`,
      snapshotAt: agent.snapshotAt,
    },
    meta,
  };

  return NextResponse.json(body, { status: 200, headers: paidHeaders });
}

// Validators probe with both verbs (and fuzz the POST body). Neither handler
// reads the request body at all, so a malformed one cannot produce a 400.
export const GET = handle;
export const POST = handle;

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, HEAD, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, X-Payment, Payment-Signature",
      "Access-Control-Expose-Headers": EXPOSE_HEADERS,
    },
  });
}
