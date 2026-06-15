'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import TopRibbon from '@/components/TopRibbon';
import { supabase } from '@/lib/supabase-client';
import FeedItem, { MarketEvent } from '@/components/FeedItem';
import { EventRecord } from '@/types/event';
import { getTradingViewSymbol } from '@/lib/tickerMap';
import TerminalErrorBoundary from '@/components/TerminalErrorBoundary';

function SidebarNav() {
  const pathname = usePathname();
  const navItems = [
    { label: 'Squawk Box', href: '/' },
    { label: 'Intel Stream', href: '/intel' },
    { label: 'Quant Engine', href: '/quant' },
  ];

  return (
    <div className="w-64 border-r border-zinc-800 bg-[#09090b] flex flex-col shrink-0">
      <div className="p-6 border-b border-zinc-800">
        <h1 className="text-xl font-black text-white tracking-tight leading-none">MACROPULSE</h1>
        <p className="text-[10px] text-cyan-500 font-mono mt-1 tracking-widest uppercase">Squawk Box</p>
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
          High-Speed Ingestion Active
        </p>
      </div>
    </div>
  );
}

export default function Home() {
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
          .limit(200);

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

  const lastSeenEventId = useRef<string | null>(null);

  useEffect(() => {
    if (events.length > 0) {
      if (lastSeenEventId.current) {
        const newEvents = [];
        for (const e of events) {
          if (e.id === lastSeenEventId.current) break;
          newEvents.push(e);
        }
        
        if (newEvents.some(e => e.severity_score >= 9)) {
          const alertSound = new Audio('/sounds/alert.mp3');
          alertSound.play().catch((e) => console.error("Audio play failed:", e));
        }
      }
      lastSeenEventId.current = events[0].id;
    }
  }, [events]);

  return (
    <div className="h-full w-full bg-[#09090b] flex flex-col overflow-hidden">
      <TopRibbon />
      
      <div className="flex-1 flex overflow-hidden">
        <SidebarNav />

        <div className="flex-1 bg-[#09090b] flex flex-col relative overflow-hidden">
          <div className="h-12 border-b border-zinc-800 bg-zinc-900/30 flex items-center px-6 shrink-0 justify-between">
            <div className="flex items-center gap-3">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
              </span>
              <h2 className="text-xs font-mono font-bold text-zinc-300 uppercase tracking-widest">
                Global Live Intel Feed
              </h2>
            </div>
            <div className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">
              Squawk Box Stream · Maximum Density
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
            <div className="max-w-5xl mx-auto space-y-4">
              <TerminalErrorBoundary>
                {loadingEvents ? (
                  <div className="p-8 text-center text-zinc-600 text-sm font-mono uppercase animate-pulse border border-zinc-800/50 rounded-lg">
                    Syncing intelligence database...
                  </div>
                ) : events.length > 0 ? (
                  events.map((event) => (
                    <div key={event.id} className="w-full">
                      <FeedItem
                        event={event}
                        isActive={false}
                        onSelect={() => {}}
                      />
                    </div>
                  ))
                ) : (
                  <div className="p-8 text-center text-zinc-600 text-sm font-mono uppercase border border-zinc-800/50 rounded-lg">
                    No intelligence events found
                  </div>
                )}
              </TerminalErrorBoundary>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
