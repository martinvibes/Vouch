/**
 * x402 ("HTTP 402 Payment Required") server implementation — standard-compliant
 * and settled for real on X Layer. Flow:
 *
 *   1. Client GETs the resource with no payment → 402 + base64 `PAYMENT-REQUIRED`
 *      challenge header (what OKX's validators read) + JSON body `accepts`.
 *   2. Client signs an EIP-3009 transferWithAuthorization from the challenge and
 *      retries with the standard `X-PAYMENT` header.
 *   3. We settle it on-chain ourselves (our operator wallet broadcasts the
 *      authorization and pays gas) → 200 + resource + `X-PAYMENT-RESPONSE`
 *      header carrying the real settlement txHash.
 *
 * The token contract itself verifies the buyer's signature and enforces nonce
 * uniqueness (authorizationState), so settlement is trustless and replay-proof
 * without a database — important on serverless.
 */

import { ethers } from "ethers";

/**
 * x402 protocol version. MUST be 2: OKX's marketplace validator parses the
 * base64 challenge with `@okxweb3/x402-core`'s zod schema, which pins
 * `x402Version: z.literal(2)` and requires `resource` to be an OBJECT. A v1
 * challenge fails that parse outright and the listing is rejected with
 * "x402 standard validation failed" — regardless of whether payment works.
 */
export const X402_VERSION = 2;

/** Price of one rating lookup, in USDT atomic units (6 decimals) → $0.02. */
export const RATING_PRICE_ATOMIC = "20000";
export const RATING_PRICE_USD = 0.02;

/**
 * Vouch's receiving identity and the settlement asset on X Layer mainnet.
 * PAY_TO is Vouch's real Agentic Wallet address (ERC-8004 ASP #5434).
 * USDT0 is the OKX task-system settlement token (supports EIP-3009); its
 * EIP-712 domain is verified against the on-chain DOMAIN_SEPARATOR — buyers
 * sign against extra {name, version}, so these MUST match the contract.
 */
export const PAY_TO = "0x6f1b837d7c27f62e4b1bc72a41d02118e30e9af1";
export const USDT0_XLAYER = "0x779ded0c9e1022225f8e0630b35a9b54be713736";
export const USDT0_DOMAIN = { name: "USD₮0", version: "1" };
export const NETWORK = "eip155:196";
export const XLAYER_RPC = "https://xlayerrpc.okx.com";
export const ASP_ID = "5434";

/**
 * One entry of `accepts[]`. Exactly the fields the OKX schema defines — no
 * more. Extra keys are tolerated by the (non-strict) parser, but a lean entry
 * is what has been proven to pass review, so we keep the wire shape minimal
 * and put anything human-readable in `resource` instead.
 */
export interface PaymentRequirements {
  scheme: "exact";
  network: string;
  asset: string;
  amount: string;
  payTo: string;
  maxTimeoutSeconds: number;
  extra: { name: string; version: string };
}

export interface Challenge {
  x402Version: number;
  error: string;
  resource: { url: string; description: string; mimeType: string };
  accepts: PaymentRequirements[];
}

/** The v2 challenge served on every unpaid request, header and body alike. */
export function paymentRequired(resource: string, description: string): Challenge {
  const requirements: PaymentRequirements = {
    scheme: "exact",
    network: NETWORK,
    asset: USDT0_XLAYER,
    amount: RATING_PRICE_ATOMIC,
    payTo: PAY_TO,
    maxTimeoutSeconds: 300,
    extra: { ...USDT0_DOMAIN },
  };
  return {
    x402Version: X402_VERSION,
    error: "X-PAYMENT header is required to call the Vouch rating API",
    resource: {
      url: resource,
      description,
      mimeType: "application/json",
    },
    accepts: [requirements],
  };
}

/**
 * Fields older/bespoke clients read from the 402 JSON body. Merged into the
 * body only — the header stays strictly v2 so the validator's parse is clean.
 */
export function legacyBodyFields(resource: string, description: string) {
  return {
    maxAmountRequired: RATING_PRICE_ATOMIC,
    decimals: 6,
    payTo: PAY_TO,
    asset: USDT0_XLAYER,
    network: NETWORK,
    description,
    resourceUrl: resource,
  };
}

