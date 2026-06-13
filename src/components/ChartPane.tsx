'use client';

import React, { memo } from 'react';
import { MarketEvent } from './FeedItem';

interface ChartPaneProps {
  event: MarketEvent | null;
}

/**
 * Lazy-loaded TradingView widget.
 * We use next/dynamic here instead of a top-level import so the ~200KB
 * react-ts-tradingview-widgets bundle is code-split into its own chunk
 * and only loaded on the client after the shell has hydrated.
 */
import dynamic from 'next/dynamic';

const AdvancedRealTimeChart = dynamic(
  () => import('react-ts-tradingview-widgets').then((mod) => mod.AdvancedRealTimeChart),
  { ssr: false, loading: () => <ChartSkeleton /> }
);

/** Minimal loading skeleton that matches the terminal aesthetic. */
function ChartSkeleton() {
  return (
    <div className="h-full w-full bg-[#09090b] flex items-center justify-center">
      <div className="flex flex-col items-center gap-2">
        <div className="w-6 h-6 border-2 border-cyan-500/30 border-t-cyan-400 rounded-full animate-spin" />
        <span className="text-[10px] font-mono text-zinc-600 uppercase tracking-widest">
          Loading chart engine…
        </span>
      </div>
    </div>
  );
}

/**
 * Inner chart — memoized on `symbol` so TradingView doesn't remount
 * when unrelated parent state changes.
 */
const MemoizedChart = memo(function MemoizedChart({ symbol }: { symbol: string }) {
  return (
    <AdvancedRealTimeChart
      theme="dark"
      symbol={symbol}
      autosize
      hide_side_toolbar={false}
      allow_symbol_change={true}
      save_image={false}
      toolbar_bg="#09090b"
    />
  );
});

/**
 * ChartPane — memoized on the event reference.
 * The outer wrapper only re-renders when the selected event changes.
 */
const ChartPane = memo(function ChartPane({ event }: ChartPaneProps) {
  const symbol = event?.ticker ?? 'CME_MINI:ES1!';

  return (
    <div className="h-full w-full bg-[#09090b]">
      <MemoizedChart symbol={symbol} />
    </div>
  );
});

export default ChartPane;
