const PROJECT_TYPES = new Set([
  "Kitchen",
  "Bathroom",
  "Kitchen + Bathroom",
  "Not sure yet"
]);

const PROJECT_STAGES = new Set([
  "Exploring possibilities",
  "Defining the scope",
  "Ready to begin planning"
]);

const PROJECT_TIMINGS = new Set([
  "As soon as feasible",
  "Within 3–6 months",
  "Within 6–12 months",
  "More than 12 months",
  "Flexible"
]);

const INVESTMENT_STAGES = new Set([
  "I have an established range",
  "I am defining it",
  "I would like to discuss it"
]);

const CONTACT_PREFERENCES = new Set(["Phone", "Email", "No preference"]);

const ATTRIBUTION_LIMITS = {
  utm_source: 200,
  utm_medium: 200,
  utm_campaign: 300,
  utm_term: 300,
  utm_content: 300,
  gclid: 512,
  fbclid: 512,
  landing_page: 2048,
  referrer: 2048
};

export class ValidationError extends Error {
  constructor(code = "invalid_submission") {
    super(code);
    this.name = "ValidationError";
    this.code = code;
  }
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function cleanText(value, { min = 0, max, multiline = false } = {}) {
  if (typeof value !== "string") throw new ValidationError();
  let cleaned = value.replace(/\u0000/g, "");
  cleaned = multiline
    ? cleaned.replace(/\r\n?/g, "\n").replace(/[\u0001-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, "").trim()
    : cleaned.replace(/[\u0001-\u001f\u007f]+/g, " ").replace(/\s+/g, " ").trim();
  if (cleaned.length < min || (max && cleaned.length > max)) throw new ValidationError();
  return cleaned;
}

function enumValue(value, allowed) {
  const cleaned = cleanText(value, { min: 1, max: 120 });
  if (!allowed.has(cleaned)) throw new ValidationError();
  return cleaned;
}

function emailValue(value) {
  const email = cleanText(value, { min: 3, max: 254 }).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/u.test(email)) throw new ValidationError();
  return email;
}

function phoneValue(value) {
  const phone = cleanText(value, { min: 10, max: 30 });
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 10 || digits.length > 15) throw new ValidationError();
  return phone;
}

function cappedString(value, max) {
  if (typeof value !== "string") return "";
  return value.replace(/\u0000/g, "").trim().slice(0, max);
}

function sanitizeLandingPage(value) {
  const raw = cappedString(value, ATTRIBUTION_LIMITS.landing_page);
  if (!raw) return "";
  try {
    const url = raw.startsWith("/")
      ? new URL(raw, "https://premierluxuryinteriors.com")
      : new URL(raw);
    if (url.protocol !== "https:" && url.protocol !== "http:") return "";
    url.username = "";
    url.password = "";
    url.hash = "";
    const retained = new URLSearchParams();
    for (const key of ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content", "gclid", "fbclid"]) {
      const valueForKey = url.searchParams.get(key);
      if (valueForKey) retained.set(key, cappedString(valueForKey, ATTRIBUTION_LIMITS[key]));
    }
    url.search = retained.toString();
    return url.toString().slice(0, ATTRIBUTION_LIMITS.landing_page);
  } catch {
    return "";
  }
}

function sanitizeReferrer(value) {
  const raw = cappedString(value, ATTRIBUTION_LIMITS.referrer);
  if (!raw) return "";
  try {
    const url = new URL(raw);
    if (url.protocol !== "https:" && url.protocol !== "http:") return "";
    return `${url.origin}${url.pathname}`.slice(0, ATTRIBUTION_LIMITS.referrer);
  } catch {
    return "";
  }
}

function attributionValue(body, key) {
  const nested = isPlainObject(body.attribution) ? body.attribution[key] : undefined;
  return nested ?? body[key] ?? "";
}

function buildAttribution(body) {
  const attribution = {};
  for (const [key, limit] of Object.entries(ATTRIBUTION_LIMITS)) {
    const value = attributionValue(body, key);
    if (key === "landing_page") attribution[key] = sanitizeLandingPage(value);
    else if (key === "referrer") attribution[key] = sanitizeReferrer(value);
    else attribution[key] = cappedString(value, limit);
  }
  return attribution;
}

export function validateInquiry(body, { now = new Date() } = {}) {
  if (!isPlainObject(body)) throw new ValidationError("invalid_json");

  if (typeof body.website === "string" && body.website.trim()) {
    return { isBot: true, inquiry: null };
  }

  const firstName = cleanText(body.firstName, { min: 1, max: 80 });
  const lastName = cleanText(body.lastName, { min: 1, max: 80 });
  if (body.consent !== true) throw new ValidationError();
  if (body.smsConsent !== undefined && typeof body.smsConsent !== "boolean") throw new ValidationError();
  const smsConsent = body.smsConsent === true;

  const inquiry = {
    first_name: firstName,
    last_name: lastName,
    email: emailValue(body.email),
    phone: phoneValue(body.phone),
    sms_consent: smsConsent,
    sms_consent_method: smsConsent ? "Optional website checkbox" : "Not provided",
    sms_consent_recorded_at: smsConsent ? now.toISOString() : "",
    sms_consent_source_url: smsConsent ? "https://premierluxuryinteriors.com/#inquiry" : "",
    project_type: enumValue(body.projectType, PROJECT_TYPES),
    property_location: cleanText(body.location, { min: 2, max: 120 }),
    project_stage: enumValue(body.stage, PROJECT_STAGES),
    desired_timing: enumValue(body.timing, PROJECT_TIMINGS),
    investment_readiness: enumValue(body.investmentReadiness, INVESTMENT_STAGES),
    project_goals: cleanText(body.goals, { min: 20, max: 2000, multiline: true }),
    contact_preference: enumValue(body.contactPreference || "No preference", CONTACT_PREFERENCES),
    consent: true,
    source: "Premier Luxury Interiors website",
    received_at: now.toISOString(),
    ...buildAttribution(body)
  };

  return { isBot: false, inquiry };
}
