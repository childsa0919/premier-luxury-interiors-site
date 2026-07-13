import assert from "node:assert/strict";
import { createServer } from "node:http";
import test from "node:test";
import { createLeadProxy } from "../server.mjs";

const ORIGIN = "https://premierluxuryinteriors.com";

const VALID_INQUIRY = {
  projectType: "Kitchen + Bathroom",
  location: "Bethesda, MD 20814",
  stage: "Defining the scope",
  timing: "Within 3–6 months",
  investmentReadiness: "I have an established range",
  goals: "Create a calm, highly functional room for daily family life.",
  firstName: "Avery",
  lastName: "Morgan",
  email: "Avery@example.com",
  phone: "(301) 555-0147",
  contactPreference: "Phone",
  consent: true,
  smsConsent: true,
  website: "",
  source: "untrusted source",
  submittedAt: "2000-01-01T00:00:00.000Z",
  attribution: {
    utm_source: "google",
    utm_medium: "cpc",
    landing_page: "https://premierluxuryinteriors.com/?utm_source=google&token=must-not-pass",
    referrer: "https://www.google.com/search?q=private+query"
  },
  arbitrary: "ignored"
};

async function listen(server) {
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  return `http://127.0.0.1:${address.port}`;
}

async function close(server) {
  await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
}

async function setup(t, { upstreamHandler, proxyOptions = {} } = {}) {
  const received = [];
  const upstream = createServer(async (request, response) => {
    const chunks = [];
    for await (const chunk of request) chunks.push(chunk);
    if (chunks.length) received.push(JSON.parse(Buffer.concat(chunks).toString("utf8")));
    if (upstreamHandler) return upstreamHandler(request, response);
    response.writeHead(202, { "Content-Type": "application/json" });
    response.end('{"id":"accepted"}');
  });
  const upstreamUrl = await listen(upstream);
  const proxy = createLeadProxy({
    webhookUrl: `${upstreamUrl}/highlevel`,
    allowInsecureWebhook: true,
    allowedOrigins: [ORIGIN],
    rateLimit: 50,
    globalRateLimit: 500,
    rateLimitSalt: "test-salt",
    ...proxyOptions
  });
  const proxyUrl = await listen(proxy);
  t.after(async () => {
    await close(proxy);
    await close(upstream);
  });
  return { proxyUrl, received };
}

function submit(url, body = VALID_INQUIRY, headers = {}) {
  return fetch(`${url}/api/inquiries`, {
    method: "POST",
    headers: { Origin: ORIGIN, "Content-Type": "application/json", ...headers },
    body: typeof body === "string" ? body : JSON.stringify(body)
  });
}

test("health and CORS preflight are exact and cache-safe", async (t) => {
  const { proxyUrl } = await setup(t);
  const health = await fetch(`${proxyUrl}/health`);
  assert.equal(health.status, 200);
  assert.deepEqual(await health.json(), { ok: true });
  assert.equal(health.headers.get("cache-control"), "no-store");

  const allowed = await fetch(`${proxyUrl}/api/inquiries`, { method: "OPTIONS", headers: { Origin: ORIGIN } });
  assert.equal(allowed.status, 204);
  assert.equal(allowed.headers.get("access-control-allow-origin"), ORIGIN);
  assert.equal(allowed.headers.get("vary"), "Origin");

  const rejected = await fetch(`${proxyUrl}/api/inquiries`, { method: "OPTIONS", headers: { Origin: "https://evil.example" } });
  assert.equal(rejected.status, 403);
  assert.equal(rejected.headers.get("access-control-allow-origin"), null);
});

test("health fails closed when the private HighLevel webhook is missing or unsafe", async (t) => {
  for (const webhookUrl of ["", "http://highlevel.example/webhook", "not-a-url"]) {
    const proxy = createLeadProxy({
      webhookUrl,
      allowedOrigins: [ORIGIN],
      rateLimitSalt: "test-salt"
    });
    const proxyUrl = await listen(proxy);
    const response = await fetch(`${proxyUrl}/health`);
    assert.equal(response.status, 503);
    assert.deepEqual(await response.json(), { ok: false, error: "not_ready" });
    await close(proxy);
  }
});

test("a valid inquiry is flattened, sanitized, and acknowledged only after upstream accepts it", async (t) => {
  const { proxyUrl, received } = await setup(t);
  const response = await submit(proxyUrl);
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type"), /^application\/json/);
  assert.deepEqual(await response.json(), { ok: true });
  assert.equal(received.length, 1);

  const lead = received[0];
  assert.equal(lead.first_name, "Avery");
  assert.equal(lead.email, "avery@example.com");
  assert.equal(lead.project_type, "Kitchen + Bathroom");
  assert.equal(lead.sms_consent, true);
  assert.equal(lead.sms_consent_method, "Optional website checkbox");
  assert.equal(lead.sms_consent_source_url, "https://premierluxuryinteriors.com/#inquiry");
  assert.match(lead.sms_consent_recorded_at, /^\d{4}-\d{2}-\d{2}T/);
  assert.equal(lead.source, "Premier Luxury Interiors website");
  assert.equal(lead.utm_source, "google");
  assert.equal(lead.landing_page, "https://premierluxuryinteriors.com/?utm_source=google");
  assert.equal(lead.referrer, "https://www.google.com/search");
  assert.equal("token" in lead, false);
  assert.equal("arbitrary" in lead, false);
  assert.equal("submittedAt" in lead, false);
  assert.match(lead.received_at, /^\d{4}-\d{2}-\d{2}T/);
});

