/**
 * Tournament Bracket Generator
 * 
 * Generates single and double elimination tournament brackets
 * Handles seeding, bye rounds, and progression tracking
 */

/**
 * Get next power of 2 for bracket size (for byes)
 */
function getNextPowerOf2(n) {
  let p = 1;
  while (p < n) p *= 2;
  return p;
}

/**
 * Generate a single elimination bracket
 * Returns a tournament structure with rounds and matchups
 */
export function generateSingleEliminationBracket(players = []) {
  if (!Array.isArray(players) || players.length < 2) {
    return { error: 'Minimum 2 players required for tournament', bracket: null };
  }

  // Active players only
  const activePlayers = players.filter((p) => p?.active !== false);
  if (activePlayers.length < 2) {
    return { error: 'Minimum 2 active players required', bracket: null };
  }

  const playerCount = activePlayers.length;
  const bracketSize = getNextPowerOf2(playerCount);
  const byeCount = bracketSize - playerCount;

  // Seed players (by points/wins, can be customized)
  const seeded = [...activePlayers].sort((a, b) => {
    const scoreA = (b.points || 0) + (b.wins || 0) * 10;
    const scoreB = (a.points || 0) + (a.wins || 0) * 10;
    return scoreA - scoreB;
  });

  // Build first round matchups with byes
  const firstRound = [];
  let playerIndex = 0;

  for (let i = 0; i < bracketSize / 2; i++) {
    if (i < byeCount) {
      // Bye matchup - player advances automatically
      firstRound.push({
        id: `match_1_${i}`,
        stage: 'round1',
        position: i,
        team1: [seeded[playerIndex]],
        team2: null, // null = bye
        winner: null,
        played: false,
      });
      playerIndex++;
    } else {
      // Regular matchup
      firstRound.push({
        id: `match_1_${i}`,
        stage: 'round1',
        position: i,
        team1: [seeded[playerIndex]],
        team2: [seeded[playerIndex + 1]],
        winner: null,
        played: false,
      });
      playerIndex += 2;
    }
  }

  // Calculate number of rounds needed
  const numRounds = Math.ceil(Math.log2(playerCount));

  return {
    error: null,
    bracket: {
      format: 'single-elimination',
      playerCount,
      bracketSize,
      byeCount,
      totalRounds: numRounds,
      seededPlayers: seeded,
      rounds: [
        {
          roundNumber: 1,
          stageName: 'Round 1',
          matchups: firstRound,
        },
        // Future rounds created as matches complete
      ],
      createdAt: new Date().toISOString(),
    },
  };
}

/**
 * Generate a double elimination bracket
 * Returns bracket with winners and losers brackets
 */
export function generateDoubleEliminationBracket(players = []) {
  if (!Array.isArray(players) || players.length < 2) {
    return { error: 'Minimum 2 players required for tournament', bracket: null };
  }

  const activePlayers = players.filter((p) => p?.active !== false);
  if (activePlayers.length < 2) {
    return { error: 'Minimum 2 active players required', bracket: null };
  }

  const playerCount = activePlayers.length;
  const bracketSize = getNextPowerOf2(playerCount);
  const byeCount = bracketSize - playerCount;

  // Seed players
  const seeded = [...activePlayers].sort((a, b) => {
    const scoreA = (b.points || 0) + (b.wins || 0) * 10;
    const scoreB = (a.points || 0) + (a.wins || 0) * 10;
    return scoreA - scoreB;
  });

  // Build winners bracket first round
  const winnersRound = [];
  let playerIndex = 0;

  for (let i = 0; i < bracketSize / 2; i++) {
    if (i < byeCount) {
      winnersRound.push({
        id: `match_w1_${i}`,
        stage: 'winners_round1',
        position: i,
        team1: [seeded[playerIndex]],
        team2: null,
        winner: null,
        played: false,
      });
      playerIndex++;
    } else {
      winnersRound.push({
        id: `match_w1_${i}`,
        stage: 'winners_round1',
        position: i,
        team1: [seeded[playerIndex]],
        team2: [seeded[playerIndex + 1]],
        winner: null,
        played: false,
      });
      playerIndex += 2;
    }
  }

  const numRounds = Math.ceil(Math.log2(playerCount));

  return {
    error: null,
    bracket: {
      format: 'double-elimination',
      playerCount,
      bracketSize,
      byeCount,
      totalRounds: numRounds * 2, // Winners + losers
      seededPlayers: seeded,
      rounds: [
        {
          roundNumber: 1,
          stageName: 'Winners Round 1',
          bracketType: 'winners',
          matchups: winnersRound,
        },
      ],
      losersRound: {
        roundNumber: 1,
        stageName: 'Losers Round 1',
        bracketType: 'losers',
        matchups: [],
      },
      createdAt: new Date().toISOString(),
    },
  };
}

