import React from 'react';

export default function TopRibbon() {
  return (
    <div className="h-6 w-full bg-[#050505] border-b border-zinc-800 flex items-center overflow-hidden shrink-0">
      <div className="animate-marquee whitespace-nowrap text-[10px] font-mono uppercase tracking-widest text-zinc-400 font-bold w-full">
        <span className="mx-8 text-cyan-500">SYSTEM: ONLINE</span>
        <span className="mx-8 text-zinc-600">|</span>
        <span className="mx-8">GLOBAL RISK INDEX: <span className="text-red-500">ELEVATED (7.2)</span></span>
        <span className="mx-8 text-zinc-600">|</span>
        <span className="mx-8">CRUDE OIL ACCELERATION: <span className="text-green-500">+1.4%</span></span>
        <span className="mx-8 text-zinc-600">|</span>
        <span className="mx-8">US CORE CPI: <span className="text-zinc-300">3.1% YoY</span></span>
        <span className="mx-8 text-zinc-600">|</span>
        <span className="mx-8">VIX: <span className="text-red-500">18.4 ▲</span></span>
        <span className="mx-8 text-zinc-600">|</span>
        <span className="mx-8 text-cyan-500">AI INGESTION: NOMINAL</span>
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
  );
}
