'use client';

import React from 'react';
import useSWR from 'swr';

const fetcher = (url: string) => fetch(url).then((res) => {
  if (!res.ok) throw new Error(`HTTP Error ${res.status}`);
  return res.json().then(data => {
    if (data.error) throw new Error(data.error);
    return data;
  });
});

export default function QuantTape() {
  const { data: pricesData } = useSWR('/api/prices', fetcher, { refreshInterval: 60000 });
  const { data: moversData } = useSWR('/api/market-movers', fetcher, { refreshInterval: 60000 });

  return (
    <div className="w-full h-8 bg-slate-950 border-b border-slate-800 flex items-center shrink-0">
      <div className="bg-slate-900 border-r border-slate-800 px-3 h-full flex items-center z-10 shadow-[5px_0_15px_-3px_rgba(0,0,0,0.5)]">
        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Q-TAPE</span>
      </div>
      <div className="flex-1 overflow-x-auto no-scrollbar flex items-center whitespace-nowrap pl-2 space-x-6">
        {pricesData?.data?.map((t: { symbol: string; price: number; changePercent: number }) => {
          if (!t.price) return null;
          const isUp = t.changePercent > 0;
          return (
            <div key={t.symbol} className="flex items-center gap-2 text-[10px] font-mono tracking-widest">
              <span className="font-bold text-slate-300">{t.symbol}</span>
              <span className="text-slate-100">{t.price.toFixed(2)}</span>
              <span className={`font-bold ${isUp ? 'text-emerald-400' : 'text-red-500'}`}>
                {isUp ? '▲' : '▼'} {Math.abs(t.changePercent).toFixed(2)}%
              </span>
            </div>
          );
        })}
        {moversData?.bullish?.slice(0,2).map((item: { ticker: string; netSentimentScore: number }) => (
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
