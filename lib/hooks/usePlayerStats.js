import { useMemo } from 'react';

/**
 * usePlayerStats Hook - Calculates detailed statistics for a player
 * 
 * Usage:
 *   const stats = usePlayerStats(selectedPlayerId, players, previousMatches);
 *   // Returns: { wins, losses, draws, winRate, headToHead, performance, etc. }
 */
export function usePlayerStats(playerId, players, previousMatches = []) {
  return useMemo(() => {
    if (!playerId || !players) {
      return {
        player: null,
        totalMatches: 0,
        wins: 0,
        losses: 0,
        draws: 0,
        winRate: 0,
        avgPointsFor: 0,
        avgPointsAgainst: 0,
        pointsDifferential: 0,
        headToHead: [],
        performance: { monthly: [], weekly: [] },
        bestStreak: 0,
        currentStreak: 0,
        streakType: null,
      };
    }

    const player = players.find((p) => String(p.id) === String(playerId));
    if (!player) {
      return {
        player: null,
        totalMatches: 0,
        wins: 0,
        losses: 0,
        draws: 0,
        winRate: 0,
        avgPointsFor: 0,
        avgPointsAgainst: 0,
        pointsDifferential: 0,
        headToHead: [],
        performance: { monthly: [], weekly: [] },
        bestStreak: 0,
        currentStreak: 0,
        streakType: null,
      };
    }

    // Basic stats from player object
    const wins = player.wins || 0;
    const losses = player.losses || 0;
    const draws = player.draws || 0;
    const totalMatches = wins + losses + draws;
    const winRate = totalMatches > 0 ? ((wins / totalMatches) * 100).toFixed(1) : 0;

    // Calculate points differentials
    let totalPointsFor = 0;
    let totalPointsAgainst = 0;
    const playerMatches = [];

    // Find all matches involving this player
    (previousMatches || []).forEach((match) => {
      if (match.players && Array.isArray(match.players) && match.players.includes(String(playerId))) {
        playerMatches.push(match);
        
        if (match.scores) {
          // Determine if player was in team1 or team2
          const team1Count = match.players.slice(0, 2).filter((id) => String(id) === String(playerId)).length;
          const isTeam1 = team1Count > 0;

          if (isTeam1) {
            totalPointsFor += match.scores.team1 || 0;
            totalPointsAgainst += match.scores.team2 || 0;
          } else {
            totalPointsFor += match.scores.team2 || 0;
            totalPointsAgainst += match.scores.team1 || 0;
          }
        }
      }
    });

    const avgPointsFor = playerMatches.length > 0 ? (totalPointsFor / playerMatches.length).toFixed(2) : 0;
    const avgPointsAgainst = playerMatches.length > 0 ? (totalPointsAgainst / playerMatches.length).toFixed(2) : 0;
    const pointsDifferential = totalPointsFor - totalPointsAgainst;

    // Calculate head-to-head records against other players
    const headToHeadMap = {};
    playerMatches.forEach((match) => {
      const opponents = match.players.filter((id) => String(id) !== String(playerId));
      opponents.forEach((oppId) => {
        if (!headToHeadMap[oppId]) {
          headToHeadMap[oppId] = { wins: 0, losses: 0, draws: 0 };
        }

        // Determine if player won, lost, or drew
        if (match.scores) {
          const team1Count = match.players.slice(0, 2).filter((id) => String(id) === String(playerId)).length;
          const isTeam1 = team1Count > 0;
          const playerScore = isTeam1 ? match.scores.team1 : match.scores.team2;
          const oppScore = isTeam1 ? match.scores.team2 : match.scores.team1;

          if (playerScore > oppScore) {
            headToHeadMap[oppId].wins++;
          } else if (playerScore < oppScore) {
            headToHeadMap[oppId].losses++;
          } else {
            headToHeadMap[oppId].draws++;
          }
        }
      });
    });

    // Convert head-to-head to array with opponent names
    const headToHead = Object.entries(headToHeadMap).map(([oppId, record]) => {
      const opp = players.find((p) => String(p.id) === String(oppId));
      return {
        opponentId: oppId,
        opponentName: opp?.name || `Player ${oppId}`,
        ...record,
      };
    }).sort((a, b) => (b.wins - b.losses) - (a.wins - a.losses));

    // Calculate performance by time period
    const performance = {
      monthly: {},
      weekly: {},
    };

    playerMatches.forEach((match) => {
      if (!match.created_at) return;

      const date = new Date(match.created_at);
      const monthKey = date.toISOString().slice(0, 7); // YYYY-MM
      const weekStart = new Date(date);
      weekStart.setDate(date.getDate() - date.getDay());
      const weekKey = weekStart.toISOString().slice(0, 10);

      // Track monthly
      if (!performance.monthly[monthKey]) {
        performance.monthly[monthKey] = { wins: 0, losses: 0, draws: 0, matches: 0 };
      }
      performance.monthly[monthKey].matches++;

      // Track weekly
      if (!performance.weekly[weekKey]) {
        performance.weekly[weekKey] = { wins: 0, losses: 0, draws: 0, matches: 0 };
      }
      performance.weekly[weekKey].matches++;

      // Determine result
      if (match.scores) {
        const team1Count = match.players.slice(0, 2).filter((id) => String(id) === String(playerId)).length;
        const isTeam1 = team1Count > 0;
        const playerScore = isTeam1 ? match.scores.team1 : match.scores.team2;
        const oppScore = isTeam1 ? match.scores.team2 : match.scores.team1;

        if (playerScore > oppScore) {
          performance.monthly[monthKey].wins++;
          performance.weekly[weekKey].wins++;
        } else if (playerScore < oppScore) {
          performance.monthly[monthKey].losses++;
          performance.weekly[weekKey].losses++;
        } else {
          performance.monthly[monthKey].draws++;
          performance.weekly[weekKey].draws++;
        }
      }
    });

    // Current streak calculation (from most recent matches)
    let currentStreak = 0;
    let streakType = null;
    const recentMatches = [...playerMatches].sort((a, b) => {
      return new Date(b.created_at || 0) - new Date(a.created_at || 0);
    });

    for (const match of recentMatches) {
      if (!match.scores) continue;

      const team1Count = match.players.slice(0, 2).filter((id) => String(id) === String(playerId)).length;
      const isTeam1 = team1Count > 0;
      const playerScore = isTeam1 ? match.scores.team1 : match.scores.team2;
      const oppScore = isTeam1 ? match.scores.team2 : match.scores.team1;

      let result = null;
      if (playerScore > oppScore) result = 'win';
      else if (playerScore < oppScore) result = 'loss';
      else result = 'draw';

      if (currentStreak === 0) {
        streakType = result;
        currentStreak = 1;
      } else if (result === streakType) {
        currentStreak++;
      } else {
        break;
      }
    }

    return {
      player,
      totalMatches,
      wins,
      losses,
      draws,
      winRate,
      avgPointsFor,
      avgPointsAgainst,
      pointsDifferential,
      headToHead,
      performance,
      bestStreak: player.win_streak || 0,
      currentStreak,
      streakType,
      recentMatches: recentMatches.slice(0, 10),
    };
  }, [playerId, players, previousMatches]);
}
