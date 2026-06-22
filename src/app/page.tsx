'use client';

import React, { useState, useEffect, useRef } from 'react';
import TopRibbon from '@/components/TopRibbon';
import MarketNarrative from '@/components/MarketNarrative';
import QuantTape from '@/components/QuantTape';
import { supabase } from '@/lib/supabase-client';
import FeedItem, { MarketEvent } from '@/components/FeedItem';
import { getTradingViewSymbol } from '@/lib/tickerMap';
import TerminalErrorBoundary from '@/components/TerminalErrorBoundary';

// Define the raw event shape from Supabase to avoid using any
interface RawSupabaseEvent {
  id: string;
  title?: string;
  source?: string;
  published_at?: string;
  created_at?: string;
  rationale?: string;
  severity_score?: number;
  bullish_assets?: unknown;
  bearish_assets?: unknown;
  asset_class?: string;
  analysis_status?: string;
  [key: string]: unknown;
}

export default function Home() {
  const [events, setEvents] = useState<MarketEvent[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [queueStats, setQueueStats] = useState({ analyzed: 0, processing: 0, pending: 0, failed: 0 });

  useEffect(() => {
    let isMounted = true;
    async function fetchEvents() {
      try {
        setLoadingEvents(true);
        
        const [analyzedRes, pendingRes, processingRes, failedRes] = await Promise.all([
          supabase.from('events').select('*', { count: 'exact', head: true }).or('analysis_status.eq.analyzed,analysis_status.is.null'),
          supabase.from('events').select('*', { count: 'exact', head: true }).eq('analysis_status', 'pending'),
          supabase.from('events').select('*', { count: 'exact', head: true }).eq('analysis_status', 'processing'),
          supabase.from('events').select('*', { count: 'exact', head: true }).eq('analysis_status', 'failed'),
        ]);

        if (isMounted) {
          setQueueStats({
            analyzed: analyzedRes.count || 0,
            pending: pendingRes.count || 0,
            processing: processingRes.count || 0,
            failed: failedRes.count || 0,
          });
        }

        const [analyzedData, otherData] = await Promise.all([
          supabase.from('events').select('*').or('analysis_status.eq.analyzed,analysis_status.is.null').order('published_at', { ascending: false }).limit(100),
          supabase.from('events').select('*').in('analysis_status', ['pending', 'processing']).order('published_at', { ascending: false }).limit(100)
        ]);

        if (analyzedData.error) console.error('Error fetching analyzed events:', analyzedData.error);
        if (otherData.error) console.error('Error fetching pending events:', otherData.error);

        const combinedData: RawSupabaseEvent[] = [];
        const seenIds = new Set();
        [...(analyzedData.data || []), ...(otherData.data || [])].forEach(e => {
          if (!seenIds.has(e.id)) {
            combinedData.push(e);
            seenIds.add(e.id);
          }
        });

        if (combinedData.length > 0 && isMounted) {
          const mappedEvents = combinedData.map((event: RawSupabaseEvent) => ({
            ...event,
            title: event.title || 'Untitled Event',
            source: event.source || 'Unknown Source',
            published_at: event.published_at || event.created_at || new Date().toISOString(),
            content: event.rationale || '',
            severity_score: event.severity_score || 0,
            bullish_assets: Array.isArray(event.bullish_assets) ? event.bullish_assets : [],
            bearish_assets: Array.isArray(event.bearish_assets) ? event.bearish_assets : [],
            ticker: getTradingViewSymbol(event.asset_class),
            analysis_status: event.analysis_status || 'analyzed'
          })) as MarketEvent[];
          
          const statusWeight: Record<string, number> = {
            analyzed: 1,
            processing: 2,
            pending: 3,
            failed: 4
          };
          
          mappedEvents.sort((a, b) => {
             const weightA = statusWeight[a.analysis_status || 'analyzed'];
             const weightB = statusWeight[b.analysis_status || 'analyzed'];
             if (weightA !== weightB) return weightA - weightB;
             return new Date(b.published_at).getTime() - new Date(a.published_at).getTime();
          });

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
      
      <div className="h-8 border-b border-slate-800 bg-slate-900 flex justify-center items-center px-4 shrink-0 text-[9px] sm:text-[10px] font-bold uppercase tracking-widest text-slate-400">
        <span className="hidden sm:inline">INTELLIGENCE QUEUE:</span>
        <span className="mx-2 text-emerald-400">ANALYZED: {queueStats.analyzed}</span>|
        <span className="mx-2 text-blue-400">AI ENRICHMENT: {queueStats.processing}</span>|
        <span className="mx-2 text-slate-400">PENDING: {queueStats.pending}</span>|
        <span className="mx-2 text-red-500">FAILED: {queueStats.failed}</span>
      </div>
      
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
