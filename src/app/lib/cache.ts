// src/app/lib/cache.ts
// ─────────────────────────────────────────────────────────────────────────────
// Thin wrapper around Vercel KV (Redis).
// Falls back gracefully if KV env vars aren't set (local dev without KV).
// ─────────────────────────────────────────────────────────────────────────────

import type { MarketSnapshot } from "./fetcher";

const KV_KEY = "nse:market:snapshot";
const TTL_SECONDS = 60 * 60 * 14; // 14 hours — refreshed daily by cron

// Lazy-load @vercel/kv so the app doesn't crash when env vars are missing
async function getKV() {
  if (!process.env.KV_REST_API_URL || !process.env.KV_REST_API_TOKEN) {
    return null;
  }
  try {
    const { kv } = await import("@vercel/kv");
    return kv;
  } catch {
    return null;
  }
}

export async function getCachedSnapshot(): Promise<MarketSnapshot | null> {
  const kv = await getKV();
  if (!kv) return null;
  try {
    const data = await kv.get<MarketSnapshot>(KV_KEY);
    return data ?? null;
  } catch {
    return null;
  }
}

export async function setCachedSnapshot(snapshot: MarketSnapshot): Promise<void> {
  const kv = await getKV();
  if (!kv) return;
  try {
    await kv.set(KV_KEY, snapshot, { ex: TTL_SECONDS });
  } catch {
    // non-fatal — app still works without cache
    console.warn("[cache] KV set failed — continuing without cache");
  }
}

export async function clearCache(): Promise<void> {
  const kv = await getKV();
  if (!kv) return;
  try {
    await kv.del(KV_KEY);
  } catch {
    // non-fatal
  }
}
