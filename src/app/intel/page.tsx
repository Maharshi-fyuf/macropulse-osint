'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabase-client';
import { getTradingViewSymbol } from '@/lib/tickerMap';
import FeedItem, { MarketEvent } from '@/components/FeedItem';
import { EventRecord } from '@/types/event';
import TerminalErrorBoundary from '@/components/TerminalErrorBoundary';

type TimeFilter = 'Live' | '24h' | '7d';

export default function IntelPage() {
  const [events, setEvents] = useState<MarketEvent[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [feedError, setFeedError] = useState(false);
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('Live');

  const fetchEvents = useCallback(async () => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      controller.abort();
      setLoading(false);
    }, 10000);

    try {
      setFeedError(false);
      
      let query = supabase
        .from('events')
        .select('*')
        .order('published_at', { ascending: false });

      if (timeFilter === '24h') {
        const date24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
        query = query.gte('published_at', date24h.toISOString()).limit(500);
      } else if (timeFilter === '7d') {
        const date7d = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        query = query.gte('published_at', date7d.toISOString()).limit(1000);
      } else {
        query = query.limit(100);
      }

      const { data, error } = await query.abortSignal(controller.signal);

      clearTimeout(timeoutId);

      if (error) {
        console.error('Error fetching events:', error);
        setFeedError(true);
      } else if (data && data.length > 0) {
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
      clearTimeout(timeoutId);
      console.error('Failed to fetch events:', err);
      setFeedError(true);
    } finally {
      setLoading(false);
    }
  }, [timeFilter]);

  useEffect(() => {
    setTimeout(() => {
      fetchEvents();
    }, 0);
    const interval = setInterval(fetchEvents, 60000);
    return () => clearInterval(interval);
  }, [fetchEvents]);

  const handleSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value),
    []
  );

  const clearSearch = useCallback(() => setSearchQuery(''), []);

  const filteredEvents = useMemo(() => {
    if (searchQuery.trim() === '') return events;
    const q = searchQuery.toLowerCase();
    return events.filter(
      (event) =>
        event.title.toLowerCase().includes(q) ||
        (event.rationale?.toLowerCase().includes(q) ?? false) ||
        event.source.toLowerCase().includes(q) ||
        event.bullish_assets?.some((a) => a.toLowerCase().includes(q)) ||
        event.bearish_assets?.some((a) => a.toLowerCase().includes(q))
    );
  }, [events, searchQuery]);

  return (
    <div className="h-full w-full bg-[#09090b] flex flex-col font-sans">
      <header className="h-14 border-b border-zinc-800 bg-[#09090b] flex items-center justify-between px-4 shrink-0">
        <div className="flex items-baseline gap-4">
          <h1 className="text-xl font-black tracking-tight text-white uppercase">
            Intel Stream
          </h1>
        </div>

        <div className="flex items-center gap-2">
          <div className="hidden sm:flex items-center bg-[#18181b] border border-zinc-800 rounded p-0.5">
            {(['Live', '24h', '7d'] as TimeFilter[]).map((filter) => (
              <button
                key={filter}
                onClick={() => setTimeFilter(filter)}
                className={`px-3 py-1 rounded text-[10px] font-mono font-bold uppercase tracking-wider transition-colors ${
                  timeFilter === filter
                    ? 'bg-zinc-700 text-white'
                    : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                {filter}
              </button>
            ))}
          </div>

          <div className="flex flex-1 max-w-[150px] sm:max-w-xs relative">
            <input
              type="text"
              placeholder="Search feed..."
              value={searchQuery}
              onChange={handleSearchChange}
              className="w-full bg-[#18181b] border border-zinc-800 rounded px-3 py-1.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-cyan-500/50"
            />
            {searchQuery && (
              <button
                onClick={clearSearch}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white text-xs font-bold"
              >
                ✕
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-hidden grid grid-cols-12">
        {/* Left Pane: Event Stream (Full Width) */}
        <div className="col-span-12 border-r border-zinc-800 flex flex-col relative">
          <TerminalErrorBoundary isActive={feedError}>
            <div className="flex-1 overflow-y-auto max-w-4xl mx-auto w-full">
              {loading ? (
                <div className="p-4 text-center text-zinc-600 text-xs font-mono uppercase animate-pulse">
                  Fetching data stream...
                </div>
              ) : filteredEvents.length > 0 ? (
                filteredEvents.map((event) => (
                  <FeedItem
                    key={event.id}
                    event={event}
                    isActive={false}
                  />
                ))
              ) : events.length === 0 ? (
                <div className="p-4 text-center text-zinc-600 text-xs font-mono uppercase">
                  No events found in database
                </div>
              ) : (
                <div className="p-4 text-center text-zinc-600 text-xs font-mono uppercase">
                  No events matched query
                </div>
              )}
            </div>
          </TerminalErrorBoundary>
        </div>
      </main>
    </div>
  );
}
