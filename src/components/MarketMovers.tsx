'use client';

import React from 'react';
import useSWR from 'swr';
import { MarketEvent, formatTimeAgo } from '@/components/FeedItem';

interface MarketMoversProps {
  onSelectEvent: (event: MarketEvent) => void;
}

interface MoverEvent extends MarketEvent {
  netSentimentScore: number;
}

const fetcher = (url: string) => fetch(url).then(res => {
  if (!res.ok) throw new Error('Failed to fetch market movers');
  return res.json();
});

export default function MarketMovers({ onSelectEvent }: MarketMoversProps) {
  const { data, error, isLoading } = useSWR('/api/market-movers', fetcher, { refreshInterval: 5 * 60 * 1000 });

  const renderMoverList = (items: MoverEvent[], type: 'bullish' | 'bearish') => {
    if (items.length === 0) {
      return (
        <div className={`p-4 border-dashed border border-slate-800 rounded-sm flex items-center justify-center h-24 ${
          type === 'bullish' ? 'text-emerald-900/50' : 'text-red-900/50'
        }`}>
          <span className="text-[10px] font-mono uppercase tracking-widest">[ NO STRONG CATALYSTS DETECTED ]</span>
        </div>
      );
    }

    return (
      <div className="flex flex-col gap-2 font-mono text-xs">
        {items.map((item) => {
          const isIndian = item.ticker.endsWith('.NS') || item.ticker.endsWith('.BO') || item.ticker === '^NSEI' || item.ticker === '^BSESN';
          const isBullish = type === 'bullish';
          
          return (
            <div 
              key={item.id}
              onClick={() => onSelectEvent(item)}
              className={`group cursor-pointer border-b border-slate-800/50 p-3 transition-all hover:bg-slate-800/50`}
            >
              <div className="flex justify-between items-start mb-1">
                <span className={`text-xs font-bold tracking-widest uppercase ${isBullish ? 'text-emerald-400' : 'text-red-500'}`}>
                  {item.ticker || 'GLOBAL'}
                </span>
                <div className={`text-[10px] font-bold px-1.5 py-0.5 rounded-sm bg-slate-900 border border-slate-800 ${isBullish ? 'text-emerald-400' : 'text-red-500'}`}>
                  {isBullish ? '+' : ''}{item.netSentimentScore.toFixed(2)}
                </div>
              </div>
              
              <h4 className="text-xs text-slate-300 font-semibold leading-tight mb-2 group-hover:text-slate-100 transition-colors line-clamp-2">
                {item.title}
              </h4>
              
              <div className="flex items-center justify-between text-[9px] text-slate-500 uppercase tracking-widest">
                <span>{item.source}</span>
                <span>{formatTimeAgo(item.published_at)}</span>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="h-full w-full flex items-center justify-center p-8 bg-slate-950 font-mono text-xs">
        <span className="text-slate-500 uppercase tracking-widest animate-pulse">
          Scanning Intelligence Feed...
        </span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-full w-full flex items-center justify-center p-8 bg-slate-950 font-mono text-xs">
        <span className="text-red-500 uppercase tracking-widest">
          Failed to load market movers
        </span>
      </div>
    );
  }

  const bullish = data?.bullish || [];
  const bearish = data?.bearish || [];

  return (
    <div className="h-full w-full p-4 md:p-6 overflow-y-auto bg-slate-950 flex flex-col font-mono text-xs leading-tight text-slate-100">
      <div className="mb-6 border-b border-slate-800 pb-4">
        <h2 className="text-sm font-bold text-slate-100 mb-1 uppercase tracking-widest flex items-center gap-2">
          <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse inline-block" />
          Market Catalysts
        </h2>
        <p className="text-[10px] text-slate-500 uppercase tracking-widest">
          Top events ranked by AI sentiment
        </p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="flex flex-col">
          <h3 className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest mb-3 flex items-center gap-2 border-b border-slate-800 pb-2">
            ▲ Top Bullish
          </h3>
          {renderMoverList(bullish, 'bullish')}
        </div>

        <div className="flex flex-col">
          <h3 className="text-[10px] font-bold text-red-500 uppercase tracking-widest mb-3 flex items-center gap-2 border-b border-slate-800 pb-2">
            ▼ Top Bearish
          </h3>
          {renderMoverList(bearish, 'bearish')}
        </div>
      </div>
    </div>
  );
}
