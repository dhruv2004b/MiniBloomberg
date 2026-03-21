// src/app/api/market-data/route.ts
// ─────────────────────────────────────────────────────────────────────────────
// GET /api/market-data
// Returns the cached market snapshot, or fetches fresh data if cache is empty.
// Frontend calls this on page load and every 5 minutes during market hours.
// ─────────────────────────────────────────────────────────────────────────────

import { NextResponse } from "next/server";
import { getCachedSnapshot, setCachedSnapshot } from "../../lib/cache";
import { fetchMarketSnapshot } from "../../lib/fetcher";

// Vercel Edge config: allow this route to run up to 30s (Yahoo fetches take ~5-8s)
export const maxDuration = 30;
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    // 1. Try cache first
    const cached = await getCachedSnapshot();
    if (cached) {
      return NextResponse.json(
        { ...cached, source: "cache" },
        {
          headers: {
            "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
            "X-Data-Source": "vercel-kv",
          },
        }
      );
    }

    // 2. Cache miss — fetch fresh from Yahoo Finance
    console.log("[market-data] Cache miss — fetching from Yahoo Finance...");
    const snapshot = await fetchMarketSnapshot();

    // 3. Store in cache for subsequent requests
    await setCachedSnapshot(snapshot);

    return NextResponse.json(
      { ...snapshot, source: "live" },
      {
        headers: {
          "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
          "X-Data-Source": "yahoo-finance-live",
        },
      }
    );
  } catch (error) {
    console.error("[market-data] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch market data. Yahoo Finance may be temporarily unavailable." },
      { status: 503 }
    );
  }
}
