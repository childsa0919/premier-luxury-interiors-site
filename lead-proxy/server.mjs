import { createHash, randomBytes } from "node:crypto";
import { createServer } from "node:http";
import { pathToFileURL } from "node:url";
import { ValidationError, validateInquiry } from "./lib/validate.mjs";

const DEFAULT_ORIGIN = "https://premierluxuryinteriors.com";
const MAX_BODY_BYTES = 32 * 1024;
const DEFAULT_UPSTREAM_TIMEOUT_MS = 8_000;

class RequestError extends Error {
  constructor(status, code) {
    super(code);
    this.name = "RequestError";
    this.status = status;
    this.code = code;
  }
}

function normalizeOrigins(value) {
  const values = Array.isArray(value) ? value : String(value || DEFAULT_ORIGIN).split(",");
  const origins = new Set();
  for (const candidate of values) {
    try {
      const url = new URL(String(candidate).trim());
      if ((url.protocol === "https:" || url.protocol === "http:") && url.origin === String(candidate).trim().replace(/\/$/, "")) {
        origins.add(url.origin);
      }
    } catch {
      // Ignore malformed configuration entries; an empty allowlist fails closed.
    }
  }
  return origins;
}

function validWebhookUrl(value, allowInsecure = false) {
  if (typeof value !== "string" || !value.trim()) return "";
  try {
    const url = new URL(value.trim());
    if (url.username || url.password) return "";
    if (url.protocol !== "https:" && !(allowInsecure && url.protocol === "http:")) return "";
    return url.href;
  } catch {
    return "";
  }
}

function corsHeaders(origin) {
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "600",
    Vary: "Origin"
  };
}

function sendJson(response, status, body, origin = "") {
  const payload = JSON.stringify(body);
  response.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": Buffer.byteLength(payload),
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
    ...(origin ? corsHeaders(origin) : {})
  });
  response.end(payload);
}

function sendPreflight(response, origin) {
  response.writeHead(204, {
    ...corsHeaders(origin),
    "Cache-Control": "no-store",
    "Content-Length": "0"
  });
  response.end();
}

function readJsonBody(request, maxBytes = MAX_BODY_BYTES) {
  const announcedLength = Number(request.headers["content-length"] || 0);
  if (Number.isFinite(announcedLength) && announcedLength > maxBytes) {
    request.resume();
    throw new RequestError(413, "payload_too_large");
  }

  return new Promise((resolve, reject) => {
    const chunks = [];
    let total = 0;
    let settled = false;

    request.on("data", (chunk) => {
      if (settled) return;
      total += chunk.length;
      if (total > maxBytes) {
        settled = true;
        chunks.length = 0;
        request.resume();
        reject(new RequestError(413, "payload_too_large"));
        return;
      }
      chunks.push(chunk);
    });

    request.on("end", () => {
      if (settled) return;
      settled = true;
      try {
        const text = Buffer.concat(chunks).toString("utf8");
        resolve(JSON.parse(text));
      } catch {
        reject(new RequestError(400, "invalid_json"));
      }
    });

    request.on("error", () => {
      if (settled) return;
      settled = true;
      reject(new RequestError(400, "invalid_request"));
    });
  });
}

function clientAddress(request) {
  const forwarded = request.headers["x-forwarded-for"];
  if (typeof forwarded === "string" && forwarded.trim()) {
    const chain = forwarded.split(",");
    return chain[chain.length - 1].trim();
  }
  return request.socket.remoteAddress || "unknown";
}

function createRateLimiter({
  limit = 5,
  globalLimit = 2_000,
  windowMs = 15 * 60 * 1000,
  salt = randomBytes(32).toString("hex")
} = {}) {
  const clients = new Map();
  let globalWindow = { count: 0, resetAt: Date.now() + windowMs };
  let requestsSinceSweep = 0;

  return {
    consume(address, now = Date.now()) {
      if (now >= globalWindow.resetAt) globalWindow = { count: 0, resetAt: now + windowMs };
      const key = createHash("sha256").update(salt).update("\0").update(address).digest("hex");
      const existing = clients.get(key);
      const entry = !existing || now >= existing.resetAt
        ? { count: 0, resetAt: now + windowMs }
        : existing;
      entry.count += 1;
      clients.set(key, entry);

      requestsSinceSweep += 1;
      if (requestsSinceSweep >= 100) {
        requestsSinceSweep = 0;
        for (const [clientKey, clientEntry] of clients) {
          if (now >= clientEntry.resetAt) clients.delete(clientKey);
        }
      }

      if (entry.count > limit) return false;

      globalWindow.count += 1;
      return globalWindow.count <= globalLimit;
    }
  };
}

