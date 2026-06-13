import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const ticker = url.searchParams.get('ticker');

    if (!ticker) {
      return NextResponse.json({ error: 'Ticker parameter is required' }, { status: 400 });
    }

    // Proxy to Yahoo Finance Chart API
    // 1d interval, 6mo range to ensure enough data for the chart
    const yfUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?interval=1d&range=6mo`;

    const response = await fetch(yfUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: `Yahoo Finance API responded with status: ${response.status}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    const result = data?.chart?.result?.[0];

    if (!result || !result.timestamp || !result.indicators?.quote?.[0]) {
      return NextResponse.json({ error: 'Invalid data format from Yahoo Finance' }, { status: 500 });
    }

    const timestamps: number[] = result.timestamp;
    const quote = result.indicators.quote[0];

    // Format data for lightweight-charts
    // { time: 'YYYY-MM-DD', open, high, low, close }
    const formattedData = [];

    for (let i = 0; i < timestamps.length; i++) {
      const open = quote.open[i];
      const high = quote.high[i];
      const low = quote.low[i];
      const close = quote.close[i];

      // Skip null values (sometimes Yahoo returns null for trading days with missing data)
      if (open === null || high === null || low === null || close === null) {
        continue;
      }

      // Format time as YYYY-MM-DD string for lightweight-charts daily data
      const date = new Date(timestamps[i] * 1000);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const timeString = `${year}-${month}-${day}`;

      formattedData.push({
        time: timeString,
        open,
        high,
        low,
        close,
      });
    }

    return NextResponse.json({ data: formattedData });
  } catch (error: any) {
    console.error('Error proxying Yahoo Finance data:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
