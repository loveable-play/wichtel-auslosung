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
export type DrawResult<T extends Id> = {
    ok: true;
    assignment: Map<T, T>;
} | {
    ok: false;
    reason: "too_few" | "unsatisfiable";
};
export type RandomInt = (maxExclusive: number) => number;
/** Uniform integer in [0, maxExclusive) via rejection sampling — no modulo bias. */
export declare const secureRandomInt: RandomInt;
export type DrawOptions = {
    maxAttempts?: number;
    randomInt?: RandomInt;
};
/**
 * Draws "who gives to whom".
 * @param ids          participant ids (at least 3, must be unique)
 * @param exclusions   pairs that must not draw each other (symmetric)
 */
export declare function draw<T extends Id>(ids: readonly T[], exclusions?: ReadonlyArray<readonly [T, T]>, { maxAttempts, randomInt }?: DrawOptions): DrawResult<T>;
/** Upper bound of exclusions per person: n - 3 (at least 1), so at least two possible receivers remain. */
export declare function maxExclusionsPerPerson(participantCount: number): number;
export type ExclusionCheck<T extends Id> = {
    ok: true;
    pair: readonly [T, T];
} | {
    ok: false;
    reason: "same" | "unknown" | "duplicate" | "too_many" | "unsatisfiable";
};
/**
 * Validates a new exclusion before you store it: both persons must belong to the group and differ,
 * the pair must be new, nobody may exceed maxExclusionsPerPerson, and a draw must still be possible
 * (checked with a trial draw using the same algorithm).
 */
export declare function checkExclusion<T extends Id>(ids: readonly T[], existing: ReadonlyArray<readonly [T, T]>, a: T, b: T, options?: DrawOptions): ExclusionCheck<T>;
