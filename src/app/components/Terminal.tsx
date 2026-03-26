// "use client";
// // src/app/components/Terminal.tsx
// // Full Bloomberg-style terminal UI — wired to /api/market-data

// import { useState, useEffect, useRef, useCallback } from "react";
// import type { MarketSnapshot, SectorData } from "../lib/fetcher";
// import FlowChart from "./FlowChart";
// import styles from "./Terminal.module.css";

// // ── Helpers ───────────────────────────────────────────────────────────────────
// function fmt(v: number) { return (v > 0 ? "+" : "") + v.toLocaleString("en-IN"); }
// function fmtCr(v: number) { return (v > 0 ? "+" : "-") + "₹" + Math.abs(v).toLocaleString("en-IN") + " Cr"; }
// function heatClass(fii: number) {
//   if (fii >  3000) return styles.heatStrongBuy;
//   if (fii >  1000) return styles.heatBuy;
//   if (fii >     0) return styles.heatMildBuy;
//   if (fii > -1000) return styles.heatNeutral;
//   if (fii > -2000) return styles.heatMildSell;
//   if (fii > -4000) return styles.heatSell;
//   return styles.heatStrongSell;
// }

// const SEGMENT_LABELS = [
//   "Cash Market", "Futures (Net)", "Options (Call)", "Options (Put)", "Debt Market",
// ];

// // ── News generator from live sector data ─────────────────────────────────────
// function generateNews(sectors: SectorData[], totalFii: number, totalDii: number) {
//   const news = [];
//   const topSell = [...sectors].sort((a, b) => a.fii - b.fii)[0];
//   const topBuy  = [...sectors].sort((a, b) => b.fii - a.fii)[0];
//   const now = new Date();
//   const istH = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Kolkata" })).getHours();
//   const istM = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Kolkata" })).getMinutes();
//   const ts = (h: number, m: number) => `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;

//   if (totalFii < 0) news.push({ time: ts(istH, istM), head: `FIIs net sellers today — ${fmtCr(totalFii)} across equity segments.`, tag: "sell", sector: null });
//   else news.push({ time: ts(istH, istM), head: `FIIs net buyers — ${fmtCr(totalFii)} inflow across equity segments.`, tag: "buy", sector: null });

//   news.push({ time: ts(istH - 1, istM), head: `DIIs absorb flow — ${fmtCr(totalDii)} net ${totalDii > 0 ? "buying" : "selling"} on day.`, tag: totalDii > 0 ? "buy" : "sell", sector: null });

//   if (topSell) news.push({ time: ts(istH - 1, 30), head: `${topSell.name}: Heavy distribution detected — ${fmtCr(topSell.fii)} FII outflow. RSI: ${topSell.rsi}.`, tag: "sell", sector: topSell.id });
//   if (topBuy)  news.push({ time: ts(istH - 2, 15), head: `${topBuy.name}: Smart money accumulation — ${fmtCr(topBuy.fii)} FII inflow. Zone: ${topBuy.zone.toUpperCase()}.`, tag: "buy", sector: topBuy.id });

//   const accSectors = sectors.filter(s => s.zone === "acc");
//   if (accSectors.length > 0) news.push({ time: ts(istH - 2, 45), head: `Rotation signal: ${accSectors.map(s => s.id).join(", ")} in accumulation zone (RSI ≥ 65).`, tag: "buy", sector: null });

//   const distSectors = sectors.filter(s => s.zone === "dist");
//   if (distSectors.length > 0) news.push({ time: ts(istH - 3, 10), head: `Distribution alert: ${distSectors.map(s => s.id).join(", ")} showing sustained FII exit.`, tag: "sell", sector: null });

//   return news;
// }

// // ── Props ─────────────────────────────────────────────────────────────────────
// interface Props { initialData: MarketSnapshot | null; }

// // ── Component ─────────────────────────────────────────────────────────────────
// export default function Terminal({ initialData }: Props) {
//   const [data, setData]           = useState<MarketSnapshot | null>(initialData);
//   const [loading, setLoading]     = useState(!initialData);
//   const [lastFetch, setLastFetch] = useState<string>("");
//   const [filter, setFilter]       = useState<string | null>(null);
//   const [cmdVal, setCmdVal]       = useState("");
//   const [cmdMsg, setCmdMsg]       = useState("");
//   const [cmdVisible, setCmdVisible] = useState(false);
//   const [detail, setDetail]       = useState<SectorData | null>(null);
//   const [clock, setClock]         = useState("");
//   const cmdTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
//   // ── Clock ─────────────────────────────────────────────────────────────────
//   useEffect(() => {
//     const tick = () => {
//       const ist = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));
//       setClock(ist.toTimeString().slice(0, 8) + " IST");
//     };
//     tick();
//     const id = setInterval(tick, 1000);
//     return () => clearInterval(id);
//   }, []);

//   // ── Data polling ──────────────────────────────────────────────────────────
//   const fetchData = useCallback(async () => {
//     try {
//       const res = await fetch("/api/market-data");
//       if (!res.ok) return;
//       const json: MarketSnapshot = await res.json();
//       setData(json);
//       setLastFetch(new Date().toLocaleTimeString("en-IN", { timeZone: "Asia/Kolkata" }) + " IST");
//     } catch {
//       // keep showing last good data
//     } finally {
//       setLoading(false);
//     }
//   }, []);

//   useEffect(() => {
//     if (!initialData) fetchData();
//     // Poll every 5 minutes during market hours, every 30 min otherwise
//     const interval = data?.isMarketOpen ? 5 * 60_000 : 30 * 60_000;
//     const id = setInterval(fetchData, interval);
//     return () => clearInterval(id);
//   }, [fetchData, initialData, data?.isMarketOpen]);

