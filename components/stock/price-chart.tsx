"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  createChart,
  ColorType,
  type IChartApi,
  type ISeriesApi,
  type Time,
} from "lightweight-charts";
import { useTheme } from "next-themes";
import { sma } from "@/lib/indicators";
import { cn } from "@/lib/utils";
import type { DailyBar } from "@/lib/stock/data";

const TIMEFRAMES = [
  { id: "1M",  label: "1M",  days: 22 },
  { id: "3M",  label: "3M",  days: 65 },
  { id: "6M",  label: "6M",  days: 130 },
  { id: "1Y",  label: "1Y",  days: 252 },
  { id: "5Y",  label: "5Y",  days: 1260 },
  { id: "ALL", label: "All", days: Number.POSITIVE_INFINITY },
] as const;

type TfId = (typeof TIMEFRAMES)[number]["id"];

const MA_COLORS = {
  ma20: "#06b6d4",   // cyan
  ma50: "#f59e0b",   // amber
  ma200: "#a855f7",  // violet
};

export function PriceChart({ bars }: { bars: DailyBar[] }) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candleRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const volumeRef = useRef<ISeriesApi<"Histogram"> | null>(null);
  const ma20Ref = useRef<ISeriesApi<"Line"> | null>(null);
  const ma50Ref = useRef<ISeriesApi<"Line"> | null>(null);
  const ma200Ref = useRef<ISeriesApi<"Line"> | null>(null);

  const [timeframe, setTimeframe] = useState<TfId>("1Y");
  const [showMa20, setShowMa20] = useState(true);
  const [showMa50, setShowMa50] = useState(true);
  const [showMa200, setShowMa200] = useState(false);

  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  const visibleBars = useMemo(() => {
    const tf = TIMEFRAMES.find((t) => t.id === timeframe)!;
    if (!Number.isFinite(tf.days)) return bars;
    return bars.slice(-tf.days);
  }, [bars, timeframe]);

  // Initialize chart once. Theme changes apply via a separate effect.
  useEffect(() => {
    if (!containerRef.current || chartRef.current) return;

    const chart = createChart(containerRef.current, {
      width: containerRef.current.clientWidth,
      height: 480,
      layout: {
        background: { type: ColorType.Solid, color: "transparent" },
        textColor: "#475569",
      },
      grid: {
        vertLines: { color: "#f1f5f9" },
        horzLines: { color: "#f1f5f9" },
      },
      rightPriceScale: { borderColor: "#e2e8f0" },
      timeScale: { borderColor: "#e2e8f0", timeVisible: false },
      crosshair: { mode: 1 },
    });

    candleRef.current = chart.addCandlestickSeries({
      upColor: "#10b981",
      downColor: "#ef4444",
      borderUpColor: "#10b981",
      borderDownColor: "#ef4444",
      wickUpColor: "#10b981",
      wickDownColor: "#ef4444",
    });

    volumeRef.current = chart.addHistogramSeries({
      priceFormat: { type: "volume" },
      priceScaleId: "vol",
    });
    chart.priceScale("vol").applyOptions({
      scaleMargins: { top: 0.8, bottom: 0 },
    });

    ma20Ref.current = chart.addLineSeries({
      color: MA_COLORS.ma20,
      lineWidth: 1,
      lastValueVisible: false,
      priceLineVisible: false,
    });
    ma50Ref.current = chart.addLineSeries({
      color: MA_COLORS.ma50,
      lineWidth: 1,
      lastValueVisible: false,
      priceLineVisible: false,
    });
    ma200Ref.current = chart.addLineSeries({
      color: MA_COLORS.ma200,
      lineWidth: 1,
      lastValueVisible: false,
      priceLineVisible: false,
    });

    chartRef.current = chart;

    const handleResize = () => {
      if (containerRef.current && chartRef.current) {
        chartRef.current.applyOptions({
          width: containerRef.current.clientWidth,
        });
      }
    };
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      chart.remove();
      chartRef.current = null;
      candleRef.current = null;
      volumeRef.current = null;
      ma20Ref.current = null;
      ma50Ref.current = null;
      ma200Ref.current = null;
    };
  }, []);

  // Apply theme.
  useEffect(() => {
    if (!chartRef.current) return;
    chartRef.current.applyOptions({
      layout: {
        background: { type: ColorType.Solid, color: "transparent" },
        textColor: isDark ? "#cbd5e1" : "#475569",
      },
      grid: {
        vertLines: { color: isDark ? "#1e293b" : "#f1f5f9" },
        horzLines: { color: isDark ? "#1e293b" : "#f1f5f9" },
      },
      rightPriceScale: { borderColor: isDark ? "#334155" : "#e2e8f0" },
      timeScale: { borderColor: isDark ? "#334155" : "#e2e8f0" },
    });
  }, [isDark]);

  // Push data into the series when timeframe / MA toggles change.
  useEffect(() => {
    if (!candleRef.current || !volumeRef.current) return;

    const candleData = visibleBars.map((b) => ({
      time: b.date as Time,
      open: b.open,
      high: b.high,
      low: b.low,
      close: b.close,
    }));
    const volumeData = visibleBars.map((b) => ({
      time: b.date as Time,
      value: b.volume,
      color: b.close >= b.open
        ? "rgba(16,185,129,0.45)"
        : "rgba(239,68,68,0.45)",
    }));

    candleRef.current.setData(candleData);
    volumeRef.current.setData(volumeData);

    const closes = visibleBars.map((b) => b.close);
    const sma20 = sma(closes, 20);
    const sma50 = sma(closes, 50);
    const sma200 = sma(closes, 200);

    const toLine = (vals: (number | null)[]) =>
      vals.flatMap((v, i) =>
        v === null ? [] : [{ time: visibleBars[i].date as Time, value: v }],
      );

    ma20Ref.current?.setData(showMa20 ? toLine(sma20) : []);
    ma50Ref.current?.setData(showMa50 ? toLine(sma50) : []);
    ma200Ref.current?.setData(showMa200 ? toLine(sma200) : []);

    chartRef.current?.timeScale().fitContent();
  }, [visibleBars, showMa20, showMa50, showMa200]);

  if (bars.length === 0) {
    return <NoChartFallback />;
  }

  return (
    <div className="border border-app">
      <div className="px-3 py-2 border-b border-app bg-slate-50 dark:bg-slate-900/50 flex flex-wrap items-center gap-2">
        <h3 className="font-bold text-[13px] uppercase tracking-wider">
          Price Chart
        </h3>
        <span className="text-[10px] font-mono text-muted">
          {visibleBars.length} daily bars
        </span>

        <div className="flex gap-1 text-[11px] font-mono ml-auto">
          {TIMEFRAMES.map((tf) => (
            <button
              key={tf.id}
              onClick={() => setTimeframe(tf.id)}
              className={cn(
                "px-2 py-0.5 border border-app rounded",
                timeframe === tf.id
                  ? "bg-slate-900 text-white border-slate-900 dark:bg-slate-100 dark:text-slate-900 dark:border-slate-100"
                  : "hover:bg-slate-100 dark:hover:bg-slate-800",
              )}
            >
              {tf.label}
            </button>
          ))}
        </div>

        <div className="flex gap-1 text-[11px] font-mono">
          <MaToggle label="20" color={MA_COLORS.ma20} active={showMa20} onClick={() => setShowMa20((v) => !v)} />
          <MaToggle label="50" color={MA_COLORS.ma50} active={showMa50} onClick={() => setShowMa50((v) => !v)} />
          <MaToggle label="200" color={MA_COLORS.ma200} active={showMa200} onClick={() => setShowMa200((v) => !v)} />
        </div>
      </div>
      <div ref={containerRef} className="w-full" />
    </div>
  );
}

