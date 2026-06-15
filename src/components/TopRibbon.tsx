import React from 'react';
import useSWR from 'swr';

const fetcher = (url: string) => fetch(url).then(res => res.json());

export default function TopRibbon() {
  const { data: riskData } = useSWR('/api/risk-index', fetcher, { refreshInterval: 60000 });
  const { data: healthData } = useSWR('/api/health', fetcher, { refreshInterval: 60000 });
  const riskScore = riskData?.score || 0;
  const explanation = riskData?.explanation || 'AWAITING DATA';

  const getRiskStyle = (score: number) => {
    if (score > 75) return 'text-red-500 bg-red-950/50 px-1 py-0.5 rounded-sm';
    if (score < 50) return 'text-emerald-400 bg-emerald-950/50 px-1 py-0.5 rounded-sm';
    return 'text-yellow-400 bg-yellow-950/50 px-1 py-0.5 rounded-sm';
  };

  return (
    <div className="h-8 w-full bg-slate-950 border-b border-slate-800 flex items-center justify-between px-2 overflow-hidden shrink-0">
      <div className="flex-1 overflow-hidden relative flex items-center h-full">
        <div className="animate-marquee whitespace-nowrap text-[10px] font-mono uppercase tracking-widest text-slate-400 font-bold w-full flex items-center">
          <span className="mx-6 text-emerald-400">SYSTEM: ONLINE</span>
          <span className="mx-6 text-slate-700">|</span>
          <span className="mx-6">GLOBAL RISK INDEX: <span className={getRiskStyle(riskScore)}>{explanation}</span></span>
          <span className="mx-6 text-slate-700">|</span>
          <span className="mx-6 text-emerald-400">AI INGESTION: NOMINAL</span>
        </div>
        <style dangerouslySetInnerHTML={{__html: `
          @keyframes marquee {
            0% { transform: translateX(100%); }
            100% { transform: translateX(-100%); }
          }
          .animate-marquee {
            animation: marquee 30s linear infinite;
          }
        `}} />
      </div>

      <div className="flex items-center gap-2 pl-2 border-l border-slate-800 bg-slate-950 z-10 shrink-0 h-full">
        {['rss', 'ai', 'db', 'mkt'].map(sys => {
          const status = healthData?.[sys] || 'yellow';
          const color = status === 'green' ? 'bg-emerald-500 animate-pulse' : status === 'red' ? 'bg-red-500 animate-ping' : 'bg-yellow-500';
          return (
            <div key={sys} className="flex flex-col items-center justify-center">
              <span className={`w-1.5 h-1.5 rounded-full mb-0.5 ${color}`} />
              <span className="text-[8px] font-bold text-slate-500 leading-none uppercase">{sys}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
