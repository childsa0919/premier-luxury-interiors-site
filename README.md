# Premier Luxury Interiors

Production website for Premier Luxury Interiors, a high-end kitchen and bathroom remodeling studio.

**Live:** [premierluxuryinteriors.com](https://premierluxuryinteriors.com)

## Experience

- Editorial, single-page art-direction with a scroll-responsive threshold hero
- Kitchen and bathroom visual studies, approach, process, FAQ, and consultation brief
- Four-step lead qualification flow with call and email alternatives throughout
- Self-hosted fonts and responsive AVIF/WebP/JPEG image sources
- Accessible navigation, focus states, reduced-motion support, and semantic metadata

## Stack

- Static HTML, CSS, and JavaScript; no build step
- Hosted on Render as a Static Site
- Separate zero-dependency Node lead connector prepared for an always-on Render Web Service
- Publish directory: `.`
- Build command: blank
- Render deploys updates from the GitHub `main` branch

## Local preview

Open `index.html` directly, or serve the repository root with any static web server.

## Structure

```text
index.html          Main single-page experience
css/site.css        Complete responsive design system
js/main.js          Motion, navigation, analytics, and consultation flow
lead-proxy/         Secure server-side HighLevel lead connector and tests
assets/brand/       Primary brand marks
assets/fonts/       Self-hosted typefaces
assets/img/         Responsive image formats
assets/og.png       Social sharing image
*.html              Legacy URL redirects to current page sections
sitemap.xml
robots.txt
```

## Consultation form

The form is prepared for HighLevel and looks for the public Render connector URL
in the empty `<meta data-highlevel-webhook content="">` tag in `index.html`.
Once the connector is deployed and verified, set its `/api/inquiries` URL as the
tag's `content` value. The endpoint returns JSON `{ "ok": true }` only after
HighLevel accepts the lead; the private HighLevel webhook remains server-side.

Deployment and workflow mapping instructions are in
[`lead-proxy/README.md`](lead-proxy/README.md).

Until then, submission opens a pre-filled email to
`info@premierluxuryinteriors.com` and clearly asks the visitor to send that
draft. It never shows a false CRM success state. The phone number
`(301) 664-1538` remains available throughout the experience.
