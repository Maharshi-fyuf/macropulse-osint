import Parser from 'rss-parser';

export interface RawItem {
  title: string;
  link: string;
  content: string;
  pubDate: string;
  source: string;
}

export interface FeedResult {
  url: string;
  status: 'ok' | 'http_error' | 'parse_error' | 'timeout' | 'error';
  itemCount?: number;
  freshItemCount?: number;
  error?: string;
}

function parseSafeDate(dateStr: string | undefined | null): string {
  if (!dateStr) return new Date().toISOString();
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return new Date().toISOString();
  return d.toISOString();
}

export async function fetchSingleFeed(
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
      signal: AbortSignal.timeout(12000),
    });

    if (!response.ok) {
      return {
        items: [],
        result: { url: feedUrl, status: 'http_error', error: `HTTP ${response.status} ${response.statusText}` },
      };
    }

    let xml = await response.text();
    xml = xml.replace(/&(?!(?:apos|quot|[gl]t|amp);|#)/g, '&amp;');

    let parsedFeed: Parser.Output<Record<string, unknown>>;
    try {
      parsedFeed = await parser.parseString(xml);
    } catch (parseErr: unknown) {
      const msg = parseErr instanceof Error ? parseErr.message : String(parseErr);
      console.error(`[Cron Error] XML parse failed for ${feedUrl}:`, msg);
      return {
        items: [],
        result: { url: feedUrl, status: 'parse_error', error: msg },
      };
    }

    const feedTitle = parsedFeed.title || new URL(feedUrl).hostname;
    const items: RawItem[] = [];

    for (const item of parsedFeed.items) {
      const itemLink = item.link || (item as Record<string, unknown>).guid || '';
      if (!item.title || !itemLink) continue;

      const pubDate = parseSafeDate((item as Record<string, unknown>).isoDate as string | undefined || item.pubDate);

      if (new Date(pubDate) < recencyCutoff) continue;

      items.push({
        title: item.title,
        link: itemLink as string,
        content: item.contentSnippet || (item as Record<string, unknown>).content as string || (item as Record<string, unknown>).summary as string || item.title,
        pubDate,
        source: feedTitle,
      });
    }

    const totalItems = parsedFeed.items.length;
    return {
      items,
      result: { url: feedUrl, status: 'ok', itemCount: totalItems, freshItemCount: items.length },
    };
  } catch (err: unknown) {
    const isTimeout = err instanceof Error && (err.name === 'TimeoutError' || err.name === 'AbortError');
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[Cron Error] ${isTimeout ? 'Timeout' : 'Network error'} fetching ${feedUrl}:`, msg);
    return {
      items: [],
      result: { url: feedUrl, status: isTimeout ? 'timeout' : 'error', error: msg },
    };
  }
}
