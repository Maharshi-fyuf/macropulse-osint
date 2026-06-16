'use client';

import React, { useState, useEffect, useRef } from 'react';
import TopRibbon from '@/components/TopRibbon';
import MarketNarrative from '@/components/MarketNarrative';
import QuantTape from '@/components/QuantTape';
import { supabase } from '@/lib/supabase-client';
import FeedItem, { MarketEvent } from '@/components/FeedItem';
import { EventRecord } from '@/types/event';
import { getTradingViewSymbol } from '@/lib/tickerMap';
import TerminalErrorBoundary from '@/components/TerminalErrorBoundary';

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

  const priorityEvents = events.filter(e => e.severity_score >= 8);
  const standardEvents = events.filter(e => e.severity_score < 8);

  return (
    <div className="h-full w-full bg-slate-950 flex flex-col overflow-hidden font-mono text-xs leading-tight">
      <TopRibbon />
      <MarketNarrative />
      <QuantTape />
      
      <div className="flex-1 overflow-y-auto bg-slate-950 flex flex-col relative">
        <div className="w-full flex-1 pb-20">
          <TerminalErrorBoundary>
            {loadingEvents ? (
              <div className="p-8 text-center text-slate-600 font-mono uppercase animate-pulse">
                Syncing intelligence database...
              </div>
            ) : events.length > 0 ? (
              <>
                {priorityEvents.length > 0 && (
                  <div className="mb-2">
                    <div className="h-8 border-b border-y border-slate-800 bg-red-950/20 flex items-center px-4 shrink-0 sticky top-0 z-10">
                      <div className="flex items-center gap-2">
                        <span className="relative flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                        </span>
                        <h2 className="text-[10px] font-bold text-red-400 uppercase tracking-widest">
                          Priority Intel Overlay
                        </h2>
                      </div>
                    </div>
                    {priorityEvents.map((event) => (
                      <div key={event.id} className="border-l-4 border-l-red-500 bg-red-950/10">
                        <FeedItem
                          event={event}
                          isActive={false}
                        />
                      </div>
                    ))}
                  </div>
                )}

                <div>
                  <div className="h-8 border-b border-y border-slate-800 bg-slate-900 flex items-center px-4 shrink-0 sticky top-0 z-10">
                    <div className="flex items-center gap-2">
                      <h2 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                        Chronological Feed
                      </h2>
                    </div>
                  </div>
                  {standardEvents.map((event) => (
                    <FeedItem
                      key={event.id}
                      event={event}
                      isActive={false}
                    />
                  ))}
                </div>
              </>
            ) : (
              <div className="p-8 text-center text-slate-600 font-mono uppercase">
                No intelligence events found
              </div>
            )}
          </TerminalErrorBoundary>
        </div>
      </div>
    </div>
  );
}
