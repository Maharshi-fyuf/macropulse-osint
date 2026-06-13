import { NextResponse } from 'next/server';
import Parser from 'rss-parser';
import { GoogleGenAI } from '@google/genai';
import { supabaseAdmin } from '@/lib/supabase';

// ── Types ─────────────────────────────────────────────────────────────────────

interface GeminiAnalysis {
  is_market_moving: boolean;
  rationale: string;
  severity_score: number;
  primary_asset_class: 'Energy' | 'Metals' | 'Forex' | 'Equities' | 'None';
  bullish_assets: string[];
  bearish_assets: string[];
}

interface RawItem {
  title: string;
  link: string;
  content: string;
  pubDate: string; // ISO string
  source: string;
}

interface FeedResult {
  url: string;
  status: 'ok' | 'http_error' | 'parse_error' | 'timeout' | 'error';
  itemCount?: number;
  freshItemCount?: number;
  error?: string;
}

// ── Feed configuration ────────────────────────────────────────────────────────
// Reuters agency feed (reutersagency.com/feed) is confirmed 404 dead.
// Replaced with Reuters via Feedburner mirror which is stable.
const DEFAULT_FEEDS = [
  'https://feeds.bbci.co.uk/news/business/rss.xml',
  'https://www.theguardian.com/business/economics/rss',
  'https://feeds.marketwatch.com/marketwatch/topstories/',
  'https://rss.nytimes.com/services/xml/rss/nyt/Economy.xml',
  'https://www.moneycontrol.com/rss/economy.xml',
  // Economic Times — default feed (markets/rss.cms has broken doctype declaration)
  'https://economictimes.indiatimes.com/rssfeedsdefault.cms',
  'https://feeds.bloomberg.com/markets/news.rss',
  // Reuters — agency primary feed is 404; Feedburner mirror also dead.
  // Using The Guardian world news as a replacement for global geopolitical coverage.
  'https://www.theguardian.com/world/rss',
];

// ── Recency gate ──────────────────────────────────────────────────────────────
// Only process articles published within the last 48 hours.
// This prevents old-backlog saturation where high-volume sources (BBC) fill
// the processing window with 20-40 day old articles before newer sources land.
const RECENCY_GATE_HOURS = 48;

// ── Rate limit config ─────────────────────────────────────────────────────────
// Gemini free tier: 15 RPM / 1500 RPD.
// Drip-feed approach: 5 items × 5s hard delay = ~25s per run, capped at 12 RPM.
// This native throttle makes 429 errors structurally impossible.
const MAX_ITEMS_PER_RUN = 5;                  // 5 items per cron trigger
const GEMINI_INTER_REQUEST_DELAY_MS = 5000;   // 5s hard pause → never exceeds 12 RPM

// ── Helpers ───────────────────────────────────────────────────────────────────

