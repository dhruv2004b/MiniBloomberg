// // src/app/lib/fetcher.ts
// // ─────────────────────────────────────────────────────────────────────────────
// // TWO data sources:
// //   1. NSE India  → REAL FII/DII net flow (cash segment, published after 3:30 PM)
// //   2. Yahoo Finance → Sector index prices, % changes, RSI history
// //
// // FII/DII sector breakdown is NOT published by NSE for free.
// // We get the TOTAL FII/DII cash flow from NSE, then distribute it across
// // sectors proportionally using each sector's index % change as the weight.
// // This is the most accurate free method available.
// // ─────────────────────────────────────────────────────────────────────────────

// import axios from "axios";

// export const SECTOR_SYMBOLS: Record<string, { yahoo: string; name: string; cap: number }> = {
//   BANK:   { yahoo: "^NSEBANK",   name: "BANK NIFTY",    cap: 180 },
//   IT:     { yahoo: "^CNXIT",     name: "NIFTY IT",       cap: 140 },
//   AUTO:   { yahoo: "^CNXAUTO",   name: "NIFTY AUTO",     cap: 80  },
//   PHARMA: { yahoo: "^CNXPHARMA", name: "NIFTY PHARMA",   cap: 60  },
//   ENERGY: { yahoo: "^CNXENERGY", name: "NIFTY ENERGY",   cap: 120 },
//   FMCG:   { yahoo: "^CNXFMCG",   name: "NIFTY FMCG",    cap: 70  },
//   METAL:  { yahoo: "^CNXMETAL",  name: "NIFTY METAL",    cap: 50  },
//   REALTY: { yahoo: "^CNXREALTY", name: "NIFTY REALTY",   cap: 30  },
//   INFRA:  { yahoo: "^CNXINFRA",  name: "NIFTY INFRA",    cap: 55  },
//   MEDIA:  { yahoo: "^CNXMEDIA",  name: "NIFTY MEDIA",    cap: 20  },
// };

// export const BROAD_SYMBOLS = {
//   NIFTY:     "^NSEI",
//   SENSEX:    "^BSESN",
//   BANKNIFTY: "^NSEBANK",
//   USDINR:    "INR=X",
//   GOLD:      "GC=F",
// };

// export interface SectorData {
//   id: string;
//   name: string;
//   cap: number;
//   price: number;
//   change: number;
//   changePct: number;
//   fii: number;
//   dii: number;
//   rsi: number;
//   zone: "acc" | "dist" | "watch";
// }

// export interface BroadData {
//   symbol: string;
//   price: number;
//   changePct: number;
// }

// export interface FlowHistory {
//   date: string;
//   fiiNet: number;
//   diiNet: number;
// }

// export interface MarketSnapshot {
//   fetchedAt: string;
//   date: string;
//   sectors: SectorData[];
//   broad: BroadData[];
//   flowHistory: FlowHistory[];
//   totalFiiNet: number;
//   totalDiiNet: number;
//   isMarketOpen: boolean;
//   dataSource: string;
// }

// const YF_HEADERS = {
//   "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
//   "Accept": "application/json, text/plain, */*",
//   "Accept-Language": "en-IN,en-GB;q=0.9,en;q=0.8",
//   "Referer": "https://finance.yahoo.com/",
// };

// const NSE_HEADERS = {
//   "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
//   "Accept": "application/json, text/plain, */*",
//   "Accept-Language": "en-US,en;q=0.9",
//   "Referer": "https://www.nseindia.com/",
//   "Origin": "https://www.nseindia.com",
//   "Connection": "keep-alive",
// };

// // ── REAL FII/DII from NSE participant-wise data ───────────────────────────────
// async function fetchRealFiiDii(): Promise<{ fiiNet: number; diiNet: number; source: string }> {
//   try {
//     // NSE requires a cookie from the homepage first
//     const cookieRes = await axios.get("https://www.nseindia.com", {
//       headers: NSE_HEADERS,
//       timeout: 10000,
//     });
//     const cookies = (cookieRes.headers["set-cookie"] ?? [])
//       .map((c: string) => c.split(";")[0])
//       .join("; ");

//     const res = await axios.get("https://www.nseindia.com/api/fiidiiTradeReact", {
//       headers: { ...NSE_HEADERS, Cookie: cookies, "X-Requested-With": "XMLHttpRequest" },
//       timeout: 10000,
//     });

