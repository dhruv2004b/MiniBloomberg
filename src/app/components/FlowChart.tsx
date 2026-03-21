"use client";
// src/app/components/FlowChart.tsx
import { useEffect, useRef } from "react";
import type { FlowHistory } from "../lib/fetcher";

interface Props { history: FlowHistory[]; }

export default function FlowChart({ history }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartRef  = useRef<unknown>(null);

  useEffect(() => {
    if (!canvasRef.current || !history.length) return;

    // Dynamic import so Chart.js only loads client-side
    import("chart.js/auto").then((mod) => {
      const Chart = mod.default;

      // Destroy previous instance
      if (chartRef.current) {
        (chartRef.current as InstanceType<typeof Chart>).destroy();
      }

      chartRef.current = new Chart(canvasRef.current!, {
        type: "bar",
        data: {
          labels: history.map(h => h.date),
          datasets: [
            {
              label: "FII Net",
              data: history.map(h => h.fiiNet),
              backgroundColor: history.map(h => h.fiiNet >= 0 ? "rgba(34,197,94,0.7)" : "rgba(239,68,68,0.7)"),
              borderColor:     history.map(h => h.fiiNet >= 0 ? "#22c55e" : "#ef4444"),
              borderWidth: 1,
            },
            {
              label: "DII Net",
              data: history.map(h => h.diiNet),
              backgroundColor: history.map(h => h.diiNet >= 0 ? "rgba(20,184,166,0.5)" : "rgba(168,85,247,0.5)"),
              borderColor:     history.map(h => h.diiNet >= 0 ? "#14b8a6" : "#a855f7"),
              borderWidth: 1,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: {
              mode: "index",
              callbacks: {
                label: (ctx) => {
                  const v = ctx.parsed.y ?? 0;
                  return ` ${ctx.dataset.label}: ${v >= 0 ? "+" : ""}${v.toLocaleString("en-IN")} Cr`;
                },
              },
            },
          },
          scales: {
            x: {
              ticks: { color: "#7070a0", font: { size: 9, family: "Courier New" }, maxRotation: 45, autoSkip: false },
              grid:  { color: "#1e1e38" },
            },
            y: {
              ticks: {
                color: "#7070a0",
                font: { size: 9, family: "Courier New" },
                callback: (v) => {
                  const n = Number(v);
                  return (n >= 0 ? "+" : "") + (n / 1000).toFixed(1) + "K";
                },
              },
              grid: { color: "#1e1e38" },
            },
          },
        },
      });
    });

    return () => {
      if (chartRef.current) {
        (chartRef.current as { destroy: () => void }).destroy();
      }
    };
  }, [history]);

  return (
    <div style={{ position: "relative", height: 180 }}>
      <canvas ref={canvasRef} />
    </div>
  );
}
