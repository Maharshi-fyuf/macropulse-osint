'use client';

import React, { memo, useEffect, useRef, useState } from 'react';
import {
  createChart,
  IChartApi,
  ISeriesApi,
  IPriceLine,
  CandlestickSeries,
  HistogramSeries,
  LineSeries,
  LineStyle,
} from 'lightweight-charts';
import { MarketEvent } from './FeedItem';
import { type PredictionData } from '@/lib/types';
import { useSearchParams } from 'next/navigation';

interface ChartPaneProps {
  event?: MarketEvent | null;
  prediction?: PredictionData | null;
}

/** Minimal loading skeleton that matches the terminal aesthetic. */
function ChartSkeleton({ text = 'Loading chart engine…' }: { text?: string }) {
  return (
    <div className="h-full w-full bg-[#09090b] flex items-center justify-center">
      <div className="flex flex-col items-center gap-2">
        <div className="w-6 h-6 border-2 border-cyan-500/30 border-t-cyan-400 rounded-full animate-spin" />
        <span className="text-[10px] font-mono text-zinc-600 uppercase tracking-widest">
          {text}
        </span>
      </div>
    </div>
  );
}

function ErrorDisplay({ message }: { message: string }) {
  return (
    <div className="h-full w-full bg-[#09090b] flex items-center justify-center">
      <div className="flex flex-col items-center gap-2 max-w-xs text-center p-4">
        <div className="w-6 h-6 text-red-500 mb-2">⚠</div>
        <span className="text-[10px] font-mono text-red-400 uppercase tracking-widest">
          Chart Failed to Load
        </span>
        <span className="text-xs text-zinc-500 mt-2">{message}</span>
        <span className="text-[9px] text-zinc-600 mt-2 font-mono">
          If this is a regional stock, try appending the exchange suffix (e.g. .NS or .L)
        </span>
      </div>
    </div>
  );
}

// ── Math Helpers ──────────────────────────────────────────────────────────────

function calculateSMA(data: any[], period: number) {
  const result = [];
  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      continue;
    }
    let sum = 0;
    for (let j = 0; j < period; j++) {
      sum += data[i - j].close;
    }
    result.push({ time: data[i].time, value: sum / period });
  }
  return result;
}

// ── Types ─────────────────────────────────────────────────────────────────────

interface MemoizedChartProps {
  symbol: string;
  prediction?: PredictionData | null;
  showSma20: boolean;
  showSma50: boolean;
  showVolume: boolean;
}

/**
 * Inner chart — memoized on `symbol` and `prediction` and toggles.
 * Handles fetching OHLC data, rendering the canvas, drawing SMAs/Volume and GBM PriceLines.
 */
