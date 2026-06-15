import React from 'react';

export default function MarketNarrative() {
  return (
    <div className="w-full border-b border-slate-800 bg-slate-900 p-4 shrink-0 shadow-lg">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
          <span className="w-2 h-2 bg-red-500 rounded-sm animate-pulse" />
          MARKET NARRATIVE
        </h2>
        <span className="text-[10px] font-mono text-emerald-400 font-bold border border-emerald-900/50 bg-emerald-950/30 px-2 py-0.5 rounded-sm">
          CONFIDENCE: 84%
        </span>
      </div>
      
      <p className="text-sm text-slate-200 leading-snug font-mono mb-4 border-l-2 border-red-500 pl-3">
        Markets rotating aggressively into energy and defense sectors following renewed Middle East tensions and supply chain disruptions. Tech equities experiencing significant outflow pressure.
      </p>

      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5 border border-slate-800 bg-slate-950 p-2 rounded-sm">
          <span className="text-[9px] text-slate-500 uppercase tracking-widest font-bold">Most Impacted (Bullish)</span>
          <div className="flex flex-wrap gap-1.5">
            <span className="text-xs font-bold text-emerald-400">↑ XLE</span>
            <span className="text-xs font-bold text-emerald-400">↑ LMT</span>
            <span className="text-xs font-bold text-emerald-400">↑ USO</span>
          </div>
        </div>

        <div className="flex flex-col gap-1.5 border border-slate-800 bg-slate-950 p-2 rounded-sm">
          <span className="text-[9px] text-slate-500 uppercase tracking-widest font-bold">Most At Risk (Bearish)</span>
          <div className="flex flex-wrap gap-1.5">
            <span className="text-xs font-bold text-red-500">↓ QQQ</span>
            <span className="text-xs font-bold text-red-500">↓ ARKK</span>
            <span className="text-xs font-bold text-red-500">↓ TSLA</span>
          </div>
        </div>
      </div>
    </div>
  );
}
