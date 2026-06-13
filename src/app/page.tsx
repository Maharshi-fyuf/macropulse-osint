'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase-client';
import FeedItem, { MarketEvent, getTradingViewSymbol } from '@/components/FeedItem';
import AnalysisPane from '@/components/AnalysisPane';
import ChartPane from '@/components/ChartPane';
import TerminalErrorBoundary from '@/components/TerminalErrorBoundary';

export default function Home() {
  const [events, setEvents] = useState<MarketEvent[]>([]);
  const [selectedFeedItem, setSelectedFeedItem] = useState<MarketEvent | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [feedError, setFeedError] = useState(false);

  const fetchEvents = async () => {
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
        // Map database events to include requested fields (content & ticker)
        const mappedEvents = data.map((event: any) => ({
          ...event,
          content: event.rationale,
          ticker: getTradingViewSymbol(event.asset_class)
        })) as MarketEvent[];

        setEvents(mappedEvents);
        // Auto-select the most recent event if nothing is selected
        setSelectedFeedItem((prev) => prev || mappedEvents[0]);
      }
    } catch (err) {
      console.error('Failed to fetch events:', err);
      setFeedError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();

    // Auto-refresh every 60 seconds
    const interval = setInterval(() => {
      fetchEvents();
    }, 60000);

    return () => clearInterval(interval);
  }, []);

  const filteredEvents = events.filter((event) => {
    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase();
      const matchTitle = event.title.toLowerCase().includes(q);
      const matchRationale = event.rationale?.toLowerCase().includes(q) || false;
      const matchSource = event.source.toLowerCase().includes(q);
      const matchAssets =
        event.bullish_assets?.some((a) => a.toLowerCase().includes(q)) ||
        event.bearish_assets?.some((a) => a.toLowerCase().includes(q)) ||
        false;

      return matchTitle || matchRationale || matchSource || matchAssets;
    }
    return true;
  });

  return (
    <div className="h-screen w-screen bg-[#09090b] text-zinc-100 overflow-hidden flex flex-col font-sans">
      {/* Top Header Bar */}
      <header className="h-14 border-b border-zinc-800 bg-[#09090b] flex items-center justify-between px-4 shrink-0">
        <div className="flex items-baseline gap-4">
          <h1 className="text-xl font-black tracking-tight text-white uppercase">
            MacroPulse Terminal
          </h1>
          <span className="text-[10px] font-mono font-bold tracking-wider text-zinc-500 uppercase">
            Live Feed
          </span>
        </div>
        <div className="flex flex-1 max-w-md mx-4 relative">
          <input
            type="text"
            placeholder="Search assets, tickers, keywords..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#18181b] border border-zinc-800 rounded px-3 py-1.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-700"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
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

      {/* Main Grid Area */}
      <main className="flex-1 grid grid-cols-12 overflow-hidden bg-[#09090b]">
        {/* Left Pane: News Feed */}
        <div className="col-span-3 border-r border-zinc-800 flex flex-col overflow-hidden bg-[#09090b] relative">
          <TerminalErrorBoundary isActive={feedError}>
            <div className="h-8 border-b border-zinc-800 flex items-center px-3 bg-zinc-900/50 shrink-0">
              <span className="text-[10px] font-mono font-bold text-zinc-400 uppercase tracking-widest">
                Event Stream
              </span>
            </div>
            <div className="flex-1 overflow-y-auto">
              {loading && events.length === 0 ? (
                <div className="p-4 text-center text-zinc-600 text-xs font-mono uppercase">
                  Loading Data...
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
              ) : (
                <div className="p-4 text-center text-zinc-600 text-xs font-mono uppercase">
                  No events matched query
                </div>
              )}
            </div>
          </TerminalErrorBoundary>
        </div>

        {/* Right Pane: Charts & Analysis */}
        <div className={`col-span-9 flex flex-col overflow-hidden bg-[#09090b] transition-all duration-300 relative ${
          selectedFeedItem 
            ? 'ring-1 ring-cyan-500/30 shadow-[0_0_15px_rgba(6,182,212,0.15)] z-10' 
            : ''
        }`}>
          {/* Top Right: TradingView Chart */}
          <div className="flex-[3] border-b border-zinc-800 overflow-hidden relative">
            <TerminalErrorBoundary>
              <ChartPane event={selectedFeedItem} />
            </TerminalErrorBoundary>
          </div>

          {/* Bottom Right: AI Analysis */}
          <div className="flex-[2] overflow-hidden relative bg-[#09090b]">
            <TerminalErrorBoundary>
              <AnalysisPane event={selectedFeedItem} />
            </TerminalErrorBoundary>
          </div>
        </div>
      </main>
    </div>
  );
}
