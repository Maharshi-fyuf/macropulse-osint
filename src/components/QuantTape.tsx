'use client';

import React from 'react';
import useSWR from 'swr';
import { type PredictionData } from '@/lib/types';

const fetcher = (url: string) => fetch(url).then((res) => {
  if (!res.ok) throw new Error(`HTTP Error ${res.status}`);
  return res.json().then(data => {
    if (data.error) throw new Error(data.error);
    return data;
  });
});

export default function QuantTape() {
  // Use pre-defined major indices for the tape
  const tickers = ['^NSEI', '^BSESN', 'GC=F'];
  
  // We'll mock the data for speed as firing 3x heavy serverless predicts on load is heavy
  // In a real app we'd fetch actual real-time prices or use the SWR endpoint if it was fast enough.
  // Using SWR to mock data or hit a lightweight endpoint.
  const { data, error } = useSWR('/api/market-movers', fetcher, { refreshInterval: 60000 });

  return (
    <div className="w-full h-8 bg-slate-950 border-b border-slate-800 flex items-center shrink-0">
      <div className="bg-slate-900 border-r border-slate-800 px-3 h-full flex items-center z-10 shadow-[5px_0_15px_-3px_rgba(0,0,0,0.5)]">
        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Q-TAPE</span>
      </div>
      <div className="flex-1 overflow-x-auto no-scrollbar flex items-center whitespace-nowrap pl-2 space-x-6">
        {tickers.map(t => {
          // Mock data mapping
          const drift = Math.random() > 0.5 ? 0.015 : -0.012;
          const price = t === '^NSEI' ? 22400.50 : t === '^BSESN' ? 73500.20 : 2350.10;
          const isUp = drift > 0;
          return (
            <div key={t} className="flex items-center gap-2 text-[10px] font-mono tracking-widest">
              <span className="font-bold text-slate-300">{t}</span>
              <span className="text-slate-100">{price.toFixed(2)}</span>
              <span className={`font-bold ${isUp ? 'text-emerald-400' : 'text-red-500'}`}>
                {isUp ? '▲' : '▼'} {Math.abs(drift * 100).toFixed(2)}%
              </span>
            </div>
          );
        })}
        {data && data.bullish?.slice(0,2).map((item: any) => (
            <div key={item.ticker} className="flex items-center gap-2 text-[10px] font-mono tracking-widest">
              <span className="font-bold text-slate-300">{item.ticker}</span>
              <span className="font-bold text-emerald-400">
                ▲ {(item.netSentimentScore).toFixed(2)} AI_SN
              </span>
            </div>
        ))}
      </div>
    </div>
  );
}
