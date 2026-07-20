import { supabase } from '@/lib/supabase';

/**
 * Keep-alive endpoint to maintain Supabase project activity
 * Prevents free tier projects from being suspended due to inactivity
 * Called daily by a cron job
 */
export async function GET(request) {
  try {
    if (!supabase) {
      return Response.json(
        { error: 'Supabase client not initialized' },
        { status: 500 }
      );
    }

    // Verify the request is from Vercel cron (Vercel automatically adds this header)
    // Or allow if no secret is configured (development mode)
    // Or accept Bearer token for manual testing when secret IS configured
    const cronHeader = request.headers.get('x-vercel-cron');
    const authHeader = request.headers.get('authorization');
    const expectedKey = process.env.KEEP_ALIVE_SECRET_KEY;

    // Allow if: (1) it's a Vercel cron request OR (2) no secret configured (dev) OR (3) bearer token matches
    const isAuthorized = cronHeader || !expectedKey || (expectedKey && authHeader === `Bearer ${expectedKey}`);

    if (!isAuthorized) {
      return Response.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Perform multiple read operations to ensure project stays active
    const results = {};

    // 1. Read from season_summaries table
    const { data: seasonData, error: seasonError } = await supabase
      .from('season_summaries')
      .select('id')
      .limit(1);

    results.seasonSummaries = seasonError 
      ? { error: seasonError.message } 
      : { success: true, count: seasonData?.length || 0 };

    // 2. Read from divisions table
    const { data: divisionsData, error: divisionsError } = await supabase
      .from('divisions')
      .select('id')
      .limit(1);

    results.divisions = divisionsError 
      ? { error: divisionsError.message } 
      : { success: true, count: divisionsData?.length || 0 };

    // 3. Read from players table
    const { data: playersData, error: playersError } = await supabase
      .from('players')
      .select('id')
      .limit(1);

    results.players = playersError 
      ? { error: playersError.message } 
      : { success: true, count: playersData?.length || 0 };

    // 4. Read from matches table
    const { data: matchesData, error: matchesError } = await supabase
      .from('matches')
      .select('id')
      .limit(1);

    results.matches = matchesError 
      ? { error: matchesError.message } 
      : { success: true, count: matchesData?.length || 0 };

    // 5. Read from previous_matches table
    const { data: prevMatchesData, error: prevMatchesError } = await supabase
      .from('previous_matches')
      .select('id')
      .limit(1);

    results.previousMatches = prevMatchesError 
      ? { error: prevMatchesError.message } 
      : { success: true, count: prevMatchesData?.length || 0 };

    const hasErrors = Object.values(results).some(r => r.error);

    return Response.json(
      {
        success: !hasErrors,
        timestamp: new Date().toISOString(),
        results,
      },
      { status: hasErrors ? 500 : 200 }
    );
  } catch (error) {
    console.error('Keep-alive endpoint error:', error);
    return Response.json(
      { 
        error: 'Failed to execute keep-alive check',
        details: error.message,
      },
      { status: 500 }
    );
  }
}
