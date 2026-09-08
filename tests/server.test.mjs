import test, { after, before } from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const port = 43919;
const baseUrl = `http://127.0.0.1:${port}`;
let child;
let logs = "";

before(async () => {
  child = spawn(process.execPath, ["server.mjs"], {
    cwd: root,
    env: {
      ...process.env,
      HOST: "127.0.0.1",
      PORT: String(port),
      NODE_ENV: "production",
      TRUST_PROXY: "1",
      RATE_LIMIT_MAX: "2",
      RATE_LIMIT_WINDOW_MS: "60000"
    },
    stdio: ["ignore", "pipe", "pipe"]
  });
  child.stdout.on("data", (chunk) => { logs += chunk; });
  child.stderr.on("data", (chunk) => { logs += chunk; });

  for (let attempt = 0; attempt < 40; attempt += 1) {
    try {
      const response = await fetch(`${baseUrl}/api/health`);
      if (response.ok) return;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
  }
  throw new Error(`Test server did not start.\n${logs}`);
});

after(() => {
  if (child && !child.killed) child.kill("SIGTERM");
});

test("serves health, legal pages and production security headers", async () => {
  const health = await fetch(`${baseUrl}/api/health`);
  assert.equal(health.status, 200);
  assert.equal((await health.json()).version, "0.3.0");
  assert.match(health.headers.get("content-security-policy"), /frame-ancestors 'none'/);
  assert.match(health.headers.get("strict-transport-security"), /max-age=31536000/);

  for (const page of ["privacy.html", "terms.html"]) {
    const response = await fetch(`${baseUrl}/${page}`);
    assert.equal(response.status, 200);
    assert.match(await response.text(), /Public research prototype/i);
  }
});

test("rejects unsupported and malformed request bodies", async () => {
  const unsupported = await fetch(`${baseUrl}/api/analyze`, {
    method: "POST",
    headers: { "Content-Type": "text/plain", "X-Forwarded-For": "198.51.100.10" },
    body: "{}"
  });
  assert.equal(unsupported.status, 415);

  const malformed = await fetch(`${baseUrl}/api/analyze`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Forwarded-For": "198.51.100.11" },
    body: "{not-json}"
  });
  assert.equal(malformed.status, 400);
});

test("returns rate-limit headers and blocks excess requests", async () => {
  const options = { headers: { "X-Forwarded-For": "198.51.100.20" } };
  const first = await fetch(`${baseUrl}/api/india/dataset`, options);
  const second = await fetch(`${baseUrl}/api/india/dataset`, options);
  const blocked = await fetch(`${baseUrl}/api/india/dataset`, options);

  assert.equal(first.status, 200);
  assert.equal(first.headers.get("ratelimit-limit"), "2");
  assert.equal(second.headers.get("ratelimit-remaining"), "0");
  assert.equal(blocked.status, 429);
  assert.ok(Number(blocked.headers.get("retry-after")) >= 1);
});