//   // ── Command handler ───────────────────────────────────────────────────────
//   const showCmd = (msg: string) => {
//     setCmdMsg(msg); setCmdVisible(true);
//     if (cmdTimer.current) clearTimeout(cmdTimer.current);
//     cmdTimer.current = setTimeout(() => setCmdVisible(false), 3500);
//   };

//   const handleCmd = (e: React.KeyboardEvent<HTMLInputElement>) => {
//     if (e.key !== "Enter") return;
//     const cmd = cmdVal.trim().toUpperCase();
//     setCmdVal("");
//     if (!data) return;

//     if (cmd === "ALL" || cmd === "RESET") {
//       setFilter(null); showCmd("↩ Showing all sectors");
//     } else if (cmd === "REFRESH") {
//       fetchData(); showCmd("⟳ Refreshing data from Yahoo Finance...");
//     } else if (cmd === "HELP") {
//       showCmd("Commands: " + data.sectors.map(s => s.id).join(" · ") + " · ALL · RESET · REFRESH");
//     } else {
//       const match = data.sectors.find(s => s.id === cmd);
//       if (match) {
//         setFilter(cmd);
//         showCmd(`▶ ${match.name} — FII: ${fmtCr(match.fii)} · RSI: ${match.rsi} · Zone: ${match.zone.toUpperCase()}`);
//       } else {
//         showCmd(`⚠ Unknown: "${cmd}" — type HELP for commands`);
//       }
//     }
//   };

//   // ── Derived data ──────────────────────────────────────────────────────────
//   const sectors = data ? (filter ? data.sectors.filter(s => s.id === filter) : data.sectors) : [];
//   const allSectors = data?.sectors ?? [];
//   const news = data ? generateNews(allSectors, data.totalFiiNet, data.totalDiiNet) : [];
//   const filteredNews = filter ? news.filter(n => !n.sector || n.sector === filter) : news;

//   const sorted = [...allSectors].sort((a, b) => b.fii - a.fii);
//   const topAcc  = sorted.slice(0, 3);
//   const topDist = sorted.slice(-3).reverse();

//   // Fake segment breakdown scaled from total flow
//   const segmentData = data ? [
//     { fii: data.totalFiiNet,                      dii: data.totalDiiNet },
//     { fii: Math.round(data.totalFiiNet * -0.42),  dii: Math.round(data.totalDiiNet * 0.21) },
//     { fii: Math.round(Math.abs(data.totalFiiNet) * 1.6),  dii: Math.round(Math.abs(data.totalDiiNet) * 0.74) },
//     { fii: Math.round(Math.abs(data.totalFiiNet) * 1.21), dii: Math.round(Math.abs(data.totalDiiNet) * 0.54) },
//     { fii: Math.round(data.totalFiiNet * 0.22),   dii: Math.round(data.totalDiiNet * 0.16) },
//   ] : [];

//   // Ticker tape items
//   const tickerItems = data
//     ? [
//         ...data.broad.map(b => ({ sym: b.symbol, val: b.price.toLocaleString("en-IN"), chg: (b.changePct > 0 ? "+" : "") + b.changePct.toFixed(2) + "%", up: b.changePct >= 0 })),
//         { sym: "FII NET", val: fmtCr(data.totalFiiNet), chg: data.totalFiiNet >= 0 ? "BUY" : "SELL", up: data.totalFiiNet >= 0 },
//         { sym: "DII NET", val: fmtCr(data.totalDiiNet), chg: data.totalDiiNet >= 0 ? "BUY" : "SELL", up: data.totalDiiNet >= 0 },
//       ]
//     : [];

//   // ── Render ────────────────────────────────────────────────────────────────
//   if (loading) {
//     return (
//       <div className={styles.loadingScreen}>
//         <div className={styles.loadingInner}>
//           <div className={styles.loadingLogo}>◈ NSE TERMINAL</div>
//           <div className={styles.loadingMsg}>Connecting to Yahoo Finance · Fetching sector data...</div>
//           <div className={styles.loadingBar}><div className={styles.loadingFill}/></div>
//         </div>
//       </div>
//     );
//   }

//   return (
//     <div className={styles.root}>

//       {/* ── TOP BAR ─────────────────────────────────────────────────── */}
//       <header className={styles.topbar}>
//         <div className={styles.logo}>
//           <span className={styles.logoMark}>◈ NSE TERMINAL</span>
//           <span className={styles.logoSub}>FII/DII SECTOR ROTATION · LIVE</span>
//         </div>
//         <input
//           className={styles.cmdInput}
//           type="text"
//           value={cmdVal}
//           onChange={e => setCmdVal(e.target.value)}
//           onKeyDown={handleCmd}
//           placeholder="⌨  BANK <ENTER> — sector filter..."
//           maxLength={20}
//         />
//         <div className={styles.tickerWrap}>
//           <div className={styles.tickerInner}>
//             {[...tickerItems, ...tickerItems].map((t, i) => (
//               <span key={i} className={styles.tickItem}>
//                 {t.sym} <span className={t.up ? styles.up : styles.dn}>{t.val} {t.chg}</span>
//               </span>
//             ))}
//           </div>
//         </div>
//         <span className={styles.clock}>{clock}</span>
//         {data?.isMarketOpen && <span className={styles.liveTag}>● LIVE</span>}
//       </header>

//       {/* ── CMD OUTPUT ──────────────────────────────────────────────── */}
//       {cmdVisible && <div className={styles.cmdOut}>{cmdMsg}</div>}

//       {/* ── MAIN GRID ───────────────────────────────────────────────── */}
//       <div className={styles.main}>

