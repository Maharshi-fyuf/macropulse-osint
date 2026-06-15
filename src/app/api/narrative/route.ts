import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase-client';

export const revalidate = 60; // Cache for 60 seconds

export async function GET() {
  try {
    const { data, error } = await supabase
      .from('narratives')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error || !data) {
      // It's possible the table doesn't exist yet, return 404 cleanly
      return NextResponse.json({ error: 'Not enough data to generate narrative' }, { status: 404 });
    }

    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: 'Not enough data to generate narrative' }, { status: 500 });
  }
}
