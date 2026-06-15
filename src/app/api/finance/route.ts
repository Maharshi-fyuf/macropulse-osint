import { NextResponse } from 'next/server';
import { getChartData } from '@/lib/finance/yahooClient';

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const ticker = url.searchParams.get('ticker')?.trim().toUpperCase();

    if (!ticker) {
      return NextResponse.json({ error: 'Ticker parameter is required' }, { status: 400 });
    }

    const chartData = await getChartData(ticker);

    if (!chartData) {
      return NextResponse.json(
        { error: 'Symbol not found or unsupported data format.' },
        { status: 500 }
      );
    }

    return NextResponse.json({ data: chartData.data, resolvedSymbol: chartData.resolvedSymbol });
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.error('Fatal error in /api/finance:', error.message);
    } else {
      console.error('Fatal error in /api/finance:', error);
    }
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
