'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabase-client';
import { getTradingViewSymbol } from '@/lib/tickerMap';
import FeedItem, { MarketEvent, formatTimeAgo } from '@/components/FeedItem';
import TerminalErrorBoundary from '@/components/TerminalErrorBoundary';

type TimeFilter = 'Live' | '24h' | '7d';

export default function IntelPage() {
  const [events, setEvents] = useState<MarketEvent[]>([]);
  const [selectedFeedItem, setSelectedFeedItem] = useState<MarketEvent | null>(null);
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
        const mappedEvents = data.map((event: any) => ({
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
        setSelectedFeedItem((prev) => prev || mappedEvents[0]);
      }
    } catch (err: any) {
      clearTimeout(timeoutId);
      console.error('Failed to fetch events:', err);
      setFeedError(true);
    } finally {
      setLoading(false);
    }
  }, [timeFilter]);

  useEffect(() => {
    fetchEvents();
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
        {/* Left Pane: Event Stream */}
        <div className="col-span-12 md:col-span-5 lg:col-span-4 border-r border-zinc-800 flex flex-col relative">
          <TerminalErrorBoundary isActive={feedError}>
            <div className="flex-1 overflow-y-auto">
              {loading ? (
                <div className="p-4 text-center text-zinc-600 text-xs font-mono uppercase animate-pulse">
                  Fetching data stream...
                </div>
              ) : filteredEvents.length > 0 ? (
                filteredEvents.map((event) => (
                  <FeedItem
                    key={event.id}
                    event={event}
                    isActive={selectedFeedItem?.id === event.id}
                    onSelect={() => setSelectedFeedItem(event)}
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

        {/* Right Pane: AI Rationale & Impact */}
        <div className="hidden md:flex flex-col col-span-7 lg:col-span-8 bg-[#09090b] relative">
          <TerminalErrorBoundary>
            {!selectedFeedItem ? (
              <div className="h-full w-full flex items-center justify-center text-zinc-600 text-xs font-mono uppercase">
                Select an event to view analysis
              </div>
            ) : (
              <div className="h-full w-full p-6 overflow-y-auto flex flex-col">
                <div className="mb-4 pb-4 border-b border-zinc-800">
                  <h2 className="text-xl font-bold text-white mb-2 leading-snug">{selectedFeedItem.title}</h2>
                  <div className="flex gap-4 text-xs font-mono text-zinc-500">
                    <span>SOURCE: {selectedFeedItem.source}</span>
                    <span>TIME: {formatTimeAgo(selectedFeedItem.published_at)}</span>
                    <a href={selectedFeedItem.url} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">
                      [READ FULL]
                    </a>
                  </div>
                </div>

                <div className="flex-1 flex flex-col gap-6">
                  <div>
                    <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">AI Rationale</h3>
                    <p className="text-sm text-zinc-300 leading-relaxed">
                      {selectedFeedItem.rationale || 'No rationale provided.'}
                    </p>
                  </div>

                  {((selectedFeedItem.bullish_assets?.length ?? 0) > 0 || (selectedFeedItem.bearish_assets?.length ?? 0) > 0) && (
                    <div className="grid grid-cols-2 gap-4">
                      {(selectedFeedItem.bullish_assets?.length ?? 0) > 0 && (
                        <div className="bg-green-950/20 border border-green-900/30 rounded p-4">
                          <span className="block text-[10px] font-bold text-green-500 mb-2 tracking-wider uppercase">
                            ▲ Bullish Impact
                          </span>
                          <div className="flex flex-wrap gap-1.5">
                            {selectedFeedItem.bullish_assets?.map((asset, i) => {
                              const [ticker, ...reasoningParts] = asset.split(':');
                              const reasoning = reasoningParts.join(':').trim();
                              return (
                                <span key={i} className="bg-green-900/40 text-green-300 px-2 py-1 rounded-md text-xs font-semibold flex flex-col gap-1">
                                  <span>{ticker.trim()}</span>
                                  {reasoning && <span className="text-[9px] font-normal opacity-80 leading-snug">{reasoning}</span>}
                                </span>
                              );
                            })}
                          </div>
                        </div>
                      )}
                      {(selectedFeedItem.bearish_assets?.length ?? 0) > 0 && (
                        <div className="bg-red-950/20 border border-red-900/30 rounded p-4">
                          <span className="block text-[10px] font-bold text-red-500 mb-2 tracking-wider uppercase">
                            ▼ Bearish Impact
                          </span>
                          <div className="flex flex-wrap gap-1.5">
                            {selectedFeedItem.bearish_assets?.map((asset, i) => {
                              const [ticker, ...reasoningParts] = asset.split(':');
                              const reasoning = reasoningParts.join(':').trim();
                              return (
                                <span key={i} className="bg-red-900/40 text-red-300 px-2 py-1 rounded-md text-xs font-semibold flex flex-col gap-1">
                                  <span>{ticker.trim()}</span>
                                  {reasoning && <span className="text-[9px] font-normal opacity-80 leading-snug">{reasoning}</span>}
                                </span>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </TerminalErrorBoundary>
        </div>
      </main>
    </div>
  );
}
