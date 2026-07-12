# HighLevel lead connector

This small Node service accepts the public website's consultation form, validates
and sanitizes the project brief, then forwards a flat JSON payload to a private
HighLevel Inbound Webhook. The HighLevel URL stays in Render's secret environment
settings and is never exposed to the browser or committed to Git.

The service has no runtime dependencies. It includes exact-origin CORS, a 32 KiB
body limit, server-side validation, a silent honeypot, hashed in-memory rate
limiting, attribution allowlisting, an eight-second HighLevel timeout, and a
strict `{ "ok": true }` response only after HighLevel accepts the request.

## Render Web Service

Create a separate Render **Web Service** from the same GitHub repository:

- Root directory: `lead-proxy`
- Runtime: Node
- Build command: `npm install`
- Start command: `npm start`
- Health check path: `/health`
- Instance: Starter or another always-on plan
- Auto-deploy: `main`

Set these environment variables in Render:

```text
HIGHLEVEL_WEBHOOK_URL=<private HighLevel Inbound Webhook URL>
ALLOWED_ORIGINS=https://premierluxuryinteriors.com
RATE_LIMIT_SALT=<a long random value>
```

Add `https://www.premierluxuryinteriors.com` to `ALLOWED_ORIGINS`, separated by
a comma, only if that hostname serves the website rather than redirecting it.
Never put `HIGHLEVEL_WEBHOOK_URL` in `index.html`, GitHub, or browser JavaScript.

Once Render provides the public service URL, the website's form endpoint is:

```text
https://<render-service>.onrender.com/api/inquiries
```

That public proxy URL belongs in the `data-highlevel-webhook` meta tag in the
root `index.html`.

## HighLevel workflow

In the correct HighLevel sub-account:

1. Create a workflow with an **Inbound Webhook** trigger and copy its private URL.
2. Add that URL to Render as `HIGHLEVEL_WEBHOOK_URL`.
3. Put the trigger into sample/test mode, then send one representative inquiry
   through the Render connector.
4. Map `first_name`, `last_name`, `email`, `phone`, and the project fields below
   into **Create/Update Contact** and the desired custom fields.
5. Add a `Website Lead` tag, owner notification, opportunity, and follow-up
   actions as appropriate, then publish the workflow.

Forwarded project keys:

```text
project_type
property_location
project_stage
desired_timing
investment_readiness
project_goals
contact_preference
consent
source
received_at
utm_source
utm_medium
utm_campaign
utm_term
utm_content
gclid
fbclid
landing_page
referrer
```

## Local verification

With Node 20 or later:

```text
npm test
```

The tests use local fake services and never contact HighLevel.
