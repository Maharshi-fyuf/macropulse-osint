import Parser from 'rss-parser';
import { GoogleGenAI } from '@google/genai';
import { supabaseAdmin } from '@/lib/supabase';
import { fetchSingleFeed, FeedResult, RawItem } from '../rss/feedFetcher';
import { analyzeWithGemini } from '../ai/geminiClient';

const DEFAULT_FEEDS = [
  'https://feeds.bbci.co.uk/news/business/rss.xml',
  'https://www.theguardian.com/business/economics/rss',
  'https://feeds.marketwatch.com/marketwatch/topstories/',
  'https://rss.nytimes.com/services/xml/rss/nyt/Economy.xml',
  'https://www.moneycontrol.com/rss/economy.xml',
  'https://economictimes.indiatimes.com/rssfeedsdefault.cms',
  'https://feeds.bloomberg.com/markets/news.rss',
  'https://www.theguardian.com/world/rss',
];

const RECENCY_GATE_HOURS = 48;
const MAX_ITEMS_PER_RUN = 5;
const GEMINI_INTER_REQUEST_DELAY_MS = 5000;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

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
    return {
      message: 'No fresh articles found (all within recency gate or feeds failed)',
      feedResults,
      status: 200,
    };
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
    console.warn('[Cron Warn] Dedup failed, processing all fresh items:', msg);
    dedupStatus = `failed: ${msg}`;
  }

  if (newItems.length === 0) {
    return {
      message: 'No new articles to process (all already in DB)',
      feedResults,
      dedupStatus,
      status: 200,
    };
  }

  const itemsBySource: Record<string, RawItem[]> = {};
  for (const item of newItems) {
    if (!itemsBySource[item.source]) itemsBySource[item.source] = [];
    itemsBySource[item.source].push(item);
  }

  for (const source in itemsBySource) {
    itemsBySource[source].sort((a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime());
  }

  const itemsToProcess: RawItem[] = [];
  let hasMore = true;
  while (itemsToProcess.length < MAX_ITEMS_PER_RUN && hasMore) {
    hasMore = false;
    for (const source in itemsBySource) {
      if (itemsToProcess.length >= MAX_ITEMS_PER_RUN) break;
      const sourceQueue = itemsBySource[source];
      if (sourceQueue.length > 0) {
        const nextItem = sourceQueue.shift();
        if (nextItem) itemsToProcess.push(nextItem);
        hasMore = true;
      }
    }
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not defined');
  }
  const ai = new GoogleGenAI({ apiKey });

  const upsertPayloads: Array<{
    title: string;
    source: string;
    url: string;
    published_at: string;
    is_market_moving: boolean;
    rationale: string;
    severity_score: number;
    asset_class: string;
    bullish_assets: string[];
    bearish_assets: string[];
  }> = [];

  const processedLog: Array<{ title: string; status: string; source?: string; error?: string }> = [];

  for (const item of itemsToProcess) {
    try {
      const analysis = await analyzeWithGemini(ai, item);
      if (analysis) {
        upsertPayloads.push({
          title: item.title,
          source: item.source,
          url: item.link,
          published_at: item.pubDate,
          is_market_moving: analysis.is_market_moving,
          rationale: analysis.rationale,
          severity_score: analysis.severity_score,
          asset_class: analysis.primary_asset_class,
          bullish_assets: analysis.bullish_assets,
          bearish_assets: analysis.bearish_assets,
        });

        processedLog.push({
          title: item.title,
          status: 'analysed',
          source: item.source,
        });
      } else {
        processedLog.push({ title: item.title, status: 'analysis_failed', error: 'Validation returned null' });
      }
    } catch (itemError: unknown) {
      const msg = itemError instanceof Error ? itemError.message : String(itemError);
      processedLog.push({ title: item.title, status: 'analysis_failed', error: msg });
    }

    await sleep(GEMINI_INTER_REQUEST_DELAY_MS);
  }

  let insertedCount = 0;
  let upsertError: string | undefined;

  if (upsertPayloads.length > 0) {
    const { error: dbErr } = await supabaseAdmin
      .from('events')
      .upsert(upsertPayloads, {
        onConflict: 'url',
        ignoreDuplicates: false,
      });

    if (dbErr) {
      upsertError = dbErr.message;
    } else {
      insertedCount = upsertPayloads.length;
    }
  }

  return {
    message: 'RSS ingestion completed',
    recency_gate_hours: RECENCY_GATE_HOURS,
    total_fresh_from_feeds: totalFresh,
    new_after_dedup: newItems.length,
    attempted_processing: itemsToProcess.length,
    successfully_upserted: insertedCount,
    upsert_error: upsertError,
    processed: processedLog,
    dedupStatus,
    feedResults,
    status: 200,
  };
}
