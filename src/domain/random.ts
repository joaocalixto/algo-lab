/**
 * Deterministic pseudo-random numbers.
 *
 * The graph generator must be reproducible: the same seed always yields the
 * same graph, so a learner can share "graph 1234" with the class and an
 * automated test can pin a generated example. `Math.random` cannot do that.
 *
 * mulberry32: a small, well-distributed 32-bit generator. Quality beyond
 * "looks random to a human" is irrelevant here.
 */
export interface RandomSource {
  /** Uniform in [0, 1). */
  readonly next: () => number;
  /** Uniform integer in [min, max]. */
  readonly int: (min: number, max: number) => number;
  /** A copy of `items` in a uniformly random order (Fisher–Yates). */
  readonly shuffle: <T>(items: readonly T[]) => T[];
}

export function createRandom(seed: number): RandomSource {
  let state = (Math.trunc(seed) || 1) >>> 0;
  const next = (): number => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const int = (min: number, max: number): number => min + Math.floor(next() * (max - min + 1));
  const shuffle = <T,>(items: readonly T[]): T[] => {
    const copy = [...items];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = int(0, i);
      [copy[i], copy[j]] = [copy[j]!, copy[i]!];
    }
    return copy;
  };
  return { next, int, shuffle };
}

/** A seed to offer as a starting point when the user has not chosen one. */
export function randomSeed(): number {
  return Math.floor(Math.random() * 1_000_000) + 1;
}