//         {/* LEFT */}
//         <aside className={styles.leftCol}>
//           <div className={styles.panelTitle}>⚡ FII vs DII — Today</div>
//           {sectors.slice(0, 6).map(s => {
//             const total = Math.abs(s.fii) + Math.abs(s.dii) || 1;
//             const fPct  = (Math.abs(s.fii) / total * 100).toFixed(0);
//             const dPct  = (Math.abs(s.dii) / total * 100).toFixed(0);
//             return (
//               <div key={s.id} className={styles.tugBlock}>
//                 <div className={styles.tugHeader}>
//                   <span className={styles.tugId}>{s.id}</span>
//                   <span className={styles.tugName}>{s.name}</span>
//                 </div>
//                 <div className={styles.tugRow}>
//                   <span className={styles.tugLabel} style={{ color: "var(--red)" }}>FII</span>
//                   <div className={styles.tugBarWrap}>
//                     <div className={styles.tugFii} style={{ width: fPct + "%", background: s.fii < 0 ? "var(--red)" : "var(--green)" }}/>
//                   </div>
//                   <span className={styles.tugVal} style={{ color: s.fii < 0 ? "var(--red)" : "var(--green)" }}>
//                     ₹{(Math.abs(s.fii) / 100).toFixed(1)}B
//                   </span>
//                 </div>
//                 <div className={styles.tugRow}>
//                   <span className={styles.tugLabel} style={{ color: "var(--green)" }}>DII</span>
//                   <div className={styles.tugBarWrap}>
//                     <div className={styles.tugDii} style={{ width: dPct + "%" }}/>
//                   </div>
//                   <span className={styles.tugVal} style={{ color: "var(--green)" }}>
//                     ₹{(Math.abs(s.dii) / 100).toFixed(1)}B
//                   </span>
//                 </div>
//               </div>
//             );
//           })}

//           <div className={styles.panelTitle} style={{ marginTop: 16 }}>📊 Flow RSI (5-Day)</div>
//           {sectors.map(s => {
//             const col = s.rsi >= 65 ? "var(--green)" : s.rsi <= 35 ? "var(--red)" : "var(--amber)";
//             return (
//               <div key={s.id} className={styles.rsiRow}>
//                 <span className={styles.rsiLabel}>{s.id}</span>
//                 <div className={styles.rsiBarWrap}>
//                   <div className={styles.rsiFill} style={{ width: s.rsi + "%", background: col }}/>
//                 </div>
//                 <span className={styles.rsiVal} style={{ color: col }}>{s.rsi}</span>
//               </div>
//             );
//           })}

//           <div className={styles.panelTitle} style={{ marginTop: 16 }}>🔺 Top Accumulation</div>
//           {topAcc.map(s => (
//             <div key={s.id} className={styles.miniRow}>
//               <span>{s.id}</span>
//               <span className={styles.up}>{fmtCr(s.fii)}</span>
//             </div>
//           ))}

//           <div className={styles.panelTitle} style={{ marginTop: 12 }}>🔻 Top Distribution</div>
//           {topDist.map(s => (
//             <div key={s.id} className={styles.miniRow}>
//               <span>{s.id}</span>
//               <span className={styles.dn}>{fmtCr(s.fii)}</span>
//             </div>
//           ))}
//         </aside>

//         {/* CENTER */}
//         <main className={styles.center}>

//           {/* Heatmap */}
//           <section className={styles.heatmapPanel}>
//             <div className={styles.heatmapHeader}>
//               <span className={styles.panelTitleInline}>🌡 SECTOR ROTATION HEATMAP</span>
//               <span className={styles.dateLabel}>{data?.date} · LIVE</span>
//             </div>
//             <div className={styles.heatmap} style={{ gridTemplateColumns: `repeat(${Math.min(sectors.length, 5)}, 1fr)` }}>
//               {sectors.map(s => (
//                 <div
//                   key={s.id}
//                   className={`${styles.heatCell} ${heatClass(s.fii)}`}
//                   onClick={() => setDetail(s)}
//                   title={s.name}
//                 >
//                   <span className={`${styles.zoneBadge} ${styles["zone_" + s.zone]}`}>
//                     {s.zone === "acc" ? "ACCUM" : s.zone === "dist" ? "DISTR" : "WATCH"}
//                   </span>
//                   <span className={styles.heatId}>{s.id}</span>
//                   <span className={styles.heatChgPct} style={{ color: s.changePct >= 0 ? "var(--green)" : "var(--red)" }}>
//                     {s.changePct >= 0 ? "▲" : "▼"} {Math.abs(s.changePct).toFixed(2)}%
//                   </span>
//                   <span className={styles.heatFlow} style={{ color: s.fii >= 0 ? "var(--green)" : "var(--red)" }}>
//                     {fmt(s.fii)} Cr
//                   </span>
//                 </div>
//               ))}
//             </div>
//             <div className={styles.heatLegend}>
//               <span><span className={styles.dot} style={{ background: "#047857" }}/> Strong buy</span>
//               <span><span className={styles.dot} style={{ background: "#1a1a2e" }}/> Neutral</span>
//               <span><span className={styles.dot} style={{ background: "#991b1b" }}/> Strong sell</span>
//               <span className={styles.legendRight}>Box color = FII net flow proxy · Click for detail</span>
//             </div>
//           </section>

//           {/* Flow chart */}
//           <section className={styles.chartPanel}>
//             <div className={styles.panelTitle}>📈 Net Institutional Flow — 15-Day Rolling (₹ Cr)</div>
//             {data && <FlowChart history={data.flowHistory} />}
//           </section>

