'use client';
import React, { useState, useEffect } from 'react';

export default function TopRibbon() {
  const [riskScore, setRiskScore] = useState(82.4); // Mock dynamic risk score

  useEffect(() => {
    // Simulate dynamic risk score fluctuation
    const interval = setInterval(() => {
      setRiskScore(prev => Math.max(0, Math.min(100, prev + (Math.random() * 4 - 2))));
    }, 5000);
    return () => clearInterval(interval);
  }, []);

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
          <span className="mx-6">GLOBAL RISK INDEX: <span className={getRiskStyle(riskScore)}>{riskScore.toFixed(1)}</span></span>
          <span className="mx-6 text-slate-700">|</span>
          <span className="mx-6">CRUDE OIL ACCELERATION: <span className="text-emerald-400">+1.4%</span></span>
          <span className="mx-6 text-slate-700">|</span>
          <span className="mx-6">US CORE CPI: <span className="text-slate-300">3.1% YoY</span></span>
          <span className="mx-6 text-slate-700">|</span>
          <span className="mx-6">VIX: <span className="text-red-500">18.4 ▲</span></span>
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
        <div className="flex flex-col items-center justify-center">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse mb-0.5" />
          <span className="text-[8px] font-bold text-slate-500 leading-none">RSS</span>
        </div>
        <div className="flex flex-col items-center justify-center">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse mb-0.5" />
          <span className="text-[8px] font-bold text-slate-500 leading-none">AI</span>
        </div>
        <div className="flex flex-col items-center justify-center">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse mb-0.5" />
          <span className="text-[8px] font-bold text-slate-500 leading-none">DB</span>
        </div>
        <div className="flex flex-col items-center justify-center">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse mb-0.5" />
          <span className="text-[8px] font-bold text-slate-500 leading-none">MKT</span>
        </div>
      </div>
    </div>
  );
}
