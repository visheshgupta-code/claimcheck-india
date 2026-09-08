import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";

import { analyzeCase } from "./src/analyzer.mjs";
import { getIndiaContext, getIndiaDataset } from "./src/india-context.mjs";
import { createRateLimiter } from "./src/rate-limit.mjs";

const root = fileURLToPath(new URL(".", import.meta.url));
const publicDir = join(root, "public");
const port = Number(process.env.PORT || 4173);
const host = process.env.HOST || "0.0.0.0";
const trustProxy = process.env.TRUST_PROXY === "1";
const apiLimiter = createRateLimiter({
  max: Number(process.env.RATE_LIMIT_MAX || 30),
  windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS || 60_000)
});

const mime = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml"
};

function sendJson(res, status, body) {
  res.setHeader("Cache-Control", "no-store");
  res.writeHead(status, { "Content-Type": mime[".json"] });
  res.end(JSON.stringify(body));
}

class HttpError extends Error {
  constructor(statusCode, message) {
    super(message);
    this.statusCode = statusCode;
  }
}

async function readJson(req) {
  if (!String(req.headers["content-type"] || "").toLowerCase().startsWith("application/json")) {
    throw new HttpError(415, "Content-Type must be application/json.");
  }
  let raw = "";
  let bytes = 0;
  for await (const chunk of req) {
    bytes += Buffer.byteLength(chunk);
    if (bytes > 200_000) throw new HttpError(413, "Request body is too large.");
    raw += chunk;
  }
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch {
    throw new HttpError(400, "Request body contains invalid JSON.");
  }
}

function securityHeaders(res) {
  res.setHeader("Content-Security-Policy", "default-src 'self'; img-src 'self' data:; style-src 'self'; script-src 'self'; connect-src 'self'; frame-ancestors 'none'");
  res.setHeader("Cross-Origin-Opener-Policy", "same-origin");
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=(), payment=()");
  res.setHeader("Referrer-Policy", "no-referrer");
  if (process.env.NODE_ENV === "production") res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-DNS-Prefetch-Control", "off");
  res.setHeader("X-Frame-Options", "DENY");
}

function clientAddress(req) {
  if (trustProxy) {
    const forwarded = String(req.headers["x-forwarded-for"] || "").split(",")[0].trim();
    if (forwarded) return forwarded;
  }
  return req.socket.remoteAddress || "unknown";
}

function allowApiRequest(req, res, pathname) {
  const result = apiLimiter.check(`${clientAddress(req)}:${pathname}`);
  res.setHeader("RateLimit-Limit", result.limit);
  res.setHeader("RateLimit-Remaining", result.remaining);
  res.setHeader("RateLimit-Reset", result.retryAfterSeconds);
  if (result.allowed) return true;
  res.setHeader("Retry-After", result.retryAfterSeconds);
  sendJson(res, 429, { error: "Too many requests. Please wait before trying again." });
  return false;
}

const server = createServer(async (req, res) => {
  securityHeaders(res);

  try {
    const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);

    if (url.pathname.startsWith("/api/") && url.pathname !== "/api/health") {
      if (!allowApiRequest(req, res, url.pathname)) return;
    }

    if (req.method === "GET" && url.pathname === "/api/health") {
      return sendJson(res, 200, { ok: true, service: "ClaimCheck Finance India", version: "0.3.0" });
    }

    if (req.method === "GET" && url.pathname === "/api/india/reference-pack") {
      const marketContext = url.searchParams.get("context") || "general-fintech";
      return sendJson(res, 200, getIndiaContext({ marketContext }));
    }

    if (req.method === "GET" && url.pathname === "/api/india/dataset") {
      return sendJson(res, 200, getIndiaDataset());
    }

    if (req.method === "POST" && url.pathname === "/api/analyze") {
      const body = await readJson(req);
      const indiaContext = getIndiaContext(body);
      let result;
      try {
        result = analyzeCase({ ...body, indiaContext });
      } catch (error) {
        throw new HttpError(400, error.message || "The case input is invalid.");
      }
      return sendJson(res, 200, result);
    }

    if (req.method !== "GET") return sendJson(res, 405, { error: "Method not allowed." });

    const requested = url.pathname === "/" ? "index.html" : decodeURIComponent(url.pathname);
    const safePath = normalize(requested)
      .replace(/^[/\\]+/, "")
      .replace(/^(\.\.(\/|\\|$))+/, "");
    const filePath = join(publicDir, safePath);
    if (!filePath.startsWith(publicDir)) return sendJson(res, 403, { error: "Forbidden." });

    try {
      const file = await readFile(filePath);
      res.setHeader("Cache-Control", extname(filePath) === ".html" ? "no-cache" : "public, max-age=3600");
      res.writeHead(200, { "Content-Type": mime[extname(filePath)] || "application/octet-stream" });
      res.end(file);
    } catch {
      if (extname(safePath)) return sendJson(res, 404, { error: "Asset not found." });
      const fallback = await readFile(join(publicDir, "index.html"));
      res.writeHead(200, { "Content-Type": mime[".html"] });
      res.end(fallback);
    }
  } catch (error) {
    const status = error.statusCode || 500;
    if (status >= 500) console.error(error);
    sendJson(res, status, { error: status >= 500 ? "Unexpected server error." : error.message });
  }
});

server.listen(port, host, () => {
  console.log(`ClaimCheck Finance running on ${host}:${port}`);
});

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => server.close(() => process.exit(0)));
}
