import { NextResponse } from 'next/server';
import { processEnrichmentBatch } from '@/lib/services/newsIngestionService';

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const secretParam = url.searchParams.get('secret');
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret || (authHeader !== `Bearer ${cronSecret}` && secretParam !== cronSecret)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const result = await processEnrichmentBatch();

    return NextResponse.json(result, { status: result.status });
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.error('[Enrichment Error] Fatal cron handler error:', error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    console.error('[Enrichment Error] Fatal cron handler error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