//           {/* Bottom tables */}
//           <section className={styles.bottomPanel}>
//             <div className={styles.tableGrid}>
//               <div className={styles.tableBox}>
//                 <div className={styles.panelTitle}>🏦 FII Activity — Segment Breakdown</div>
//                 <table className={styles.table}>
//                   <thead>
//                     <tr><th>Segment</th><th className={styles.dn}>FII</th><th className={styles.up}>DII</th></tr>
//                   </thead>
//                   <tbody>
//                     {SEGMENT_LABELS.map((lbl, i) => (
//                       <tr key={lbl}>
//                         <td className={styles.muted}>{lbl}</td>
//                         <td className={segmentData[i]?.fii >= 0 ? styles.up : styles.dn}>{fmtCr(segmentData[i]?.fii ?? 0)}</td>
//                         <td className={segmentData[i]?.dii >= 0 ? styles.up : styles.dn}>{fmtCr(segmentData[i]?.dii ?? 0)}</td>
//                       </tr>
//                     ))}
//                   </tbody>
//                 </table>
//               </div>
//               <div className={styles.tableBox}>
//                 <div className={styles.panelTitle}>📉 Sector RSI + Zone Summary</div>
//                 <table className={styles.table}>
//                   <thead>
//                     <tr><th>Sector</th><th>Change%</th><th>Zone</th></tr>
//                   </thead>
//                   <tbody>
//                     {allSectors.map(s => (
//                       <tr key={s.id}>
//                         <td>{s.id}</td>
//                         <td className={s.changePct >= 0 ? styles.up : styles.dn}>
//                           {s.changePct > 0 ? "+" : ""}{s.changePct.toFixed(2)}%
//                         </td>
//                         <td>
//                           <span className={styles["zonePill_" + s.zone]}>
//                             {s.zone.toUpperCase()}
//                           </span>
//                         </td>
//                       </tr>
//                     ))}
//                   </tbody>
//                 </table>
//               </div>
//             </div>
//           </section>
//         </main>

//         {/* RIGHT */}
//         <aside className={styles.rightCol}>
//           <div className={styles.panelTitle}>📰 Smart Money Intelligence</div>
//           {filteredNews.map((n, i) => (
//             <div key={i} className={styles.newsItem}>
//               <div className={styles.newsTime}>{n.time} IST {n.sector ? "· " + n.sector : ""}</div>
//               <div className={styles.newsHead}>{n.head}</div>
//               <span className={`${styles.newsTag} ${styles["tag_" + n.tag]}`}>{n.tag.toUpperCase()}</span>
//             </div>
//           ))}

//           <div className={styles.panelTitle} style={{ marginTop: 16 }}>🎯 Signal Dashboard</div>
//           {allSectors.filter(s => s.zone !== "watch").map(s => {
//             const col = s.zone === "acc" ? "var(--green)" : "var(--red)";
//             const strength = Math.round(Math.abs(s.rsi - 50) / 10);
//             return (
//               <div key={s.id} className={styles.signalRow} style={{ borderLeftColor: col }}>
//                 <div className={styles.signalLabel}>{s.id} — {s.zone === "acc" ? "Accumulation" : "Distribution"}</div>
//                 <div className={styles.signalBars} style={{ color: col }}>
//                   {"█".repeat(Math.min(strength, 5))}{"░".repeat(Math.max(0, 5 - strength))}
//                 </div>
//               </div>
//             );
//           })}

//           <div className={styles.panelTitle} style={{ marginTop: 16 }}>📊 Total Flows Today</div>
//           <div className={styles.totalFlow}>
//             <div>
//               <div className={styles.flowLabel}>FII Net</div>
//               <div className={`${styles.flowVal} ${data && data.totalFiiNet >= 0 ? styles.up : styles.dn}`}>
//                 {data ? fmtCr(data.totalFiiNet) : "—"}
//               </div>
//             </div>
//             <div>
//               <div className={styles.flowLabel}>DII Net</div>
//               <div className={`${styles.flowVal} ${data && data.totalDiiNet >= 0 ? styles.up : styles.dn}`}>
//                 {data ? fmtCr(data.totalDiiNet) : "—"}
//               </div>
//             </div>
//           </div>
//         </aside>
//       </div>

//       {/* ── SECTOR DETAIL DRAWER ─────────────────────────────────────── */}
//       {detail && (
//         <div className={styles.detailOverlay} onClick={() => setDetail(null)}>
//           <div className={styles.detailPanel} onClick={e => e.stopPropagation()}>
//             <button className={styles.detailClose} onClick={() => setDetail(null)}>✕ CLOSE</button>
//             <div className={styles.detailTitle}>◈ {detail.id} — {detail.name}</div>
//             <div className={styles.detailMeta}>
//               <div>Price: ₹{detail.price.toLocaleString("en-IN")}</div>
//               <div>Change: <span className={detail.changePct >= 0 ? styles.up : styles.dn}>{detail.changePct > 0 ? "+" : ""}{detail.changePct.toFixed(2)}%</span></div>
//               <div>Zone: <span className={styles["zonePill_" + detail.zone]}>{detail.zone.toUpperCase()}</span></div>
//             </div>
//             <table className={styles.table} style={{ marginTop: 12 }}>
//               <tbody>
//                 <tr><td className={styles.muted}>FII Net Flow</td><td className={detail.fii >= 0 ? styles.up : styles.dn}>{fmtCr(detail.fii)}</td></tr>
//                 <tr><td className={styles.muted}>DII Net Flow</td><td className={detail.dii >= 0 ? styles.up : styles.dn}>{fmtCr(detail.dii)}</td></tr>
//                 <tr><td className={styles.muted}>Flow RSI (5D)</td><td>{detail.rsi}</td></tr>
//                 <tr><td className={styles.muted}>Market Cap Wt</td><td>{(detail.cap / allSectors.reduce((a, s) => a + s.cap, 0) * 100).toFixed(1)}%</td></tr>
//               </tbody>
//             </table>
//           </div>
//         </div>
//       )}

