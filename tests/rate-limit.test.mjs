import test from "node:test";
import assert from "node:assert/strict";

import { createRateLimiter } from "../src/rate-limit.mjs";

test("allows requests up to the configured limit", () => {
  const limiter = createRateLimiter({ max: 2, windowMs: 1_000, now: () => 10_000 });
  assert.equal(limiter.check("visitor:/api/analyze").allowed, true);
  const second = limiter.check("visitor:/api/analyze");
  assert.equal(second.allowed, true);
  assert.equal(second.remaining, 0);
  assert.equal(limiter.check("visitor:/api/analyze").allowed, false);
});

test("isolates visitors and resets an expired window", () => {
  let timestamp = 20_000;
  const limiter = createRateLimiter({ max: 1, windowMs: 1_000, now: () => timestamp });
  assert.equal(limiter.check("visitor-a").allowed, true);
  assert.equal(limiter.check("visitor-a").allowed, false);
  assert.equal(limiter.check("visitor-b").allowed, true);
  timestamp += 1_001;
  const reset = limiter.check("visitor-a");
  assert.equal(reset.allowed, true);
  assert.equal(reset.remaining, 0);
});