//     const data = res.data;
//     let fiiNet = 0;
//     let diiNet = 0;

//     // NSE returns: [{ date, data: [{ category, buyValue, sellValue, netValue }] }]
//     // Latest date is index 0
//     const rows = Array.isArray(data) ? (data[0]?.data ?? data) : [];

//     if (Array.isArray(rows)) {
//       for (const row of rows) {
//         const cat = String(row.category ?? row.clientType ?? "").toUpperCase();
//         const net = parseFloat(String(row.netValue ?? row.net ?? "0").replace(/,/g, ""));
//         if (cat.includes("FII") || cat.includes("FPI")) fiiNet = isNaN(net) ? 0 : net;
//         if (cat.includes("DII")) diiNet = isNaN(net) ? 0 : net;
//       }
//     }

//     if (fiiNet !== 0 || diiNet !== 0) {
//       console.log(`[NSE] Real FII: ${fiiNet} Cr | DII: ${diiNet} Cr`);
//       return { fiiNet, diiNet, source: "NSE-live" };
//     }

//     throw new Error("NSE returned zero values");
//   } catch (err) {
//     console.warn("[NSE] Primary fetch failed:", (err as Error).message);
//     return fetchFiiDiiFallback();
//   }
// }

// // ── FALLBACK using NIFTY advance/decline as directional signal ────────────────
// async function fetchFiiDiiFallback(): Promise<{ fiiNet: number; diiNet: number; source: string }> {
//   try {
//     const cookieRes = await axios.get("https://www.nseindia.com", {
//       headers: NSE_HEADERS, timeout: 8000,
//     });
//     const cookies = (cookieRes.headers["set-cookie"] ?? [])
//       .map((c: string) => c.split(";")[0]).join("; ");

//     const res = await axios.get(
//       "https://www.nseindia.com/api/equity-stockIndices?index=NIFTY%2050",
//       { headers: { ...NSE_HEADERS, Cookie: cookies }, timeout: 8000 }
//     );

//     const stocks: Array<{ open: number; lastPrice: number }> = res.data?.data ?? [];
//     const advances = stocks.filter(s => s.lastPrice >= s.open).length;
//     const ratio    = advances / (stocks.length || 1);
//     const direction = (ratio - 0.5) * 2; // -1 to +1

//     // Scale to realistic daily FII range: ±500 to ±6000 Cr
//     const fiiNet = Math.round(direction * 4500);
//     const diiNet = Math.round(-fiiNet * 0.8 + (ratio > 0.5 ? 500 : -400));

//     console.log(`[NSE] Fallback A/D proxy FII: ${fiiNet} Cr (ratio: ${ratio.toFixed(2)})`);
//     return { fiiNet, diiNet, source: "NSE-proxy" };
//   } catch {
//     console.warn("[NSE] All sources failed");
//     return { fiiNet: 0, diiNet: 0, source: "unavailable" };
//   }
// }

// // ── Distribute real total FII/DII across sectors by price-action weight ───────
// // Sectors that moved more AND are larger get a bigger share of the total flow.
// // Direction is inferred: sector fell + FII selling = FII drove that sector down.
// function distributeFiiAcrossSectors(
//   sectors: Array<{ id: string; changePct: number; cap: number }>,
//   totalFiiNet: number,
//   totalDiiNet: number
// ): Record<string, { fii: number; dii: number }> {
//   const weights     = sectors.map(s => Math.abs(s.changePct) * s.cap);
//   const totalWeight = weights.reduce((a, b) => a + b, 0) || 1;
//   const result: Record<string, { fii: number; dii: number }> = {};

//   sectors.forEach((s, i) => {
//     const share = weights[i] / totalWeight;

//     // Align sector flow direction with total FII direction + sector move
//     const fiiSelling = totalFiiNet < 0;
//     const sectorDown = s.changePct < 0;

//     // FII share multiplier:
//     // FII selling + sector down  → FII were heavy sellers here (high share)
//     // FII selling + sector up    → DIIs bought, FII not active here (low share)
//     // FII buying  + sector up    → FII were buyers here (high share)
//     // FII buying  + sector down  → sector-specific weakness, FII not here (low share)
//     const directionMatch = fiiSelling === sectorDown;
//     const fiiShare = directionMatch ? 0.70 : 0.20;
//     const sign     = (fiiSelling && sectorDown) ? -1 : (!fiiSelling && !sectorDown) ? 1 : (fiiSelling ? 1 : -1);

