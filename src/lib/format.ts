/** Small formatting helpers shared across the UI. */

export function shortHash(hash: string): string {
  if (hash.length <= 14) return hash;
  return `${hash.slice(0, 8)}…${hash.slice(-6)}`;
}

export function fmtUsd(n: number): string {
  if (n < 1) return `$${n.toFixed(3)}`;
  return `$${n.toLocaleString("en-US", { maximumFractionDigits: 2 })}`;
}

export function fmtLatency(ms: number): string {
  if (ms < 1000) return `${ms} ms`;
  return `${(ms / 1000).toFixed(1)} s`;
}

export function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function fmtRelative(iso: string, now = Date.parse("2026-07-13T12:00:00Z")): string {
  const diff = now - Date.parse(iso);
  const days = Math.floor(diff / 864e5);
  if (days <= 0) return "today";
  if (days === 1) return "yesterday";
  return `${days} days ago`;
}

const FLAG_LABELS: Record<string, string> = {
  "no-delivery": "No delivery",
  "spec-miss": "Missed the brief",
  overpriced: "Overpriced",
  "edge-evaporates": "Edge gone after costs",
  "misses-vulns": "Missed vulnerabilities",
  "weak-risk-control": "Weak risk control",
  "generic-output": "Generic output",
};

export function flagLabel(flag: string): string {
  return FLAG_LABELS[flag] ?? flag;
}
