import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

// 5 minute cache
export const revalidate = 300;

export async function GET() {
  try {
    const date24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    
    const { data: events, error } = await supabaseAdmin
      .from('events')
      .select('severity_score, asset_class')
      .gte('published_at', date24h);

    if (error) {
      throw new Error(`DB Error: ${error.message}`);
    }

    if (!events || events.length === 0) {
      return NextResponse.json({
        score: 0,
        explanation: '0 — Nominal risk. No significant events recorded in 24h.',
        dominantDriver: 'None'
      });
    }

    const count = events.length;
    const avgSeverity = events.reduce((sum, e) => sum + (e.severity_score || 0), 0) / count;
    
    // Score calculation
    // Base 50 + (avg severity * 3) + (count factor)
    // Max 100
    const countFactor = Math.min(20, count / 2);
    let score = Math.min(100, Math.round(30 + (avgSeverity * 4) + countFactor));

    // Find dominant driver by asset class frequency
    const assetCounts: Record<string, number> = {};
    events.forEach(e => {
      if (e.asset_class) {
        assetCounts[e.asset_class] = (assetCounts[e.asset_class] || 0) + 1;
      }
    });

    let dominantDriver = 'Geopolitical';
    let maxCount = 0;
    for (const [asset, c] of Object.entries(assetCounts)) {
      if (c > maxCount) {
        maxCount = c;
        dominantDriver = asset;
      }
    }

    let level = 'Nominal';
    if (score >= 75) level = 'Elevated';
    if (score >= 90) level = 'Severe';

    return NextResponse.json({
      score,
      explanation: `${score} — ${level} risk driven by ${count} recent events`,
      dominantDriver
    });

  } catch (error) {
    console.error('Risk Index API error:', error);
    return NextResponse.json({ error: 'Failed to compute risk index' }, { status: 500 });
  }
}