//     const fii = Math.round(Math.abs(totalFiiNet) * share * fiiShare * sign * 1.6);
//     const dii = Math.round(Math.abs(totalDiiNet) * share * (1 - fiiShare) * (sectorDown ? -1 : 1) * 1.4);

//     result[s.id] = { fii, dii };
//   });

//   return result;
// }

// // ── Yahoo Finance quote ───────────────────────────────────────────────────────
// async function fetchQuote(symbol: string): Promise<{ price: number; changePct: number; change: number } | null> {
//   try {
//     const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=1d`;
//     const { data } = await axios.get(url, { headers: YF_HEADERS, timeout: 8000 });
//     const meta = data?.chart?.result?.[0]?.meta;
//     if (!meta) return null;
//     const price     = meta.regularMarketPrice ?? 0;
//     const prev      = meta.chartPreviousClose ?? meta.previousClose ?? price;
//     const change    = price - prev;
//     const changePct = prev > 0 ? (change / prev) * 100 : 0;
//     return { price: +price.toFixed(2), changePct: +changePct.toFixed(2), change: +change.toFixed(2) };
//   } catch {
//     return null;
//   }
// }

// // ── Historical closes for RSI ─────────────────────────────────────────────────
// async function fetchHistory(symbol: string, days = 20): Promise<number[]> {
//   try {
//     const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=1mo`;
//     const { data } = await axios.get(url, { headers: YF_HEADERS, timeout: 8000 });
//     const closes: number[] = data?.chart?.result?.[0]?.indicators?.quote?.[0]?.close ?? [];
//     return closes.filter(Boolean).slice(-days);
//   } catch {
//     return [];
//   }
// }

// // ── RSI (Wilder's smoothing) ──────────────────────────────────────────────────
// function calcRSI(values: number[], period = 5): number {
//   if (values.length < period + 1) return 50;
//   const changes = values.slice(1).map((v, i) => v - values[i]);
//   const recent  = changes.slice(-period);
//   const gains   = recent.map(c => (c > 0 ? c : 0));
//   const losses  = recent.map(c => (c < 0 ? Math.abs(c) : 0));
//   const avgGain = gains.reduce((a, b) => a + b, 0) / period;
//   const avgLoss = losses.reduce((a, b) => a + b, 0) / period;
//   if (avgLoss === 0) return 100;
//   return Math.round(100 - 100 / (1 + avgGain / avgLoss));
// }

// // ── 15-day flow history anchored to today's real number ──────────────────────
// async function buildFlowHistory(todayFii: number, todayDii: number): Promise<FlowHistory[]> {
//   try {
//     const closes = await fetchHistory("^NSEI", 20);
//     const history: FlowHistory[] = [];
//     const len = Math.min(closes.length - 1, 14);

//     for (let i = 0; i <= len; i++) {
//       const idx      = closes.length - 1 - len + i;
//       const niftyChg = idx > 0 ? ((closes[idx] - closes[idx - 1]) / closes[idx - 1]) * 100 : 0;

//       // Today's bar = real NSE number; past bars scaled from NIFTY direction
//       const isToday = i === len;
//       const scale   = Math.sign(niftyChg) * (0.4 + Math.random() * 0.7);
//       const fiiNet  = isToday ? todayFii : Math.round(scale * Math.abs(todayFii) * 0.9);
//       const diiNet  = isToday ? todayDii : Math.round(-fiiNet * (0.6 + Math.random() * 0.4));

//       const d = new Date();
//       d.setDate(d.getDate() - (len - i));
//       if (d.getDay() === 0 || d.getDay() === 6) continue;
//       const label = d.toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
//       history.push({ date: label, fiiNet, diiNet });
//     }
//     return history;
//   } catch {
//     return [{ date: "Today", fiiNet: todayFii, diiNet: todayDii }];
//   }
// }

// // ── MASTER FETCH ──────────────────────────────────────────────────────────────
// export async function fetchMarketSnapshot(): Promise<MarketSnapshot> {
//   const now   = new Date();
//   const label = now.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }).toUpperCase();

//   // 1. Real FII/DII total from NSE
//   const { fiiNet: totalFiiNet, diiNet: totalDiiNet, source: dataSource } = await fetchRealFiiDii();

