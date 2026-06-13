import { NextResponse } from 'next/server';

const YF_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
  'Accept': 'application/json',
};

/**
 * Fetches candlestick data from Yahoo Finance for a given symbol.
 * Returns the parsed chart result, or null if the response is invalid/empty.
 */
async function fetchChartData(symbol: string): Promise<{ result: any; data: any } | null> {
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=6mo`;
    const response = await fetch(url, { headers: YF_HEADERS });

    if (!response.ok) return null;

    const data = await response.json().catch(() => null);
    if (!data) return null;

    // Treat a Yahoo-level error in the payload as a failure
    if (data?.chart?.error || !data?.chart?.result?.[0]) return null;

    const result = data.chart.result[0];

    // Validate that we have the minimum required OHLC fields
    if (!result?.timestamp || !result?.indicators?.quote?.[0]) return null;

    return { result, data };
  } catch {
    return null;
  }
}

/**
 * Determines whether the ticker already has an exchange suffix or special
 * character that signals it should NOT receive the .NS priority treatment.
 *
 * Examples that are already suffixed / not bare equities:
 *   MRF.NS  MRF.BO  BTC-USD  GC=F  ^GSPC  SPY (but SPY is fine as a global
 *   fallback — it will just fail .NS and succeed on the bare fetch).
 */
function hasSuffix(ticker: string): boolean {
  return (
    ticker.includes('.') ||  // e.g. MRF.NS, MRF.BO
    ticker.includes('=') ||  // e.g. GC=F (commodity futures)
    ticker.includes('^') ||  // e.g. ^GSPC, ^BSESN (indices)
    ticker.includes('-')     // e.g. BTC-USD (crypto pairs)
  );
}

/**
 * Formats a validated Yahoo Finance chart result into the OHLC array
 * expected by lightweight-charts: [{ time: 'YYYY-MM-DD', open, high, low, close, value }]
 */
function formatOHLC(result: any): Array<{ time: string; open: number; high: number; low: number; close: number; value: number }> {
  const timestamps: number[] = result.timestamp;
  const quote = result.indicators.quote[0];
  const formatted = [];

  for (let i = 0; i < timestamps.length; i++) {
    const open = quote.open[i];
    const high = quote.high[i];
    const low = quote.low[i];
    const close = quote.close[i];
    const volume = quote.volume[i];

    // Skip null / undefined values (Yahoo returns nulls for non-trading days)
    if (open == null || high == null || low == null || close == null || volume == null) continue;

    const date = new Date(timestamps[i] * 1000);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    formatted.push({ time: `${year}-${month}-${day}`, open, high, low, close, value: volume });
  }

  return formatted;
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const ticker = url.searchParams.get('ticker')?.trim().toUpperCase();

    if (!ticker) {
      return NextResponse.json({ error: 'Ticker parameter is required' }, { status: 400 });
    }

    let chartResult: { result: any; data: any } | null = null;
    let resolvedSymbol = ticker;

    if (hasSuffix(ticker)) {
      // ── Path A: User already specified a suffix/format — use it directly ──
      chartResult = await fetchChartData(ticker);
    } else {
      // ── Path B: Bare ticker — apply NSE Regional Priority Override ──
      //
      // Step 1: Try with .NS (National Stock Exchange of India) first.
      //         This catches MRF, ITC, RELIANCE, INFY, etc. without the user
      //         having to know the suffix.
      const nseSymbol = `${ticker}.NS`;
      chartResult = await fetchChartData(nseSymbol);

      if (chartResult) {
        resolvedSymbol = nseSymbol;
      } else {
        // Step 2: .NS failed (likely a global/US ticker like AAPL, SPY).
        //         Fall back to the bare string — Yahoo will resolve it via its
        //         own global lookup (e.g., NASDAQ:AAPL, NYSE:SPY).
        chartResult = await fetchChartData(ticker);
        resolvedSymbol = ticker;
      }
    }

    // ── Both attempts failed ──
    if (!chartResult) {
      return NextResponse.json(
        { error: 'Symbol not found or unsupported data format.' },
        { status: 500 }
      );
    }

    const formattedData = formatOHLC(chartResult.result);

    if (formattedData.length === 0) {
      return NextResponse.json(
        { error: 'No valid candlestick data returned for this symbol.' },
        { status: 500 }
      );
    }

    return NextResponse.json({ data: formattedData, resolvedSymbol });
  } catch (error: any) {
    console.error('Fatal error in /api/finance:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
