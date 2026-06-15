import { NextResponse } from 'next/server';

// ── Shared Yahoo Finance fetch headers ───────────────────────────────────────
const YF_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
  'Accept': 'application/json',
};

// ── Ticker helpers (mirrors /api/finance for consistent resolution) ───────────

/**
 * Returns true when the ticker already carries an exchange suffix or
 * special character (e.g. MRF.NS, GC=F, ^GSPC, BTC-USD).
 * These symbols are sent directly to Yahoo without the .NS override.
 */
function hasSuffix(ticker: string): boolean {
  return (
    ticker.includes('.') ||
    ticker.includes('=') ||
    ticker.includes('^') ||
    ticker.includes('-')
  );
}

// ── Data fetching ─────────────────────────────────────────────────────────────

interface PriceHistory {
  closes: number[];
  currentPrice: number;
  resolvedSymbol: string;
}

/**
 * Attempts to fetch 60 days of daily closing prices for `symbol`.
 * Returns null if the request fails or data is insufficient.
 */
async function tryFetchCloses(symbol: string): Promise<PriceHistory | null> {
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=3mo`;
    const res = await fetch(url, { headers: YF_HEADERS });
    if (!res.ok) return null;

    const data = await res.json().catch(() => null);
    if (!data || data?.chart?.error || !data?.chart?.result?.[0]) return null;

    const result = data.chart.result[0];
    const quote = result?.indicators?.quote?.[0];
    if (!quote?.close || !result?.timestamp) return null;

    // Collect non-null closing prices
    const closes: number[] = [];
    for (let i = 0; i < result.timestamp.length; i++) {
      const c = quote.close[i];
      if (c != null && !isNaN(c) && c > 0) closes.push(c);
    }

    if (closes.length < 5) return null; // Need meaningful history

    return {
      closes,
      currentPrice: closes[closes.length - 1],
      resolvedSymbol: symbol,
    };
  } catch {
    return null;
  }
}

/**
 * Fetches historical closing prices, applying the same NSE Regional Priority
 * Override used by /api/finance:
 *   - Bare tickers (e.g. "MRF") → try "MRF.NS" first, fall back to bare.
 *   - Already-suffixed tickers (e.g. "MRF.NS", "GC=F") → fetch directly.
 */
async function fetchPriceHistory(ticker: string): Promise<PriceHistory | null> {
  if (hasSuffix(ticker)) {
    return tryFetchCloses(ticker);
  }

  // NSE priority: bare Indian tickers resolve cleanly via .NS
  const nseResult = await tryFetchCloses(`${ticker}.NS`);
  if (nseResult) return nseResult;

  // Global fallback (US equities, ETFs, etc.)
  return tryFetchCloses(ticker);
}

// ── Statistics helpers ────────────────────────────────────────────────────────

function mean(arr: number[]): number {
  return arr.reduce((s, v) => s + v, 0) / arr.length;
}

/** Sample standard deviation (Bessel-corrected, n-1 denominator). */
function sampleStdDev(arr: number[], mu: number): number {
  if (arr.length < 2) return 0;
  const variance = arr.reduce((s, v) => s + (v - mu) ** 2, 0) / (arr.length - 1);
  return Math.sqrt(Math.max(0, variance));
}

// ── Route handler ─────────────────────────────────────────────────────────────

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);

    const rawSymbol = url.searchParams.get('symbol')?.trim().toUpperCase();
    const rawSentiment = url.searchParams.get('sentimentScore');
    const rawDays = url.searchParams.get('days');

    // ── Parameter validation ─────────────────────────────────────────────────
    if (!rawSymbol) {
      return NextResponse.json({ error: 'symbol parameter is required' }, { status: 400 });
    }

    const sentimentScore = Math.max(-1, Math.min(1, parseFloat(rawSentiment ?? '0') || 0));
    const days = Math.max(1, Math.min(30, parseInt(rawDays ?? '5', 10) || 5));

    // ── Step 1: Fetch historical closing prices ──────────────────────────────
    const history = await fetchPriceHistory(rawSymbol);
    if (!history) {
      return NextResponse.json(
        { error: 'Unable to fetch sufficient historical data for this symbol.' },
        { status: 500 }
      );
    }

    const { closes, currentPrice, resolvedSymbol } = history;

    // ── Step 2: Compute log returns ──────────────────────────────────────────
    const logReturns: number[] = [];
    for (let i = 1; i < closes.length; i++) {
      const r = Math.log(closes[i] / closes[i - 1]);
      if (isFinite(r)) logReturns.push(r);
    }

    if (logReturns.length < 2) {
      return NextResponse.json(
        { error: 'Insufficient data to calculate volatility (need at least 3 clean trading days).' },
        { status: 400 }
      );
    }

    // ── Step 3: Calculate μ and σ ─────────────────────────────────────────────
    const rawMu = mean(logReturns);          // historical mean daily log-return
    const sigma = sampleStdDev(logReturns, rawMu); // daily volatility

    // ── Step 4: Catalyst adjustment ───────────────────────────────────────────
    // sentimentScore ∈ [-1, 1] scaled by 0.001 shifts the drift by at most
    // ±0.001 per day (~±0.1% daily), a modest but meaningful catalyst nudge.
    const adjustedMu = rawMu + sentimentScore * 0.001;

    // ── Step 5: GBM projection ────────────────────────────────────────────────
    // E[S_T] path:  S₀ × exp((μ - ½σ²) × T ± σ√T)
    const driftTerm = (adjustedMu - 0.5 * sigma * sigma) * days;
    const spreadTerm = sigma * Math.sqrt(days);

    const upperBound = currentPrice * Math.exp(driftTerm + spreadTerm);
    const lowerBound = currentPrice * Math.exp(driftTerm - spreadTerm);

    // Guard against degenerate outputs (e.g. σ=0 producing identical bounds)
    if (!isFinite(upperBound) || !isFinite(lowerBound)) {
      return NextResponse.json(
        { error: 'Projection produced non-finite values. Try a different symbol.' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      currentPrice: parseFloat(currentPrice.toFixed(4)),
      upperBound:   parseFloat(upperBound.toFixed(4)),
      lowerBound:   parseFloat(lowerBound.toFixed(4)),
      projectedDrift: parseFloat(adjustedMu.toFixed(6)),
      volatility:   parseFloat(sigma.toFixed(6)),
      resolvedSymbol,
      horizon: days,
    });
  } catch (error: unknown) {
    console.error('Fatal error in /api/predict:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