/** Base64 challenge for the PAYMENT-REQUIRED / X-PAYMENT-REQUIRED headers. */
export function encodeChallenge(challenge: ReturnType<typeof paymentRequired>): string {
  return Buffer.from(JSON.stringify(challenge)).toString("base64");
}

/**
 * The settlement receipt, shaped to the SDK's `settleResponseSchema` so the
 * buyer's client can parse it out of the PAYMENT-RESPONSE header.
 */
export interface Settlement {
  success: boolean;
  /** Matches the SDK's settleResponseSchema, which allows a pending receipt. */
  status: "success" | "pending";
  transaction: string;
  txHash: string; // legacy alias of `transaction`
  network: string;
  payer: string;
  amount: string;
}

export type SettleOutcome = { ok: true; settlement: Settlement } | { ok: false; reason: string };

interface ExactAuthorization {
  from: string;
  to: string;
  value: string;
  validAfter: string;
  validBefore: string;
  nonce: string;
}

const EIP3009_ABI = [
  "function transferWithAuthorization(address from, address to, uint256 value, uint256 validAfter, uint256 validBefore, bytes32 nonce, uint8 v, bytes32 r, bytes32 s)",
  "function authorizationState(address authorizer, bytes32 nonce) view returns (bool)",
];

const SETTLE_TIMEOUT_MS = 45_000;

/**
 * Parse the standard payment header: base64-encoded (or raw) JSON.
 *
 * v1 clients put `scheme`/`network` at the top level; v2 clients (including
 * OKX's own `payment pay-local`) nest the chosen requirement under `accepted`.
 * Both are read, so either generation of buyer settles.
 */
function parsePaymentHeader(header: string): {
  scheme?: string;
  network?: string;
  accepted?: { scheme?: string; network?: string };
  payload: { signature: string; authorization: ExactAuthorization };
} | null {
  for (const text of [Buffer.from(header, "base64").toString("utf8"), header]) {
    try {
      const obj = JSON.parse(text);
      if (obj && typeof obj === "object" && obj.payload?.authorization && obj.payload?.signature) return obj;
    } catch {
      // not this encoding — try the next
    }
  }
  return null;
}

/**
 * Verify and settle a standard x402 "exact" payment on-chain. Returns the real
 * settlement (with the on-chain txHash) on success, or the reason it can't
 * settle. Fails closed if the operator key is not configured.
 */
