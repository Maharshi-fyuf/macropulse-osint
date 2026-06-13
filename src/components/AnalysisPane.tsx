import React, { memo } from 'react';
import { MarketEvent, formatTimeAgo } from './FeedItem';
import { type PredictionData } from '@/lib/types';

interface AnalysisPaneProps {
  event: MarketEvent | null;
  prediction: PredictionData | null;
  predictionLoading: boolean;
}

/**
 * AnalysisPane — wrapped in React.memo.
 * Only re-renders when the selected event reference or prediction data changes.
 */
const AnalysisPane = memo(function AnalysisPane({
  event,
  prediction,
  predictionLoading,
}: AnalysisPaneProps) {
  if (!event) {
    return (
      <div className="h-full w-full flex items-center justify-center text-zinc-600 text-xs font-mono uppercase bg-[#09090b]">
        Select an event to view analysis
      </div>
    );
  }

  const hasBullish = event.bullish_assets && event.bullish_assets.length > 0;
  const hasBearish = event.bearish_assets && event.bearish_assets.length > 0;

  // Format a price with locale-aware thousands separator, max 2 decimal places
  const fmt = (n: number) =>
    n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <div className="h-full w-full p-6 overflow-y-auto flex flex-col bg-[#09090b]">
      {/* ── Event header ──────────────────────────────────────────────────── */}
      <div className="mb-4 pb-4 border-b border-zinc-800">
        <h2 className="text-xl font-bold text-white mb-2 leading-snug">{event.title}</h2>
        <div className="flex gap-4 text-xs font-mono text-zinc-500">
          <span>SOURCE: {event.source}</span>
          <span>TIME: {formatTimeAgo(event.published_at)}</span>
          <a href={event.url} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">
            [READ FULL]
          </a>
        </div>
      </div>

      <div className="flex-1 flex flex-col gap-6">
        {/* ── AI Rationale ───────────────────────────────────────────────── */}
        <div>
          <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">AI Rationale</h3>
          <p className="text-sm text-zinc-300 leading-relaxed">
            {event.rationale || 'No rationale provided.'}
          </p>
        </div>

        {/* ── Bullish / Bearish impact grids ─────────────────────────────── */}
        {(hasBullish || hasBearish) && (
          <div className="grid grid-cols-2 gap-4">
            {hasBullish && (
              <div className="bg-green-950/20 border border-green-900/30 rounded p-4">
                <span className="block text-[10px] font-bold text-green-500 mb-2 tracking-wider uppercase">
                  ▲ Bullish Impact
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {event.bullish_assets.map((asset, i) => {
                    const [ticker, ...reasoningParts] = asset.split(':');
                    const reasoning = reasoningParts.join(':').trim();
                    return (
                      <span key={i} className="bg-green-900/40 text-green-300 px-2 py-1 rounded-md text-xs font-semibold flex flex-col gap-1">
                        <span>{ticker.trim()}</span>
                        {reasoning && <span className="text-[9px] font-normal opacity-80 leading-snug">{reasoning}</span>}
                      </span>
                    );
                  })}
                </div>
              </div>
            )}
            {hasBearish && (
              <div className="bg-red-950/20 border border-red-900/30 rounded p-4">
                <span className="block text-[10px] font-bold text-red-500 mb-2 tracking-wider uppercase">
                  ▼ Bearish Impact
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {event.bearish_assets.map((asset, i) => {
                    const [ticker, ...reasoningParts] = asset.split(':');
                    const reasoning = reasoningParts.join(':').trim();
                    return (
                      <span key={i} className="bg-red-900/40 text-red-300 px-2 py-1 rounded-md text-xs font-semibold flex flex-col gap-1">
                        <span>{ticker.trim()}</span>
                        {reasoning && <span className="text-[9px] font-normal opacity-80 leading-snug">{reasoning}</span>}
                      </span>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Quantitative Forecast (GBM) ─────────────────────────────────── */}
        <div className="border border-cyan-900/40 rounded bg-cyan-950/10 p-4 shrink-0">
          <h3 className="text-[10px] font-bold text-cyan-500 uppercase tracking-widest mb-3 flex items-center gap-2">
            <span className="w-1.5 h-1.5 bg-cyan-500 rounded-full animate-pulse inline-block" />
            Quantitative Forecast (5-Day GBM)
          </h3>

          {predictionLoading ? (
            <div className="flex items-center gap-2 py-2">
              <div className="w-3 h-3 border border-cyan-500/30 border-t-cyan-400 rounded-full animate-spin shrink-0" />
              <span className="text-[10px] font-mono text-zinc-600 uppercase tracking-widest animate-pulse">
                Computing volatility surface…
              </span>
            </div>
          ) : prediction ? (
            <div className="font-mono space-y-2.5">
              {/* Current price */}
              <div className="flex justify-between items-baseline">
                <span className="text-[10px] text-zinc-500 uppercase tracking-wider">Current Price</span>
                <span className="text-sm text-white font-bold tabular-nums">{fmt(prediction.currentPrice)}</span>
              </div>

              {/* Volatility */}
              <div className="flex justify-between items-baseline">
                <span className="text-[10px] text-zinc-500 uppercase tracking-wider">Volatility (1D σ)</span>
                <span className="text-xs text-zinc-300 tabular-nums">
                  {(prediction.volatility * 100).toFixed(2)}%
                </span>
              </div>

              {/* Drift bias */}
              <div className="flex justify-between items-baseline">
                <span className="text-[10px] text-zinc-500 uppercase tracking-wider">Drift Bias</span>
                <span className={`text-xs font-semibold tabular-nums ${prediction.projectedDrift >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {prediction.projectedDrift >= 0 ? '▲ BULLISH' : '▼ BEARISH'}
                  {' '}
                  <span className="text-[10px] font-normal opacity-80">
                    ({prediction.projectedDrift >= 0 ? '+' : ''}{(prediction.projectedDrift * 100).toFixed(3)}%/day)
                  </span>
                </span>
              </div>

              {/* Divider */}
              <div className="border-t border-zinc-800/80 pt-2.5">
                {/* Target range bar */}
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="text-[10px] text-red-400 font-mono tabular-nums shrink-0">
                    ↓ {fmt(prediction.lowerBound)}
                  </span>
                  <div className="flex-1 h-px bg-gradient-to-r from-red-500/40 via-zinc-700/60 to-cyan-500/40" />
                  <span className="text-[10px] text-cyan-400 font-mono tabular-nums shrink-0">
                    {fmt(prediction.upperBound)} ↑
                  </span>
                </div>

                {/* Confidence label */}
                <p className="text-center text-[9px] text-zinc-600 uppercase tracking-widest leading-relaxed">
                  68% confidence · 1σ interval · {prediction.horizon}-day horizon
                  {prediction.resolvedSymbol !== event.ticker && (
                    <span className="block text-cyan-900/80 mt-0.5">
                      resolved: {prediction.resolvedSymbol}
                    </span>
                  )}
                </p>
              </div>
            </div>
          ) : (
            <p className="text-[10px] font-mono text-zinc-600 uppercase tracking-widest py-1">
              Forecast unavailable for this asset class.
            </p>
          )}
        </div>
      </div>
    </div>
  );
});

export default AnalysisPane;
