/**
 * Deterministic RNG — pure, no Math.random, no Date.now.
 *
 * - hashSeed: FNV-1a 32-bit hash of a string (deterministic, no crypto needed
 *   for sequence selection; cryptographic hash is reserved for higher layers).
 * - mulberry32: high-quality 32-bit PRNG seeded from the hash.
 *
 * Same seed string ⇒ same numeric stream ⇒ same composer sequence.
 */

export function hashSeed(seed: string): number {
  let h = 0x811c9dc5; // FNV offset basis
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    // FNV prime multiplication, kept in 32-bit range
    h = Math.imul(h, 0x01000193);
  }
  // Force unsigned 32-bit
  return h >>> 0;
}

export function mulberry32(seedInt: number): () => number {
  let a = seedInt >>> 0;
  return function next(): number {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Deterministic integer in [0, max). */
export function nextInt(rng: () => number, max: number): number {
  if (max <= 0) return 0;
  return Math.floor(rng() * max);
}
