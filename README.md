# FuelGeniusPro 🚗⛽

> Live UK petrol & diesel price tracker — Next.js 14 · Tailwind CSS · Leaflet · DVLA API · Fuel Finder API

## Pages

| Route | Description |
|---|---|
| `/` | Landing page — hero, live UK avg prices, cheapest stations |
| `/fuel-tracker` | Live petrol & diesel map + sortable price table |
| `/ev-charging` | EV charger finder (NCR data) |
| `/journey` | Journey cost calculator with MPG lookup |
| `/car-health` | DVLA vehicle lookup — MOT, tax, fuel type |
| `/blog` | SEO fuel economy blog (6 articles) |
| `/blog/[slug]` | Individual blog posts |
| `/fuel/[city]` | Local SEO pages for 30 UK cities |
| `/sitemap.xml` | Auto-generated sitemap |
| `/robots.txt` | Search engine rules |

---

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Environment variables are pre-configured in .env.local
#    Edit if your keys change

# 3. Run dev server
npm run dev
# → http://localhost:3000
```

The app runs **fully with mock data** without live APIs — great for development and testing.

---

## API Keys (already set in .env.local)

| Variable | Value |
|---|---|
| `DVLA_API_KEY` | `a6EZdpWwsq7QNC5VZ3jL96C9sFo4424m5DbB2I3r` |
| `DVLA_API_BASE` | `https://driver-vehicle-licensing.api.gov.uk/vehicle-enquiry/v1` |
| `FUEL_FINDER_CLIENT_ID` | `LgwOY7nZ7mVVlTVXhdudL2ipVvglJcvy` |
| `FUEL_FINDER_CLIENT_SECRET` | `oCyd4tgtjaxFcroMZHCn9BVQqJh4BuRa4iXsB81o5FXjlAt6dEYCkZldBe1yqhda` |

> **⚠️ Regenerate your API keys** — they've been shared in chat. Takes 2 minutes and protects your account.
> - DVLA: https://developer-portal.driver-vehicle-licensing.api.gov.uk
> - Fuel Finder: check your Fuel Finder developer portal

---

## Deploy to Vercel

### Step 1 — Push to GitHub

```bash
cd fuelgeniuspro
git init
git add .
git commit -m "FuelGeniusPro — initial build"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/fuelgeniuspro.git
git push -u origin main
```

### Step 2 — Import to Vercel

1. Go to https://vercel.com/new
2. Click **Import Git Repository** → select `fuelgeniuspro`
3. Framework: **Next.js** (auto-detected)
4. Click **Deploy**

### Step 3 — Add Environment Variables in Vercel

Go to Project → **Settings → Environment Variables** and add all keys from `.env.local`.
Then click **Redeploy**.

---

## SEO

- 30 city pages pre-built at `/fuel/[city]` — London, Birmingham, Manchester, etc.
- Each page has unique `<title>`, `<meta description>`, canonical URL, and JSON-LD breadcrumbs
- Sitemap at `/sitemap.xml` covers all pages
- Blog with 6 articles targeting fuel economy keywords

---

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Styling**: Tailwind CSS
- **Map**: Leaflet + react-leaflet (client-side, dark CartoDB tiles)
- **Icons**: lucide-react
- **APIs**: DVLA Vehicle Enquiry Service, Fuel Finder API (OAuth 2.0)
- **Deployment**: Vercel (recommended)

---

## Monetisation Options

1. **Google AdSense** — add to layout.tsx after approval
2. **Fuel card affiliate** — Fuel Card Services, iGO (£20–£50 per signup)
3. **Comparison affiliate** — MoneySuperMarket, Compare the Market (car insurance links)
4. **Sponsored city pages** — charge local fuel card companies £X/month

---

*Data sourced under the UK Open Government Licence v3.0. © Competition and Markets Authority. DVLA data © DVLA. Not financial or motoring advice.*