const MemoizedChart = memo(function MemoizedChart({
  symbol,
  prediction,
  showSma20,
  showSma50,
  showVolume,
}: MemoizedChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const volumeSeriesRef = useRef<ISeriesApi<'Histogram'> | null>(null);
  const sma20SeriesRef = useRef<ISeriesApi<'Line'> | null>(null);
  const sma50SeriesRef = useRef<ISeriesApi<'Line'> | null>(null);

  // Keep a ref to the raw fetched data so we can toggle series without refetching
  const rawDataRef = useRef<any[]>([]);

  // Refs to the two GBM price lines so we can cleanly remove them on update
  const upperLineRef = useRef<IPriceLine | null>(null);
  const lowerLineRef = useRef<IPriceLine | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [resolvedTicker, setResolvedTicker] = useState(symbol);

  // Sync resolvedTicker with symbol prop if it changes externally
  useEffect(() => {
    setResolvedTicker(symbol);
  }, [symbol]);

  const isIndian = resolvedTicker.endsWith('.NS') || resolvedTicker.endsWith('.BO') || resolvedTicker === '^NSEI' || resolvedTicker === '^BSESN';
  const currencyPrefix = isIndian ? '₹' : '$';

  // ── Effect 1: Initialize chart instance (once on mount) ──────────────────
  useEffect(() => {
    if (!chartContainerRef.current) return;

    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { color: '#09090b' },
        textColor: '#a1a1aa', // zinc-400
      },
      grid: {
        vertLines: { color: '#27272a' }, // zinc-800
        horzLines: { color: '#27272a' },
      },
      timeScale: {
        borderColor: '#27272a',
        timeVisible: true,
      },
      rightPriceScale: {
        borderColor: '#27272a',
      },
      localization: {
        priceFormatter: (price: number) => {
          // Fallback to currency prefix format
          return `${currencyPrefix}${price.toFixed(2)}`;
        },
      },
      crosshair: {
        mode: 0,
        vertLine: {
          color: '#3f3f46',
          labelBackgroundColor: '#27272a',
        },
        horzLine: {
          color: '#3f3f46',
          labelBackgroundColor: '#27272a',
        },
      },
    });

    chartRef.current = chart;

    const series = chart.addSeries(CandlestickSeries, {
      upColor: '#22c55e',   // green-500
      downColor: '#ef4444', // red-500
      borderVisible: false,
      wickUpColor: '#22c55e',
      wickDownColor: '#ef4444',
    });
    seriesRef.current = series;

    // Volume Series
    const volumeSeries = chart.addSeries(HistogramSeries, {
      color: '#3f3f46', // Default color, will be overridden by data
      priceFormat: {
        type: 'volume',
      },
      priceScaleId: '', // Overlay on main chart area
    });
    // Scale volume to bottom 20% of the chart
    volumeSeries.priceScale().applyOptions({
      scaleMargins: {
        top: 0.8,
        bottom: 0,
      },
    });
    volumeSeriesRef.current = volumeSeries;

    // SMA Series
    const sma20Series = chart.addSeries(LineSeries, {
      color: '#c084fc', // purple-400
      lineWidth: 2,
      crosshairMarkerVisible: false,
      priceLineVisible: false,
      lastValueVisible: false,
    });
    sma20SeriesRef.current = sma20Series;

    const sma50Series = chart.addSeries(LineSeries, {
      color: '#fb923c', // orange-400
      lineWidth: 2,
      crosshairMarkerVisible: false,
      priceLineVisible: false,
      lastValueVisible: false,
    });
    sma50SeriesRef.current = sma50Series;

    const handleResize = () => {
      if (chartContainerRef.current) {
        chart.applyOptions({
          width: chartContainerRef.current.clientWidth,
          height: chartContainerRef.current.clientHeight,
        });
      }
    };

    window.addEventListener('resize', handleResize);
    handleResize();

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
      volumeSeriesRef.current = null;
      sma20SeriesRef.current = null;
      sma50SeriesRef.current = null;
      upperLineRef.current = null;
      lowerLineRef.current = null;
    };
  }, []); // Run only on mount

  // ── Effect 1.5: Update currency formatting dynamically ─────────────────────
  useEffect(() => {
    if (chartRef.current) {
      chartRef.current.applyOptions({
        localization: {
          priceFormatter: (price: number) => `${currencyPrefix}${price.toFixed(2)}`,
        },
      });
    }
  }, [currencyPrefix]);

  // ── Effect 2: Fetch and render OHLC data whenever symbol changes ─────────
  useEffect(() => {
    let isMounted = true;
    const controller = new AbortController();

    async function fetchData() {
      try {
        setLoading(true);
        setError(null);

        const res = await fetch(`/api/finance?ticker=${encodeURIComponent(symbol)}`, {
          signal: controller.signal,
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || `HTTP error ${res.status}`);
        }

        const json = await res.json();

        if (!json.data || !Array.isArray(json.data) || json.data.length === 0) {
          throw new Error('No data returned for this symbol.');
        }

        if (isMounted) {
          if (json.resolvedSymbol) {
            setResolvedTicker(json.resolvedSymbol);
          }
          if (seriesRef.current) {
            rawDataRef.current = json.data;
            seriesRef.current.setData(json.data);
            chartRef.current?.timeScale().fitContent();
            setLoading(false);
          }
        }
      } catch (err: any) {
        if (err.name === 'AbortError') return;
        console.error('Error fetching chart data:', err);
        if (isMounted) {
          setError(err.message || 'Failed to fetch data');
          setLoading(false);
        }
      }
    }

    // Give the chart a moment to initialize before fetching
    const timeoutId = setTimeout(fetchData, 50);

    return () => {
      isMounted = false;
      controller.abort();
      clearTimeout(timeoutId);
    };
  }, [symbol]);

  // ── Effect 3: Overlay GBM PriceLines whenever prediction or loading changes
  useEffect(() => {
    const series = seriesRef.current;
    if (!series) return;

    // Always remove stale lines first
    if (upperLineRef.current) {
      try { series.removePriceLine(upperLineRef.current); } catch { /* already removed */ }
      upperLineRef.current = null;
    }
    if (lowerLineRef.current) {
      try { series.removePriceLine(lowerLineRef.current); } catch { /* already removed */ }
      lowerLineRef.current = null;
    }

    // Only draw new lines once data has loaded and prediction is available
    if (loading || !prediction) return;

    upperLineRef.current = series.createPriceLine({
      price: prediction.upperBound,
      color: 'rgba(6, 182, 212, 0.75)',   // cyan-500
      lineWidth: 1,
      lineStyle: LineStyle.Dashed,
      axisLabelVisible: true,
      title: `↑ +1σ (${prediction.horizon}d)`,
    });

    lowerLineRef.current = series.createPriceLine({
      price: prediction.lowerBound,
      color: 'rgba(239, 68, 68, 0.75)',   // red-500
      lineWidth: 1,
      lineStyle: LineStyle.Dashed,
      axisLabelVisible: true,
      title: `↓ -1σ (${prediction.horizon}d)`,
    });
  }, [prediction, loading]);

  // ── Effect 4: Technical Indicators Toggle ─────────────────────────────────
  useEffect(() => {
    if (loading || rawDataRef.current.length === 0) return;

    if (showVolume && volumeSeriesRef.current) {
      // Color volume bars based on close vs open
      const volumeData = rawDataRef.current.map((d: any) => ({
        time: d.time,
        value: d.value, // value is volume
        color: d.close >= d.open ? 'rgba(34, 197, 94, 0.3)' : 'rgba(239, 68, 68, 0.3)', // green-500/30 or red-500/30
      }));
      volumeSeriesRef.current.setData(volumeData);
    } else if (volumeSeriesRef.current) {
      volumeSeriesRef.current.setData([]);
    }

    if (showSma20 && sma20SeriesRef.current) {
      sma20SeriesRef.current.setData(calculateSMA(rawDataRef.current, 20));
    } else if (sma20SeriesRef.current) {
      sma20SeriesRef.current.setData([]);
    }

    if (showSma50 && sma50SeriesRef.current) {
      sma50SeriesRef.current.setData(calculateSMA(rawDataRef.current, 50));
    } else if (sma50SeriesRef.current) {
      sma50SeriesRef.current.setData([]);
    }
  }, [showVolume, showSma20, showSma50, loading]);

  return (
    <div className="relative w-full h-full bg-[#09090b]">
      {loading && (
        <div className="absolute inset-0 z-10 bg-[#09090b]/80 backdrop-blur-sm">
          <ChartSkeleton text={`Loading ${symbol} data…`} />
        </div>
      )}

      {error && (
        <div className="absolute inset-0 z-20">
          <ErrorDisplay message={error} />
        </div>
      )}

      {/* Canvas container */}
      <div
        ref={chartContainerRef}
        className="w-full h-full"
        style={{ position: 'absolute', inset: 0 }}
      />

      {/* Symbol watermark overlay */}
      <div className="absolute top-4 left-4 pointer-events-none z-10 mix-blend-screen opacity-20 text-white font-mono font-bold text-4xl tracking-widest uppercase select-none">
        {symbol}
      </div>

      {/* GBM badge — shown only when prediction lines are active */}
      {!loading && prediction && (
        <div className="absolute bottom-2 right-2 pointer-events-none z-10 flex items-center gap-1.5 bg-[#09090b]/70 border border-cyan-900/40 rounded px-2 py-1">
          <span className="w-1.5 h-1.5 bg-cyan-500 rounded-full animate-pulse" />
          <span className="text-[9px] font-mono text-cyan-600 uppercase tracking-widest">
            GBM · 1σ · {prediction.horizon}d
          </span>
        </div>
      )}
    </div>
  );
});