async function forwardToHighLevel(webhookUrl, inquiry, timeoutMs, fetchImplementation) {
  if (!webhookUrl) throw new RequestError(503, "temporarily_unavailable");
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetchImplementation(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json, text/plain, */*",
        "User-Agent": "PremierLuxuryInteriors-Lead-Proxy/1.0"
      },
      body: JSON.stringify(inquiry),
      redirect: "error",
      signal: controller.signal
    });

    if (response.body) await response.body.cancel().catch(() => {});
    if (!response.ok) throw new RequestError(502, "delivery_failed");
  } catch (error) {
    if (error instanceof RequestError) throw error;
    if (error && error.name === "AbortError") throw new RequestError(504, "delivery_timeout");
    throw new RequestError(502, "delivery_failed");
  } finally {
    clearTimeout(timeout);
  }
}

export function createLeadProxy(options = {}) {
  const allowedOrigins = normalizeOrigins(options.allowedOrigins ?? process.env.ALLOWED_ORIGINS);
  const webhookUrl = validWebhookUrl(
    options.webhookUrl ?? process.env.HIGHLEVEL_WEBHOOK_URL ?? "",
    options.allowInsecureWebhook === true
  );
  const fetchImplementation = options.fetchImplementation ?? globalThis.fetch;
  const upstreamTimeoutMs = options.upstreamTimeoutMs ?? DEFAULT_UPSTREAM_TIMEOUT_MS;
  const limiter = createRateLimiter({
    limit: options.rateLimit,
    globalLimit: options.globalRateLimit,
    windowMs: options.rateWindowMs,
    salt: options.rateLimitSalt ?? process.env.RATE_LIMIT_SALT
  });

  return createServer(async (request, response) => {
    const method = request.method || "GET";
    let path;
    try {
      path = new URL(request.url || "/", "http://localhost").pathname;
    } catch {
      sendJson(response, 400, { ok: false, error: "invalid_request" });
      return;
    }

    if (method === "GET" && path === "/health") {
      sendJson(response, webhookUrl ? 200 : 503, webhookUrl
        ? { ok: true }
        : { ok: false, error: "not_ready" });
      return;
    }

    if (path !== "/api/inquiries" || (method !== "POST" && method !== "OPTIONS")) {
      sendJson(response, 404, { ok: false, error: "not_found" });
      return;
    }

    const origin = typeof request.headers.origin === "string" ? request.headers.origin : "";
    if (!origin || !allowedOrigins.has(origin)) {
      sendJson(response, 403, { ok: false, error: "origin_not_allowed" });
      return;
    }

    if (method === "OPTIONS") {
      sendPreflight(response, origin);
      return;
    }

    const contentType = String(request.headers["content-type"] || "").split(";", 1)[0].trim().toLowerCase();
    if (contentType !== "application/json") {
      sendJson(response, 415, { ok: false, error: "json_required" }, origin);
      return;
    }

    try {
      const body = await readJsonBody(request);
      if (body && typeof body === "object" && !Array.isArray(body) && typeof body.website === "string" && body.website.trim()) {
        sendJson(response, 200, { ok: true }, origin);
        return;
      }

      const { inquiry } = validateInquiry(body);

      if (!limiter.consume(clientAddress(request))) {
        sendJson(response, 429, { ok: false, error: "rate_limited" }, origin);
        return;
      }

      await forwardToHighLevel(webhookUrl, inquiry, upstreamTimeoutMs, fetchImplementation);
      sendJson(response, 200, { ok: true }, origin);
    } catch (error) {
      if (error instanceof ValidationError) {
        sendJson(response, 400, { ok: false, error: "invalid_submission" }, origin);
        return;
      }
      if (error instanceof RequestError) {
        sendJson(response, error.status, { ok: false, error: error.code }, origin);
        return;
      }
      sendJson(response, 500, { ok: false, error: "temporarily_unavailable" }, origin);
    }
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const port = Number(process.env.PORT || 3000);
  const server = createLeadProxy();
  server.listen(port, "0.0.0.0", () => {
    console.log(`Lead proxy listening on port ${port}`);
  });
}
