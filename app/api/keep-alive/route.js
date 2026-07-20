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

    // Use wildcard select to be compatible with different table schemas
    const tableNames = ['season_summaries', 'divisions', 'players', 'matches', 'previous_matches'];
    
    for (const tableName of tableNames) {
      const { data, error } = await supabase
        .from(tableName)
        .select('*')
        .limit(1);

      results[tableName] = error 
        ? { error: error.message } 
        : { success: true, count: data?.length || 0 };
    }

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