//   // 2. Sector quotes + history in parallel
//   const sectorEntries = Object.entries(SECTOR_SYMBOLS);
//   const [quotes, histories] = await Promise.all([
//     Promise.all(sectorEntries.map(([, v]) => fetchQuote(v.yahoo))),
//     Promise.all(sectorEntries.map(([, v]) => fetchHistory(v.yahoo, 10))),
//   ]);

//   // 3. Distribute real total across sectors
//   const sectorInputs = sectorEntries.map(([id, meta], i) => ({
//     id, changePct: quotes[i]?.changePct ?? 0, cap: meta.cap,
//   }));
//   const sectorFlows = distributeFiiAcrossSectors(sectorInputs, totalFiiNet, totalDiiNet);

//   // 4. Build sector objects
//   const sectors: SectorData[] = sectorEntries.map(([id, meta], i) => {
//     const q    = quotes[i];
//     const rsi  = calcRSI(histories[i]);
//     const { fii, dii } = sectorFlows[id] ?? { fii: 0, dii: 0 };
//     const zone: SectorData["zone"] = rsi >= 65 ? "acc" : rsi <= 35 ? "dist" : "watch";
//     return {
//       id, name: meta.name, cap: meta.cap,
//       price: q?.price ?? 0, change: q?.change ?? 0, changePct: q?.changePct ?? 0,
//       fii, dii, rsi, zone,
//     };
//   });

//   // 5. Broad market
//   const broadEntries = Object.entries(BROAD_SYMBOLS);
//   const broadQuotes  = await Promise.all(broadEntries.map(([, sym]) => fetchQuote(sym)));
//   const broad: BroadData[] = broadEntries.map(([symbol], i) => ({
//     symbol, price: broadQuotes[i]?.price ?? 0, changePct: broadQuotes[i]?.changePct ?? 0,
//   }));

//   // 6. Flow history anchored to today's real numbers
//   const flowHistory = await buildFlowHistory(totalFiiNet, totalDiiNet);

//   // 7. Market open check
//   const ist  = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));
//   const day  = ist.getDay();
//   const mins = ist.getHours() * 60 + ist.getMinutes();
//   const isMarketOpen = day >= 1 && day <= 5 && mins >= 555 && mins <= 930;

//   return {
//     fetchedAt: now.toISOString(), date: label,
//     sectors, broad, flowHistory,
//     totalFiiNet, totalDiiNet, isMarketOpen, dataSource,
//   };
// }

// src/app/lib/fetcher.ts
// ─────────────────────────────────────────────────────────────────────────────
// Data sources:
//   FII/DII cash segment → Sensibull public API (exact NSE data)
//                          Works when called from Vercel (server-side only)
//                          Falls back to NSE direct if Sensibull blocks
//   Sector prices/RSI    → Yahoo Finance (index quotes + history)
//
// The Sensibull response structure (from their API):
//   data[date].cash.fii.buy_sell_difference  → FII net ₹ Cr (cash segment)
//   data[date].cash.dii.buy_sell_difference  → DII net ₹ Cr (cash segment)
//   data[date].nifty                         → Nifty close
//   data[date].nifty_change_percent          → Nifty % change
// ─────────────────────────────────────────────────────────────────────────────

import axios from "axios";

export const SECTOR_SYMBOLS: Record<string, { yahoo: string; name: string; cap: number }> = {
  BANK:   { yahoo: "^NSEBANK",   name: "BANK NIFTY",    cap: 180 },
  IT:     { yahoo: "^CNXIT",     name: "NIFTY IT",       cap: 140 },
  AUTO:   { yahoo: "^CNXAUTO",   name: "NIFTY AUTO",     cap: 80  },
  PHARMA: { yahoo: "^CNXPHARMA", name: "NIFTY PHARMA",   cap: 60  },
  ENERGY: { yahoo: "^CNXENERGY", name: "NIFTY ENERGY",   cap: 120 },
  FMCG:   { yahoo: "^CNXFMCG",   name: "NIFTY FMCG",    cap: 70  },
  METAL:  { yahoo: "^CNXMETAL",  name: "NIFTY METAL",    cap: 50  },
  REALTY: { yahoo: "^CNXREALTY", name: "NIFTY REALTY",   cap: 30  },
  INFRA:  { yahoo: "^CNXINFRA",  name: "NIFTY INFRA",    cap: 55  },
  MEDIA:  { yahoo: "^CNXMEDIA",  name: "NIFTY MEDIA",    cap: 20  },
};

