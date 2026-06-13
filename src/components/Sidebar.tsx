'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function Sidebar() {
  const pathname = usePathname();

  const links = [
    { href: '/', label: 'CHART', icon: '⬡' },
    { href: '/intel', label: 'INTEL', icon: '📰' },
    { href: '/quant', label: 'QUANT', icon: '◈' },
  ];

  return (
    <aside className="w-16 sm:w-20 bg-[#09090b] border-r border-zinc-800 flex flex-col items-center py-4 shrink-0 h-full">
      <div className="w-8 h-8 bg-cyan-500/10 border border-cyan-500/30 rounded flex items-center justify-center mb-8 shrink-0">
        <span className="text-cyan-500 font-black text-sm">MP</span>
      </div>

      <nav className="flex flex-col gap-4 w-full">
        {links.map((link) => {
          const isActive = pathname === link.href;
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`flex flex-col items-center justify-center py-3 border-l-2 transition-colors w-full ${
                isActive
                  ? 'border-cyan-500 text-cyan-400 bg-cyan-950/10'
                  : 'border-transparent text-zinc-600 hover:text-zinc-400 hover:bg-zinc-900/50'
              }`}
            >
              <span className="text-xl leading-none mb-1">{link.icon}</span>
              <span className="text-[9px] font-mono font-bold tracking-widest uppercase">
                {link.label}
              </span>
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto flex flex-col items-center gap-2">
        <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.5)]"></span>
        <span className="text-[8px] font-mono text-zinc-600 uppercase tracking-widest rotate-180" style={{ writingMode: 'vertical-rl' }}>
          SYSTEM ONLINE
        </span>
      </div>
    </aside>
  );
}
