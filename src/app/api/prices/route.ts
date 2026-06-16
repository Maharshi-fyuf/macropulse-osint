import { NextResponse } from 'next/server';
import YahooFinance from 'yahoo-finance2';

const yahooFinance = new YahooFinance();
// 5 minute cache
export const revalidate = 300;

export async function GET() {
  try {
    const symbols = ['^NSEI', '^BSESN', 'GC=F', 'INR=X', 'BTC-USD'];
    const results = await Promise.all(
      symbols.map(async (symbol) => {
        try {
          const rawQuote = await yahooFinance.quote(symbol);
          
          interface YahooQuote {
            regularMarketPrice?: number;
            regularMarketChangePercent?: number;
          }

          const quote = rawQuote as unknown as YahooQuote;

          if (quote && typeof quote === 'object' && quote.regularMarketPrice !== undefined && quote.regularMarketChangePercent !== undefined) {
            return {
              symbol,
              price: quote.regularMarketPrice,
              changePercent: quote.regularMarketChangePercent,
            };
          }
          
          return {
            symbol,
            price: null,
            changePercent: null,
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
