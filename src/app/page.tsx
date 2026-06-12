'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/lib/supabase-client';
import EventCard, { MarketEvent } from '@/components/EventCard';
import FilterBar from '@/components/FilterBar';

export default function Home() {
  const [events, setEvents] = useState<MarketEvent[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [pullProgress, setPullProgress] = useState(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const touchStartRef = useRef(0);
  const isPullingRef = useRef(false);

  // Fetch events from Supabase anon client
  const fetchEvents = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    try {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .order('published_at', { ascending: false })
        .limit(30); // fetch 30 to make sure we have enough to display and filter

      if (error) {
        console.error('Error fetching events:', error);
      } else if (data) {
        setEvents(data as MarketEvent[]);
      }
    } catch (err) {
      console.error('Failed to fetch events:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
      setPullProgress(0);
    }
  }, []);

  // Fetch initially
  useEffect(() => {
    fetchEvents();

    // Setup a polling interval to auto-refresh every 60 seconds
    const interval = setInterval(() => {
      fetchEvents(true);
    }, 60000);

    return () => clearInterval(interval);
  }, [fetchEvents]);

  // Touch handlers for Pull-to-Refresh
  const handleTouchStart = (e: React.TouchEvent) => {
    if (window.scrollY === 0) {
      touchStartRef.current = e.touches[0].pageY;
      isPullingRef.current = true;
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isPullingRef.current) return;
    const currentY = e.touches[0].pageY;
    const diffY = currentY - touchStartRef.current;

    if (diffY > 0 && window.scrollY === 0) {
      // Apply resistance
      const progress = Math.min(100, Math.floor(diffY / 2.5));
      setPullProgress(progress);

      // Prevent browser default scroll bounce
      if (progress > 5 && e.cancelable) {
        e.preventDefault();
      }
    }
  };

  const handleTouchEnd = () => {
    if (!isPullingRef.current) return;
    isPullingRef.current = false;

    if (pullProgress >= 70) {
      setRefreshing(true);
      fetchEvents(true);
    } else {
      setPullProgress(0);
    }
  };

  // Filter and Search logic
  const filteredEvents = events.filter((event) => {
    // 1. Category Filter
    if (selectedCategory === 'High Risk') {
      if (event.severity_score < 8) return false;
    } else if (selectedCategory !== 'All') {
      if (event.asset_class?.toLowerCase() !== selectedCategory.toLowerCase()) {
        return false;
      }
    }

    // 2. Search Query Filter (Title, Rationale, bullish/bearish assets)
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
    <div
      ref={containerRef}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      className="min-h-screen bg-[#0D0D0D] text-zinc-100 flex flex-col max-w-md mx-auto border-x border-zinc-900 shadow-2xl relative"
    >
      {/* Pull down Refresh Indicator */}
      <div
        className="w-full flex items-center justify-center bg-zinc-950 overflow-hidden transition-all duration-200"
        style={{
          height: refreshing ? '50px' : pullProgress > 0 ? `${pullProgress / 1.5}px` : '0px',
          opacity: refreshing || pullProgress > 10 ? 1 : 0,
        }}
      >
        <span className="text-xs font-mono font-bold tracking-widest text-zinc-400">
          {refreshing ? '🔄 REFRESHING DATA...' : `↓ PULL TO REFRESH (${pullProgress}%)`}
        </span>
      </div>

      {/* Header */}
      <header className="px-4 pt-6 pb-2 flex justify-between items-center border-b border-zinc-900 bg-zinc-950/80 backdrop-blur sticky top-0 z-20">
        <div>
          <h1 className="text-xl font-black tracking-tight text-white uppercase">
            MacroPulse
          </h1>
          <p className="text-[10px] font-mono font-bold tracking-wider text-zinc-500 uppercase mt-0.5">
            Geopolitical OSINT Feed
          </p>
        </div>
        <div className="flex items-center gap-1.5 bg-green-950/20 px-2.5 py-1 rounded-full border border-green-900/30">
          <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span>
          <span className="text-[10px] font-bold text-green-400 tracking-wide uppercase">
            Live Feed
          </span>
        </div>
      </header>

      {/* Category Selection Filter Chips */}
      <FilterBar
        selectedCategory={selectedCategory}
        onSelectCategory={setSelectedCategory}
      />

      {/* Search Bar */}
      <div className="px-4 py-2 bg-[#0D0D0D] border-b border-zinc-900">
        <div className="relative">
          <input
            type="text"
            placeholder="Search assets, tickers, keywords..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#1A1A1A] border border-zinc-800 rounded-lg py-1.5 pl-3 pr-8 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-700 font-medium"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white text-xs font-bold"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Main Stream Dashboard */}
      <main className="flex-1 px-4 py-4 overflow-y-auto">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-zinc-500 gap-3">
            <div className="w-6 h-6 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
            <span className="text-[11px] font-mono tracking-widest font-bold">LOADING TERMINAL DATA...</span>
          </div>
        ) : filteredEvents.length > 0 ? (
          filteredEvents.map((event) => (
            <EventCard key={event.id} event={event} />
          ))
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-center text-zinc-500 border border-dashed border-zinc-800 rounded-xl px-4">
            <span className="text-2xl mb-2">📭</span>
            <span className="text-xs font-mono font-bold tracking-wider uppercase mb-1">
              No events matched query
            </span>
            <span className="text-[10px] text-zinc-600">
              Try modifying search keywords or category filters
            </span>
          </div>
        )}
      </main>

      {/* Bottom Nav / Refresh */}
      <footer className="py-4 border-t border-zinc-900 text-center bg-zinc-950/30">
        <button
          onClick={() => {
            setRefreshing(true);
            fetchEvents(true);
          }}
          disabled={refreshing}
          className="text-[11px] font-mono tracking-wider font-bold text-zinc-500 uppercase hover:text-white transition-colors"
        >
          {refreshing ? 'REFRESHING...' : '↓ Pull or Click to Refresh ↓'}
        </button>
      </footer>
    </div>
  );
}
