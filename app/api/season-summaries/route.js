import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Helper function to compute leaderboard for a division
async function computeLeaderboardForDivision(supabase, division, formatSuffix, format = 'league') {
  const playersTable = formatSuffix ? `players_${formatSuffix}` : 'players';
  const matchesTable = formatSuffix ? `previous_matches_${formatSuffix}` : 'previous_matches';

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

  // Return sorted by format-specific criteria
  return Object.values(standings).sort((a, b) => {
    const aGames = a.wins + a.losses + a.draws;
    const bGames = b.wins + b.losses + b.draws;
    const aWinPct = aGames > 0 ? a.wins / aGames : 0;
    const bWinPct = bGames > 0 ? b.wins / bGames : 0;
    const aDiff = a.points_for - a.points_against;
    const bDiff = b.points_for - b.points_against;
    
    // Format: 'league'
    if (format === 'league') {
      // 1. Win %
      if (aWinPct !== bWinPct) return bWinPct - aWinPct;
      // 2. Points difference
      if (aDiff !== bDiff) return bDiff - aDiff;
      // 3. Games played
      if (aGames !== bGames) return bGames - aGames;
      // 4. Name
      return (a.name || "").localeCompare(b.name || "");
    }
    
    // Format: 'points' (Doubles - Point Difference mode)
    if (format === 'points') {
      // 1. Point difference
      if (aDiff !== bDiff) return bDiff - aDiff;
      // 2. Games played
      if (aGames !== bGames) return bGames - aGames;
      // 3. Name
      return (a.name || "").localeCompare(b.name || "");
    }
    
    // Format: '5player' (5 Player Champ) or 'roundrobin' (Round Robin)
    if (format === '5player' || format === 'roundrobin') {
      // 1. Points (3 for win, 1 for draw)
      if (a.points !== b.points) return b.points - a.points;
      // 2. Games played
      if (aGames !== bGames) return bGames - aGames;
      // 3. Point difference
      if (aDiff !== bDiff) return bDiff - aDiff;
      // 4. Name
      return (a.name || "").localeCompare(b.name || "");
    }
    
    // Default fallback (shouldn't reach here)
    return b.points - a.points;
  });
}

export async function GET(request) {
  try {
    const url = new URL(request.url);
    const division = url.searchParams.get('division');
    const format = url.searchParams.get('format') || 'league'; // Default to league

    const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json({ error: 'Supabase credentials not configured on server' }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Map format names to table suffixes
    // 'league' = no suffix (base tables), 'points' = _doubles suffix
    const formatMap = {
      'league': '',           // Base tables with no suffix
      'points': 'doubles',    // Points Difference uses _doubles tables
      '5player': '5champ',    // 5 Player uses _5champ tables
      'roundrobin': 'roundrobin'  // Round Robin uses _roundrobin tables
    };

    const formatSuffix = formatMap[format] || '';
    const summariesTable = formatSuffix ? `season_summaries_${formatSuffix}` : 'season_summaries';
    const runningTable = formatSuffix ? `running_seasons_${formatSuffix}` : 'running_seasons';
    const divisionsTable = formatSuffix ? `divisions_${formatSuffix}` : 'divisions';

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
          const standings = await computeLeaderboardForDivision(supabase, season.division, formatSuffix, format);
          season.final_standings = standings;
          season.timestamp = season.started_at; // Use started_at as timestamp for sorting
        }
      }
    } catch (e) {
      runningResult = { data: [], error: null };
    }

    // Get division names and owner information for proper display
    let divisionsData = [];
    const divisionNames = {};
    
    try {
      // Try to fetch with owner join
      const fkeyName = `${divisionsTable}_owner_id_fkey`;
      const { data: divsWithOwners } = await supabase
        .from(divisionsTable)
        .select(`
          id,
          name,
          owner_id,
          club_members!${fkeyName} (
            username
          )
        `);
      
      divisionsData = divsWithOwners || [];
    } catch (e) {
      // Fallback: fetch without owner join
      const { data: divsOnly } = await supabase
        .from(divisionsTable)
        .select('id, name, owner_id');
      
      divisionsData = divsOnly || [];
      
      // If we got owner_ids, fetch usernames separately
      if (divisionsData.length > 0 && divisionsData[0].owner_id) {
        const ownerIds = [...new Set(divisionsData.map(d => d.owner_id).filter(Boolean))];
        const { data: members } = await supabase
          .from('club_members')
          .select('id, username')
          .in('id', ownerIds);
        
        const memberMap = {};
        (members || []).forEach(m => {
          memberMap[m.id] = m;
        });
        
        divisionsData.forEach(d => {
          d.club_members = memberMap[d.owner_id] || null;
        });
      }
    }
    
    (divisionsData || []).forEach(d => {
      // Format: "OwnerName - Division Name" if owner exists, otherwise just "Division Name"
      const ownerName = d.club_members?.username ? `${d.club_members.username} - ` : '';
      divisionNames[d.id] = `${ownerName}${d.name}`;
    });

    // Combine both archived and running seasons
    const allData = [
      ...(summariesResult.data || []),
      ...(runningResult.data || [])
    ];

    // Fetch matches for each season/summary for form calculation
    const matchesTable = formatSuffix ? `previous_matches_${formatSuffix}` : 'previous_matches';
    for (const item of allData) {
      if (item.division) {
        const { data: matches } = await supabase
          .from(matchesTable)
          .select('*')
          .eq('division', item.division)
          .order('created_at', { ascending: true });
        item.matches = matches || [];
      }
    }

    // Enrich with division names and ensure valid timestamps
    allData.forEach(item => {
      item.divisionName = divisionNames[item.division] || `Division ${item.division}`;
      
      // Ensure timestamp is valid
      const timeStr = item.timestamp || item.created_at || item.started_at;
      const parsedTime = new Date(timeStr);
      item.timestamp = !isNaN(parsedTime.getTime()) ? timeStr : null;
    });

    // Sort by timestamp descending
    const sorted = allData.sort((a, b) => {
      const timeA = a.timestamp ? new Date(a.timestamp).getTime() : 0;
      const timeB = b.timestamp ? new Date(b.timestamp).getTime() : 0;
      return timeB - timeA;
    });

    return NextResponse.json({ data: sorted });
  } catch (e) {
    return NextResponse.json({ error: e?.message || String(e) }, { status: 500 });
  }
}
