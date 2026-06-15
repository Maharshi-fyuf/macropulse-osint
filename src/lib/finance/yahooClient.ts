import { YahooChartResponse, OHLCPoint, YahooChartResult } from '@/types/yahoo';

const YF_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
  'Accept': 'application/json',
};

function hasSuffix(ticker: string): boolean {
  return (
    ticker.includes('.') ||
    ticker.includes('=') ||
    ticker.includes('^') ||
    ticker.includes('-')
  );
}

function formatOHLC(result: YahooChartResult): OHLCPoint[] {
  const timestamps = result.timestamp;
  const quote = result.indicators.quote[0];
  const formatted: OHLCPoint[] = [];

  for (let i = 0; i < timestamps.length; i++) {
    const open = quote.open[i];
    const high = quote.high[i];
    const low = quote.low[i];
    const close = quote.close[i];
    const volume = quote.volume[i];

    if (open == null || high == null || low == null || close == null || volume == null) continue;

    const date = new Date(timestamps[i] * 1000);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    formatted.push({ time: `${year}-${month}-${day}`, open, high, low, close, value: volume });
  }

  return formatted;
}

export async function fetchChartData(symbol: string): Promise<{ result: YahooChartResult; data: YahooChartResponse } | null> {
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=6mo`;
    
    // next: { revalidate: 300 } will cache this call in Next.js for 5 minutes
    const response = await fetch(url, { 
      headers: YF_HEADERS,
      next: { revalidate: 300 }
    });

    if (!response.ok) return null;

    const data: YahooChartResponse = await response.json().catch(() => null);
    if (!data) return null;

    if (data.chart.error || !data.chart.result?.[0]) return null;

    const result = data.chart.result[0];

    if (!result.timestamp || !result.indicators.quote?.[0]) return null;

    return { result, data };
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.error('[YahooClient] Error fetching chart data:', error.message);
    }
    return null;
  }
}

export async function getChartData(ticker: string): Promise<{ data: OHLCPoint[]; resolvedSymbol: string } | null> {
  let chartResult: { result: YahooChartResult; data: YahooChartResponse } | null = null;
  let resolvedSymbol = ticker;

  if (hasSuffix(ticker)) {
    chartResult = await fetchChartData(ticker);
  } else {
    const nseSymbol = `${ticker}.NS`;
    chartResult = await fetchChartData(nseSymbol);

    if (chartResult) {
      resolvedSymbol = nseSymbol;
    } else {
      chartResult = await fetchChartData(ticker);
      resolvedSymbol = ticker;
    }
  }

  if (!chartResult) return null;

  const formattedData = formatOHLC(chartResult.result);
  if (formattedData.length === 0) return null;

  return { data: formattedData, resolvedSymbol };
}