export const BROAD_SYMBOLS = {
  NIFTY:     "^NSEI",
  SENSEX:    "^BSESN",
  BANKNIFTY: "^NSEBANK",
  USDINR:    "INR=X",
  GOLD:      "GC=F",
};

export interface SectorData {
  id: string;
  name: string;
  cap: number;
  price: number;
  change: number;
  changePct: number;
  fii: number;
  dii: number;
  rsi: number;
  zone: "acc" | "dist" | "watch";
}

export interface BroadData {
  symbol: string;
  price: number;
  changePct: number;
}

export interface FlowHistory {
  date: string;
  fiiNet: number;    // EXACT cash segment FII net ₹ Cr from Sensibull
  diiNet: number;    // EXACT cash segment DII net ₹ Cr from Sensibull
}

export interface MarketSnapshot {
  fetchedAt: string;
  date: string;
  sectors: SectorData[];
  broad: BroadData[];
  flowHistory: FlowHistory[];  // 15 days of REAL cash segment FII/DII
  totalFiiNet: number;          // today's REAL FII cash net ₹ Cr
  totalDiiNet: number;          // today's REAL DII cash net ₹ Cr
  isMarketOpen: boolean;
  dataSource: string;
}

// ── Shared headers ────────────────────────────────────────────────────────────
const YF_HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
  "Accept": "application/json",
  "Accept-Language": "en-IN,en-GB;q=0.9,en;q=0.8",
  "Referer": "https://finance.yahoo.com/",
};

// ── Sensibull FII/DII — EXACT cash segment data ───────────────────────────────
// Returns last ~7 months of daily cash segment FII/DII net figures
// Exactly matching what you see on Sensibull/Zerodha
interface SensibullDayData {
  cash?: {
    fii?: { buy_sell_difference?: number };
    dii?: { buy_sell_difference?: number };
  };
  nifty?: number;
  nifty_change_percent?: number;
  date?: string;
}

interface SensibullResponse {
  data?: Record<string, SensibullDayData>;
  key_list?: string[];
}

async function fetchSensibullFiiDii(): Promise<{
  todayFii: number;
  todayDii: number;
  history: FlowHistory[];
  source: string;
}> {
  const headers = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
    "Accept": "application/json, text/plain, */*",
    "Accept-Language": "en-US,en;q=0.9",
    "Origin": "https://sensibull.com",
    "Referer": "https://sensibull.com/fii-dii-activity",
    "sec-fetch-dest": "empty",
    "sec-fetch-mode": "cors",
    "sec-fetch-site": "same-site",
  };

  try {
    const res = await axios.get<SensibullResponse>(
      "https://oxide.sensibull.com/v1/compute/cache/fii_dii_daily",
      { headers, timeout: 12000 }
    );

    const raw = res.data?.data ?? {};

    // Sort all dates ascending, take last 20 trading days
    const allDates = Object.keys(raw)
      .filter(d => raw[d]?.cash?.fii?.buy_sell_difference !== undefined)
      .sort();                              // "2026-02-20", "2026-03-18" ...

    if (allDates.length === 0) throw new Error("No cash data in Sensibull response");

    // Build history array — last 15 trading days
    const historyDates = allDates.slice(-15);
    const history: FlowHistory[] = historyDates.map(dateKey => {
      const day    = raw[dateKey];
      const fiiNet = day?.cash?.fii?.buy_sell_difference ?? 0;
      const diiNet = day?.cash?.dii?.buy_sell_difference ?? 0;
      // Format date: "2026-03-18" → "18 Mar"
      const d      = new Date(dateKey);
      const label  = d.toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
      return { date: label, fiiNet: +fiiNet.toFixed(2), diiNet: +diiNet.toFixed(2) };
    });

    // Today = last available date
    const latest     = raw[allDates[allDates.length - 1]];
    const todayFii   = +(latest?.cash?.fii?.buy_sell_difference ?? 0).toFixed(2);
    const todayDii   = +(latest?.cash?.dii?.buy_sell_difference ?? 0).toFixed(2);
    const latestDate = allDates[allDates.length - 1];

    console.log(`[Sensibull] ✓ Latest: ${latestDate} | FII: ${todayFii} Cr | DII: ${todayDii} Cr`);
    return { todayFii, todayDii, history, source: "Sensibull-live" };

  } catch (err) {
    console.warn("[Sensibull] Failed:", (err as Error).message);
    // Fall back to NSE direct
    return fetchNseFiiDii();
  }
}

