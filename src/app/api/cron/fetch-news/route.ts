import { NextResponse } from 'next/server';
import Parser from 'rss-parser';
import { GoogleGenAI } from '@google/genai';
import { supabaseAdmin } from '@/lib/supabase';

// Define the structure of the Gemini analysis response
interface GeminiAnalysis {
  is_market_moving: boolean;
  rationale: string;
  severity_score: number;
  primary_asset_class: 'Energy' | 'Metals' | 'Forex' | 'Equities' | 'None';
  bullish_assets: string[];
  bearish_assets: string[];
}

const DEFAULT_FEEDS = [
  'https://search.cnbc.com/rs/search/combinedfeed.cxml',
  'https://www.reutersagency.com/feed/?taxonomy=keywords&term=geopolitics'
];

function parseSafeDate(dateStr: string | undefined | null): string {
  if (!dateStr) return new Date().toISOString();
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return new Date().toISOString();
  return d.toISOString();
}

export async function GET(request: Request) {
  try {
    // 1. Authenticate Request
    const url = new URL(request.url);
    const secretParam = url.searchParams.get('secret');
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret || (authHeader !== `Bearer ${cronSecret}` && secretParam !== cronSecret)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Resolve RSS Feeds
    const feedsStr = process.env.RSS_FEEDS;
    const feeds = feedsStr ? feedsStr.split(',').map((f) => f.trim()) : DEFAULT_FEEDS;

    const parser = new Parser();
    const allItems: Array<{
      title: string;
      link: string;
      content: string;
      pubDate: string;
      source: string;
    }> = [];

    // 3. Fetch Feeds Concurrently with Individual Error Handling
    const feedPromises = feeds.map(async (url) => {
      try {
        const parsedFeed = await parser.parseURL(url);
        const feedTitle = parsedFeed.title || 'Unknown Source';

        parsedFeed.items.forEach((item) => {
          if (item.title && item.link) {
            allItems.push({
              title: item.title,
              link: item.link,
              content: item.contentSnippet || item.content || item.title,
              pubDate: parseSafeDate(item.isoDate || item.pubDate),
              source: feedTitle,
            });
          }
        });
      } catch (feedError) {
        console.error(`Error parsing feed URL: ${url}`, feedError);
      }
    });

    await Promise.all(feedPromises);

    if (allItems.length === 0) {
      return NextResponse.json({ message: 'No articles found in RSS feeds' }, { status: 200 });
    }

    // 4. Deduplicate Against Existing Database URLs
    const urls = allItems.map((item) => item.link);

    const { data: existingEvents, error: dbError } = await supabaseAdmin
      .from('events')
      .select('url')
      .in('url', urls);

    if (dbError) {
      console.error('Supabase query error:', dbError);
      return NextResponse.json({ error: 'Database verification failed' }, { status: 500 });
    }

    const existingUrlsSet = new Set(existingEvents?.map((e) => e.url) || []);
    const newItems = allItems.filter((item) => !existingUrlsSet.has(item.link));

    if (newItems.length === 0) {
      return NextResponse.json(
        {
          message: 'No new articles to process',
          processed: 0,
          inserted: 0,
        },
        { status: 200 }
      );
    }

    // Sort from oldest to newest so they are saved to DB chronologically
    newItems.sort((a, b) => new Date(a.pubDate).getTime() - new Date(b.pubDate).getTime());

    // Limit to prevent hitting API rate limits or function timeouts (e.g., free tiers)
    const MAX_ITEMS_PER_RUN = 10;
    const itemsToProcess = newItems.slice(0, MAX_ITEMS_PER_RUN);

    // 5. Initialize Gemini SDK
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.error('GEMINI_API_KEY is not defined');
      return NextResponse.json({ error: 'Gemini configuration error' }, { status: 500 });
    }
    const ai = new GoogleGenAI({ apiKey });

    const processedEvents = [];
    let insertedCount = 0;

    // 6. Process Sequentially to Adhere to Free-Tier Rate Limits (15 RPM)
    for (const item of itemsToProcess) {
      try {
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
  "bullish_assets": ["Asset/Ticker 1", "Asset 2"],
  "bearish_assets": ["Asset/Ticker 1", "Asset 2"]
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
                bullish_assets: {
                  type: 'ARRAY',
                  items: { type: 'STRING' },
                },
                bearish_assets: {
                  type: 'ARRAY',
                  items: { type: 'STRING' },
                },
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
        if (!jsonText) {
          throw new Error('Gemini returned an empty text response.');
        }

        // Clean markdown blocks if any exist
        let cleanedJson = jsonText.trim();
        if (cleanedJson.startsWith('```json')) {
          cleanedJson = cleanedJson.substring(7);
        } else if (cleanedJson.startsWith('```')) {
          cleanedJson = cleanedJson.substring(3);
        }
        if (cleanedJson.endsWith('```')) {
          cleanedJson = cleanedJson.substring(0, cleanedJson.length - 3);
        }
        cleanedJson = cleanedJson.trim();

        const analysis: GeminiAnalysis = JSON.parse(cleanedJson);

        // Sanitize analysis inputs (Check severity score boundaries)
        const severityScore = Math.max(1, Math.min(10, Math.round(analysis.severity_score || 1)));

        // 7. Write Result to Supabase
        const { error: insertError } = await supabaseAdmin.from('events').insert({
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

        if (insertError) {
          console.error(`Failed to insert article: ${item.link}`, insertError);
        } else {
          insertedCount++;
          processedEvents.push({
            title: item.title,
            is_market_moving: analysis.is_market_moving,
            severity_score: severityScore,
          });
        }
      } catch (itemError) {
        console.error(`Failed to process article with Gemini/Supabase: ${item.link}`, itemError);
      }
    }

    return NextResponse.json(
      {
        message: 'RSS ingestion completed',
        total_found: allItems.length,
        new_found: newItems.length,
        attempted_processing: itemsToProcess.length,
        successfully_inserted: insertedCount,
        processed: processedEvents,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Fatal cron handler error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
