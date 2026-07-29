import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Helper function to compute leaderboard for a division
async function computeLeaderboardForDivision(supabase, division, view) {
  const playersTable = view === 'doubles' ? 'players_doubles' : 'players';
  const matchesTable = view === 'doubles' ? 'previous_matches_doubles' : 'previous_matches';

  // Fetch all players for this division
  const { data: players } = await supabase
    .from(playersTable)
    .select('*')
    .eq('division', division);

  // Fetch all matches for this division
  const { data: matches } = await supabase
    .from(matchesTable)
    .select('*')
    .eq('division', division)
    .order('created_at', { ascending: true });

  // Initialize standings
  const standings = {};
  (players || []).forEach(p => {
    standings[p.id] = {
      id: p.id,
      name: p.name,
      wins: 0,
      losses: 0,
      draws: 0,
      points: 0,
      points_for: 0,
      points_against: 0,
      win_streak: 0,
      active: p.active
    };
  });

  // Process matches
  (matches || []).forEach(match => {
    if (!match.players || !match.scores) return;

    const playersArray = Array.isArray(match.players)
      ? match.players
      : JSON.parse(match.players || '[]');

    if (!Array.isArray(playersArray) || playersArray.length < 4) return;

    const score1 = Number(match.scores?.team1 ?? (Array.isArray(match.scores) ? match.scores[0] : null));
    const score2 = Number(match.scores?.team2 ?? (Array.isArray(match.scores) ? match.scores[1] : null));

    if (Number.isNaN(score1) || Number.isNaN(score2)) return;

    const team1 = playersArray.slice(0, 2);
    const team2 = playersArray.slice(2, 4);

    // Determine results
    let result1 = 'draw', result2 = 'draw';
    if (score1 > score2) {
      result1 = 'win';
      result2 = 'loss';
    } else if (score1 < score2) {
      result1 = 'loss';
      result2 = 'win';
    }

    // Update team 1
    team1.forEach(playerId => {
      if (standings[playerId]) {
        if (result1 === 'win') {
          standings[playerId].wins++;
          standings[playerId].points += 3;
          standings[playerId].win_streak++;
        } else if (result1 === 'loss') {
          standings[playerId].losses++;
          standings[playerId].win_streak = 0;
        } else {
          standings[playerId].draws++;
          standings[playerId].points += 1;
          standings[playerId].win_streak = 0;
        }
        standings[playerId].points_for += score1;
        standings[playerId].points_against += score2;
      }
    });

    // Update team 2
    team2.forEach(playerId => {
      if (standings[playerId]) {
        if (result2 === 'win') {
          standings[playerId].wins++;
          standings[playerId].points += 3;
          standings[playerId].win_streak++;
        } else if (result2 === 'loss') {
          standings[playerId].losses++;
          standings[playerId].win_streak = 0;
        } else {
          standings[playerId].draws++;
          standings[playerId].points += 1;
          standings[playerId].win_streak = 0;
        }
        standings[playerId].points_for += score2;
        standings[playerId].points_against += score1;
      }
    });
  });

  // Return sorted by points
  return Object.values(standings).sort((a, b) => b.points - a.points);
}

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

    // Fetch running/active seasons and compute standings
    let runningResult = { data: [], error: null };
    try {
      let runningQuery = supabase.from(runningTable).select('*');
      if (division) runningQuery = runningQuery.eq('division', division);
      runningResult = await runningQuery;

      // For each running season, compute its final_standings
      if (runningResult.data && runningResult.data.length > 0) {
        for (const season of runningResult.data) {
          const standings = await computeLeaderboardForDivision(supabase, season.division, view);
          season.final_standings = standings;
          season.timestamp = season.started_at; // Use started_at as timestamp for sorting
        }
      }
    } catch (e) {
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
