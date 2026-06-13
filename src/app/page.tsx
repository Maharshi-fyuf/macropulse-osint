'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabase-client';
import { getTradingViewSymbol } from '@/lib/tickerMap';
import FeedItem, { MarketEvent } from '@/components/FeedItem';
import AnalysisPane from '@/components/AnalysisPane';
import ChartPane from '@/components/ChartPane';
import TerminalErrorBoundary from '@/components/TerminalErrorBoundary';

// Mobile tab identifiers
type ActiveTab = 'feed' | 'chart' | 'analysis';

export default function Home() {
  const [events, setEvents] = useState<MarketEvent[]>([]);
  const [selectedFeedItem, setSelectedFeedItem] = useState<MarketEvent | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [feedError, setFeedError] = useState(false);
  const [activeTab, setActiveTab] = useState<ActiveTab>('feed');

  // ── Stable fetch function — won't cause useEffect re-fires ─────────────
  const fetchEvents = useCallback(async () => {
    try {
      setFeedError(false);
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .order('published_at', { ascending: false })
        .limit(50);

      if (error) {
        console.error('Error fetching events:', error);
        setFeedError(true);
      } else if (data && data.length > 0) {
        const mappedEvents = data.map((event: any) => ({
          ...event,
          content: event.rationale,
          ticker: getTradingViewSymbol(event.asset_class),
        })) as MarketEvent[];

        setEvents(mappedEvents);
        setSelectedFeedItem((prev) => prev || mappedEvents[0]);
      }
    } catch (err) {
      console.error('Failed to fetch events:', err);
      setFeedError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  // ── Effect: initial fetch + polling interval with proper cleanup ────────
  useEffect(() => {
    fetchEvents();
    const interval = setInterval(fetchEvents, 60000);
    return () => clearInterval(interval);
  }, [fetchEvents]);

  // ── Stable handlers — prevents FeedItem memo from being busted ─────────
  const handleSelect = useCallback((event: MarketEvent) => {
    setSelectedFeedItem(event);
    setActiveTab('chart');
  }, []);

  const handleSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value),
    []
  );

  const clearSearch = useCallback(() => setSearchQuery(''), []);

  // ── Memoised filter — only recomputes when events or searchQuery change ─
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

  // ── Tab visibility (mobile only via CSS breakpoints) ───────────────────
  const isFeedVisible = activeTab === 'feed';
  const isChartVisible = activeTab === 'chart';
  const isAnalysisVisible = activeTab === 'analysis';

  return (
    <div className="h-screen w-screen bg-[#09090b] text-zinc-100 overflow-hidden flex flex-col font-sans">

      {/* ── Top Header Bar ─────────────────────────────────────────────── */}
      <header className="h-14 border-b border-zinc-800 bg-[#09090b] flex items-center justify-between px-4 shrink-0">
        <div className="flex items-baseline gap-4">
          <h1 className="text-xl font-black tracking-tight text-white uppercase">
            MacroPulse
          </h1>
          <span className="hidden sm:inline text-[10px] font-mono font-bold tracking-wider text-zinc-500 uppercase">
            Live Feed
          </span>
        </div>

        <div className="flex flex-1 max-w-xs sm:max-w-md mx-4 relative">
          <input
            type="text"
            placeholder="Search assets, tickers…"
            value={searchQuery}
            onChange={handleSearchChange}
            className="w-full bg-[#18181b] border border-zinc-800 rounded px-3 py-1.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-700"
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

        <div className="flex items-center gap-1.5 bg-green-950/20 px-2.5 py-1 rounded border border-green-900/30">
          <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span>
          <span className="text-[10px] font-bold text-green-400 tracking-wide uppercase">
            Connected
          </span>
        </div>
      </header>

      {/* ── Main Content Area ───────────────────────────────────────────── */}
      <main className="flex-1 overflow-hidden bg-[#09090b]
                       flex flex-col
                       md:grid md:grid-cols-12">

        {/* ── LEFT PANE: News Feed ──────────────────────────────────────── */}
        <div className={`
          border-zinc-800 bg-[#09090b] relative flex flex-col overflow-hidden
          md:col-span-3 md:border-r md:flex
          ${isFeedVisible ? 'flex flex-1' : 'hidden'}
        `}>
          <TerminalErrorBoundary isActive={feedError}>
            <div className="h-8 border-b border-zinc-800 flex items-center px-3 bg-zinc-900/50 shrink-0">
              <span className="text-[10px] font-mono font-bold text-zinc-400 uppercase tracking-widest">
                Event Stream
              </span>
              {events.length > 0 && (
                <span className="ml-auto text-[9px] font-mono text-zinc-600">
                  {filteredEvents.length} events
                </span>
              )}
            </div>

            <div className="flex-1 overflow-y-auto">
              {loading && events.length === 0 ? (
                <div className="p-4 text-center text-zinc-600 text-xs font-mono uppercase animate-pulse">
                  Fetching data stream...
                </div>
              ) : filteredEvents.length > 0 ? (
                filteredEvents.map((event) => (
                  <FeedItem
                    key={event.id}
                    event={event}
                    isActive={selectedFeedItem?.id === event.id}
                    onSelect={() => handleSelect(event)}
                  />
                ))
              ) : (
                <div className="p-4 text-center text-zinc-600 text-xs font-mono uppercase">
                  No events matched query
                </div>
              )}
            </div>
          </TerminalErrorBoundary>
        </div>

        {/* ── RIGHT PANE: Chart + Analysis ─────────────────────────────── */}
        {/*
          transition-shadow (NOT transition-all) prevents layout thrashing
          during the neon glow toggle — box-shadow and ring are composite-only
          properties so the browser can animate them on the GPU layer.
        */}
        <div className={`
          bg-[#09090b] transition-shadow duration-300 relative
          md:col-span-9 md:flex md:flex-col md:overflow-hidden
          ${selectedFeedItem ? 'md:ring-1 md:ring-cyan-500/30 md:shadow-[0_0_15px_rgba(6,182,212,0.15)] md:z-10' : ''}
          ${(isChartVisible || isAnalysisVisible) ? 'flex flex-col flex-1 overflow-hidden' : 'hidden md:flex'}
        `}>

          {/* Chart sub-pane */}
          <div className={`
            border-zinc-800 overflow-hidden relative
            md:flex-[3] md:border-b md:block
            ${isChartVisible ? 'flex-1' : 'hidden md:block'}
          `}>
            <TerminalErrorBoundary>
              <ChartPane event={selectedFeedItem} />
            </TerminalErrorBoundary>
          </div>

          {/* Analysis sub-pane */}
          <div className={`
            overflow-hidden relative bg-[#09090b]
            md:flex-[2] md:block
            ${isAnalysisVisible ? 'flex-1' : 'hidden md:block'}
          `}>
            <TerminalErrorBoundary>
              <AnalysisPane event={selectedFeedItem} />
            </TerminalErrorBoundary>
          </div>
        </div>
      </main>

      {/* ── Mobile Tab Bar ─────────────────────────────────────────────── */}
      <nav className="md:hidden shrink-0 h-12 bg-[#0d0d10] border-t border-zinc-800 grid grid-cols-3">
        {(
          [
            { id: 'feed',     label: 'FEED',     icon: '≡' },
            { id: 'chart',    label: 'CHART',    icon: '⬡' },
            { id: 'analysis', label: 'ANALYSIS', icon: '◈' },
          ] as { id: ActiveTab; label: string; icon: string }[]
        ).map(({ id, label, icon }) => (
          <button
            key={id}
            id={`tab-${id}`}
            onClick={() => setActiveTab(id)}
            className={`flex flex-col items-center justify-center gap-0.5 text-[9px] font-mono font-bold tracking-widest uppercase transition-colors ${
              activeTab === id
                ? 'text-cyan-400 border-t-2 border-cyan-500 bg-cyan-950/10'
                : 'text-zinc-600 hover:text-zinc-400 border-t-2 border-transparent'
            }`}
          >
            <span className="text-base leading-none">{icon}</span>
            <span>{label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}
