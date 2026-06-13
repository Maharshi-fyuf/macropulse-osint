'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { MarketEvent, formatTimeAgo } from '@/components/FeedItem';

interface MarketMoversProps {
  onSelectEvent: (event: MarketEvent) => void;
}

interface MoverEvent extends MarketEvent {
  netSentimentScore: number;
}

export default function MarketMovers({ onSelectEvent }: MarketMoversProps) {
  const [bullish, setBullish] = useState<MoverEvent[]>([]);
  const [bearish, setBearish] = useState<MoverEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    const controller = new AbortController();

    async function fetchMovers() {
      try {
        setLoading(true);
        const res = await fetch('/api/market-movers', { signal: controller.signal });
        if (!res.ok) throw new Error('Failed to fetch market movers');
        const data = await res.json();
        
        if (isMounted) {
          setBullish(data.bullish || []);
          setBearish(data.bearish || []);
          setLoading(false);
        }
      } catch (err: any) {
        if (err.name === 'AbortError') return;
        if (isMounted) {
          setError(err.message);
          setLoading(false);
        }
      }
    }

    fetchMovers();
    
    // Refresh every 5 minutes
    const interval = setInterval(fetchMovers, 5 * 60 * 1000);

    return () => {
      isMounted = false;
      controller.abort();
      clearInterval(interval);
    };
  }, []);

  const renderMoverList = (items: MoverEvent[], type: 'bullish' | 'bearish') => {
    if (items.length === 0) {
      return (
        <div className={`p-6 border-dashed border-2 rounded flex items-center justify-center h-32 ${
          type === 'bullish' ? 'border-green-900/30 text-green-900/50' : 'border-red-900/30 text-red-900/50'
        }`}>
          <span className="text-[10px] font-mono uppercase tracking-widest">[ NO STRONG CATALYSTS DETECTED ]</span>
        </div>
      );
    }

    return (
      <div className="flex flex-col gap-3">
        {items.map((item) => {
          const isIndian = item.ticker.endsWith('.NS') || item.ticker.endsWith('.BO') || item.ticker === '^NSEI' || item.ticker === '^BSESN';
          const currencyPrefix = isIndian ? '₹' : '$';
          const isBullish = type === 'bullish';
          
          return (
            <div 
              key={item.id}
              onClick={() => onSelectEvent(item)}
              className={`group cursor-pointer border rounded p-4 transition-all hover:-translate-y-0.5 ${
                isBullish 
                  ? 'border-green-900/40 bg-green-950/10 hover:border-green-500/50 hover:bg-green-950/20 hover:shadow-[0_0_15px_rgba(34,197,94,0.1)]' 
                  : 'border-red-900/40 bg-red-950/10 hover:border-red-500/50 hover:bg-red-950/20 hover:shadow-[0_0_15px_rgba(239,68,68,0.1)]'
              }`}
            >
              <div className="flex justify-between items-start mb-2">
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-bold font-mono tracking-widest ${isBullish ? 'text-green-400' : 'text-red-400'}`}>
                    {item.ticker || 'GLOBAL'}
                  </span>
                  <Link 
                    href={`/?symbol=${item.ticker || '^NSEI'}`}
                    onClick={(e) => e.stopPropagation()}
                    className={`text-[9px] font-mono uppercase tracking-widest px-1.5 py-0.5 rounded border transition-colors ${
                      isBullish 
                        ? 'border-green-900/50 text-green-600 hover:bg-green-900/50 hover:text-green-300' 
                        : 'border-red-900/50 text-red-600 hover:bg-red-900/50 hover:text-red-300'
                    }`}
                  >
                    View Chart
                  </Link>
                </div>
                <div className={`text-xs font-mono font-bold px-2 py-0.5 rounded bg-black/40 ${isBullish ? 'text-green-500' : 'text-red-500'}`}>
                  {isBullish ? '+' : ''}{item.netSentimentScore.toFixed(2)}
                </div>
              </div>
              
              <h4 className="text-sm text-zinc-200 font-semibold leading-snug mb-2 group-hover:text-white transition-colors line-clamp-2">
                {item.title}
              </h4>
              
              <p className="text-xs text-zinc-500 line-clamp-2 leading-relaxed">
                {item.content || 'No detailed rationale available.'}
              </p>
              
              <div className="mt-3 flex items-center justify-between text-[10px] font-mono text-zinc-600 uppercase tracking-widest border-t border-zinc-800/50 pt-2">
                <span>{item.source}</span>
                <span>{formatTimeAgo(item.published_at)}</span>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="h-full w-full flex items-center justify-center p-8">
        <div className="flex items-center gap-3">
          <div className="w-4 h-4 border-2 border-zinc-600 border-t-zinc-400 rounded-full animate-spin" />
          <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest animate-pulse">
            Scanning 24h Intelligence Feed...
          </span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-full w-full flex items-center justify-center p-8">
        <span className="text-xs font-mono text-red-500 uppercase tracking-widest border border-red-900/30 bg-red-950/20 px-4 py-2 rounded">
          Failed to load market movers
        </span>
      </div>
    );
  }

  return (
    <div className="h-full w-full p-6 overflow-y-auto bg-[#09090b] flex flex-col">
      <div className="mb-8 border-b border-zinc-800 pb-4">
        <h2 className="text-xl font-bold text-white mb-1 uppercase tracking-tight flex items-center gap-2">
          <span className="w-2 h-2 bg-cyan-500 rounded-full animate-pulse inline-block" />
          Today's Market Movers
        </h2>
        <p className="text-xs font-mono text-zinc-500 uppercase tracking-widest">
          Top macroeconomic catalysts ranked by AI sentiment impact (Past 24h)
        </p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        {/* Bullish Column */}
        <div className="flex flex-col">
          <h3 className="text-[11px] font-bold text-green-500 uppercase tracking-widest mb-4 flex items-center gap-2 border-b border-green-900/30 pb-2">
            <span className="text-base leading-none">▲</span> Top 5 Bullish Catalysts
          </h3>
          {renderMoverList(bullish, 'bullish')}
        </div>

        {/* Bearish Column */}
        <div className="flex flex-col">
          <h3 className="text-[11px] font-bold text-red-500 uppercase tracking-widest mb-4 flex items-center gap-2 border-b border-red-900/30 pb-2">
            <span className="text-base leading-none">▼</span> Top 5 Bearish Catalysts
          </h3>
          {renderMoverList(bearish, 'bearish')}
        </div>
      </div>
    </div>
  );
}
