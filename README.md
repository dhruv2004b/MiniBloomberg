# ◈ Mini Bloomberg Terminal — FII/DII Sector Rotation

> A Bloomberg-style institutional flow analytics terminal for Indian equity markets.  
> Live at → **[mini-bloomberg-sable.vercel.app](https://mini-bloomberg-sable.vercel.app)**

![Next.js](https://img.shields.io/badge/Next.js-14-black?style=flat-square&logo=next.js)
![Vercel](https://img.shields.io/badge/Deployed-Vercel-black?style=flat-square&logo=vercel)
![License](https://img.shields.io/badge/License-MIT-blue?style=flat-square)

---

## What is this?

A dark, information-dense terminal that tracks **where institutional money is flowing** in Indian equity markets — built for traders who want to see FII/DII cash segment activity without paying for Bloomberg or expensive data terminals.

Think of it as Sensibull's FII/DII page + a Bloomberg terminal UI, combined and always-on.

---

## Live Demo

🔗 **[mini-bloomberg-sable.vercel.app](https://mini-bloomberg-sable.vercel.app)**

---

## Screenshots

```
┌─────────────────────────────────────────────────────────────────────────┐
│ ◈ NSE TERMINAL   BANK <ENTER>   [NIFTY ▼0.38%  SENSEX ▼0.42% ...]     │
├──────────────┬──────────────────────────────────────┬───────────────────┤
│  FII vs DII  │   🌡 SECTOR ROTATION HEATMAP         │  📰 Intelligence  │
│  Tug of War  │                                      │                   │
│              │  [BANK+] [IT▼▼] [AUTO+] [PHARMA+]   │  Smart money news │
│  RSI Gauges  │  [ENERGY-] [FMCG+] [METAL-] [...]   │                   │
│              │                                      │  🎯 Signal Board  │
│  Top Acc     │  📈 15-Day Net Flow Bar Chart        │                   │
│  Top Dist    │                                      │  📊 Today totals  │
│              │  🏦 Segment + Zone Tables            │                   │
└──────────────┴──────────────────────────────────────┴───────────────────┘
│ ● MARKET CLOSED · ✓ SENSIBULL LIVE (CASH) · REFRESHED: 7:04:21 PM IST  │
```

---

## Features

- **Real FII/DII Cash Segment Data** — sourced from Sensibull's public API, matching exact NSE provisional figures (same numbers you see on Zerodha/Sensibull)
- **15-Day Rolling Flow Chart** — actual historical cash segment net flows, not estimates
- **Sector Rotation Heatmap** — 10 NSE sectoral indices color-coded from deep red (distribution) to emerald green (accumulation)
- **Flow RSI (5-Day)** — momentum indicator showing if a sector is in accumulation (RSI ≥ 65), distribution (RSI ≤ 35), or watch zone
- **FII vs DII Tug of War** — visual bar showing the push/pull between foreign and domestic institutions per sector
- **Bloomberg Command Bar** — type `BANK`, `IT`, `AUTO` etc. to filter all panels to that sector
- **Sector Detail Drawer** — click any heatmap cell for a full breakdown
- **Live Ticker Tape** — NIFTY, SENSEX, BANKNIFTY, USDINR, GOLD scrolling in real time
- **Daily Auto-Refresh** — Vercel Cron fires at 7:00 PM IST every weekday after NSE publishes provisional data
- **IST Clock** — live clock in the header, market open/closed status

---

## Data Sources

| Data | Source | Accuracy |
|---|---|---|
| FII cash net (total) | `oxide.sensibull.com/v1/compute/cache/fii_dii_daily` | ✅ Exact NSE provisional |
| DII cash net (total) | Same Sensibull API | ✅ Exact NSE provisional |
| 15-day flow history | Same Sensibull API (last 15 dates) | ✅ Real historical cash data |
| Sector index prices | Yahoo Finance (`^NSEBANK`, `^CNXIT` etc.) | ✅ Live/closing prices |
| Broad market (NIFTY, SENSEX) | Yahoo Finance | ✅ Live/closing prices |
| Sector FII/DII split | Calculated — real total distributed by price-action weight | ~Directional proxy |

> **Note on sector-level FII/DII:** NSE does not publish free granular per-sector FII breakdowns. The total FII/DII cash net figures are exact (from Sensibull/NSE). The per-sector split shown in the heatmap is a proxy — the real total is distributed proportionally across sectors based on each sector's % move and market cap weight. Direction is accurate; exact magnitude per sector is estimated.

---

## Tech Stack

```
Frontend    Next.js 14 (App Router) + TypeScript
Styling     CSS Modules (terminal dark theme)
Charts      Chart.js + react-chartjs-2
Hosting     Vercel (frontend + API routes + cron)
Cache       Vercel KV (Redis) — 14hr TTL
Scheduler   Vercel Cron — daily 7:00 PM IST (Mon–Fri)
Data        Sensibull API + Yahoo Finance (no paid keys)
```

---

## Architecture

```
                        ┌─────────────────────────┐
                        │   Vercel Cron            │
                        │   1:30 PM UTC = 7 PM IST │
                        │   Mon–Fri only           │
                        └────────────┬────────────┘
                                     │ triggers
                                     ▼
  Sensibull API ──────► /api/cron/daily-refresh ──► Vercel KV (Redis)
  Yahoo Finance ──────►        (fetcher.ts)               │
                                                           │ cached 14hrs
                                                           ▼
  Browser ──────────► /api/market-data ◄────────── Vercel KV
                              │                    (cache hit = instant)
                              │ JSON snapshot
                              ▼
                      Terminal UI (Next.js)
                      polls every 5min (market open)
                      polls every 30min (market closed)
```

---

## Command Bar Reference

Type in the command bar at the top and press **Enter**:

| Command | Action |
|---|---|
| `BANK` | Filter all panels to Banking sector |
| `IT` | Filter to IT sector |
| `AUTO` | Filter to Auto sector |
| `PHARMA` | Filter to Pharma sector |
| `ENERGY` | Filter to Energy sector |
| `FMCG` | Filter to FMCG sector |
| `METAL` | Filter to Metal sector |
| `REALTY` | Filter to Realty sector |
| `INFRA` | Filter to Infrastructure sector |
| `MEDIA` | Filter to Media sector |
| `ALL` or `RESET` | Clear filter — show all sectors |
| `REFRESH` | Force-fetch fresh data from all sources |
| `HELP` | Show all commands in the command bar |

---

## Reading the Terminal

### Heatmap Colors
| Color | Meaning |
|---|---|
| Deep green | Strong FII buying (accumulation) |
| Light green | Mild FII buying |
| Dark/neutral | FII roughly flat |
| Light red | Mild FII selling |
| Deep red | Strong FII distribution |

### Zone Badges (top-right of each heatmap cell)
| Badge | RSI | Meaning |
|---|---|---|
| `ACCUM` | ≥ 65 | FIIs net buyers 4 of last 5 days |
| `WATCH` | 35–65 | No clear directional trend |
| `DISTR` | ≤ 35 | FIIs net sellers 4 of last 5 days |

### Status Bar
| Indicator | Meaning |
|---|---|
| `✓ SENSIBULL LIVE (CASH)` | Real cash segment data from Sensibull |
| `✓ NSE LIVE` | Fell back to NSE direct API |
| `⚠ UNAVAILABLE` | Both sources blocked — data may be stale |
| `● MARKET OPEN` | NSE trading hours: 9:15 AM – 3:30 PM IST |
| `● MARKET CLOSED` | Outside market hours — showing last close data |

---

## Local Development

### Prerequisites
- Node.js 18+
- Git
- A Vercel account (free tier)

### Setup

```bash
# 1. Clone the repo
git clone https://github.com/dhruv2004b/MiniBloomberg.git
cd MiniBloomberg

# 2. Install dependencies
npm install

# 3. Copy env template
cp .env.local.example .env.local
# Fill in KV_REST_API_URL, KV_REST_API_TOKEN, CRON_SECRET
# (or leave blank — app runs without KV, fetches live on every request)

# 4. Run locally
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

> Without KV env vars, the app skips caching and fetches fresh data from Sensibull + Yahoo on every page load. This is fine for development.

### Verify data is live

```bash
# Should return JSON with real FII/DII numbers
curl http://localhost:3000/api/market-data
```

Check the response for:
```json
{
  "dataSource": "Sensibull-live",
  "totalFiiNet": -2714.35,
  "totalDiiNet": 3253.03,
  "fetchedAt": "2026-03-21T13:45:22.000Z"
}
```

---

## Deployment (Vercel)

### Step 1 — Push to GitHub
```bash
git add .
git commit -m "init"
git push origin main
```

### Step 2 — Import on Vercel
1. Go to [vercel.com/new](https://vercel.com/new)
2. Import your GitHub repository
3. Framework: **Next.js** (auto-detected)
4. Click **Deploy**

### Step 3 — Add Vercel KV
1. Vercel Dashboard → your project → **Storage** tab
2. **Create Database** → **KV**
3. Name it `nse-cache` → Create
4. Copy `KV_REST_API_URL` and `KV_REST_API_TOKEN`

### Step 4 — Environment Variables
Go to **Settings → Environment Variables** and add:

| Variable | Value |
|---|---|
| `KV_REST_API_URL` | From Step 3 |
| `KV_REST_API_TOKEN` | From Step 3 |
| `CRON_SECRET` | Any random string e.g. `nse-secret-2026` |

### Step 5 — Redeploy
Deployments → latest → **Redeploy** to pick up env vars.

### Step 6 — Verify cron
```
GET https://your-project.vercel.app/api/cron/daily-refresh
Header: Authorization: Bearer YOUR_CRON_SECRET
```
Should return `{ "success": true }`.

---

## Project Structure

```
src/
├── app/
│   ├── page.tsx                         # Server component — SSR initial data
│   ├── layout.tsx                       # HTML shell + metadata
│   ├── globals.css                      # Terminal dark theme variables
│   ├── lib/
│   │   ├── fetcher.ts                   # Sensibull + Yahoo Finance fetcher
│   │   └── cache.ts                     # Vercel KV wrapper
│   ├── api/
│   │   ├── market-data/route.ts         # GET /api/market-data
│   │   └── cron/daily-refresh/route.ts  # GET /api/cron/daily-refresh
│   └── components/
│       ├── Terminal.tsx                 # Main Bloomberg UI (client)
│       ├── Terminal.module.css          # All component styles
│       └── FlowChart.tsx               # Chart.js 15-day bar chart
vercel.json                              # Cron schedule definition
.env.local.example                       # Environment variable template
```

---

## Cron Schedule

Defined in `vercel.json`:
```json
{
  "crons": [
    {
      "path": "/api/cron/daily-refresh",
      "schedule": "30 13 * * 1-5"
    }
  ]
}
```

`30 13 * * 1-5` = **1:30 PM UTC = 7:00 PM IST, Monday to Friday**

NSE publishes provisional FII/DII figures after 3:30 PM. Sensibull updates their API by ~6:30–7:00 PM IST. The cron fires at 7:00 PM to catch the latest data.

---

## Troubleshooting

**`dataSource: "unavailable"` in API response**
Sensibull is blocking the Vercel server's IP. This happens occasionally. Wait and retry — or force refresh via `REFRESH` command in the terminal.

**Numbers not matching Sensibull exactly**
Check `dataSource` in `/api/market-data`. If it's `"Sensibull-live"`, the total FII/DII numbers will match exactly. Per-sector breakdown is always a proxy.

**Build failing on Vercel**
Check the build log for TypeScript errors. Most common: `useRef` needs an initial value in newer React — use `useRef<T | undefined>(undefined)` not `useRef<T>()`.

**KV cache errors**
Verify `KV_REST_API_URL` and `KV_REST_API_TOKEN` are set in Vercel → Settings → Environment Variables, and that you redeployed after adding them.

**Slow first load (3–5 seconds)**
This is normal — the first request after a cold start hits Sensibull + Yahoo Finance APIs (~10 parallel fetches). Subsequent loads serve from KV cache in under 100ms.

---

## Limitations

- **Sector FII/DII split** is a weighted proxy, not real NSE data. NSE does not publish free granular sectoral FII flows.
- **Historical flow chart** shows real cash segment data for the last ~15 trading days (as available from Sensibull). Data before that is not available from free sources.
- **Intraday updates** — Sensibull only publishes final end-of-day figures. The terminal does not show live intraday FII flow during market hours.
- **Yahoo Finance blocking** — Yahoo Finance occasionally returns 403 from non-browser requests. If sector prices show 0, it usually resolves within minutes.

---

## Contributing

Pull requests welcome. Open an issue first for major changes.

---

## License

MIT — free to use, modify, and deploy.

---

## Acknowledgements

- [Sensibull](https://sensibull.com) — public FII/DII cash segment data
- [NSE India](https://nseindia.com) — source of truth for all institutional flow data
- [Yahoo Finance](https://finance.yahoo.com) — sector index prices
- [Vercel](https://vercel.com) — hosting, KV cache, and cron jobs
- [Chart.js](https://chartjs.org) — flow history bar chart

---

*Built for Indian equity traders who want institutional flow data without a Bloomberg subscription.*
