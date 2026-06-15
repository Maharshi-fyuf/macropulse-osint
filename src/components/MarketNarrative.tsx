'use client';

import React from 'react';
import useSWR from 'swr';

const fetcher = (url: string) => fetch(url).then(res => {
  if (!res.ok) throw new Error('Not enough data to generate narrative');
  return res.json();
});

export default function MarketNarrative() {
  const { data, error, isLoading } = useSWR('/api/narrative', fetcher, { refreshInterval: 60000 });

  if (isLoading) {
    return (
      <div className="w-full border-b border-slate-800 bg-slate-900 p-4 shrink-0 shadow-lg animate-pulse">
        <h2 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">
          GENERATING NARRATIVE...
        </h2>
        <div className="h-4 bg-slate-800 w-3/4 rounded-sm mb-2" />
        <div className="h-4 bg-slate-800 w-full rounded-sm mb-4" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="w-full border-b border-slate-800 bg-slate-900 p-4 shrink-0 shadow-lg">
        <h2 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">
          MARKET NARRATIVE
        </h2>
        <p className="text-xs text-slate-500 font-mono italic">
          Not enough data to generate narrative
        </p>
      </div>
    );
  }

  return (
    <div className="w-full border-b border-slate-800 bg-slate-900 p-4 shrink-0 shadow-lg">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
          <span className="w-2 h-2 bg-red-500 rounded-sm animate-pulse" />
          {data.dominant_theme || 'MARKET NARRATIVE'}
        </h2>
      </div>
      
      <p className="text-sm text-slate-200 leading-snug font-mono mb-4 border-l-2 border-red-500 pl-3">
        {data.summary}
      </p>

      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5 border border-slate-800 bg-slate-950 p-2 rounded-sm">
          <span className="text-[9px] text-slate-500 uppercase tracking-widest font-bold">Most Impacted (Bullish)</span>
          <div className="flex flex-wrap gap-1.5">
            {data.bullish_assets?.map((asset: string, i: number) => (
              <span key={i} className="text-[10px] font-bold text-emerald-400">↑ {asset}</span>
            )) || <span className="text-[10px] text-slate-600">NONE DETECTED</span>}
          </div>
        </div>

        <div className="flex flex-col gap-1.5 border border-slate-800 bg-slate-950 p-2 rounded-sm">
          <span className="text-[9px] text-slate-500 uppercase tracking-widest font-bold">Most At Risk (Bearish)</span>
          <div className="flex flex-wrap gap-1.5">
            {data.bearish_assets?.map((asset: string, i: number) => (
              <span key={i} className="text-[10px] font-bold text-red-500">↓ {asset}</span>
            )) || <span className="text-[10px] text-slate-600">NONE DETECTED</span>}
          </div>
        </div>
      </div>
    </div>
  );
}
