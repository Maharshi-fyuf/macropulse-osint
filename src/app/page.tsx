'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabase-client';
import { getTradingViewSymbol } from '@/lib/tickerMap';
import FeedItem, { MarketEvent } from '@/components/FeedItem';
import AnalysisPane from '@/components/AnalysisPane';
import ChartPane from '@/components/ChartPane';
import TerminalErrorBoundary from '@/components/TerminalErrorBoundary';

// Mobile tab identifiers
type ActiveTab = 'feed' | 'headlines' | 'chart' | 'analysis';

type TimeFilter = 'Live' | '24h' | '7d';

export default function Home() {
  const [events, setEvents] = useState<MarketEvent[]>([]);
  const [selectedFeedItem, setSelectedFeedItem] = useState<MarketEvent | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [feedError, setFeedError] = useState(false);
  const [activeTab, setActiveTab] = useState<ActiveTab>('feed');
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('Live');

  const [debugInfo, setDebugInfo] = useState<any>(null);

  const fetchEvents = useCallback(async () => {
    // Timeout to prevent permanent hang if browser drops the request silently
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      controller.abort();
      setLoading(false);
    }, 10000);

    try {
      setFeedError(false);
      setDebugInfo({ status: 'fetching' });
      
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

      const { data, error, status, statusText } = await query.abortSignal(controller.signal);

      clearTimeout(timeoutId);
      setDebugInfo({ status: 'done', error, dataCount: data?.length, httpStatus: status, httpStatusText: statusText });

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
      } else {
        setDebugInfo({ status: 'empty_data_returned', data });
      }
    } catch (err: any) {
      clearTimeout(timeoutId);
      console.error('Failed to fetch events:', err);
      setDebugInfo({ status: 'caught_exception', message: err?.message, stack: err?.stack });
      setFeedError(true);
    } finally {
      setLoading(false);
    }
  }, [timeFilter]);

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
  const viewMode = activeTab === 'headlines' ? 'headlines' : 'feed';

  const filteredEvents = useMemo(() => {
    // 1. Filter by view mode (feed = market moving only, headlines = all)
    const viewEvents = viewMode === 'headlines' ? events : events.filter(e => e.is_market_moving);

    // 2. Filter by search query
    if (searchQuery.trim() === '') return viewEvents;
    const q = searchQuery.toLowerCase();
    return viewEvents.filter(
      (event) =>
        event.title.toLowerCase().includes(q) ||
        (event.rationale?.toLowerCase().includes(q) ?? false) ||
        event.source.toLowerCase().includes(q) ||
        event.bullish_assets?.some((a) => a.toLowerCase().includes(q)) ||
        event.bearish_assets?.some((a) => a.toLowerCase().includes(q))
    );
  }, [events, searchQuery, viewMode]);

  // ── Tab visibility (mobile only via CSS breakpoints) ───────────────────
  const isFeedVisible = activeTab === 'feed' || activeTab === 'headlines';
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

        <div className="flex items-center gap-2">
          {/* Time Filter Group */}
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
              placeholder="Search assets, tickers…"
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
            {debugInfo && (
              <div className="bg-red-900/50 p-2 m-2 text-[10px] text-red-200 border border-red-500 font-mono break-words overflow-y-auto max-h-40">
                DEBUG INFO: {JSON.stringify(debugInfo, null, 2)}
              </div>
            )}
            <div className="h-8 border-b border-zinc-800 flex items-center bg-zinc-900/50 shrink-0">
              <button
                onClick={() => setActiveTab('feed')}
                className={`flex-1 h-full text-[10px] font-mono font-bold uppercase tracking-widest transition-colors ${viewMode === 'feed' ? 'text-zinc-200 bg-zinc-800/50' : 'text-zinc-500 hover:text-zinc-400'}`}
              >
                Event Stream
              </button>
              <button
                onClick={() => setActiveTab('headlines')}
                className={`flex-1 h-full border-l border-zinc-800 text-[10px] font-mono font-bold uppercase tracking-widest transition-colors ${viewMode === 'headlines' ? 'text-zinc-200 bg-zinc-800/50' : 'text-zinc-500 hover:text-zinc-400'}`}
              >
                Headlines
              </button>
            </div>

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
                    onSelect={() => handleSelect(event)}
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
      <nav className="md:hidden shrink-0 h-12 bg-[#0d0d10] border-t border-zinc-800 grid grid-cols-4">
        {(
          [
            { id: 'feed',     label: 'FEED',     icon: '≡' },
            { id: 'headlines',label: 'HEADLINES',icon: '📰' },
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
