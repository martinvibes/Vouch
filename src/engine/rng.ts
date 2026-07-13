/**
 * Tiny deterministic PRNG (mulberry32). Vouch's published ratings must be
 * reproducible: given the same audit inputs, anyone re-running the scorer gets
 * the same numbers. A seeded RNG is how the simulation mode stays stable and
 * how the live scorer stays auditable.
 */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Deterministic 32-bit hash of a string → usable as an RNG seed. */
export function hashSeed(input: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Gaussian-ish sample (sum of uniforms) centred on `mean`, clamped 0..100. */
export function scoreAround(rng: () => number, mean: number, spread = 10): number {
  const noise = (rng() + rng() + rng()) / 3 - 0.5; // ~[-0.5, 0.5], bell-ish
  const v = mean + noise * spread * 2;
  return Math.max(0, Math.min(100, Math.round(v)));
}
