# Premier Luxury Interiors

Static marketing site for Premier Luxury Interiors — a high-end kitchen, bath, and interior renovation studio serving Washington DC, Maryland, and Northern Virginia.

**Live**: [premierluxuryinteriors.com](https://premierluxuryinteriors.com)

## Stack

- Static HTML / CSS / JS — no build step
- Cormorant Garamond + Inter via Google Fonts
- Custom design system in `css/base.css` + `css/style.css`
- Light / dark mode (auto + toggle)

## Local preview

Open `index.html` directly in a browser, or:

```bash
python3 -m http.server 8000
```

## Deploy

Hosted on Render as a Static Site. Publish directory: `.` Build command: (blank). Custom domain configured at Namecheap.

## Structure

```
index.html          Homepage
kitchens.html       Kitchens service page
bathrooms.html      Bathrooms service page
interiors.html      Whole-home interiors
portfolio.html      Project grid
about.html          Studio philosophy
contact.html        Contact form
css/                Design system + styles
js/app.js           Theme toggle, mobile nav, reveal animations
assets/             Images + favicon
sitemap.xml
robots.txt
```
