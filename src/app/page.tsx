'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import ChartPane from '@/components/ChartPane';
import TopRibbon from '@/components/TopRibbon';
import CommandPalette from '@/components/CommandPalette';
import { supabase } from '@/lib/supabase-client';
import FeedItem, { MarketEvent } from '@/components/FeedItem';
import { EventRecord } from '@/types/event';
import { getTradingViewSymbol } from '@/lib/tickerMap';
import TerminalErrorBoundary from '@/components/TerminalErrorBoundary';

function SidebarNav() {
  const pathname = usePathname();
  const navItems = [
    { label: 'Terminal', href: '/' },
    { label: 'Intel Stream', href: '/intel' },
    { label: 'Quant Engine', href: '/quant' },
  ];

  return (
    <div className="w-64 border-r border-zinc-800 bg-[#09090b] flex flex-col shrink-0">
      <div className="p-6 border-b border-zinc-800">
        <h1 className="text-xl font-black text-white tracking-tight leading-none">MACROPULSE</h1>
        <p className="text-[10px] text-cyan-500 font-mono mt-1 tracking-widest uppercase">OSINT Terminal 9.5</p>
      </div>
      <nav className="flex-1 p-4 flex flex-col gap-2">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`px-4 py-3 rounded text-sm font-mono tracking-widest uppercase transition-all ${
                isActive
                  ? 'bg-zinc-800 text-white border-l-2 border-cyan-500'
                  : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900 border-l-2 border-transparent'
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="p-4 border-t border-zinc-800">
        <p className="text-[9px] text-zinc-600 font-mono text-center uppercase tracking-widest">
          Ctrl+K to search
        </p>
      </div>
    </div>
  );
}

export default function Home() {
  const [activeSymbol, setActiveSymbol] = useState('^NSEI');
  const [events, setEvents] = useState<MarketEvent[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(true);

  useEffect(() => {
    let isMounted = true;
    async function fetchEvents() {
      try {
        setLoadingEvents(true);
        const { data, error } = await supabase
          .from('events')
          .select('*')
          .order('published_at', { ascending: false })
          .limit(200); // Fetch top 200 events for the live feed and markers

        if (error) {
          console.error('Error fetching events:', error);
          return;
        }

        if (data && isMounted) {
          const mappedEvents = data.map((event: EventRecord) => ({
            ...event,
            title: event.title || 'Untitled Event',
            source: event.source || 'Unknown Source',
            published_at: event.published_at || event.created_at || new Date().toISOString(),
            content: event.rationale || '',
            severity_score: event.severity_score || 0,
            bullish_assets: Array.isArray(event.bullish_assets) ? event.bullish_assets : [],
            bearish_assets: Array.isArray(event.bearish_assets) ? event.bearish_assets : [],
            ticker: getTradingViewSymbol(event.asset_class),
          })) as MarketEvent[];
          setEvents(mappedEvents);
        }
      } catch (err: unknown) {
        console.error('Failed to fetch events:', err instanceof Error ? err.message : String(err));
      } finally {
        if (isMounted) setLoadingEvents(false);
      }
    }

    fetchEvents();
    const interval = setInterval(fetchEvents, 60000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  const handleSelectSymbol = (symbol: string) => {
    setActiveSymbol(symbol);
  };

  const handleEventClick = (event: MarketEvent) => {
    if (event.ticker && event.ticker !== 'GLOBAL') {
      setActiveSymbol(event.ticker);
    }
  };

  // For ChartPane markers, filter events matching the active ticker
  const symbolEvents = events.filter((e) => {
    // If it's a global event, or if it specifically impacts this asset
    if (e.ticker === activeSymbol) return true;
    const isBull = e.bullish_assets.some((a) => a.includes(activeSymbol.split('.')[0]));
    const isBear = e.bearish_assets.some((a) => a.includes(activeSymbol.split('.')[0]));
    return isBull || isBear;
  });

  return (
    <div className="h-full w-full bg-[#09090b] flex flex-col overflow-hidden">
      <TopRibbon />
      <CommandPalette onSelect={handleSelectSymbol} />
      
      <div className="flex-1 flex overflow-hidden">
        <SidebarNav />

        <div className="flex-1 border-r border-zinc-800 relative">
          <Suspense fallback={<div className="h-full w-full flex items-center justify-center text-zinc-600 font-mono uppercase text-xs">Loading chart framework...</div>}>
            <ChartPane event={{ ticker: activeSymbol } as MarketEvent} events={symbolEvents} />
          </Suspense>
        </div>

        <div className="w-80 bg-[#09090b] flex flex-col shrink-0">
          <div className="h-10 border-b border-zinc-800 bg-zinc-900/50 flex items-center px-4 shrink-0">
            <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse mr-2" />
            <h2 className="text-[10px] font-mono font-bold text-zinc-300 uppercase tracking-widest">
              Live Intel Feed
            </h2>
          </div>
          <div className="flex-1 overflow-y-auto p-2">
            <TerminalErrorBoundary>
              {loadingEvents ? (
                <div className="p-4 text-center text-zinc-600 text-xs font-mono uppercase animate-pulse">
                  Syncing database...
                </div>
              ) : events.length > 0 ? (
                events.map((event) => (
                  <div key={event.id} onClick={() => handleEventClick(event)} className="cursor-pointer">
                    <FeedItem
                      event={event}
                      isActive={false}
                      onSelect={() => handleEventClick(event)}
                    />
                  </div>
                ))
              ) : (
                <div className="p-4 text-center text-zinc-600 text-xs font-mono uppercase">
                  No events found
                </div>
              )}
            </TerminalErrorBoundary>
          </div>
        </div>
      </div>
    </div>
  );
}