/**
 * Generate next round matchups based on current winners
 * Called after each round completes
 */
export function generateNextRound(bracket, currentRound) {
  if (!bracket || !currentRound) {
    return { error: 'Invalid bracket or round', matchups: null };
  }

  const { format, rounds } = bracket;
  const lastRoundMatchups = currentRound.matchups || [];
  const winners = lastRoundMatchups
    .filter((m) => m.winner)
    .map((m) => m.winner);

  if (winners.length < 2) {
    return { error: 'Need at least 2 winners to advance', matchups: null };
  }

  const nextRound = [];
  for (let i = 0; i < winners.length; i += 2) {
    if (i + 1 < winners.length) {
      nextRound.push({
        id: `match_${rounds.length}_${i / 2}`,
        stage: `round${rounds.length + 1}`,
        position: Math.floor(i / 2),
        team1: [winners[i]],
        team2: [winners[i + 1]],
        winner: null,
        played: false,
      });
    } else if (winners.length % 2 === 1) {
      // Bye for odd player
      nextRound.push({
        id: `match_${rounds.length}_${Math.floor(i / 2)}`,
        stage: `round${rounds.length + 1}`,
        position: Math.floor(i / 2),
        team1: [winners[i]],
        team2: null,
        winner: null,
        played: false,
      });
    }
  }

  return { error: null, matchups: nextRound };
}

/**
 * Advance winner to next round
 */
export function recordBracketMatchResult(bracket, matchId, winner) {
  if (!bracket || !matchId || !winner) {
    return { error: 'Invalid parameters', updated: false };
  }

  // Find and update the match
  for (const round of bracket.rounds) {
    for (const match of round.matchups) {
      if (match.id === matchId) {
        match.winner = winner;
        match.played = true;
        match.completedAt = new Date().toISOString();
        return { error: null, updated: true, match };
      }
    }
  }

  return { error: 'Match not found', updated: false };
}

/**
 * Get bracket statistics - active matches, completed rounds, standings
 */
export function getBracketStats(bracket) {
  if (!bracket || !bracket.rounds) {
    return null;
  }

  const allMatchups = bracket.rounds.flatMap((r) => r.matchups || []);
  const completedMatches = allMatchups.filter((m) => m.played).length;
  const pendingMatches = allMatchups.filter((m) => !m.played).length;
  const players = bracket.seededPlayers || [];

  // Calculate advancement status
  const playerProgress = {};
  players.forEach((p) => {
    playerProgress[p.id] = {
      name: p.name,
      currentRound: 1,
      status: 'active', // active, eliminated, champion
      seed: players.indexOf(p) + 1,
    };
  });

  return {
    totalMatches: allMatchups.length,
    completedMatches,
    pendingMatches,
    completionPercentage: Math.round((completedMatches / allMatchups.length) * 100),
    totalPlayers: bracket.playerCount,
    currentRound: bracket.rounds.length,
    playerProgress,
  };
}

/**
 * Get tournament winner
 */
export function getTournamentWinner(bracket) {
  if (!bracket || !bracket.rounds || bracket.rounds.length === 0) {
    return null;
  }

  // Final round is last round
  const lastRound = bracket.rounds[bracket.rounds.length - 1];
  if (!lastRound || !lastRound.matchups || lastRound.matchups.length === 0) {
    return null;
  }

  // Only one matchup in final round
  const finalMatch = lastRound.matchups[0];
  return finalMatch?.winner || null;
}
