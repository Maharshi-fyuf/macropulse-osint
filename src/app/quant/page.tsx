'use client';

import React, { useState } from 'react';
import useSWR from 'swr';
import { type PredictionData } from '@/lib/types';
import TerminalErrorBoundary from '@/components/TerminalErrorBoundary';

const fetcher = (url: string) => fetch(url).then((res) => {
  if (!res.ok) throw new Error(`HTTP Error ${res.status}`);
  return res.json().then(data => {
    if (data.error) throw new Error(data.error);
    return data;
  });
});

export default function QuantPage() {
  const [ticker, setTicker] = useState('^NSEI');
  const [activeTicker, setActiveTicker] = useState('^NSEI');
  const [sentiment, setSentiment] = useState(0);
  const [activeSentiment, setActiveSentiment] = useState(0);

  const { data: prediction, error, isValidating } = useSWR<PredictionData>(
    activeTicker ? `/api/predict?symbol=${encodeURIComponent(activeTicker)}&sentimentScore=${activeSentiment}&days=5` : null,
    fetcher,
    { revalidateOnFocus: false, refreshInterval: 60000 } // background refetching every 60s
  );

  const handleRun = (e: React.FormEvent) => {
    e.preventDefault();
    if (ticker) {
      setActiveTicker(ticker.toUpperCase());
      setActiveSentiment(sentiment);
    }
  };

  const fmt = (n: number, symbol: string) => {
    const isIndian = symbol.endsWith('.NS') || symbol.endsWith('.BO') || symbol === '^NSEI' || symbol === '^BSESN';
    const currencyPrefix = isIndian ? '₹' : '$';
    return `${currencyPrefix}${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  return (
    <div className="h-full w-full bg-slate-950 flex flex-col font-mono text-xs leading-tight">
      <header className="h-10 border-b border-slate-800 bg-slate-900 flex items-center px-4 shrink-0 justify-between">
        <h1 className="font-bold tracking-widest text-slate-300 uppercase">
          Quant Engine (GBM)
        </h1>
        <div className="flex items-center gap-2">
           <span className="text-[10px] text-slate-500 uppercase tracking-widest">SWR Cache Active</span>
           {isValidating && <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-ping" />}
        </div>
      </header>

      <main className="flex-1 overflow-y-auto p-4 md:p-8 flex items-start justify-center">
        <TerminalErrorBoundary>
          <div className="w-full max-w-3xl border border-slate-800 bg-slate-900 rounded-sm p-0 shadow-2xl">
            
            <div className="p-4 border-b border-slate-800 bg-slate-950">
              <form onSubmit={handleRun} className="flex flex-col md:flex-row gap-4 items-end">
                <div className="flex-1 flex flex-col gap-1 w-full">
                  <label className="text-[10px] text-slate-500 uppercase tracking-widest">Target Ticker</label>
                  <input
                    type="text"
                    value={ticker}
                    onChange={(e) => setTicker(e.target.value.toUpperCase())}
                    placeholder="^NSEI"
                    className="bg-slate-950 border border-slate-800 rounded-sm px-2 py-1.5 text-slate-100 focus:outline-none focus:border-emerald-500/50 transition-colors uppercase w-full"
                  />
                </div>

                <div className="flex-1 flex flex-col gap-1 w-full">
                  <div className="flex justify-between items-center">
                    <label className="text-[10px] text-slate-500 uppercase tracking-widest">Sentiment Bias</label>
                    <span className={`text-[10px] font-bold ${sentiment > 0 ? 'text-emerald-400' : sentiment < 0 ? 'text-red-500' : 'text-slate-400'}`}>
                      {sentiment > 0 ? '+' : ''}{sentiment.toFixed(1)}
                    </span>
                  </div>
                  <input
                    type="range"
                    min="-1.0"
                    max="1.0"
                    step="0.1"
                    value={sentiment}
                    onChange={(e) => setSentiment(parseFloat(e.target.value))}
                    className="w-full accent-emerald-500"
                  />
                </div>

                <button
                  type="submit"
                  className="bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-100 font-bold uppercase tracking-widest px-4 py-1.5 rounded-sm transition-colors w-full md:w-auto"
                >
                  COMPUTE
                </button>
              </form>
            </div>

            {error && (
              <div className="p-4 bg-red-950/20 border-b border-red-900/30 text-red-500 uppercase tracking-widest text-[10px]">
                {error.message || 'Failed to compute predictions.'}
              </div>
            )}

            <div className="p-0">
              {(!prediction && isValidating) ? (
                // Skeleton Loader matching table layout
                <div className="w-full">
                  <table className="table-auto w-full text-left border-collapse">
                    <tbody>
                      {[...Array(5)].map((_, i) => (
                        <tr key={i} className="border-b border-slate-800/50">
                          <td className="p-3"><div className="h-3 w-32 bg-slate-800 animate-pulse rounded-sm" /></td>
                          <td className="p-3 flex justify-end"><div className="h-3 w-16 bg-slate-800 animate-pulse rounded-sm" /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : prediction ? (
                <table className="table-auto w-full text-left border-collapse whitespace-nowrap">
                  <thead>
                    <tr className="bg-slate-950 text-[9px] uppercase tracking-widest text-slate-500 border-b border-slate-800">
                      <th className="p-3 font-normal">Metric</th>
                      <th className="p-3 font-normal text-right">Value</th>
                      <th className="p-3 font-normal text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="text-slate-300">
                    <tr className="border-b border-slate-800/50 hover:bg-slate-800/50 transition-colors">
                      <td className="p-3 font-bold text-slate-100">Current Price</td>
                      <td className="p-3 text-right tabular-nums">{fmt(prediction.currentPrice, prediction.resolvedSymbol)}</td>
                      <td className="p-3 text-right text-slate-500 text-[10px]">LTP</td>
                    </tr>
                    <tr className="border-b border-slate-800/50 hover:bg-slate-800/50 transition-colors">
                      <td className="p-3 font-bold text-slate-100">Volatility (1D σ)</td>
                      <td className="p-3 text-right tabular-nums">{(prediction.volatility * 100).toFixed(2)}%</td>
                      <td className={`p-3 text-right uppercase text-[10px] tracking-widest ${prediction.volatility > 0.03 ? 'text-red-500' : 'text-emerald-400'}`}>
                        {prediction.volatility > 0.03 ? 'HIGH RISK' : 'NOMINAL'}
                      </td>
                    </tr>
                    <tr className="border-b border-slate-800/50 hover:bg-slate-800/50 transition-colors">
                      <td className="p-3 font-bold text-slate-100">Projected Drift</td>
                      <td className={`p-3 text-right tabular-nums ${prediction.projectedDrift >= 0 ? 'text-emerald-400' : 'text-red-500'}`}>
                        {prediction.projectedDrift > 0 ? '+' : ''}{(prediction.projectedDrift * 100).toFixed(3)}%
                      </td>
                      <td className={`p-3 text-right uppercase text-[10px] tracking-widest ${prediction.projectedDrift >= 0 ? 'text-emerald-400' : 'text-red-500'}`}>
                        {prediction.projectedDrift >= 0 ? 'BULL' : 'BEAR'}
                      </td>
                    </tr>
                    <tr className="border-b border-slate-800/50 hover:bg-slate-800/50 transition-colors">
                      <td className="p-3 font-bold text-slate-100">Lower Bound (1σ)</td>
                      <td className="p-3 text-right tabular-nums text-red-500">{fmt(prediction.lowerBound, prediction.resolvedSymbol)}</td>
                      <td className="p-3 text-right text-slate-500 text-[10px]">SUPPORT</td>
                    </tr>
                    <tr className="hover:bg-slate-800/50 transition-colors">
                      <td className="p-3 font-bold text-slate-100">Upper Bound (1σ)</td>
                      <td className="p-3 text-right tabular-nums text-emerald-400">{fmt(prediction.upperBound, prediction.resolvedSymbol)}</td>
                      <td className="p-3 text-right text-slate-500 text-[10px]">RESISTANCE</td>
                    </tr>
                  </tbody>
                </table>
              ) : (
                <div className="p-8 text-center text-[10px] text-slate-500 uppercase tracking-widest">
                  System Ready. Input ticker to begin.
                </div>
              )}
            </div>

          </div>
        </TerminalErrorBoundary>
      </main>
    </div>
  );
}
