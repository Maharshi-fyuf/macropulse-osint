'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function Navigation() {
  const pathname = usePathname();

  const navItems = [
    { name: 'Feed', href: '/' },
    { name: 'Intel', href: '/intel' },
    { name: 'Quant', href: '/quant' },
  ];

  return (
    <nav className="w-full bg-slate-950 border-t border-slate-800 shrink-0 md:border-t-0 md:border-b md:order-first z-50">
      <div className="flex items-center justify-around md:justify-start md:px-4 h-12">
        {navItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex-1 md:flex-none md:w-32 flex justify-center items-center h-full text-xs font-bold font-mono tracking-widest uppercase transition-colors border-t-2 md:border-t-0 md:border-b-2 ${
                isActive
                  ? 'border-emerald-400 text-emerald-400 bg-slate-900/50'
                  : 'border-transparent text-slate-500 hover:text-slate-300 hover:bg-slate-900/30'
              }`}
            >
              {item.name}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