function parseSafeDate(dateStr: string | undefined | null): string {
  if (!dateStr) return new Date().toISOString();
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return new Date().toISOString();
  return d.toISOString();
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Fetches and parses a single RSS feed URL.
 * Fully isolated — any error is caught and returned as a FeedResult with status='error'.
 * Never throws; never blocks other feeds.
 */
async function fetchSingleFeed(
  feedUrl: string,
  parser: Parser,
  recencyCutoff: Date
): Promise<{ items: RawItem[]; result: FeedResult }> {
  try {
    const response = await fetch(feedUrl, {
      headers: {
        'User-Agent': 'MacroPulse/1.0 (RSS Reader; +https://macropulse-terminal-solos.vercel.app)',
        'Accept': 'application/rss+xml, application/xml, application/atom+xml, text/xml, */*',
      },
      signal: AbortSignal.timeout(12000), // 12s per feed — leaves room for 8 feeds in parallel
    });

    if (!response.ok) {
      return {
        items: [],
        result: { url: feedUrl, status: 'http_error', error: `HTTP ${response.status} ${response.statusText}` },
      };
    }

    let xml = await response.text();

    // Sanitize bare & that aren't already valid XML entities
    xml = xml.replace(/&(?!(?:apos|quot|[gl]t|amp);|#)/g, '&amp;');

    let parsedFeed: Parser.Output<Record<string, unknown>>;
    try {
      parsedFeed = await parser.parseString(xml);
    } catch (parseErr: any) {
      // XML schema change from a publisher — log it but keep other feeds running
      console.error(`[Cron Error] XML parse failed for ${feedUrl}:`, parseErr?.message);
      return {
        items: [],
        result: { url: feedUrl, status: 'parse_error', error: parseErr?.message || String(parseErr) },
      };
    }

    const feedTitle = parsedFeed.title || new URL(feedUrl).hostname;
    const items: RawItem[] = [];

    for (const item of parsedFeed.items) {
      const itemLink = item.link || (item as any).guid || '';
      if (!item.title || !itemLink) continue;

      const pubDate = parseSafeDate((item as any).isoDate || item.pubDate);

      // ── Recency gate: skip articles older than RECENCY_GATE_HOURS ──────
      if (new Date(pubDate) < recencyCutoff) continue;

      items.push({
        title: item.title,
        link: itemLink,
        content: item.contentSnippet || (item as any).content || (item as any).summary || item.title,
        pubDate,
        source: feedTitle,
      });
    }

    const totalItems = parsedFeed.items.length;
    console.log(`[Cron Info] Scraped ${items.length} fresh items (of ${totalItems} total) from "${feedTitle}" — ${feedUrl}`);

    return {
      items,
      result: { url: feedUrl, status: 'ok', itemCount: totalItems, freshItemCount: items.length },
    };
  } catch (err: any) {
    const isTimeout = err?.name === 'TimeoutError' || err?.name === 'AbortError';
    console.error(`[Cron Error] ${isTimeout ? 'Timeout' : 'Network error'} fetching ${feedUrl}:`, err?.message);
    return {
      items: [],
      result: { url: feedUrl, status: isTimeout ? 'timeout' : 'error', error: err?.message || String(err) },
    };
  }
}

/**
 * Calls Gemini to analyze a single news item and returns a structured GeminiAnalysis.
 * Throws on any error so the caller can log and skip the item cleanly.
 * Rate-limiting is handled externally via the 5s drip-feed delay in the caller loop.
 */
async function analyzeWithGemini(
  ai: GoogleGenAI,
  item: RawItem
): Promise<GeminiAnalysis> {
  const prompt = `You are a senior macro-economic trading analyst and geopolitical OSINT expert.
Analyze the following news item:
Title: ${item.title}
Source: ${item.source}
Content: ${item.content}

Output exactly a single JSON object matching this schema:
{
  "is_market_moving": boolean,
  "rationale": "1-2 sentence explanation of the geopolitical context",
  "severity_score": integer (1-10),
  "primary_asset_class": "Energy" | "Metals" | "Forex" | "Equities" | "None",
  "bullish_assets": ["Asset/Ticker 1: Reason why", "Asset 2: Reason why"],
  "bearish_assets": ["Asset/Ticker 1: Reason why", "Asset 2: Reason why"]
}
If "is_market_moving" is false, return "None" for asset class and empty arrays. Do not add markdown code blocks around the JSON string.`;

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: prompt,
    config: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: 'OBJECT',
        properties: {
          is_market_moving: { type: 'BOOLEAN' },
          rationale: { type: 'STRING' },
          severity_score: { type: 'INTEGER' },
          primary_asset_class: {
            type: 'STRING',
            enum: ['Energy', 'Metals', 'Forex', 'Equities', 'None'],
          },
          bullish_assets: { type: 'ARRAY', items: { type: 'STRING' } },
          bearish_assets: { type: 'ARRAY', items: { type: 'STRING' } },
        },
        required: [
          'is_market_moving',
          'rationale',
          'severity_score',
          'primary_asset_class',
          'bullish_assets',
          'bearish_assets',
        ],
      },
    },
  });

  const jsonText = response.text;
  if (!jsonText) throw new Error('Gemini returned an empty text response.');

  // Strip any accidental markdown code fences
  const cleaned = jsonText
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/, '')
    .replace(/```/g, '')
    .trim();

  return JSON.parse(cleaned) as GeminiAnalysis;
}

// ── Route handler ─────────────────────────────────────────────────────────────

export async function GET(request: Request) {
  try {
    // ── 1. Auth ──────────────────────────────────────────────────────────────
    const url = new URL(request.url);
    const secretParam = url.searchParams.get('secret');
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret || (authHeader !== `Bearer ${cronSecret}` && secretParam !== cronSecret)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // ── 2. Recency cutoff ────────────────────────────────────────────────────
    const recencyCutoff = new Date(Date.now() - RECENCY_GATE_HOURS * 60 * 60 * 1000);
    console.log(`[Cron Info] Recency gate: only articles published after ${recencyCutoff.toISOString()}`);

    // ── 3. Initialize RSS parser ─────────────────────────────────────────────
    const parser = new Parser({
      customFields: { item: [['media:content', 'mediaContent'], ['dc:creator', 'creator']] },
      headers: {
        'User-Agent': 'MacroPulse/1.0 (RSS Reader; +https://macropulse-terminal-solos.vercel.app)',
        'Accept': 'application/rss+xml, application/xml, application/atom+xml, text/xml, */*',
      },
    });

    // ── 4. Fetch all feeds concurrently via Promise.allSettled ───────────────
    // allSettled guarantees ALL feeds run regardless of individual failures.
    // Even if Reuters 404s or The Guardian times out, BBC and ET continue.
    console.log(`[Cron Info] Fetching ${DEFAULT_FEEDS.length} RSS feeds concurrently...`);

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
        // fetchSingleFeed never throws, so a 'rejected' here is a truly unexpected error
        console.error('[Cron Error] Unexpected feed promise rejection:', settled.reason);
        feedResults.push({ url: 'unknown', status: 'error', error: String(settled.reason) });
      }
    }

    const totalFresh = allItems.length;
    console.log(`[Cron Info] Total fresh articles across all feeds: ${totalFresh}`);

    if (totalFresh === 0) {
      return NextResponse.json(
        { message: 'No fresh articles found (all within recency gate or feeds failed)', feedResults },
        { status: 200 }
      );
    }

    // ── 5. Deduplication against existing DB URLs ─────────────────────────────
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
          console.warn('[Cron Warn] Supabase dedup query warning (non-fatal):', dbError.message);
          continue;
        }
        existingEvents?.forEach((e: { url: string }) => existingUrlsSet.add(e.url));
      }

      newItems = allItems.filter((item) => !existingUrlsSet.has(item.link));
      dedupStatus = `checked — ${existingUrlsSet.size} already in DB, ${newItems.length} new`;
      console.log(`[Cron Info] Dedup: ${dedupStatus}`);
    } catch (dedupError: any) {
      console.warn('[Cron Warn] Dedup failed, processing all fresh items:', dedupError?.message);
      dedupStatus = `failed: ${dedupError?.message || 'unknown'}`;
    }

    if (newItems.length === 0) {
      return NextResponse.json(
        { message: 'No new articles to process (all already in DB)', feedResults, dedupStatus },
        { status: 200 }
      );
    }

    // ── 6. Round-robin balance across sources (newest-first within each source) ─
    // Sort newest-first so the round-robin picks today's headlines over old backlog.
    const itemsBySource: Record<string, RawItem[]> = {};
    for (const item of newItems) {
      if (!itemsBySource[item.source]) itemsBySource[item.source] = [];
      itemsBySource[item.source].push(item);
    }

    for (const source in itemsBySource) {
      // Newest first — most recent articles get priority slots
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
          itemsToProcess.push(sourceQueue.shift()!);
          hasMore = true;
        }
      }
    }

    const sourceBreakdown = Object.fromEntries(
      Object.entries(itemsBySource).map(([k, v]) => [k, v.length])
    );
    console.log(`[Cron Info] Processing ${itemsToProcess.length} items (round-robin across sources). Remaining after cap:`, sourceBreakdown);

    // ── 7. Gemini analysis ───────────────────────────────────────────────────
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.error('[Cron Error] GEMINI_API_KEY is not defined');
      return NextResponse.json({ error: 'Gemini configuration error' }, { status: 500 });
    }
    const ai = new GoogleGenAI({ apiKey });

    // Collect all payloads for a single bulk upsert at the end
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
        const severityScore = Math.max(1, Math.min(10, Math.round(analysis.severity_score || 1)));

        upsertPayloads.push({
          title: item.title,
          source: item.source,
          url: item.link,
          published_at: item.pubDate,
          is_market_moving: analysis.is_market_moving,
          rationale: analysis.rationale,
          severity_score: severityScore,
          asset_class: analysis.primary_asset_class,
          bullish_assets: analysis.bullish_assets || [],
          bearish_assets: analysis.bearish_assets || [],
        });

        processedLog.push({
          title: item.title,
          status: 'analysed',
          source: item.source,
        });

        console.log(`[Cron Info] Analysed: "${item.title.slice(0, 60)}" [${item.source}]`);
      } catch (itemError: any) {
        console.error(`[Cron Error] Failed to analyse "${item.title.slice(0, 60)}":`, itemError?.message);
        processedLog.push({ title: item.title, status: 'analysis_failed', error: itemError?.message || String(itemError) });
      }

      // ── Drip-feed delay: 5s between every Gemini call ───────────────────
      // At 5s per gap and 5 items max, burst rate can never exceed 12 RPM,
      // structurally preventing 429 RESOURCE_EXHAUSTED on the free tier.
      await sleep(GEMINI_INTER_REQUEST_DELAY_MS);
    }

    // ── 8. Bulk upsert — single DB round-trip for all analysed articles ──────
    let insertedCount = 0;
    let upsertError: string | undefined;

    if (upsertPayloads.length > 0) {
      console.log(`[Cron Info] Upserting ${upsertPayloads.length} articles to Supabase...`);
      const { error: dbErr } = await supabaseAdmin
        .from('events')
        .upsert(upsertPayloads, {
          onConflict: 'url',         // url column must have a unique constraint
          ignoreDuplicates: false,   // update existing rows with fresh Gemini analysis if re-processed
        });

      if (dbErr) {
        console.error('[Cron Error] Bulk upsert failed:', dbErr.message, dbErr.details);
        upsertError = dbErr.message;
      } else {
        insertedCount = upsertPayloads.length;
        console.log(`[Cron Info] ✓ Successfully upserted ${insertedCount} articles.`);
      }
    }

    return NextResponse.json(
      {
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
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('[Cron Error] Fatal cron handler error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
