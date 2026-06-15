import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase-client';
import { getTradingViewSymbol } from '@/lib/tickerMap';
import { MarketEvent } from '@/components/FeedItem';
import { EventRecord } from '@/types/event';

export async function GET() {
  try {
    const date24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
    
    // Fetch all events from the last 24 hours
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .gte('published_at', date24h.toISOString())
      .order('published_at', { ascending: false });

    if (error) {
      console.error('Error fetching 24h events:', error);
      return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }

    if (!data || data.length === 0) {
      return NextResponse.json({ bullish: [], bearish: [] });
    }

    // Map to MarketEvent structure and calculate net sentiment score
    const eventsWithScore = data.map((event: EventRecord) => {
      const bullishCount = Array.isArray(event.bullish_assets) ? event.bullish_assets.length : 0;
      const bearishCount = Array.isArray(event.bearish_assets) ? event.bearish_assets.length : 0;
      
      let direction = 0;
      if (bullishCount > bearishCount) direction = 1;
      else if (bearishCount > bullishCount) direction = -1;
      else if (bullishCount > 0 && bearishCount > 0) direction = 1; // Slight bullish bias if tied and non-zero
      
      const netSentimentScore = direction * (event.severity_score / 10);
      
      return {
        ...event,
        title: event.title || 'Untitled Event',
        source: event.source || 'Unknown Source',
        published_at: event.published_at || event.created_at || new Date().toISOString(),
        content: event.rationale || '',
        severity_score: event.severity_score || 0,
        bullish_assets: Array.isArray(event.bullish_assets) ? event.bullish_assets : [],
        bearish_assets: Array.isArray(event.bearish_assets) ? event.bearish_assets : [],
        ticker: getTradingViewSymbol(event.asset_class),
        netSentimentScore
      };
    });

    // Filter out events with exactly 0 sentiment (no impact)
    const activeEvents = eventsWithScore.filter((e) => e.netSentimentScore !== 0);

    // Sort by sentiment (highest to lowest)
    const sorted = [...activeEvents].sort((a, b) => b.netSentimentScore - a.netSentimentScore);

    // Extract top 5 bullish (score > 0) and top 5 bearish (score < 0)
    const bullish = sorted.filter((e) => e.netSentimentScore > 0).slice(0, 5);
    // For bearish, we take the end of the array (most negative), and reverse it so the MOST negative is first
    const bearish = sorted.filter((e) => e.netSentimentScore < 0).slice(-5).reverse();

    return NextResponse.json({ bullish, bearish });
  } catch (err: unknown) {
    console.error('Fatal error in /api/market-movers:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