export async function settlePayment(paymentHeader: string | null): Promise<SettleOutcome> {
  if (!paymentHeader || paymentHeader.trim().length === 0) {
    return { ok: false, reason: "missing X-PAYMENT header" };
  }

  const parsed = parsePaymentHeader(paymentHeader);
  if (!parsed) {
    return { ok: false, reason: "unrecognized payment header: expected standard x402 exact payload" };
  }
  const scheme = parsed.scheme ?? parsed.accepted?.scheme;
  const network = parsed.network ?? parsed.accepted?.network;
  if (scheme && scheme !== "exact") {
    return { ok: false, reason: `unsupported scheme: ${scheme} (supported: exact)` };
  }
  if (network && network !== NETWORK && network !== "x-layer" && network !== "xlayer") {
    return { ok: false, reason: `network mismatch: expected ${NETWORK}` };
  }

  const key = process.env.SETTLEMENT_PRIVATE_KEY?.trim();
  if (!key) return { ok: false, reason: "settlement operator not configured" };

  const auth = parsed.payload.authorization;
  for (const f of ["from", "to", "value", "validAfter", "validBefore", "nonce"] as const) {
    if (!auth[f]) return { ok: false, reason: `authorization missing field: ${f}` };
  }
  if (auth.to.toLowerCase() !== PAY_TO.toLowerCase()) {
    return { ok: false, reason: `authorization.to must be ${PAY_TO}` };
  }

  let value: bigint;
  try {
    value = BigInt(auth.value);
  } catch {
    return { ok: false, reason: "authorization.value is not a valid integer" };
  }
  if (value < BigInt(RATING_PRICE_ATOMIC)) {
    return { ok: false, reason: `insufficient amount: ${value} < required ${RATING_PRICE_ATOMIC}` };
  }

  const now = Math.floor(Date.now() / 1000);
  if (now < Number(auth.validAfter) - 60) return { ok: false, reason: "authorization not yet valid" };
  if (now > Number(auth.validBefore) - 6) return { ok: false, reason: "authorization expired" };

  // Everything from here touches ethers/RPC — keep it inside try/catch so a
  // config or network fault degrades to a 402-with-reason, never a hard 500.
  let token: ethers.Contract;
  try {
    const provider = new ethers.JsonRpcProvider(XLAYER_RPC, 196, { batchMaxCount: 1, staticNetwork: true });
    const signer = new ethers.Wallet(key, provider);
    token = new ethers.Contract(USDT0_XLAYER, EIP3009_ABI, signer);
  } catch (e: unknown) {
    const err = e as { message?: string };
    return { ok: false, reason: `settlement operator misconfigured: ${err?.message || String(e)}` };
  }

  // On-chain replay guard: the token tracks each (authorizer, nonce) pair.
  try {
    if (await token.authorizationState(auth.from, auth.nonce)) {
      return { ok: false, reason: "authorization already used (replay)" };
    }
  } catch (e: unknown) {
    const err = e as { message?: string };
    return { ok: false, reason: `replay check failed: ${err?.message || String(e)}` };
  }

  let sig: ethers.Signature;
  try {
    sig = ethers.Signature.from(parsed.payload.signature);
  } catch {
    return { ok: false, reason: "malformed signature" };
  }

  const args = [auth.from, auth.to, value, BigInt(auth.validAfter), BigInt(auth.validBefore), auth.nonce, sig.v, sig.r, sig.s];

  // Preflight (free): the token verifies the EIP-712 signature and buyer balance.
  try {
    await token.transferWithAuthorization.staticCall(...args);
  } catch (e: unknown) {
    const err = e as { reason?: string; shortMessage?: string; message?: string };
    return { ok: false, reason: `settlement preflight failed: ${err?.reason || err?.shortMessage || err?.message || String(e)}` };
  }

  // Broadcast. Everything above this line can fail closed at no cost to the
  // buyer; nothing below it can. Once the authorization is on the wire the
  // buyer's funds are committed, so from here the only acceptable outcomes are
  // "delivered" or "provably reverted" — reporting failure because we got
  // bored waiting would charge them for nothing, which is what failed review
  // on 2026-07-20.
  let tx: ethers.ContractTransactionResponse;
  try {
    tx = await token.transferWithAuthorization(...args);
  } catch (e: unknown) {
    const err = e as { reason?: string; shortMessage?: string; message?: string };
    return { ok: false, reason: `settlement failed: ${err?.reason || err?.shortMessage || err?.message || String(e)}` };
  }

  const settled = (status: Settlement["status"]): SettleOutcome => ({
    ok: true,
    settlement: {
      success: true,
      status,
      transaction: tx.hash,
      txHash: tx.hash,
      network: NETWORK,
      payer: ethers.getAddress(auth.from),
      amount: value.toString(),
    },
  });

  try {
    const receipt = await Promise.race([
      tx.wait(1),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), SETTLE_TIMEOUT_MS)),
    ]);
    // Slow confirmation, not a failure: X Layer has the transaction and it
    // will land. The buyer gets what they paid for, and the receipt says
    // "pending" so their client can confirm the hash itself.
    if (receipt === null) return settled("pending");
    if (receipt.status !== 1) return { ok: false, reason: "settlement transaction reverted" };
    return settled("success");
  } catch (e: unknown) {
    // Broadcast succeeded but we lost the RPC while waiting. Same reasoning:
    // the transaction exists, so deliver against it rather than charging the
    // buyer for an error that is ours.
    const err = e as { reason?: string; shortMessage?: string; message?: string };
    if (err?.reason === "reverted" || /revert/i.test(err?.message ?? "")) {
      return { ok: false, reason: "settlement transaction reverted" };
    }
    return settled("pending");
  }
}
