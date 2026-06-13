'use client';

import React, { memo, useEffect, useRef, useState } from 'react';
import { createChart, IChartApi, ISeriesApi, CandlestickSeries } from 'lightweight-charts';
import { MarketEvent } from './FeedItem';

interface ChartPaneProps {
  event: MarketEvent | null;
}

/** Minimal loading skeleton that matches the terminal aesthetic. */
function ChartSkeleton({ text = "Loading chart engine…" }: { text?: string }) {
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
        <span className="text-xs text-zinc-500 mt-2">
          {message}
        </span>
      </div>
    </div>
  );
}

/**
 * Inner chart — memoized on `symbol` so it doesn't remount when parent updates
 * unnecessarily. Handles fetching data and rendering the canvas chart.
 */
const MemoizedChart = memo(function MemoizedChart({ symbol }: { symbol: string }) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch data and update chart
  useEffect(() => {
    let isMounted = true;
    const controller = new AbortController();

    async function fetchData() {
      try {
        setLoading(true);
        setError(null);
        
        const res = await fetch(`/api/finance?ticker=${encodeURIComponent(symbol)}`, {
          signal: controller.signal
        });
        
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || `HTTP error ${res.status}`);
        }
        
        const json = await res.json();
        
        if (!json.data || !Array.isArray(json.data) || json.data.length === 0) {
          throw new Error("No data returned for this symbol.");
        }

        if (isMounted && seriesRef.current) {
          seriesRef.current.setData(json.data);
          chartRef.current?.timeScale().fitContent();
          setLoading(false);
        }
      } catch (err: any) {
        if (err.name === 'AbortError') return;
        console.error("Error fetching chart data:", err);
        if (isMounted) {
          setError(err.message || "Failed to fetch data");
          setLoading(false);
        }
      }
    }

    // Give the chart a moment to initialize before fetching data
    const timeoutId = setTimeout(() => {
      fetchData();
    }, 50);

    return () => {
      isMounted = false;
      controller.abort();
      clearTimeout(timeoutId);
    };
  }, [symbol]);

  // Initialize chart instance
  useEffect(() => {
    if (!chartContainerRef.current) return;

    // Create chart
    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { color: '#09090b' }, // Dark background matching our theme
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
      crosshair: {
        mode: 0, // Normal crosshair
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

    // Add candlestick series
    const series = chart.addSeries(CandlestickSeries, {
      upColor: '#22c55e', // green-500
      downColor: '#ef4444', // red-500
      borderVisible: false,
      wickUpColor: '#22c55e',
      wickDownColor: '#ef4444',
    });
    
    seriesRef.current = series;

    // Handle resize
    const handleResize = () => {
      if (chartContainerRef.current) {
        chart.applyOptions({
          width: chartContainerRef.current.clientWidth,
          height: chartContainerRef.current.clientHeight,
        });
      }
    };

    window.addEventListener('resize', handleResize);
    
    // Initial size
    handleResize();

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
    };
  }, []); // Run once on mount

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

      {/* Chart container */}
      <div 
        ref={chartContainerRef} 
        className="w-full h-full"
        style={{ position: 'absolute', inset: 0 }}
      />
      
      {/* Symbol watermark overlay */}
      <div className="absolute top-4 left-4 pointer-events-none z-10 mix-blend-screen opacity-20 text-white font-mono font-bold text-4xl tracking-widest uppercase select-none">
        {symbol}
      </div>
    </div>
  );
});

/**
 * ChartPane — memoized on the event reference.
 * The outer wrapper only re-renders when the selected event changes.
 */
const ChartPane = memo(function ChartPane({ event }: ChartPaneProps) {
  const [customSymbol, setCustomSymbol] = useState('');
  const [inputValue, setInputValue] = useState('');

  // Reset custom symbol when a new event is selected
  useEffect(() => {
    setCustomSymbol('');
    setInputValue('');
  }, [event]);

  // If customSymbol is set, use it. Otherwise use event.ticker, or default to S&P 500
  const symbol = customSymbol || event?.ticker || '^GSPC';

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputValue.trim()) {
      setCustomSymbol(inputValue.trim().toUpperCase());
    }
  };

  return (
    <div className="h-full w-full bg-[#09090b] relative overflow-hidden">
      {/* Header bar for chart */}
      <div className="absolute top-0 left-0 right-0 h-10 border-b border-zinc-800 bg-zinc-900/50 z-20 flex items-center justify-between px-3">
        <div className="flex items-center">
          <span className="text-[10px] font-mono font-bold text-zinc-400 uppercase tracking-widest pointer-events-none">
            Native Chart 
          </span>
          <span className="ml-2 text-[10px] font-mono text-cyan-500 uppercase tracking-widest pointer-events-none">
            {symbol}
          </span>
        </div>
        
        {/* Symbol Search Form */}
        <form onSubmit={handleSearch} className="flex items-center gap-2">
          <input
            type="text"
            placeholder="Symbol (e.g. AAPL)"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            className="w-32 bg-[#18181b] border border-zinc-800 rounded px-2 py-1 text-[10px] font-mono text-white placeholder-zinc-500 focus:outline-none focus:border-cyan-500/50 transition-colors"
          />
          <button
            type="submit"
            className="px-2 py-1 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded text-[10px] font-mono font-bold text-zinc-300 uppercase transition-colors"
          >
            Load
          </button>
        </form>
      </div>
      
      {/* Main chart area (offset for header) */}
      <div className="absolute top-10 left-0 right-0 bottom-0">
        <MemoizedChart symbol={symbol} />
      </div>
    </div>
  );
});

export default ChartPane;
