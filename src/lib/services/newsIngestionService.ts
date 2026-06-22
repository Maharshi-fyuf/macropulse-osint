import Parser from 'rss-parser';
import { supabaseAdmin } from '@/lib/supabase';
import { fetchSingleFeed, FeedResult, RawItem } from '../rss/feedFetcher';
import { analyzeWithGemini, generateNarrative } from '../ai/geminiClient';

const DEFAULT_FEEDS = [
  'https://feeds.bbci.co.uk/news/business/rss.xml',
  'https://www.theguardian.com/business/economics/rss',
  'https://feeds.marketwatch.com/marketwatch/topstories/',
  'https://rss.nytimes.com/services/xml/rss/nyt/Economy.xml',
  'https://www.moneycontrol.com/rss/economy.xml',
  'https://economictimes.indiatimes.com/rssfeedsdefault.cms',
  'https://b2b.economictimes.indiatimes.com/rss/topstories',
  'https://www.livemint.com/rss/news',
  'https://search.cnbc.com/rs/search/combinedcms/view.xml?id=10001147',
  'https://feeds.bloomberg.com/markets/news.rss',
  'https://www.theguardian.com/world/rss',
];

const RECENCY_GATE_HOURS = 48;
const MAX_ITEMS_PER_RUN = 5;
const GEMINI_INTER_REQUEST_DELAY_MS = 5000;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Phase 1: Ingestion only (No AI execution)
export async function processNewsIngestion() {
  const recencyCutoff = new Date(Date.now() - RECENCY_GATE_HOURS * 60 * 60 * 1000);

  const parser = new Parser({
    customFields: { item: [['media:content', 'mediaContent'], ['dc:creator', 'creator']] },
    headers: {
      'User-Agent': 'MacroPulse/1.0 (RSS Reader; +https://macropulse-terminal-solos.vercel.app)',
      'Accept': 'application/rss+xml, application/xml, application/atom+xml, text/xml, */*',
    },
  });

  const settledResults = await Promise.allSettled(
    DEFAULT_FEEDS.map((feedUrl) => fetchSingleFeed(feedUrl, parser, recencyCutoff))
  );

  const allItems: RawItem[] = [];
  const feedResults: FeedResult[] = [];

  for (const settled of settledResults) {
    if (settled.status === 'fulfilled') {
      allItems.push(...settled.value.items);
      feedResults.push(settled.value.result);
    } else {
      feedResults.push({ url: 'unknown', status: 'error', error: String(settled.reason) });
    }
  }

  const totalFresh = allItems.length;

  if (totalFresh === 0) {
    return { message: 'No fresh articles found', feedResults, status: 200 };
  }

  let newItems = [...allItems];
  let dedupStatus = 'skipped';

  try {
    const urls = allItems.map((item) => item.link);
    const BATCH_SIZE = 50;
    const existingUrlsSet = new Set<string>();

    for (let i = 0; i < urls.length; i += BATCH_SIZE) {
      const batch = urls.slice(i, i + BATCH_SIZE);
      const { data: existingEvents, error: dbError } = await supabaseAdmin
        .from('events')
        .select('url')
        .in('url', batch);

      if (dbError) {
        console.warn('[Cron Warn] Supabase dedup query warning:', dbError.message);
        continue;
      }
      existingEvents?.forEach((e: { url: string }) => existingUrlsSet.add(e.url));
    }

    newItems = allItems.filter((item) => !existingUrlsSet.has(item.link));
    dedupStatus = `checked — ${existingUrlsSet.size} already in DB, ${newItems.length} new`;
  } catch (dedupError: unknown) {
    const msg = dedupError instanceof Error ? dedupError.message : String(dedupError);
    dedupStatus = `failed: ${msg}`;
  }

  if (newItems.length === 0) {
    return { message: 'No new articles to process', feedResults, dedupStatus, status: 200 };
  }

  // Insert all new raw items immediately as 'pending'
  const insertPayloads = newItems.map(item => ({
    title: item.title,
    source: item.source,
    url: item.link,
    published_at: item.pubDate,
    raw_content: item.content,
    analysis_status: 'pending',
    analysis_attempts: 0
  }));

  let insertedCount = 0;
  let insertError: string | undefined;

  // Insert in chunks of 50 to avoid limits
  for (let i = 0; i < insertPayloads.length; i += 50) {
    const chunk = insertPayloads.slice(i, i + 50);
    const { error: dbErr } = await supabaseAdmin
      .from('events')
      .upsert(chunk, { onConflict: 'url', ignoreDuplicates: true });

    if (dbErr) {
      insertError = dbErr.message;
      console.error('[Ingestion] DB insert error:', dbErr);
    } else {
      insertedCount += chunk.length;
    }
  }

  return {
    message: 'RSS raw ingestion completed',
    total_fresh_from_feeds: totalFresh,
    new_after_dedup: newItems.length,
    successfully_inserted: insertedCount,
    insert_error: insertError,
    dedupStatus,
    feedResults,
    status: 200,
  };
}

