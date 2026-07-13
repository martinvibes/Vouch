"use client";

import { useState } from "react";

type Phase = "idle" | "loading";

/**
 * Live demo of the x402 rating API. Fires the real endpoint twice: once with no
 * payment (returns 402 + requirements), then with an X-PAYMENT header (returns
 * 200 + the rating). Lets anyone watch the pay-per-call flow end to end.
 */
export function ApiTryIt({ agents }: { agents: { handle: string; name: string }[] }) {
  const [handle, setHandle] = useState(agents[0]?.handle ?? "");
  const [phase, setPhase] = useState<Phase>("idle");
  const [status, setStatus] = useState<number | null>(null);
  const [paid, setPaid] = useState(false);
  const [body, setBody] = useState<string>("");

  async function call(withPayment: boolean) {
    setPhase("loading");
    setPaid(withPayment);
    try {
      const res = await fetch(`/api/vouch/${handle}`, {
        headers: withPayment ? { "X-PAYMENT": "demo-signed-x402-payload" } : {},
        cache: "no-store",
      });
      const json = await res.json();
      setStatus(res.status);
      setBody(JSON.stringify(json, null, 2));
    } catch (err) {
      setStatus(0);
      setBody(String(err));
    } finally {
      setPhase("idle");
    }
  }

  const statusColor =
    status === 200
      ? "var(--color-grade-a)"
      : status === 402
        ? "var(--color-gold)"
        : status === null
          ? "var(--color-fg-mute)"
          : "var(--color-grade-f)";

  return (
    <div className="panel-flat overflow-hidden">
      <div className="flex flex-wrap items-center gap-3 border-b border-[var(--color-line)] p-4">
        <span className="font-mono text-sm text-[var(--color-fg-mute)]">GET /api/vouch/</span>
        <select
          value={handle}
          onChange={(e) => setHandle(e.target.value)}
          className="rounded-lg border border-[var(--color-line-strong)] bg-[var(--color-ink)] px-3 py-2 font-mono text-sm text-[var(--color-fg)]"
        >
          {agents.map((a) => (
            <option key={a.handle} value={a.handle}>
              {a.handle}
            </option>
          ))}
        </select>

        <div className="ml-auto flex gap-2">
          <button onClick={() => call(false)} disabled={phase === "loading"} className="btn btn-ghost h-10 px-4 text-sm">
            Send (no payment)
          </button>
          <button onClick={() => call(true)} disabled={phase === "loading"} className="btn btn-primary h-10 px-4 text-sm">
            Pay $0.02 &amp; retry
          </button>
        </div>
      </div>

      <div className="flex items-center gap-3 border-b border-[var(--color-line)] px-4 py-2.5 font-mono text-xs">
        {status !== null ? (
          <>
            <span style={{ color: statusColor }}>● {status}</span>
            <span className="text-[var(--color-fg-mute)]">
              {status === 402 ? "Payment Required" : status === 200 ? "OK" : "Response"}
            </span>
            {status === 200 && (
              <span className="ml-auto text-[var(--color-fg-mute)]">
                paid via x402 {paid ? "· settlement in X-Payment-Response" : ""}
              </span>
            )}
          </>
        ) : (
          <span className="text-[var(--color-fg-mute)]">
            {phase === "loading" ? "Calling endpoint…" : "Run a request to see the response"}
          </span>
        )}
      </div>

      <pre className="max-h-[420px] overflow-auto p-4 font-mono text-xs leading-relaxed text-[var(--color-fg-dim)]">
        {body || "// The response body appears here.\n// Start with \"Send (no payment)\" to see the 402 challenge,\n// then \"Pay $0.02 & retry\" to get the rating."}
      </pre>
    </div>
  );
}
