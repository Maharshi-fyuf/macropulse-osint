import { NextResponse } from 'next/server';
import yahooFinance from 'yahoo-finance2';

// 5 minute cache
export const revalidate = 300;

export async function GET() {
  try {
    const symbols = ['^NSEI', '^BSESN', 'GC=F', 'INR=X', 'BTC-USD'];
    const results = await Promise.all(
      symbols.map(async (symbol) => {
        try {
          const quote = await yahooFinance.quote(symbol);
          return {
            symbol,
            price: quote.regularMarketPrice,
            changePercent: quote.regularMarketChangePercent,
          };
        } catch (err) {
          console.error(`Failed to fetch quote for ${symbol}:`, err);
          return {
            symbol,
            price: null,
            changePercent: null,
          };
        }
      })
    );

    return NextResponse.json({ data: results });
  } catch (error) {
    console.error('Prices API error:', error);
    return NextResponse.json({ error: 'Failed to fetch prices' }, { status: 500 });
  }
}
