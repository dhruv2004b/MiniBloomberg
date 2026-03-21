// src/app/page.tsx
// Server component — fetches initial data server-side for fast first paint.
// The client Terminal component then polls for updates every 5 min.

import { getCachedSnapshot } from "./lib/cache";
import { fetchMarketSnapshot } from "./lib/fetcher";
import Terminal from "./components/Terminal";

export const revalidate = 300; // ISR: revalidate every 5 minutes

export default async function Home() {
  // Try cache first, fall back to live fetch
  let snapshot = await getCachedSnapshot();
  if (!snapshot) {
    try {
      snapshot = await fetchMarketSnapshot();
    } catch (e) {
      console.error("[page] Initial fetch failed:", e);
    }
  }
  return <Terminal initialData={snapshot} />;
}
