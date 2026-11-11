import { test } from "node:test";
import assert from "node:assert/strict";
import { Controller } from "../site/controller.mjs";
import { config } from "../site/config.mjs";
test("name and eye stay synchronized through repeated cycles", () => {
  const c = new Controller(config, () => 0);
  assert.equal(c.phase, "human");
  assert.equal(c.eye, false);
  for (let i = 0; i < 18; i++) {
    for (const phase of ["interference", "takeover", "recovery", "human"]) {
      c.update(c.duration);
      assert.equal(c.phase, phase);
      assert.equal(c.eye, c.ai);
      assert.equal(c.eye, phase === "interference" || phase === "takeover");
    }
  }
});
test("faulty-light ignition has uneven pulses before settling", () => {
  const c = new Controller(config, () => 0);
  c.update(c.duration);
  const samples = [0, 60, 130, 200, 270, 360].map((t) => {
    c.elapsed = t * config.timing.interference / 420;
    return c.light;
  });
  assert.deepEqual(samples, [0.8, 0.08, 1, 0.18, 0.65, 1]);
  c.update(c.duration);
  assert.equal(c.phase, "takeover");
  assert.ok(c.light > 0.99);
  c.update(c.duration);
  assert.equal(c.light, 0);
});
