import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase-client';
import YahooFinance from 'yahoo-finance2';

const yahooFinance = new YahooFinance();
export const revalidate = 60; // 60s cache

export async function GET() {
  const health = {
    rss: 'green',
    ai: 'green',
    db: 'green',
    mkt: 'green'
  };

  try {
    // Check DB
    const { error: dbError } = await supabase.from('events').select('id').limit(1);
    if (dbError) health.db = 'red';

    // Check MKT (yahoo finance)
    try {
      await yahooFinance.quote('^NSEI');
    } catch {
      health.mkt = 'red';
    }

    // Check AI (Narrative generation timestamp)
    const { data: narrative, error: aiError } = await supabase.from('narratives').select('created_at').order('created_at', { ascending: false }).limit(1).single();
    if (aiError || !narrative) {
      health.ai = 'yellow';
    } else {
      const hoursSince = (Date.now() - new Date(narrative.created_at).getTime()) / 3600000;
      if (hoursSince > 24) health.ai = 'red';
    }

    // Check RSS (Latest event timestamp)
    const { data: event, error: rssError } = await supabase.from('events').select('published_at').order('published_at', { ascending: false }).limit(1).single();
    if (rssError || !event) {
      health.rss = 'yellow';
    } else {
      const hoursSinceRss = (Date.now() - new Date(event.published_at).getTime()) / 3600000;
      if (hoursSinceRss > 48) health.rss = 'red';
    }

    return NextResponse.json(health);
  } catch {
    return NextResponse.json(health, { status: 500 });
  }
}
