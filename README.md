# Premier Luxury Interiors

Static marketing site for Premier Luxury Interiors — a luxury kitchen and bathroom design-build studio serving Maryland and the Washington, DC metro.

**Live**: [premierluxuryinteriors.com](https://premierluxuryinteriors.com)

## Stack

- Static HTML / CSS / JS — no build step
- Single-page cinematic layout (hero reel → selected work → why → process → studio → consultation → footer)
- Type: Clash Display, Boska, Switzer (Fontshare) + JetBrains Mono (Google Fonts)
- Custom design system in `css/base.css` + `css/site.css`
- `prefers-reduced-motion` fully respected

## Local preview

Open `index.html` directly in a browser, or:

```bash
python3 -m http.server 8000
```

## Deploy

Hosted on Render as a Static Site. Publish directory: `.` Build command: (blank). Custom domain configured via DNS.

## Structure

```
index.html          Single-page site (all sections + anchors)
kitchens.html       Redirect stub → /#work  (legacy URL)
bathrooms.html      Redirect stub → /#work  (legacy URL)
portfolio.html      Redirect stub → /#work  (legacy URL)
about.html          Redirect stub → /#studio  (legacy URL)
contact.html        Redirect stub → /#consult  (legacy URL)
css/base.css        Tokens, reset, accessibility
css/site.css        Section styles
js/main.js          Veil intro, hero reel, reveals, 3-step consultation form
assets/img/         Imagery (webp + jpg fallback)
assets/logo/        Logo mark + wordmark
assets/favicon.svg  Favicon
sitemap.xml
robots.txt
```

## Consultation form

The 3-step consultation form validates client-side and, on submit, opens a
pre-filled email (`mailto:`) to `info@premierluxuryinteriors.com` containing all
gathered fields. This is a truthful fallback — no lead is recorded server-side
until a CRM/HighLevel endpoint is wired in `js/main.js` (`buildMailto` / submit
handler). The UI instructs the visitor to send the prepared email and never
shows a false "submitted" state. Phone `(301) 664-1538` is offered as an
alternate contact beside the form and in the footer.
