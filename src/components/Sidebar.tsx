'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function Sidebar() {
  const pathname = usePathname();
  
  const navItems = [
    { href: '/', label: 'SQUAWK BOX' },
    { href: '/intel', label: 'INTEL STREAM' },
    { href: '/quant', label: 'QUANT ENGINE' },
  ];

  return (
    <div className="w-16 md:w-56 h-full bg-slate-950 border-r border-slate-800 flex flex-col shrink-0">
      <div className="p-4 border-b border-slate-800 flex items-center justify-center md:justify-start">
        <h1 className="hidden md:block text-sm font-bold text-slate-100 tracking-widest uppercase">MACROPULSE</h1>
        <h1 className="md:hidden text-sm font-bold text-slate-100 tracking-widest uppercase">MP</h1>
      </div>
      <nav className="flex-1 flex flex-col pt-4 gap-1">
        {navItems.map(item => {
          const isActive = pathname === item.href;
          return (
            <Link 
              key={item.href} 
              href={item.href}
              className={`px-4 py-2 text-xs font-mono tracking-widest uppercase border-l-2 transition-colors ${isActive ? 'border-emerald-400 bg-slate-900 text-slate-100' : 'border-transparent text-slate-500 hover:text-slate-300 hover:bg-slate-900/50'}`}
            >
              <span className="hidden md:inline">{item.label}</span>
              <span className="md:hidden text-center block">{item.label.substring(0, 1)}</span>
            </Link>
          );
        })}
      </nav>
      <div className="p-4 border-t border-slate-800 hidden md:block">
        <div className="text-[10px] font-mono text-slate-600 uppercase tracking-widest leading-tight">
          SYS_STATE: ONLINE<br/>
          ENV: PROD
        </div>
      </div>
    </div>
  );
}