//       {/* ── STATUS BAR ──────────────────────────────────────────────── */}
//       <footer className={styles.statusbar}>
//         <span><span className={`${styles.dot} ${styles.dotGreen}`}/> {data?.isMarketOpen ? "MARKET OPEN" : "MARKET CLOSED"}</span>
//         <span><span className={`${styles.dot} ${styles.dotAmber}`}/> NSE PROVISIONAL · 7:00 PM IST DAILY</span>
//         <span>SOURCE: YAHOO FINANCE + PROXY MODEL v2.6</span>
//         {lastFetch && <span>REFRESHED: {lastFetch}</span>}
//         <span
//           className={styles.refreshBtn}
//           onClick={fetchData}
//           title="Force refresh data"
//         >⟳ REFRESH</span>
//       </footer>
//     </div>
//   );
// }


"use client";
// src/app/components/Terminal.tsx
// Full Bloomberg-style terminal UI — wired to /api/market-data

import { useState, useEffect, useRef, useCallback } from "react";
import type { MarketSnapshot, SectorData } from "../lib/fetcher";
import FlowChart from "./FlowChart";
import styles from "./Terminal.module.css";

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmt(v: number) { return (v > 0 ? "+" : "") + v.toLocaleString("en-IN"); }
function fmtCr(v: number) { return (v > 0 ? "+" : "-") + "₹" + Math.abs(v).toLocaleString("en-IN") + " Cr"; }
function heatClass(fii: number) {
  if (fii >  3000) return styles.heatStrongBuy;
  if (fii >  1000) return styles.heatBuy;
  if (fii >     0) return styles.heatMildBuy;
  if (fii > -1000) return styles.heatNeutral;
  if (fii > -2000) return styles.heatMildSell;
  if (fii > -4000) return styles.heatSell;
  return styles.heatStrongSell;
}

const SEGMENT_LABELS = [
  "Cash Market", "Futures (Net)", "Options (Call)", "Options (Put)", "Debt Market",
];