/**
 * ChartPane — memoized on the event reference.
 * The outer wrapper only re-renders when the selected event or prediction changes.
 */
const ChartPane = memo(function ChartPane({ event, prediction }: ChartPaneProps) {
  const [customSymbol, setCustomSymbol] = useState('');
  const [inputValue, setInputValue] = useState('');

  // Toggles for technical indicators
  const [showSma20, setShowSma20] = useState(false);
  const [showSma50, setShowSma50] = useState(false);
  const [showVolume, setShowVolume] = useState(true);

  const searchParams = useSearchParams();
  const urlSymbol = searchParams?.get('symbol');

  // Reset custom symbol when a new event is selected, or set to url param
  useEffect(() => {
    if (urlSymbol) {
      setCustomSymbol(urlSymbol.toUpperCase());
      setInputValue(urlSymbol.toUpperCase());
    } else if (event) {
      setCustomSymbol('');
      setInputValue('');
    }
  }, [event, urlSymbol]);

  // If customSymbol is set, use it. Otherwise use event.ticker, or default to Nifty 50
  const symbol = customSymbol || event?.ticker || '^NSEI';

  // Only show prediction overlay when the chart is displaying the event's natural ticker
  // (not a user-overridden custom symbol) to prevent mismatched bounds.
  const activePrediction = customSymbol ? null : prediction;

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputValue.trim()) {
      setCustomSymbol(inputValue.trim().toUpperCase());
    }
  };

  return (
    <div className="h-full w-full bg-[#09090b] relative overflow-hidden flex flex-col">
      {/* Header bar */}
      <div className="h-10 border-b border-zinc-800 bg-zinc-900/50 z-20 flex items-center justify-between px-3 shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono font-bold text-zinc-400 uppercase tracking-widest pointer-events-none">
            Native Chart
          </span>
          <span className="text-[10px] font-mono text-cyan-500 uppercase tracking-widest pointer-events-none">
            {symbol}
          </span>
          {activePrediction && (
            <span className="text-[9px] font-mono text-cyan-700 uppercase tracking-widest pointer-events-none border border-cyan-900/50 rounded px-1 py-0.5">
              GBM active
            </span>
          )}
        </div>

        {/* Technical Indicators Toolbar */}
        <div className="flex items-center bg-[#09090b] border border-zinc-800 rounded px-1.5 py-0.5 ml-auto mr-4 hidden sm:flex">
          <span className="text-[9px] font-mono text-zinc-500 uppercase tracking-widest pr-2 mr-2 border-r border-zinc-800 pointer-events-none">
            Indicators
          </span>
          <div className="flex gap-1">
            <button
              onClick={() => setShowSma20(!showSma20)}
              className={`text-[9px] font-mono font-bold uppercase px-2 py-0.5 rounded transition-colors ${showSma20 ? 'bg-purple-900/40 text-purple-400' : 'text-zinc-500 hover:text-zinc-300'}`}
            >
              SMA 20
            </button>
            <button
              onClick={() => setShowSma50(!showSma50)}
              className={`text-[9px] font-mono font-bold uppercase px-2 py-0.5 rounded transition-colors ${showSma50 ? 'bg-orange-900/40 text-orange-400' : 'text-zinc-500 hover:text-zinc-300'}`}
            >
              SMA 50
            </button>
            <button
              onClick={() => setShowVolume(!showVolume)}
              className={`text-[9px] font-mono font-bold uppercase px-2 py-0.5 rounded transition-colors ${showVolume ? 'bg-zinc-700 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
            >
              VOL
            </button>
          </div>
        </div>

        {/* Symbol Search Form */}
        <form onSubmit={handleSearch} className="flex items-center gap-2">
          <input
            type="text"
            placeholder="Symbol (e.g. AAPL)"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            className="w-24 sm:w-32 bg-[#18181b] border border-zinc-800 rounded px-2 py-1 text-[10px] font-mono text-white placeholder-zinc-500 focus:outline-none focus:border-cyan-500/50 transition-colors"
          />
          <button
            type="submit"
            className="px-2 py-1 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded text-[10px] font-mono font-bold text-zinc-300 uppercase transition-colors"
          >
            Load
          </button>
        </form>
      </div>

      {/* Main chart area */}
      <div className="flex-1 relative">
        <MemoizedChart
          symbol={symbol}
          prediction={activePrediction}
          showSma20={showSma20}
          showSma50={showSma50}
          showVolume={showVolume}
        />
      </div>
    </div>
  );
});

export default ChartPane;