// Phase 2: Asynchronous Enrichment Batch
export async function processEnrichmentBatch() {
  const { data: pendingEvents, error: fetchError } = await supabaseAdmin
    .from('events')
    .select('*')
    .eq('analysis_status', 'pending')
    .order('published_at', { ascending: false })
    .limit(MAX_ITEMS_PER_RUN);

  if (fetchError) {
    return { message: 'Failed to fetch pending events', error: fetchError.message, status: 500 };
  }

  if (!pendingEvents || pendingEvents.length === 0) {
    return { message: 'No pending events to enrich', status: 200 };
  }

  // Immediately update them to 'processing' to prevent duplicate execution
  const pendingIds = pendingEvents.map(e => e.id);
  await supabaseAdmin
    .from('events')
    .update({ analysis_status: 'processing' })
    .in('id', pendingIds);

  const processedLog: Array<{ id: string; title: string; status: string; error?: string }> = [];
  let successCount = 0;

  for (const event of pendingEvents) {
    let newStatus = 'failed';
    let errorMessage = '';
    let aiData: Record<string, unknown> = {};

    try {
      const itemToAnalyze = {
        title: event.title,
        source: event.source,
        content: event.raw_content || event.title
      };

      const analysis = await analyzeWithGemini(itemToAnalyze);
      if (analysis) {
        newStatus = 'analyzed';
        aiData = {
          is_market_moving: analysis.is_market_moving,
          rationale: analysis.rationale,
          severity_score: analysis.severity_score,
          asset_class: analysis.primary_asset_class,
          bullish_assets: analysis.bullish_assets,
          bearish_assets: analysis.bearish_assets,
          first_order_impact: analysis.first_order_impact,
          second_order_effect: analysis.second_order_effect,
          hidden_vulnerability: analysis.hidden_vulnerability,
          confidence_reasoning: analysis.confidence_reasoning,
        };
        successCount++;
        processedLog.push({ id: event.id, title: event.title, status: 'analyzed' });
      } else {
        errorMessage = 'Validation returned null';
        processedLog.push({ id: event.id, title: event.title, status: 'failed', error: errorMessage });
      }
    } catch (itemError: unknown) {
      errorMessage = itemError instanceof Error ? itemError.message : String(itemError);
      processedLog.push({ id: event.id, title: event.title, status: 'failed', error: errorMessage });
    }

    const updatePayload = {
      ...aiData,
      analysis_status: newStatus,
      analysis_attempts: (event.analysis_attempts || 0) + 1,
      ...(newStatus === 'failed' ? { last_analysis_error: errorMessage } : {})
    };

    // Update row individually to ensure partial progress is saved
    await supabaseAdmin
      .from('events')
      .update(updatePayload)
      .eq('id', event.id);

    await sleep(GEMINI_INTER_REQUEST_DELAY_MS);
  }

  // Check if narrative should be generated (Throttling: Once per hour)
  try {
    const { data: lastNarrative } = await supabaseAdmin
      .from('narratives')
      .select('created_at')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    let shouldGenerate = false;
    if (!lastNarrative) {
      shouldGenerate = true;
    } else {
      const hoursSinceLast = (Date.now() - new Date(lastNarrative.created_at).getTime()) / (1000 * 60 * 60);
      if (hoursSinceLast >= 1) {
        shouldGenerate = true;
      }
    }

    if (shouldGenerate && successCount > 0) {
      const { data: recentAnalyzed } = await supabaseAdmin
        .from('events')
        .select('*')
        .eq('analysis_status', 'analyzed')
        .order('published_at', { ascending: false })
        .limit(20);

      if (recentAnalyzed && recentAnalyzed.length > 0) {
        const narrative = await generateNarrative(recentAnalyzed);
        if (narrative) {
          await supabaseAdmin.from('narratives').insert({
            dominant_theme: narrative.dominant_theme,
            key_risks: narrative.key_risks,
            bullish_assets: narrative.bullish_assets,
            bearish_assets: narrative.bearish_assets,
            summary: narrative.summary
          });
        }
      }
    }
  } catch (narrativeError) {
    console.error('Narrative generation failed during enrichment:', narrativeError);
  }

  return {
    message: 'Enrichment batch completed',
    attempted: pendingEvents.length,
    successful: successCount,
    processed: processedLog,
    status: 200,
  };
}
