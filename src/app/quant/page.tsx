'use client';

import React, { useState, useCallback } from 'react';
import { type PredictionData } from '@/lib/types';
import TerminalErrorBoundary from '@/components/TerminalErrorBoundary';

export default function QuantPage() {
  const [ticker, setTicker] = useState('^NSEI');
  const [sentiment, setSentiment] = useState(0);
  const [prediction, setPrediction] = useState<PredictionData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPrediction = useCallback(async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!ticker) return;

    setLoading(true);
    setError(null);
    setPrediction(null);

    try {
      const res = await fetch(
        `/api/predict?symbol=${encodeURIComponent(ticker)}&sentimentScore=${sentiment}&days=5`
      );
      if (!res.ok) {
        throw new Error(`HTTP Error ${res.status}`);
      }
      const data: PredictionData = await res.json();
      if ((data as any).error) {
        throw new Error((data as any).error);
      }
      setPrediction(data);
    } catch (err: any) {
      console.error('Prediction fetch error:', err);
      setError(err.message || 'Failed to fetch prediction');
    } finally {
      setLoading(false);
    }
  }, [ticker, sentiment]);

  const fmt = (n: number, symbol: string) => {
    const isIndian = symbol.endsWith('.NS') || symbol.endsWith('.BO') || symbol === '^NSEI' || symbol === '^BSESN';
    const currencyPrefix = isIndian ? '₹' : '$';
    return `${currencyPrefix}${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  return (
    <div className="h-full w-full bg-[#09090b] flex flex-col font-sans">
      <header className="h-14 border-b border-zinc-800 bg-[#09090b] flex items-center px-4 shrink-0">
        <h1 className="text-xl font-black tracking-tight text-white uppercase">
          Quant Engine (GBM)
        </h1>
      </header>

      <main className="flex-1 overflow-y-auto p-4 md:p-8 flex items-start justify-center">
        <TerminalErrorBoundary>
          <div className="w-full max-w-2xl bg-[#0d0d10] border border-zinc-800 rounded-lg p-6 shadow-2xl">
            <h2 className="text-sm font-bold text-zinc-400 uppercase tracking-widest mb-6">Simulation Parameters</h2>
            
            <form onSubmit={fetchPrediction} className="flex flex-col gap-6 mb-8">
              <div className="flex flex-col gap-2">
                <label className="text-xs font-mono text-zinc-500 uppercase">Target Ticker</label>
                <input
                  type="text"
                  value={ticker}
                  onChange={(e) => setTicker(e.target.value.toUpperCase())}
                  placeholder="e.g. ^NSEI or AAPL"
                  className="bg-[#18181b] border border-zinc-800 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500/50 transition-colors"
                />
              </div>

              <div className="flex flex-col gap-2">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-mono text-zinc-500 uppercase">Sentiment Override</label>
                  <span className={`text-xs font-mono font-bold ${sentiment > 0 ? 'text-green-400' : sentiment < 0 ? 'text-red-400' : 'text-zinc-400'}`}>
                    {sentiment.toFixed(2)}
                  </span>
                </div>
                <input
                  type="range"
                  min="-1.0"
                  max="1.0"
                  step="0.1"
                  value={sentiment}
                  onChange={(e) => setSentiment(parseFloat(e.target.value))}
                  className="w-full accent-cyan-500"
                />
                <div className="flex justify-between text-[10px] font-mono text-zinc-600 uppercase mt-1">
                  <span>Extreme Bearish (-1.0)</span>
                  <span>Neutral (0.0)</span>
                  <span>Extreme Bullish (+1.0)</span>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || !ticker}
                className="w-full bg-cyan-950/30 hover:bg-cyan-900/50 border border-cyan-900/50 text-cyan-400 font-bold uppercase tracking-widest text-xs py-3 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Computing Volatility Surface...' : 'Run Simulation'}
              </button>
            </form>

            {/* Error Display */}
            {error && (
              <div className="bg-red-950/20 border border-red-900/30 rounded p-4 mb-8">
                <span className="text-xs text-red-400 font-mono">{error}</span>
              </div>
            )}

            {/* GBM Readout */}
            {prediction && !loading && (
              <div className="border border-cyan-900/40 rounded bg-cyan-950/10 p-6 animate-in fade-in zoom-in duration-300">
                <h3 className="text-xs font-bold text-cyan-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                  <span className="w-2 h-2 bg-cyan-500 rounded-full animate-pulse inline-block" />
                  Quantitative Forecast (5-Day GBM)
                </h3>

                <div className="font-mono space-y-4">
                  <div className="flex justify-between items-baseline border-b border-zinc-800/50 pb-2">
                    <span className="text-xs text-zinc-500 uppercase tracking-wider">Current Price</span>
                    <span className="text-base text-white font-bold tabular-nums">
                      {fmt(prediction.currentPrice, prediction.resolvedSymbol)}
                    </span>
                  </div>

                  <div className="flex justify-between items-baseline border-b border-zinc-800/50 pb-2">
                    <span className="text-xs text-zinc-500 uppercase tracking-wider">Volatility (1D σ)</span>
                    <span className="text-sm text-zinc-300 tabular-nums">
                      {(prediction.volatility * 100).toFixed(2)}%
                    </span>
                  </div>

                  <div className="flex justify-between items-baseline border-b border-zinc-800/50 pb-2">
                    <span className="text-xs text-zinc-500 uppercase tracking-wider">Drift Bias</span>
                    <span className={`text-sm font-semibold tabular-nums ${prediction.projectedDrift >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {prediction.projectedDrift >= 0 ? '▲ BULLISH' : '▼ BEARISH'}
                      {' '}
                      <span className="text-[10px] font-normal opacity-80">
                        ({prediction.projectedDrift >= 0 ? '+' : ''}{(prediction.projectedDrift * 100).toFixed(3)}%/day)
                      </span>
                    </span>
                  </div>

                  <div className="pt-4">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-xs text-red-400 font-mono tabular-nums shrink-0 font-bold">
                        ↓ {fmt(prediction.lowerBound, prediction.resolvedSymbol)}
                      </span>
                      <div className="flex-1 h-1.5 rounded-full bg-gradient-to-r from-red-500/40 via-zinc-700/60 to-cyan-500/40" />
                      <span className="text-xs text-cyan-400 font-mono tabular-nums shrink-0 font-bold">
                        {fmt(prediction.upperBound, prediction.resolvedSymbol)} ↑
                      </span>
                    </div>

                    <p className="text-center text-[10px] text-zinc-600 uppercase tracking-widest mt-4">
                      68% confidence · 1σ interval · {prediction.horizon}-day horizon
                      <span className="block text-cyan-900/80 mt-1">
                        Resolved: {prediction.resolvedSymbol}
                      </span>
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </TerminalErrorBoundary>
      </main>
    </div>
  );
}
