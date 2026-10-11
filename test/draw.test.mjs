import test from "node:test";
import assert from "node:assert/strict";
import { draw, checkExclusion, maxExclusionsPerPerson, secureRandomInt } from "../dist/index.js";

test("no self-assignment, everyone gives and receives exactly once", () => {
  for (let i = 0; i < 500; i++) {
    const ids = ["Ana", "Ben", "Cem", "Dora", "Eli", "Finn"];
    const r = draw(ids);
    assert.equal(r.ok, true);
    assert.equal(new Set(r.assignment.values()).size, ids.length);
    for (const [g, n] of r.assignment) assert.notEqual(g, n);
  }
});

test("exclusions are symmetric and respected", () => {
  for (let i = 0; i < 500; i++) {
    const r = draw([1, 2, 3, 4], [[1, 2]]);
    assert.equal(r.ok, true);
    assert.notEqual(r.assignment.get(1), 2);
    assert.notEqual(r.assignment.get(2), 1);
  }
});

test("unsatisfiable constraints are reported, not retried forever", () => {
  assert.deepEqual(draw([1, 2, 3], [[1, 2], [1, 3]]), { ok: false, reason: "unsatisfiable" });
});

test("fewer than three participants are rejected", () => {
  assert.deepEqual(draw([1, 2]), { ok: false, reason: "too_few" });
});

test("duplicate ids throw", () => {
  assert.throws(() => draw([1, 1, 2]), /unique/);
});

test("injectable random source makes draws reproducible", () => {
  let s = 7;
  const seeded = (max) => { s = (s * 1103515245 + 12345) % 2 ** 31; return s % max; };
  const a = draw([1, 2, 3, 4, 5], [], { randomInt: seeded });
  s = 7;
  const b = draw([1, 2, 3, 4, 5], [], { randomInt: seeded });
  assert.deepEqual([...a.assignment], [...b.assignment]);
});

test("secureRandomInt is in range and roughly uniform", () => {
  const counts = [0, 0, 0];
  for (let i = 0; i < 30000; i++) counts[secureRandomInt(3)]++;
  for (const c of counts) assert.ok(c > 9000 && c < 11000, `counts ${counts}`);
  assert.throws(() => secureRandomInt(0), RangeError);
});

test("exclusion limit depends on group size", () => {
  assert.equal(maxExclusionsPerPerson(3), 1);
  assert.equal(maxExclusionsPerPerson(6), 3);
  assert.equal(maxExclusionsPerPerson(12), 9);
});

test("checkExclusion rejects same, unknown, duplicate, too many and unsatisfiable", () => {
  const ids = [1, 2, 3, 4, 5, 6];
  assert.equal(checkExclusion(ids, [], 2, 2).reason, "same");
  assert.equal(checkExclusion(ids, [], 2, 99).reason, "unknown");
  assert.equal(checkExclusion(ids, [[3, 1]], 1, 3).reason, "duplicate");
  assert.equal(checkExclusion(ids, [[1, 2], [1, 3], [1, 4]], 1, 5).reason, "too_many");
  assert.equal(checkExclusion([1, 2, 3], [], 1, 2).reason, "unsatisfiable");
  const ok = checkExclusion(ids, [[1, 2]], 1, 3);
  assert.equal(ok.ok, true);
});
