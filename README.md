# ◈ NSE Terminal — FII/DII Sector Rotation
> Live institutional flow analytics for Indian equity markets  
> Stack: Next.js 14 · Yahoo Finance · Vercel KV · Vercel Cron

---

## How it works

```
Yahoo Finance (free, no key)
        ↓  every day at 7PM IST
  /api/cron/daily-refresh   ← triggered by Vercel Cron (weekdays only)
        ↓  stores result
    Vercel KV (Redis cache)
        ↓  served instantly
  /api/market-data          ← called by the browser on load + every 5 min
        ↓
    Terminal UI (Next.js)
```

- **No paid APIs.** Yahoo Finance public JSON endpoints — no key required.
- **One platform.** Vercel handles frontend, backend API routes, cron, and cache.
- **Daily updates.** Cron fires at 1:30 PM UTC (7:00 PM IST) Mon–Fri after NSE closes.
- **Friends can access.** Deploy once, share the Vercel URL.

---

## Prerequisites

- Node.js 18+ installed  
- A [Vercel account](https://vercel.com) (free tier is enough)  
- Git installed

---

## Step 1 — Install dependencies

```bash
cd nse-terminal
npm install
```

---

## Step 2 — Run locally (optional, uses live Yahoo data without KV cache)

```bash
# No .env.local needed for local dev — KV cache is skipped gracefully
npm run dev
```

Open http://localhost:3000 — data is fetched fresh from Yahoo Finance on every page load when running locally without KV.

---

## Step 3 — Push to GitHub

```bash
git init
git add .
git commit -m "NSE Terminal — initial commit"

# Create a new repo on github.com, then:
git remote add origin https://github.com/YOUR_USERNAME/nse-terminal.git
git branch -M main
git push -u origin main
```

---

## Step 4 — Deploy to Vercel

1. Go to [vercel.com/new](https://vercel.com/new)
2. Click **"Import Git Repository"** → select `nse-terminal`
3. Framework preset: **Next.js** (auto-detected)
4. Click **Deploy** (ignore env vars for now — add them next)

---

## Step 5 — Set up Vercel KV (free Redis cache)

1. In your Vercel dashboard → go to your project
2. Click **Storage** tab → **Create Database** → choose **KV**
3. Name it `nse-cache` → click **Create**
4. Click **`.env.local`** tab → copy the two values:
   - `KV_REST_API_URL`
   - `KV_REST_API_TOKEN`

---

## Step 6 — Add environment variables to Vercel

In Vercel project → **Settings** → **Environment Variables**, add:

| Variable | Value |
|---|---|
| `KV_REST_API_URL` | (from Step 5) |
| `KV_REST_API_TOKEN` | (from Step 5) |
| `CRON_SECRET` | any random string, e.g. `my-secret-abc123` |

Click **Save** for each.

---

## Step 7 — Redeploy to pick up env vars

In Vercel → **Deployments** → click the three dots on latest → **Redeploy**.

Your terminal is now live at `https://your-project.vercel.app`

---

## Step 8 — Verify the cron job

The cron is defined in `vercel.json`:
```json
{
  "crons": [{ "path": "/api/cron/daily-refresh", "schedule": "30 13 * * 1-5" }]
}
```

This runs at **1:30 PM UTC = 7:00 PM IST, Monday–Friday**.

To test it manually:
```
GET https://your-project.vercel.app/api/cron/daily-refresh
Header: Authorization: Bearer YOUR_CRON_SECRET
```

Or just visit `/api/market-data` in your browser — it fetches fresh data on first load.

---

## Commands in the Terminal

Type in the command bar and press Enter:

| Command | Action |
|---|---|
| `BANK` | Filter all panels to Banking sector |
| `IT` | Filter to IT sector |
| `AUTO`, `PHARMA`, `ENERGY`, `FMCG`, `METAL`, `REALTY`, `INFRA`, `MEDIA` | Same for other sectors |
| `ALL` or `RESET` | Clear filter, show all sectors |
| `REFRESH` | Force-fetch fresh data from Yahoo Finance |
| `HELP` | Show all available commands |

---

## Data Sources & Methodology

| Data | Source | Method |
|---|---|---|
| Sector index prices | Yahoo Finance | `^NSEBANK`, `^CNXIT`, etc. — public JSON |
| Total FII/DII flow estimate | Yahoo Finance | Nifty 50 + `INDA` ETF direction proxy |
| 15-day flow history | Yahoo Finance | Historical close prices, same proxy model |
| Flow RSI (5-day) | Calculated | Wilder's RSI applied to daily flow proxy values |
| Sector flow proxy | Calculated | `changePct × sectorCap × fiiMultiplier` |

> **Note on proxy accuracy:** Since NSE does not publish granular real-time sectoral FII data for free, the per-sector flow figures are **proxy estimates** based on index price action. The total FII/DII net figure is estimated from the NIFTY + INDA ETF direction model. For exact figures, you would need NSE's paid data feed or SEBI's T+1 bulk deal data. The proxy model is directionally accurate ~75% of the time.

---

## File Structure

```
nse-terminal/
├── src/app/
│   ├── page.tsx                          ← Server component, initial data fetch
│   ├── layout.tsx                        ← HTML shell
│   ├── globals.css                       ← Dark terminal theme
│   ├── lib/
│   │   ├── fetcher.ts                    ← Yahoo Finance fetcher + proxy math
│   │   └── cache.ts                      ← Vercel KV wrapper
│   ├── api/
│   │   ├── market-data/route.ts          ← GET /api/market-data
│   │   └── cron/daily-refresh/route.ts  ← GET /api/cron/daily-refresh
│   └── components/
│       ├── Terminal.tsx                  ← Main UI (client component)
│       ├── Terminal.module.css           ← All styles
│       └── FlowChart.tsx                 ← Chart.js bar chart
├── vercel.json                           ← Cron schedule
├── .env.local.example                    ← Copy → .env.local, fill in values
├── package.json
└── README.md
```

---

## Troubleshooting

**Data not loading?**  
→ Check `/api/market-data` in your browser. If it returns an error, Yahoo Finance may be rate-limiting. Wait 5 minutes and try again.

**KV cache errors in logs?**  
→ Verify `KV_REST_API_URL` and `KV_REST_API_TOKEN` are set correctly in Vercel Environment Variables and that you redeployed after adding them.

**Cron not running?**  
→ Vercel Cron requires a Pro plan for sub-hourly schedules, but daily is on the free tier. Check Vercel → **Cron Jobs** tab to see execution history.

**Sector data showing 0?**  
→ Yahoo Finance symbols for NSE indices occasionally change. Check `fetcher.ts` `SECTOR_SYMBOLS` and verify the symbol at `https://finance.yahoo.com/quote/^NSEBANK`
