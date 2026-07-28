import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(request) {
  try {
    const url = new URL(request.url);
    const division = url.searchParams.get('division');
    const view = url.searchParams.get('view') || 'singles';

    const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json({ error: 'Supabase credentials not configured on server' }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    const summariesTable = view === 'doubles' ? 'season_summaries_doubles' : 'season_summaries';
    const runningTable = view === 'doubles' ? 'running_seasons_doubles' : 'running_seasons';

    // Fetch completed seasons
    let summariesQuery = supabase.from(summariesTable).select('*');
    if (division) summariesQuery = summariesQuery.eq('division', division);
    const summariesResult = await summariesQuery;

    if (summariesResult.error) {
      return NextResponse.json({ error: summariesResult.error.message || String(summariesResult.error) }, { status: 500 });
    }

    // Fetch running/active seasons (these tables might not exist for all views)
    let runningResult = { data: [], error: null };
    try {
      let runningQuery = supabase.from(runningTable).select('*');
      if (division) runningQuery = runningQuery.eq('division', division);
      runningResult = await runningQuery;
    } catch (e) {
      // Running seasons table might not exist - that's OK
      runningResult = { data: [], error: null };
    }

    // Combine both archived and running seasons, sort by timestamp descending
    const allData = [
      ...(summariesResult.data || []),
      ...(runningResult.data || [])
    ].sort((a, b) => {
      const timeA = new Date(a.timestamp || a.created_at || 0);
      const timeB = new Date(b.timestamp || b.created_at || 0);
      return timeB - timeA;
    });

    return NextResponse.json({ data: allData });
  } catch (e) {
    return NextResponse.json({ error: e?.message || String(e) }, { status: 500 });
  }
}
