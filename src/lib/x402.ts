/**
 * Minimal x402 ("HTTP 402 Payment Required") server helpers, shaped to match
 * the real protocol so the Vouch rating API is a drop-in paid endpoint on
 * OKX.AI. Flow:
 *
 *   1. Client GETs the resource with no payment  → 402 + `accepts` requirements
 *   2. Client retries with an `X-PAYMENT` header  → 200 + the resource, plus an
 *      `X-PAYMENT-RESPONSE` header carrying the settlement.
 *
 * In mock mode any non-empty `X-PAYMENT` header settles (deterministic hash).
 * Wired to the OKX Payment SDK, `verifyPayment` calls the facilitator instead.
 */

export const X402_VERSION = 1;

/** Price of one rating lookup, in USDC atomic units (6 decimals) → $0.02. */
export const RATING_PRICE_ATOMIC = "20000";
export const RATING_PRICE_USD = 0.02;

/**
 * Vouch's receiving identity and the settlement asset on X Layer.
 * PAY_TO is Vouch's real Agentic Wallet address (ERC-8004 ASP #5434), so a
 * settled call pays the actual authority — no placeholder.
 */
export const PAY_TO = "0x6f1b837d7c27f62e4b1bc72a41d02118e30e9af1";
export const USDC_XLAYER = "0x74b7f16337b8972027f6196a17a631ac6de26d22";
export const NETWORK = "x-layer";
export const ASP_ID = "5434";

export interface PaymentRequirements {
  scheme: "exact";
  network: string;
  maxAmountRequired: string;
  resource: string;
  description: string;
  mimeType: string;
  payTo: string;
  maxTimeoutSeconds: number;
  asset: string;
  extra: { name: string; decimals: number };
}

export function paymentRequired(resource: string, description: string) {
  const requirements: PaymentRequirements = {
    scheme: "exact",
    network: "x-layer",
    maxAmountRequired: RATING_PRICE_ATOMIC,
    resource,
    description,
    mimeType: "application/json",
    payTo: PAY_TO,
    maxTimeoutSeconds: 60,
    asset: USDC_XLAYER,
    extra: { name: "USDC", decimals: 6 },
  };
  return {
    x402Version: X402_VERSION,
    error: "X-PAYMENT header is required to call the Vouch rating API",
    accepts: [requirements],
  };
}

export interface Settlement {
  success: boolean;
  txHash: string;
  network: string;
  payer: string;
}

/** Deterministic settlement hash from the payment payload (mock facilitator). */
function settlementHash(payment: string): string {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < payment.length; i++) {
    h ^= payment.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  const hex = "0123456789abcdef";
  let s = "0x";
  let x = h >>> 0;
  for (let i = 0; i < 64; i++) {
    s += hex[x & 15];
    x = (Math.imul(x, 1664525) + 1013904223) >>> 0;
  }
  return s;
}

/**
 * Verify (and, in live mode, settle) a payment. Returns the settlement on
 * success, or null if the header is missing/invalid. Mock: accepts any
 * non-empty header. Live: hand `payment` to the OKX facilitator to verify the
 * signed x402 payload and broadcast settlement.
 */
export function verifyPayment(paymentHeader: string | null): Settlement | null {
  if (!paymentHeader || paymentHeader.trim().length === 0) return null;
  return {
    success: true,
    txHash: settlementHash(paymentHeader),
    network: "x-layer",
    payer: "0x" + settlementHash(paymentHeader).slice(2, 42),
  };
}
