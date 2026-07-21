import { NextResponse } from "next/server";
import { getAgent } from "@/lib/data";
import {
  paymentRequired,
  legacyBodyFields,
  encodeChallenge,
  settlePayment,
  RATING_PRICE_USD,
  NETWORK,
  ASP_ID,
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
 * Three inviolable rules here.
 *
 * **Rate the agent the buyer asked for — never a different one.** The requested
 * target arrives in the task body or query (the way every OKX service takes its
 * input, e.g. `POST /compute/infer {prompt}`), NOT only in the URL path. The
 * registered endpoint path is fixed, so reading the target from the path alone
 * rated the same hardcoded agent for every buyer and mislabelled it "hire" for
 * whoever they actually asked about — the exact failure that was rejected on
 * 2026-07-21. `resolveTarget()` reads body → query → path, and the response
 * echoes both what was requested and what was resolved so the buyer can confirm
 * the rating matches the ask. A requested agent we don't have is a clear
 * not-found, never a substitution.
 *
 * **An unpaid request always answers 402 with the challenge** — every method,
 * every body, every id. Marketplace validators fuzz this endpoint (malformed
 * JSON, wrong content-type, garbage payment headers, bare GETs), and any other
 * status reads to them as "the endpoint does not implement x402".
 *
 * **The buyer is charged only for a rating actually delivered.** Settlement is
 * the last thing that happens: the result is resolved and the whole response
 * assembled first, and only then is the authorization broadcast. A query we
 * have no rating for never reaches settlement at all — the authorization is
 * simply not used, so no funds move and there is nothing to refund. Ordering
 * these the other way round is what failed review on 2026-07-20 ("fees are
 * still charged to users when the service fails to return results").
 */

// Path segments that name the service itself, not an agent to rate. Hitting
// `/api/vouch/rate` means "rate whoever is named in the body/query", so these
// never resolve as a target — the buyer's actual request must come from there.
const RESERVED_PATH = new Set(["rate", "lookup", "rating", "check", "vouch", ""]);

// Field names a buyer might use for "which agent", across body and query. OKX's
// task content lands in the request body; we read a generous set so we resolve
// the target however the caller labelled it rather than ignoring it.
const TARGET_FIELDS = ["target", "agentId", "agent_id", "handle", "agent", "query", "q", "name", "id"];
const TARGET_WRAPPERS = ["content", "input", "params", "parameters", "data", "payload", "task", "arguments"];

/**
 * The agent the buyer is asking about. Read, in order, from: the request body
 * (JSON, including one level of task/content wrapping, or a bare string); the
 * query string; and finally the URL path (unless the path is the service name).
 *
 * Every branch is defensive: a missing, empty, or malformed body must never
 * throw — it just means "no target here, try the next source" — so this cannot
 * turn a fuzzed request into a 400 or 500.
 */
async function resolveTarget(req: Request, pathId: string): Promise<{ value: string | null; source: string }> {
  const pick = (o: unknown): string | null => {
    if (!o || typeof o !== "object") return null;
    const rec = o as Record<string, unknown>;
    for (const f of TARGET_FIELDS) {
      const v = rec[f];
      if (typeof v === "string" && v.trim()) return v.trim();
    }
    return null;
  };

  // 1. Body — where OKX puts task content.
  try {
    const text = await req.text();
    if (text && text.trim()) {
      try {
        const obj: unknown = JSON.parse(text);
        if (typeof obj === "string" && obj.trim()) return { value: obj.trim(), source: "body" };
        const direct = pick(obj);
        if (direct) return { value: direct, source: "body" };
        if (obj && typeof obj === "object") {
          for (const w of TARGET_WRAPPERS) {
            const nested = pick((obj as Record<string, unknown>)[w]);
            if (nested) return { value: nested, source: `body.${w}` };
          }
        }
      } catch {
        // Not JSON. A short plain-text body is taken as the target itself.
        const t = text.trim();
        if (t.length <= 128 && !t.includes("{") && !t.includes("=")) return { value: t, source: "body" };
      }
    }
  } catch {
    // No readable body — fine, fall through.
  }

  // 2. Query string.
  try {
    const params = new URL(req.url).searchParams;
    for (const f of TARGET_FIELDS) {
      const v = params.get(f);
      if (v && v.trim()) return { value: v.trim(), source: "query" };
    }
  } catch {
    // Malformed URL — fall through.
  }

  // 3. Path, unless it's the service name (a parameterized endpoint like /rate).
  if (pathId && !RESERVED_PATH.has(pathId.toLowerCase())) return { value: pathId, source: "path" };

  return { value: null, source: "none" };
}

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
  "Payment-Required, X-Payment-Required, Payment-Response, X-Payment-Response, X-Payment-Settled";

const DISCLAIMER =
  "Independent rating computed from real, published OKX.AI marketplace signals. Not investment advice.";

type Agent = NonNullable<ReturnType<typeof getAgent>>;

/**
 * The paid deliverable, assembled from data already in hand. Deliberately
 * pure and synchronous: it is built before settlement so that once funds
 * move, returning the result cannot fail.
 */
function ratingBody(agent: Agent, req: Request, requested: string) {
  return {
    found: true,
    charged: true,
    // Echo the ask and what it resolved to, so the buyer can confirm the rating
    // is about the agent they requested — never a silent substitution.
    requested,
    resolved: { id: agent.id, name: agent.name, handle: agent.handle },
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
  };
}

// One JSON shape for "paid nothing, delivered nothing" — a miss that must not
// charge. Headers say the same for clients that read headers not bodies.
function notFound(requested: string | null, message: string) {
  return NextResponse.json(
    {
      found: false,
      charged: false,
      requested,
      resolved: null,
      rating: null,
      message,
      meta: {
        authority: "Vouch",
        asp: `#${ASP_ID}`,
        network: NETWORK,
        amountCharged: 0,
        settlement: null,
        disclaimer: DISCLAIMER,
      },
    },
    {
      status: 200,
      headers: {
        "X-Payment-Settled": "false",
        "Access-Control-Expose-Headers": EXPOSE_HEADERS,
        "Cache-Control": "no-store",
      },
    },
  );
}

async function handle(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;

  // Which agent does the buyer actually want? Body first (where OKX puts task
  // content), then query, then path. Reading the body here also consumes it, so
  // it must happen before anything else touches the request.
  const target = await resolveTarget(req, id);
  const agent = target.value ? getAgent(target.value) : undefined;

  const resource = `${publicOrigin(req)}/api/vouch/${id}`;
  const description = agent
    ? `Vouch rating for ${agent.name} (${agent.handle})`
    : "Vouch rating — pass the target agent's handle or id in the request body or query";

  // Build the challenge before anything can fail. An unknown target is NOT a
  // 404 here: the challenge is served first and the lookup result is delivered
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

  // Paid, but the buyer named no agent. Nothing to rate → no charge.
  if (!target.value) {
    return notFound(
      null,
      "No target agent specified, so you were not charged. Ask for a specific agent by passing its marketplace handle or agent id — in the JSON body as {\"target\": \"<handle-or-id>\"}, as ?target=<handle-or-id>, or in the URL path.",
    );
  }

  // Paid, but we have no rating for the agent they asked for. A clear not-found
  // for THAT agent — never a rating for some other agent. The authorization is
  // never broadcast, so no funds move and there is nothing to refund. This must
  // stay ahead of settlePayment: settling first is what charged reviewers for a
  // result they did not receive.
  if (!agent) {
    return notFound(
      target.value,
      `No rating on file for '${target.value}', so you were not charged. Vouch grades agents published on the OKX.AI marketplace; check the handle or agent id and try again. You were NOT given a rating for a different agent.`,
    );
  }

  // The whole response is assembled BEFORE settlement, so there is no step
  // between "money moved" and "result returned" that can fail and leave the
  // buyer paying for nothing. It echoes the requested target and what it
  // resolved to.
  const body = ratingBody(agent, req, target.value);

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
    "X-Payment-Settled": "true",
    "Access-Control-Expose-Headers": EXPOSE_HEADERS,
    "Cache-Control": "no-store",
  };

  const meta = {
    authority: "Vouch",
    asp: `#${ASP_ID}`,
    network: NETWORK,
    amountCharged: RATING_PRICE_USD,
    settlement: { transaction: settlement.transaction, payer: settlement.payer },
    disclaimer: DISCLAIMER,
  };

  return NextResponse.json({ ...body, meta }, { status: 200, headers: paidHeaders });
}

// Validators probe with both verbs (and fuzz the POST body). resolveTarget()
// wraps every body read in try/catch, so a malformed body yields "no target",
// never a 400.
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
