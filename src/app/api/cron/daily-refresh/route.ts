// src/app/api/cron/daily-refresh/route.ts
// ─────────────────────────────────────────────────────────────────────────────
// POST /api/cron/daily-refresh
// Triggered by Vercel Cron at 1:30 PM UTC (7:00 PM IST) on weekdays.
// Fetches fresh data from Yahoo Finance and updates the KV cache.
// Protected by CRON_SECRET env var.
// ─────────────────────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from "next/server";
import { fetchMarketSnapshot } from "../../../lib/fetcher";
import { setCachedSnapshot, clearCache } from "../../../lib/cache";

export const maxDuration = 60; // cron jobs can run longer
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  // Verify this is being called by Vercel Cron (or manually with the secret)
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    console.warn("[cron] Unauthorized attempt");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const startTime = Date.now();
  console.log("[cron] Daily refresh started at", new Date().toISOString());

  try {
    // Clear old cache first
    await clearCache();

    // Fetch fresh snapshot from Yahoo Finance
    const snapshot = await fetchMarketSnapshot();

    // Store in KV with 14h TTL
    await setCachedSnapshot(snapshot);

    const duration = Date.now() - startTime;
    console.log(`[cron] Daily refresh completed in ${duration}ms`);

    return NextResponse.json({
      success: true,
      message: "Cache refreshed successfully",
      date: snapshot.date,
      fetchedAt: snapshot.fetchedAt,
      sectorsUpdated: snapshot.sectors.length,
      totalFiiNet: snapshot.totalFiiNet,
      totalDiiNet: snapshot.totalDiiNet,
      durationMs: duration,
    });
  } catch (error) {
    console.error("[cron] Daily refresh failed:", error);
    return NextResponse.json(
      { success: false, error: "Refresh failed", details: String(error) },
      { status: 500 }
    );
  }
}
