import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(request) {
  try {
    const url = new URL(request.url);
    const view = url.searchParams.get('view') || 'singles';
    const table = view === 'doubles' ? 'season_summaries_doubles' : 'season_summaries';

    const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json({ error: 'Supabase credentials not configured on server' }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data, error } = await supabase.from(table).select('*').order('timestamp', { ascending: false });
    if (error) {
      return NextResponse.json({ error: error.message || String(error) }, { status: 500 });
    }

    const normalized = Array.isArray(data)
      ? data.map((d) => ({
          ...d,
          id: d.id ? String(d.id) : `no-id-${Math.random().toString(36).slice(2, 8)}`,
          timestamp: d.timestamp || d.created_at || new Date().toISOString(),
        }))
      : [];

    return NextResponse.json({ data: normalized });
  } catch (e) {
    return NextResponse.json({ error: e?.message || String(e) }, { status: 500 });
  }
}