function NoChartFallback() {
  return (
    <div className="border border-app">
      <div className="px-3 py-2 border-b border-app bg-slate-50 dark:bg-slate-900/50">
        <h3 className="font-bold text-[13px] uppercase tracking-wider">
          Price Chart
        </h3>
      </div>
      <div className="h-[480px] grid place-items-center px-6 text-center">
        <div className="max-w-md text-sm text-muted space-y-3">
          <p className="font-medium text-slate-700 dark:text-slate-200">
            No candle data available
          </p>
          <p className="text-xs">
            Finnhub's free tier doesn't include candles, so we use Twelve Data
            (when configured) or Yahoo Finance as a fallback. Yahoo can rate-limit
            an IP after heavy use — try again in a few minutes.
          </p>
          <p className="text-xs">
            For reliable inline charts, set{" "}
            <code className="font-mono text-[11px] px-1 py-0.5 rounded bg-slate-100 dark:bg-slate-800">
              TWELVE_DATA_API_KEY
            </code>{" "}
            in <code className="font-mono">.env.local</code> (free signup at{" "}
            <a
              href="https://twelvedata.com"
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-2 hover:text-slate-700 dark:hover:text-slate-200"
            >
              twelvedata.com
            </a>
            ).
          </p>
          <p className="text-xs">
            Or click{" "}
            <span className="underline underline-offset-2">Open in TradingView</span>{" "}
            above for the live chart now.
          </p>
        </div>
      </div>
    </div>
  );
}

function MaToggle({
  label,
  color,
  active,
  onClick,
}: {
  label: string;
  color: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1 px-2 py-0.5 border border-app rounded",
        active
          ? "bg-slate-100 dark:bg-slate-800"
          : "opacity-60 hover:opacity-100",
      )}
    >
      <span
        className="h-2 w-2 rounded-sm"
        style={{ backgroundColor: color, opacity: active ? 1 : 0.4 }}
      />
      <span style={{ color: active ? color : undefined }}>MA{label}</span>
    </button>
  );
}
