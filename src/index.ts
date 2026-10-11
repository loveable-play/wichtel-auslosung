/**
 * wichtel-auslosung — Secret-Santa / Wichtel draw with exclusions.
 *
 * - No self-assignment, every participant gives exactly one gift and receives exactly one.
 * - Exclusions are symmetric: excluding (a, b) means a never draws b and b never draws a.
 * - Unbiased shuffle (Fisher–Yates) driven by a cryptographically secure random source
 *   (Web Crypto, available in browsers and Node.js >= 19).
 * - Returns a clear error instead of looping forever when the constraints cannot be met.
 *
 * Extracted from the production code of Fina (https://www.heyfina.de/wichteln).
 */

export type Id = string | number;

export type DrawResult<T extends Id> =
  | { ok: true; assignment: Map<T, T> }
  | { ok: false; reason: "too_few" | "unsatisfiable" };

export type RandomInt = (maxExclusive: number) => number;

/** Uniform integer in [0, maxExclusive) via rejection sampling — no modulo bias. */
export const secureRandomInt: RandomInt = (maxExclusive) => {
  if (!Number.isInteger(maxExclusive) || maxExclusive <= 0 || maxExclusive > 2 ** 32) {
    throw new RangeError("maxExclusive must be an integer in 1..2^32");
  }
  const cryptoObj = (globalThis as { crypto?: { getRandomValues(a: Uint32Array): Uint32Array } }).crypto;
  if (!cryptoObj?.getRandomValues) throw new Error("No Web Crypto available (need a browser or Node.js >= 19)");
  const limit = Math.floor(2 ** 32 / maxExclusive) * maxExclusive;
  const buf = new Uint32Array(1);
  for (;;) {
    cryptoObj.getRandomValues(buf);
    if (buf[0] < limit) return buf[0] % maxExclusive;
  }
};

export type DrawOptions = { maxAttempts?: number; randomInt?: RandomInt };

/**
 * Draws "who gives to whom".
 * @param ids          participant ids (at least 3, must be unique)
 * @param exclusions   pairs that must not draw each other (symmetric)
 */
export function draw<T extends Id>(
  ids: readonly T[],
  exclusions: ReadonlyArray<readonly [T, T]> = [],
  { maxAttempts = 1000, randomInt = secureRandomInt }: DrawOptions = {},
): DrawResult<T> {
  if (new Set(ids).size !== ids.length) throw new Error("ids must be unique");
  if (ids.length < 3) return { ok: false, reason: "too_few" };
  const forbidden = new Set<string>();
  const key = (a: T, b: T) => JSON.stringify([a, b]);
  for (const [a, b] of exclusions) {
    forbidden.add(key(a, b));
    forbidden.add(key(b, a));
  }
  const allowed = (giver: T, receiver: T) => giver !== receiver && !forbidden.has(key(giver, receiver));

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const target = [...ids];
    for (let i = target.length - 1; i > 0; i--) {
      const j = randomInt(i + 1);
      [target[i], target[j]] = [target[j], target[i]];
    }
    if (ids.every((giver, i) => allowed(giver, target[i]))) {
      return { ok: true, assignment: new Map(ids.map((g, i) => [g, target[i]])) };
    }
  }
  return { ok: false, reason: "unsatisfiable" };
}

/** Upper bound of exclusions per person: n - 3 (at least 1), so at least two possible receivers remain. */
export function maxExclusionsPerPerson(participantCount: number): number {
  return Math.max(1, participantCount - 3);
}

export type ExclusionCheck<T extends Id> =
  | { ok: true; pair: readonly [T, T] }
  | { ok: false; reason: "same" | "unknown" | "duplicate" | "too_many" | "unsatisfiable" };

/**
 * Validates a new exclusion before you store it: both persons must belong to the group and differ,
 * the pair must be new, nobody may exceed maxExclusionsPerPerson, and a draw must still be possible
 * (checked with a trial draw using the same algorithm).
 */
export function checkExclusion<T extends Id>(
  ids: readonly T[],
  existing: ReadonlyArray<readonly [T, T]>,
  a: T,
  b: T,
  options: DrawOptions = {},
): ExclusionCheck<T> {
  if (a === b) return { ok: false, reason: "same" };
  if (!ids.includes(a) || !ids.includes(b)) return { ok: false, reason: "unknown" };
  const same = ([x, y]: readonly [T, T]) => (x === a && y === b) || (x === b && y === a);
  if (existing.some(same)) return { ok: false, reason: "duplicate" };
  const limit = maxExclusionsPerPerson(ids.length);
  const count = (id: T) => existing.filter(([x, y]) => x === id || y === id).length;
  if (count(a) >= limit || count(b) >= limit) return { ok: false, reason: "too_many" };
  const trial = draw(ids, [...existing, [a, b] as const], options);
  if (!trial.ok) return { ok: false, reason: "unsatisfiable" };
  return { ok: true, pair: [a, b] as const };
}
