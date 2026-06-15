'use client';

import React, { useState, useCallback } from 'react';
import { type PredictionData } from '@/lib/types';
import TerminalErrorBoundary from '@/components/TerminalErrorBoundary';

function Tooltip({ term, definition }: { term: string; definition: string }) {
  return (
    <div className="relative group inline-flex items-center gap-1 cursor-help">
      <span className="border-b border-dashed border-zinc-500 pb-0.5">{term}</span>
      <span className="inline-flex items-center justify-center w-3.5 h-3.5 rounded-full border border-zinc-600 text-[8px] text-zinc-400">?</span>
      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-3 bg-zinc-900 border border-zinc-700 rounded shadow-xl text-xs text-zinc-300 font-sans font-normal normal-case tracking-normal hidden group-hover:block z-50 pointer-events-none text-left">
        {definition}
      </div>
    </div>
  );
}

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
      const data = await res.json();
      if (data.error) {
        throw new Error(data.error);
      }
      setPrediction(data as PredictionData);
    } catch (err: unknown) {
      console.error('Prediction fetch error:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch prediction');
    } finally {
      setLoading(false);
    }
  }, [ticker, sentiment]);

  const fmt = (n: number, symbol: string) => {
    const isIndian = symbol.endsWith('.NS') || symbol.endsWith('.BO') || symbol === '^NSEI' || symbol === '^BSESN';
    const currencyPrefix = isIndian ? '₹' : '$';
    return `${currencyPrefix}${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const getVolatilityRisk = (vol: number) => {
    if (vol < 0.015) return { level: 'Low', color: 'bg-green-500/20 text-green-400 border-green-500/30', desc: 'Historically stable asset. Expect normal market fluctuations.' };
    if (vol < 0.03) return { level: 'Moderate', color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30', desc: 'Elevated historical price swings. Exercise caution.' };
    return { level: 'High Risk', color: 'bg-red-500/20 text-red-400 border-red-500/30', desc: 'High historical price swings detected. Expect sudden trend reversals.' };
  };

  const getDriftBias = (drift: number) => {
    if (drift > 0.001) return { dir: 'Bullish', desc: 'Upward momentum projected over the horizon.' };
    if (drift < -0.001) return { dir: 'Bearish', desc: 'Downward price pressure projected.' };
    return { dir: 'Neutral', desc: 'Sideways consolidation expected.' };
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
                  <label className="text-xs font-mono text-zinc-500 uppercase">
                    <Tooltip 
                      term="Sentiment Override" 
                      definition="A multiplier applied to the drift bias. Positive values artificially inflate projected momentum, while negative values simulate bear pressure based on AI intelligence feed."
                    />
                  </label>
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

            {error && (
              <div className="bg-red-950/20 border border-red-900/30 rounded p-4 mb-8">
                <span className="text-xs text-red-400 font-mono">{error}</span>
              </div>
            )}

            {prediction && !loading && (
              <div className="border border-cyan-900/40 rounded bg-[#09090b] shadow-xl animate-in fade-in zoom-in duration-300 overflow-hidden">
                <div className="bg-cyan-950/20 px-6 py-4 border-b border-cyan-900/40">
                  <h3 className="text-xs font-bold text-cyan-500 uppercase tracking-widest flex items-center gap-2">
                    <span className="w-2 h-2 bg-cyan-500 rounded-full animate-pulse inline-block" />
                    <Tooltip 
                      term="Geometric Brownian Motion" 
                      definition="A mathematical model used to forecast the future path of stock prices, assuming constant volatility and drift."
                    />
                    {' '}({prediction.horizon}-Day Forecast)
                  </h3>
                </div>

                <div className="p-6 font-mono space-y-6">
                  {/* Current Price */}
                  <div className="flex justify-between items-start border-b border-zinc-800/80 pb-4">
                    <div>
                      <span className="block text-xs text-zinc-500 uppercase tracking-wider mb-1">Current Price</span>
                      <span className="text-[10px] font-sans text-zinc-600 uppercase normal-case tracking-normal">The last recorded closing price.</span>
                    </div>
                    <span className="text-xl text-white font-bold tabular-nums">
                      {fmt(prediction.currentPrice, prediction.resolvedSymbol)}
                    </span>
                  </div>

                  {/* Volatility */}
                  <div className="flex justify-between items-start border-b border-zinc-800/80 pb-4">
                    <div className="max-w-[60%]">
                      <span className="block text-xs text-zinc-500 uppercase tracking-wider mb-1">
                        <Tooltip term="Volatility (1D σ)" definition="The standard deviation of daily returns over the historical lookback period. Higher volatility means wider confidence intervals." />
                      </span>
                      <span className="text-[10px] font-sans text-zinc-400 tracking-normal block leading-relaxed">
                        {getVolatilityRisk(prediction.volatility).desc}
                      </span>
                    </div>
                    <div className="flex flex-col items-end">
                      <span className="text-lg text-zinc-200 tabular-nums mb-1">
                        {(prediction.volatility * 100).toFixed(2)}%
                      </span>
                      <span className={`text-[10px] uppercase tracking-widest px-2 py-0.5 rounded border ${getVolatilityRisk(prediction.volatility).color}`}>
                        {getVolatilityRisk(prediction.volatility).level}
                      </span>
                    </div>
                  </div>

                  {/* Drift Bias */}
                  <div className="flex justify-between items-start border-b border-zinc-800/80 pb-4">
                    <div className="max-w-[60%]">
                      <span className="block text-xs text-zinc-500 uppercase tracking-wider mb-1">
                        <Tooltip term="Drift Bias" definition="The calculated deterministic trend in the asset's historical returns, augmented by the AI sentiment override." />
                      </span>
                      <span className="text-[10px] font-sans text-zinc-400 tracking-normal block leading-relaxed">
                        {getDriftBias(prediction.projectedDrift).desc}
                      </span>
                    </div>
                    <div className="flex flex-col items-end">
                      <span className={`text-lg font-bold tabular-nums mb-1 ${prediction.projectedDrift >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {prediction.projectedDrift >= 0 ? '▲' : '▼'} {(prediction.projectedDrift * 100).toFixed(3)}%
                      </span>
                      <span className={`text-[10px] uppercase tracking-widest px-2 py-0.5 rounded border ${prediction.projectedDrift >= 0 ? 'bg-green-500/20 border-green-500/30 text-green-400' : 'bg-red-500/20 border-red-500/30 text-red-400'}`}>
                        {getDriftBias(prediction.projectedDrift).dir}
                      </span>
                    </div>
                  </div>

                  {/* Range Projection */}
                  <div className="pt-2">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-sm text-red-400 font-mono tabular-nums shrink-0 font-bold bg-red-950/30 px-2 py-1 rounded">
                        ↓ {fmt(prediction.lowerBound, prediction.resolvedSymbol)}
                      </span>
                      <div className="flex-1 h-2 rounded-full bg-gradient-to-r from-red-500/40 via-zinc-700/60 to-cyan-500/40 shadow-inner" />
                      <span className="text-sm text-cyan-400 font-mono tabular-nums shrink-0 font-bold bg-cyan-950/30 px-2 py-1 rounded">
                        {fmt(prediction.upperBound, prediction.resolvedSymbol)} ↑
                      </span>
                    </div>

                    <p className="text-center text-[10px] text-zinc-500 uppercase tracking-widest mt-4">
                      68% confidence (<Tooltip term="1σ interval" definition="Statistically, there is roughly a 68% probability that the price will remain between these bounds." />)
                      <span className="block text-cyan-900/80 mt-2 font-bold">
                        Target System: {prediction.resolvedSymbol}
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