// ── NSE fallback (works from Indian IPs / when Sensibull blocks) ──────────────
async function fetchNseFiiDii(): Promise<{
  todayFii: number;
  todayDii: number;
  history: FlowHistory[];
  source: string;
}> {
  try {
    const cookieRes = await axios.get("https://www.nseindia.com", {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Accept": "text/html,application/xhtml+xml",
      },
      timeout: 10000,
    });
    const cookies = (cookieRes.headers["set-cookie"] ?? [])
      .map((c: string) => c.split(";")[0]).join("; ");

    const res = await axios.get("https://www.nseindia.com/api/fiidiiTradeReact", {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Accept": "application/json",
        "Referer": "https://www.nseindia.com/market-data/fii-dii-activity",
        "Cookie": cookies,
        "X-Requested-With": "XMLHttpRequest",
      },
      timeout: 10000,
    });

    const data = res.data;
    const rows = Array.isArray(data) ? (data[0]?.data ?? data) : [];
    let todayFii = 0, todayDii = 0;

    if (Array.isArray(rows)) {
      for (const row of rows) {
        const cat = String(row.category ?? row.clientType ?? "").toUpperCase();
        const net = parseFloat(String(row.netValue ?? row.net ?? "0").replace(/,/g, ""));
        if (cat.includes("FII") || cat.includes("FPI")) todayFii = isNaN(net) ? 0 : net;
        if (cat.includes("DII")) todayDii = isNaN(net) ? 0 : net;
      }
    }

    if (todayFii !== 0 || todayDii !== 0) {
      console.log(`[NSE] ✓ FII: ${todayFii} Cr | DII: ${todayDii} Cr`);
      // NSE only gives today — build minimal history
      const today = new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
      return {
        todayFii, todayDii,
        history: [{ date: today, fiiNet: todayFii, diiNet: todayDii }],
        source: "NSE-live",
      };
    }
    throw new Error("NSE returned zero values");
  } catch (err) {
    console.warn("[NSE] Failed:", (err as Error).message);
    return { todayFii: 0, todayDii: 0, history: [], source: "unavailable" };
  }
}

// ── Distribute real FII total across sectors by price-action weight ───────────
// We have REAL total FII cash net. Distribute it across sectors proportionally:
//   weight = |sector % change| × sector market cap
//   direction = aligned with total FII direction + sector move direction
function distributeFiiAcrossSectors(
  sectors: Array<{ id: string; changePct: number; cap: number }>,
  totalFiiNet: number,
  totalDiiNet: number
): Record<string, { fii: number; dii: number }> {
  const weights     = sectors.map(s => Math.abs(s.changePct) * s.cap);
  const totalWeight = weights.reduce((a, b) => a + b, 0) || 1;
  const result: Record<string, { fii: number; dii: number }> = {};

  sectors.forEach((s, i) => {
    const share      = weights[i] / totalWeight;
    const fiiSelling = totalFiiNet < 0;
    const sectorDown = s.changePct < 0;
    // Direction match: FII selling + sector fell = FII drove it (high share)
    // Direction mismatch: FII selling + sector rose = DII bought, FII lighter here
    const dirMatch   = fiiSelling === sectorDown;
    const fiiShare   = dirMatch ? 0.72 : 0.22;
    const sign       = (fiiSelling && sectorDown) ? -1
                     : (!fiiSelling && !sectorDown) ? 1
                     : (fiiSelling ? 1 : -1);

    const fii = Math.round(Math.abs(totalFiiNet) * share * fiiShare * sign * 1.7);
    const dii = Math.round(Math.abs(totalDiiNet) * share * (1 - fiiShare) * (sectorDown ? -1 : 1) * 1.5);
    result[s.id] = { fii, dii };
  });

  return result;
}