test("a cached client that sends a relative landing path still preserves safe attribution", async (t) => {
  const { proxyUrl, received } = await setup(t);
  const body = {
    ...VALID_INQUIRY,
    attribution: {
      ...VALID_INQUIRY.attribution,
      landing_page: "/?utm_source=google&private_token=must-not-pass"
    }
  };
  const response = await submit(proxyUrl, body);
  assert.equal(response.status, 200);
  assert.equal(received[0].landing_page, "https://premierluxuryinteriors.com/?utm_source=google");
});

test("invalid submissions are rejected without reaching HighLevel", async (t) => {
  const { proxyUrl, received } = await setup(t);
  const invalidBodies = [
    { ...VALID_INQUIRY, projectType: "Whole house" },
    { ...VALID_INQUIRY, email: "not-an-email" },
    { ...VALID_INQUIRY, phone: "123" },
    { ...VALID_INQUIRY, phone: "+1 301 555 0147 extension 123456789" },
    { ...VALID_INQUIRY, consent: "true" },
    { ...VALID_INQUIRY, smsConsent: "true" },
    { ...VALID_INQUIRY, goals: "Too short" }
  ];

  for (const body of invalidBodies) {
    const response = await submit(proxyUrl, body, { "X-Forwarded-For": `192.0.2.${invalidBodies.indexOf(body) + 1}` });
    assert.equal(response.status, 400);
    assert.deepEqual(await response.json(), { ok: false, error: "invalid_submission" });
  }
  assert.equal(received.length, 0);
});

test("the honeypot silently succeeds and never forwards", async (t) => {
  const { proxyUrl, received } = await setup(t);
  const response = await submit(proxyUrl, { website: "https://spam.example" });
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { ok: true });
  assert.equal(received.length, 0);
});

test("wrong content type, malformed JSON, oversized bodies, and missing origins fail closed", async (t) => {
  const { proxyUrl, received } = await setup(t);

  const wrongType = await fetch(`${proxyUrl}/api/inquiries`, {
    method: "POST",
    headers: { Origin: ORIGIN, "Content-Type": "text/plain" },
    body: "hello"
  });
  assert.equal(wrongType.status, 415);

  const malformed = await submit(proxyUrl, "{");
  assert.equal(malformed.status, 400);

  const oversized = await submit(proxyUrl, JSON.stringify({ padding: "x".repeat(33 * 1024) }));
  assert.equal(oversized.status, 413);

  const noOrigin = await fetch(`${proxyUrl}/api/inquiries`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(VALID_INQUIRY)
  });
  assert.equal(noOrigin.status, 403);
  assert.equal(received.length, 0);
});

test("per-client rate limiting rejects excess valid requests", async (t) => {
  const { proxyUrl, received } = await setup(t, { proxyOptions: { rateLimit: 1 } });
  const first = await submit(proxyUrl, VALID_INQUIRY, { "X-Forwarded-For": "198.51.100.20" });
  const second = await submit(proxyUrl, VALID_INQUIRY, { "X-Forwarded-For": "198.51.100.20" });
  assert.equal(first.status, 200);
  assert.equal(second.status, 429);
  assert.deepEqual(await second.json(), { ok: false, error: "rate_limited" });
  assert.equal(received.length, 1);
});

test("spoofed X-Forwarded-For prefixes cannot bypass the per-client limit", async (t) => {
  const { proxyUrl, received } = await setup(t, { proxyOptions: { rateLimit: 1 } });
  const first = await submit(proxyUrl, VALID_INQUIRY, { "X-Forwarded-For": "203.0.113.1, 198.51.100.44" });
  const second = await submit(proxyUrl, VALID_INQUIRY, { "X-Forwarded-For": "203.0.113.99, 198.51.100.44" });
  assert.equal(first.status, 200);
  assert.equal(second.status, 429);
  assert.equal(received.length, 1);
});

test("one throttled client cannot exhaust the global allowance for another client", async (t) => {
  const { proxyUrl, received } = await setup(t, {
    proxyOptions: { rateLimit: 1, globalRateLimit: 2 }
  });
  const first = await submit(proxyUrl, VALID_INQUIRY, { "X-Forwarded-For": "198.51.100.10" });
  assert.equal(first.status, 200);
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const rejected = await submit(proxyUrl, VALID_INQUIRY, {
      "X-Forwarded-For": `203.0.113.${attempt}, 198.51.100.10`
    });
    assert.equal(rejected.status, 429);
  }
  const otherClient = await submit(proxyUrl, VALID_INQUIRY, { "X-Forwarded-For": "198.51.100.11" });
  assert.equal(otherClient.status, 200);
  assert.equal(received.length, 2);
});

test("upstream failures and timeouts never produce a false success", async (t) => {
  await t.test("non-2xx", async (t) => {
    const { proxyUrl } = await setup(t, {
      upstreamHandler(_request, response) {
        response.writeHead(500, { "Content-Type": "text/plain" });
        response.end("private upstream detail");
      }
    });
    const response = await submit(proxyUrl);
    assert.equal(response.status, 502);
    assert.deepEqual(await response.json(), { ok: false, error: "delivery_failed" });
  });

  await t.test("timeout", async (t) => {
    const { proxyUrl } = await setup(t, {
      upstreamHandler(_request, response) {
        setTimeout(() => {
          response.writeHead(202);
          response.end();
        }, 200);
      },
      proxyOptions: { upstreamTimeoutMs: 25 }
    });
    const response = await submit(proxyUrl);
    assert.equal(response.status, 504);
    assert.deepEqual(await response.json(), { ok: false, error: "delivery_timeout" });
  });
});