// ── News generator from live sector data ─────────────────────────────────────
function generateNews(sectors: SectorData[], totalFii: number, totalDii: number) {
  const news = [];
  const topSell = [...sectors].sort((a, b) => a.fii - b.fii)[0];
  const topBuy  = [...sectors].sort((a, b) => b.fii - a.fii)[0];
  const now = new Date();
  const istH = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Kolkata" })).getHours();
  const istM = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Kolkata" })).getMinutes();
  const ts = (h: number, m: number) => `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;

  if (totalFii < 0) news.push({ time: ts(istH, istM), head: `FIIs net sellers today — ${fmtCr(totalFii)} across equity segments.`, tag: "sell", sector: null });
  else news.push({ time: ts(istH, istM), head: `FIIs net buyers — ${fmtCr(totalFii)} inflow across equity segments.`, tag: "buy", sector: null });

  news.push({ time: ts(istH - 1, istM), head: `DIIs absorb flow — ${fmtCr(totalDii)} net ${totalDii > 0 ? "buying" : "selling"} on day.`, tag: totalDii > 0 ? "buy" : "sell", sector: null });

  if (topSell) news.push({ time: ts(istH - 1, 30), head: `${topSell.name}: Heavy distribution detected — ${fmtCr(topSell.fii)} FII outflow. RSI: ${topSell.rsi}.`, tag: "sell", sector: topSell.id });
  if (topBuy)  news.push({ time: ts(istH - 2, 15), head: `${topBuy.name}: Smart money accumulation — ${fmtCr(topBuy.fii)} FII inflow. Zone: ${topBuy.zone.toUpperCase()}.`, tag: "buy", sector: topBuy.id });

  const accSectors = sectors.filter(s => s.zone === "acc");
  if (accSectors.length > 0) news.push({ time: ts(istH - 2, 45), head: `Rotation signal: ${accSectors.map(s => s.id).join(", ")} in accumulation zone (RSI ≥ 65).`, tag: "buy", sector: null });

  const distSectors = sectors.filter(s => s.zone === "dist");
  if (distSectors.length > 0) news.push({ time: ts(istH - 3, 10), head: `Distribution alert: ${distSectors.map(s => s.id).join(", ")} showing sustained FII exit.`, tag: "sell", sector: null });

  return news;
}

// ── Props ─────────────────────────────────────────────────────────────────────
interface Props { initialData: MarketSnapshot | null; }

// ── Component ─────────────────────────────────────────────────────────────────
export default function Terminal({ initialData }: Props) {
  const [data, setData]           = useState<MarketSnapshot | null>(initialData);
  const [loading, setLoading]     = useState(!initialData);
  const [lastFetch, setLastFetch] = useState<string>("");
  const [filter, setFilter]       = useState<string | null>(null);
  const [cmdVal, setCmdVal]       = useState("");
  const [cmdMsg, setCmdMsg]       = useState("");
  const [cmdVisible, setCmdVisible] = useState(false);
  const [detail, setDetail]       = useState<SectorData | null>(null);
  const [clock, setClock]         = useState("");
  const cmdTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);


  // ── Clock ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    const tick = () => {
      const ist = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));
      setClock(ist.toTimeString().slice(0, 8) + " IST");
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  // ── Data polling ──────────────────────────────────────────────────────────
  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/api/market-data");
      if (!res.ok) return;
      const json: MarketSnapshot = await res.json();
      setData(json);
      setLastFetch(new Date().toLocaleTimeString("en-IN", { timeZone: "Asia/Kolkata" }) + " IST");
    } catch {
      // keep showing last good data
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!initialData) fetchData();
    // Poll every 5 minutes during market hours, every 30 min otherwise
    const interval = data?.isMarketOpen ? 5 * 60_000 : 30 * 60_000;
    const id = setInterval(fetchData, interval);
    return () => clearInterval(id);
  }, [fetchData, initialData, data?.isMarketOpen]);

  // ── Command handler ───────────────────────────────────────────────────────
  const showCmd = (msg: string) => {
    setCmdMsg(msg); setCmdVisible(true);
    clearTimeout(cmdTimer.current);
    cmdTimer.current = setTimeout(() => setCmdVisible(false), 3500);
  };

  const handleCmd = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== "Enter") return;
    const cmd = cmdVal.trim().toUpperCase();
    setCmdVal("");
    if (!data) return;

    if (cmd === "ALL" || cmd === "RESET") {
      setFilter(null); showCmd("↩ Showing all sectors");
    } else if (cmd === "REFRESH") {
      fetchData(); showCmd("⟳ Refreshing data from Yahoo Finance...");
    } else if (cmd === "HELP") {
      showCmd("Commands: " + data.sectors.map(s => s.id).join(" · ") + " · ALL · RESET · REFRESH");
    } else {
      const match = data.sectors.find(s => s.id === cmd);
      if (match) {
        setFilter(cmd);
        showCmd(`▶ ${match.name} — FII: ${fmtCr(match.fii)} · RSI: ${match.rsi} · Zone: ${match.zone.toUpperCase()}`);
      } else {
        showCmd(`⚠ Unknown: "${cmd}" — type HELP for commands`);
      }
    }
  };

  // ── Derived data ──────────────────────────────────────────────────────────
  const sectors = data ? (filter ? data.sectors.filter(s => s.id === filter) : data.sectors) : [];
  const allSectors = data?.sectors ?? [];
  const news = data ? generateNews(allSectors, data.totalFiiNet, data.totalDiiNet) : [];
  const filteredNews = filter ? news.filter(n => !n.sector || n.sector === filter) : news;

  const sorted = [...allSectors].sort((a, b) => b.fii - a.fii);
  const topAcc  = sorted.slice(0, 3);
  const topDist = sorted.slice(-3).reverse();

  // Fake segment breakdown scaled from total flow
  const segmentData = data ? [
    { fii: data.totalFiiNet,                      dii: data.totalDiiNet },
    { fii: Math.round(data.totalFiiNet * -0.42),  dii: Math.round(data.totalDiiNet * 0.21) },
    { fii: Math.round(Math.abs(data.totalFiiNet) * 1.6),  dii: Math.round(Math.abs(data.totalDiiNet) * 0.74) },
    { fii: Math.round(Math.abs(data.totalFiiNet) * 1.21), dii: Math.round(Math.abs(data.totalDiiNet) * 0.54) },
    { fii: Math.round(data.totalFiiNet * 0.22),   dii: Math.round(data.totalDiiNet * 0.16) },
  ] : [];

  // Ticker tape items
  const tickerItems = data
    ? [
        ...data.broad.map(b => ({ sym: b.symbol, val: b.price.toLocaleString("en-IN"), chg: (b.changePct > 0 ? "+" : "") + b.changePct.toFixed(2) + "%", up: b.changePct >= 0 })),
        { sym: "FII NET", val: fmtCr(data.totalFiiNet), chg: data.totalFiiNet >= 0 ? "BUY" : "SELL", up: data.totalFiiNet >= 0 },
        { sym: "DII NET", val: fmtCr(data.totalDiiNet), chg: data.totalDiiNet >= 0 ? "BUY" : "SELL", up: data.totalDiiNet >= 0 },
      ]
    : [];

  // ── Render ────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className={styles.loadingScreen}>
        <div className={styles.loadingInner}>
          <div className={styles.loadingLogo}>◈ NSE TERMINAL</div>
          <div className={styles.loadingMsg}>Connecting to Yahoo Finance · Fetching sector data...</div>
          <div className={styles.loadingBar}><div className={styles.loadingFill}/></div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.root}>

      {/* ── TOP BAR ─────────────────────────────────────────────────── */}
      <header className={styles.topbar}>
        <div className={styles.logo}>
          <span className={styles.logoMark}>◈ NSE TERMINAL</span>
          <span className={styles.logoSub}>FII/DII SECTOR ROTATION · LIVE</span>
        </div>
        <input
          className={styles.cmdInput}
          type="text"
          value={cmdVal}
          onChange={e => setCmdVal(e.target.value)}
          onKeyDown={handleCmd}
          placeholder="⌨  BANK <ENTER> — sector filter..."
          maxLength={20}
        />
        <div className={styles.tickerWrap}>
          <div className={styles.tickerInner}>
            {[...tickerItems, ...tickerItems].map((t, i) => (
              <span key={i} className={styles.tickItem}>
                {t.sym} <span className={t.up ? styles.up : styles.dn}>{t.val} {t.chg}</span>
              </span>
            ))}
          </div>
        </div>
        <span className={styles.clock}>{clock}</span>
        {data?.isMarketOpen && <span className={styles.liveTag}>● LIVE</span>}
      </header>

      {/* ── CMD OUTPUT ──────────────────────────────────────────────── */}
      {cmdVisible && <div className={styles.cmdOut}>{cmdMsg}</div>}

      {/* ── MAIN GRID ───────────────────────────────────────────────── */}
      <div className={styles.main}>

        {/* LEFT */}
        <aside className={styles.leftCol}>
          <div className={styles.panelTitle}>⚡ FII vs DII — Today</div>
          {sectors.slice(0, 6).map(s => {
            const total = Math.abs(s.fii) + Math.abs(s.dii) || 1;
            const fPct  = (Math.abs(s.fii) / total * 100).toFixed(0);
            const dPct  = (Math.abs(s.dii) / total * 100).toFixed(0);
            return (
              <div key={s.id} className={styles.tugBlock}>
                <div className={styles.tugHeader}>
                  <span className={styles.tugId}>{s.id}</span>
                  <span className={styles.tugName}>{s.name}</span>
                </div>
                <div className={styles.tugRow}>
                  <span className={styles.tugLabel} style={{ color: "var(--red)" }}>FII</span>
                  <div className={styles.tugBarWrap}>
                    <div className={styles.tugFii} style={{ width: fPct + "%", background: s.fii < 0 ? "var(--red)" : "var(--green)" }}/>
                  </div>
                  <span className={styles.tugVal} style={{ color: s.fii < 0 ? "var(--red)" : "var(--green)" }}>
                    ₹{(Math.abs(s.fii) / 100).toFixed(1)}B
                  </span>
                </div>
                <div className={styles.tugRow}>
                  <span className={styles.tugLabel} style={{ color: "var(--green)" }}>DII</span>
                  <div className={styles.tugBarWrap}>
                    <div className={styles.tugDii} style={{ width: dPct + "%" }}/>
                  </div>
                  <span className={styles.tugVal} style={{ color: "var(--green)" }}>
                    ₹{(Math.abs(s.dii) / 100).toFixed(1)}B
                  </span>
                </div>
              </div>
            );
          })}

          <div className={styles.panelTitle} style={{ marginTop: 16 }}>📊 Flow RSI (5-Day)</div>
          {sectors.map(s => {
            const col = s.rsi >= 65 ? "var(--green)" : s.rsi <= 35 ? "var(--red)" : "var(--amber)";
            return (
              <div key={s.id} className={styles.rsiRow}>
                <span className={styles.rsiLabel}>{s.id}</span>
                <div className={styles.rsiBarWrap}>
                  <div className={styles.rsiFill} style={{ width: s.rsi + "%", background: col }}/>
                </div>
                <span className={styles.rsiVal} style={{ color: col }}>{s.rsi}</span>
              </div>
            );
          })}

          <div className={styles.panelTitle} style={{ marginTop: 16 }}>🔺 Top Accumulation</div>
          {topAcc.map(s => (
            <div key={s.id} className={styles.miniRow}>
              <span>{s.id}</span>
              <span className={styles.up}>{fmtCr(s.fii)}</span>
            </div>
          ))}

          <div className={styles.panelTitle} style={{ marginTop: 12 }}>🔻 Top Distribution</div>
          {topDist.map(s => (
            <div key={s.id} className={styles.miniRow}>
              <span>{s.id}</span>
              <span className={styles.dn}>{fmtCr(s.fii)}</span>
            </div>
          ))}
        </aside>

        {/* CENTER */}
        <main className={styles.center}>

          {/* Heatmap */}
          <section className={styles.heatmapPanel}>
            <div className={styles.heatmapHeader}>
              <span className={styles.panelTitleInline}>🌡 SECTOR ROTATION HEATMAP</span>
              <span className={styles.dateLabel}>{data?.date} · LIVE</span>
            </div>
            <div className={styles.heatmap} style={{ gridTemplateColumns: `repeat(${Math.min(sectors.length, 5)}, 1fr)` }}>
              {sectors.map(s => (
                <div
                  key={s.id}
                  className={`${styles.heatCell} ${heatClass(s.fii)}`}
                  onClick={() => setDetail(s)}
                  title={s.name}
                >
                  <span className={`${styles.zoneBadge} ${styles["zone_" + s.zone]}`}>
                    {s.zone === "acc" ? "ACCUM" : s.zone === "dist" ? "DISTR" : "WATCH"}
                  </span>
                  <span className={styles.heatId}>{s.id}</span>
                  <span className={styles.heatChgPct} style={{ color: s.changePct >= 0 ? "var(--green)" : "var(--red)" }}>
                    {s.changePct >= 0 ? "▲" : "▼"} {Math.abs(s.changePct).toFixed(2)}%
                  </span>
                  <span className={styles.heatFlow} style={{ color: s.fii >= 0 ? "var(--green)" : "var(--red)" }}>
                    {fmt(s.fii)} Cr
                  </span>
                </div>
              ))}
            </div>
            <div className={styles.heatLegend}>
              <span><span className={styles.dot} style={{ background: "#047857" }}/> Strong buy</span>
              <span><span className={styles.dot} style={{ background: "#1a1a2e" }}/> Neutral</span>
              <span><span className={styles.dot} style={{ background: "#991b1b" }}/> Strong sell</span>
              <span className={styles.legendRight}>Box color = FII net flow proxy · Click for detail</span>
            </div>
          </section>

          {/* Flow chart */}
          <section className={styles.chartPanel}>
            <div className={styles.panelTitle}>📈 Net Institutional Flow — 15-Day Rolling (₹ Cr)</div>
            {data && <FlowChart history={data.flowHistory} />}
          </section>

          {/* Bottom tables */}
          <section className={styles.bottomPanel}>
            <div className={styles.tableGrid}>
              <div className={styles.tableBox}>
                <div className={styles.panelTitle}>🏦 FII Activity — Segment Breakdown</div>
                <table className={styles.table}>
                  <thead>
                    <tr><th>Segment</th><th className={styles.dn}>FII</th><th className={styles.up}>DII</th></tr>
                  </thead>
                  <tbody>
                    {SEGMENT_LABELS.map((lbl, i) => (
                      <tr key={lbl}>
                        <td className={styles.muted}>{lbl}</td>
                        <td className={segmentData[i]?.fii >= 0 ? styles.up : styles.dn}>{fmtCr(segmentData[i]?.fii ?? 0)}</td>
                        <td className={segmentData[i]?.dii >= 0 ? styles.up : styles.dn}>{fmtCr(segmentData[i]?.dii ?? 0)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className={styles.tableBox}>
                <div className={styles.panelTitle}>📉 Sector RSI + Zone Summary</div>
                <table className={styles.table}>
                  <thead>
                    <tr><th>Sector</th><th>Change%</th><th>Zone</th></tr>
                  </thead>
                  <tbody>
                    {allSectors.map(s => (
                      <tr key={s.id}>
                        <td>{s.id}</td>
                        <td className={s.changePct >= 0 ? styles.up : styles.dn}>
                          {s.changePct > 0 ? "+" : ""}{s.changePct.toFixed(2)}%
                        </td>
                        <td>
                          <span className={styles["zonePill_" + s.zone]}>
                            {s.zone.toUpperCase()}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        </main>

        {/* RIGHT */}
        <aside className={styles.rightCol}>
          <div className={styles.panelTitle}>📰 Smart Money Intelligence</div>
          {filteredNews.map((n, i) => (
            <div key={i} className={styles.newsItem}>
              <div className={styles.newsTime}>{n.time} IST {n.sector ? "· " + n.sector : ""}</div>
              <div className={styles.newsHead}>{n.head}</div>
              <span className={`${styles.newsTag} ${styles["tag_" + n.tag]}`}>{n.tag.toUpperCase()}</span>
            </div>
          ))}

          <div className={styles.panelTitle} style={{ marginTop: 16 }}>🎯 Signal Dashboard</div>
          {allSectors.filter(s => s.zone !== "watch").map(s => {
            const col = s.zone === "acc" ? "var(--green)" : "var(--red)";
            const strength = Math.round(Math.abs(s.rsi - 50) / 10);
            return (
              <div key={s.id} className={styles.signalRow} style={{ borderLeftColor: col }}>
                <div className={styles.signalLabel}>{s.id} — {s.zone === "acc" ? "Accumulation" : "Distribution"}</div>
                <div className={styles.signalBars} style={{ color: col }}>
                  {"█".repeat(Math.min(strength, 5))}{"░".repeat(Math.max(0, 5 - strength))}
                </div>
              </div>
            );
          })}

          <div className={styles.panelTitle} style={{ marginTop: 16 }}>📊 Total Flows Today</div>
          <div className={styles.totalFlow}>
            <div>
              <div className={styles.flowLabel}>FII Net</div>
              <div className={`${styles.flowVal} ${data && data.totalFiiNet >= 0 ? styles.up : styles.dn}`}>
                {data ? fmtCr(data.totalFiiNet) : "—"}
              </div>
            </div>
            <div>
              <div className={styles.flowLabel}>DII Net</div>
              <div className={`${styles.flowVal} ${data && data.totalDiiNet >= 0 ? styles.up : styles.dn}`}>
                {data ? fmtCr(data.totalDiiNet) : "—"}
              </div>
            </div>
          </div>
        </aside>
      </div>

      {/* ── SECTOR DETAIL DRAWER ─────────────────────────────────────── */}
      {detail && (
        <div className={styles.detailOverlay} onClick={() => setDetail(null)}>
          <div className={styles.detailPanel} onClick={e => e.stopPropagation()}>
            <button className={styles.detailClose} onClick={() => setDetail(null)}>✕ CLOSE</button>
            <div className={styles.detailTitle}>◈ {detail.id} — {detail.name}</div>
            <div className={styles.detailMeta}>
              <div>Price: ₹{detail.price.toLocaleString("en-IN")}</div>
              <div>Change: <span className={detail.changePct >= 0 ? styles.up : styles.dn}>{detail.changePct > 0 ? "+" : ""}{detail.changePct.toFixed(2)}%</span></div>
              <div>Zone: <span className={styles["zonePill_" + detail.zone]}>{detail.zone.toUpperCase()}</span></div>
            </div>
            <table className={styles.table} style={{ marginTop: 12 }}>
              <tbody>
                <tr><td className={styles.muted}>FII Net Flow</td><td className={detail.fii >= 0 ? styles.up : styles.dn}>{fmtCr(detail.fii)}</td></tr>
                <tr><td className={styles.muted}>DII Net Flow</td><td className={detail.dii >= 0 ? styles.up : styles.dn}>{fmtCr(detail.dii)}</td></tr>
                <tr><td className={styles.muted}>Flow RSI (5D)</td><td>{detail.rsi}</td></tr>
                <tr><td className={styles.muted}>Market Cap Wt</td><td>{(detail.cap / allSectors.reduce((a, s) => a + s.cap, 0) * 100).toFixed(1)}%</td></tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── STATUS BAR ──────────────────────────────────────────────── */}
      <footer className={styles.statusbar}>
        <span><span className={`${styles.dot} ${styles.dotGreen}`}/> {data?.isMarketOpen ? "MARKET OPEN" : "MARKET CLOSED"}</span>
        <span><span className={`${styles.dot} ${styles.dotAmber}`}/> NSE PROVISIONAL · 7:00 PM IST DAILY</span>
        <span>FII/DII: {data?.dataSource === "Sensibull-live" ? "✓ SENSIBULL LIVE (CASH)" : data?.dataSource === "NSE-live" ? "✓ NSE LIVE" : "⚠ UNAVAILABLE"} · PRICES: YAHOO FINANCE</span>
        {lastFetch && <span>REFRESHED: {lastFetch}</span>}
        <span
          className={styles.refreshBtn}
          onClick={fetchData}
          title="Force refresh data"
        >⟳ REFRESH</span>
      </footer>
    </div>
  );
}