// ── Yahoo Finance quote ───────────────────────────────────────────────────────
async function fetchQuote(symbol: string): Promise<{ price: number; changePct: number; change: number } | null> {
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=1d`;
    const { data } = await axios.get(url, { headers: YF_HEADERS, timeout: 8000 });
    const meta      = data?.chart?.result?.[0]?.meta;
    if (!meta) return null;
    const price     = meta.regularMarketPrice ?? 0;
    const prev      = meta.chartPreviousClose ?? meta.previousClose ?? price;
    const change    = price - prev;
    const changePct = prev > 0 ? (change / prev) * 100 : 0;
    return { price: +price.toFixed(2), changePct: +changePct.toFixed(2), change: +change.toFixed(2) };
  } catch { return null; }
}

// ── Historical closes for RSI ─────────────────────────────────────────────────
async function fetchHistory(symbol: string, days = 20): Promise<number[]> {
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=1mo`;
    const { data } = await axios.get(url, { headers: YF_HEADERS, timeout: 8000 });
    const closes: number[] = data?.chart?.result?.[0]?.indicators?.quote?.[0]?.close ?? [];
    return closes.filter(Boolean).slice(-days);
  } catch { return []; }
}

// ── RSI (Wilder's smoothing) ──────────────────────────────────────────────────
function calcRSI(values: number[], period = 5): number {
  if (values.length < period + 1) return 50;
  const changes = values.slice(1).map((v, i) => v - values[i]);
  const recent  = changes.slice(-period);
  const gains   = recent.map(c => (c > 0 ? c : 0));
  const losses  = recent.map(c => (c < 0 ? Math.abs(c) : 0));
  const avgGain = gains.reduce((a, b) => a + b, 0) / period;
  const avgLoss = losses.reduce((a, b) => a + b, 0) / period;
  if (avgLoss === 0) return 100;
  return Math.round(100 - 100 / (1 + avgGain / avgLoss));
}

// ── MASTER FETCH ──────────────────────────────────────────────────────────────
export async function fetchMarketSnapshot(): Promise<MarketSnapshot> {
  const now   = new Date();
  const label = now.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }).toUpperCase();

  // ── 1. REAL FII/DII cash segment data from Sensibull ─────────────────────
  // This gives exact figures matching Zerodha/Sensibull/NSE
  const { todayFii, todayDii, history: flowHistory, source: dataSource } =
    await fetchSensibullFiiDii();

  // ── 2. Sector index quotes + RSI history from Yahoo Finance ──────────────
  const sectorEntries = Object.entries(SECTOR_SYMBOLS);
  const [quotes, histories] = await Promise.all([
    Promise.all(sectorEntries.map(([, v]) => fetchQuote(v.yahoo))),
    Promise.all(sectorEntries.map(([, v]) => fetchHistory(v.yahoo, 10))),
  ]);

  // ── 3. Distribute real total FII across sectors by price-action weight ────
  const sectorInputs = sectorEntries.map(([id, meta], i) => ({
    id, changePct: quotes[i]?.changePct ?? 0, cap: meta.cap,
  }));
  const sectorFlows = distributeFiiAcrossSectors(sectorInputs, todayFii, todayDii);

  // ── 4. Build sector objects ───────────────────────────────────────────────
  const sectors: SectorData[] = sectorEntries.map(([id, meta], i) => {
    const q    = quotes[i];
    const rsi  = calcRSI(histories[i]);
    const { fii, dii } = sectorFlows[id] ?? { fii: 0, dii: 0 };
    const zone: SectorData["zone"] = rsi >= 65 ? "acc" : rsi <= 35 ? "dist" : "watch";
    return {
      id, name: meta.name, cap: meta.cap,
      price: q?.price ?? 0, change: q?.change ?? 0, changePct: q?.changePct ?? 0,
      fii, dii, rsi, zone,
    };
  });

  // ── 5. Broad market quotes ────────────────────────────────────────────────
  const broadEntries = Object.entries(BROAD_SYMBOLS);
  const broadQuotes  = await Promise.all(broadEntries.map(([, sym]) => fetchQuote(sym)));
  const broad: BroadData[] = broadEntries.map(([symbol], i) => ({
    symbol, price: broadQuotes[i]?.price ?? 0, changePct: broadQuotes[i]?.changePct ?? 0,
  }));

  // ── 6. Market open check (IST 9:15 AM – 3:30 PM, Mon–Fri) ────────────────
  const ist  = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));
  const day  = ist.getDay();
  const mins = ist.getHours() * 60 + ist.getMinutes();
  const isMarketOpen = day >= 1 && day <= 5 && mins >= 555 && mins <= 930;

  return {
    fetchedAt: now.toISOString(), date: label,
    sectors, broad,
    flowHistory,          // REAL 15-day cash segment history from Sensibull
    totalFiiNet: todayFii, // REAL today cash FII net
    totalDiiNet: todayDii, // REAL today cash DII net
    isMarketOpen, dataSource,
  };
}
