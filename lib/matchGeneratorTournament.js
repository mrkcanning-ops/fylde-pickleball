/**
 * Tournament Bracket Generator
 * 
 * Generates single and double elimination tournament brackets
 * Handles seeding, bye rounds, and progression tracking
 */

/**
 * Validate player count for even bracket generation
 * Singles: players must be divisible by 4 or 5
 * Doubles: players must be divisible by 4
 */
function validatePlayerCountForBracket(playerCount, gameType) {
  if (gameType === 'doubles') {
    // Doubles: need factor of 4 (4, 8, 12, 16...)
    if (playerCount % 4 !== 0) {
      return {
        valid: false,
        error: `Doubles requires player count divisible by 4. You have ${playerCount} players. Try ${Math.round(playerCount / 4) * 4 + (playerCount % 4 > 2 ? 4 : 0)} players.`,
      };
    }
  } else {
    // Singles: need factor of 4 or 5
    const divisibleBy4 = playerCount % 4 === 0;
    const divisibleBy5 = playerCount % 5 === 0;
    
    if (!divisibleBy4 && !divisibleBy5) {
      // Find nearest valid numbers
      const nearest4 = Math.round(playerCount / 4) * 4;
      const nearest5 = Math.round(playerCount / 5) * 5;
      return {
        valid: false,
        error: `Singles requires player count divisible by 4 or 5. You have ${playerCount} players. Try ${nearest4} or ${nearest5} players.`,
      };
    }
  }
  
  return { valid: true, error: null };
}

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
 * Supports both singles (1v1) and doubles (2v2) match types
 */
export function generateSingleEliminationBracket(players = [], gameType = 'singles') {
  if (!Array.isArray(players) || players.length < 2) {
    return { error: 'Minimum 2 players required for tournament', bracket: null };
  }

  // Active players only
  const activePlayers = players.filter((p) => p?.active !== false);
  if (activePlayers.length < 2) {
    return { error: 'Minimum 2 active players required', bracket: null };
  }

  // Validate player count for even bracket
  const validation = validatePlayerCountForBracket(activePlayers.length, gameType);
  if (!validation.valid) {
    return { error: validation.error, bracket: null };
  }

  // For doubles, need minimum 4 players (to form 2 teams)
  if (gameType === 'doubles' && activePlayers.length < 4) {
    return { error: 'Minimum 4 active players required for doubles tournament', bracket: null };
  }

  // Seed players (by points/wins, can be customized)
  const seeded = [...activePlayers].sort((a, b) => {
    const scoreA = (b.points || 0) + (b.wins || 0) * 10;
    const scoreB = (a.points || 0) + (a.wins || 0) * 10;
    return scoreA - scoreB;
  });

  let matchupPlayers = seeded;
  let numMatchups;

  if (gameType === 'doubles') {
    // For doubles, pair up players into teams
    // Top 2 players team up, next 2 team up, etc.
    matchupPlayers = seeded.slice(0, Math.floor(seeded.length / 2) * 2); // Remove odd player
    numMatchups = matchupPlayers.length / 4; // Each matchup needs 4 players (2 teams of 2)
  } else {
    // Singles
    numMatchups = Math.floor(matchupPlayers.length / 2);
  }

  const bracketSize = getNextPowerOf2(numMatchups);
  const byeCount = bracketSize - numMatchups;

  // Build first round matchups with byes
  const firstRound = [];
  let playerIndex = 0;

  for (let i = 0; i < bracketSize; i++) {
    if (i < byeCount) {
      // Bye matchup - team advances automatically
      if (gameType === 'doubles') {
        firstRound.push({
          id: `match_1_${i}`,
          stage: 'round1',
          position: i,
          team1: [matchupPlayers[playerIndex], matchupPlayers[playerIndex + 1]],
          team2: null, // null = bye
          winner: [matchupPlayers[playerIndex], matchupPlayers[playerIndex + 1]], // Auto-advance team1
          played: true, // Bye is auto-completed
        });
        playerIndex += 2;
      } else {
        firstRound.push({
          id: `match_1_${i}`,
          stage: 'round1',
          position: i,
          team1: [matchupPlayers[playerIndex]],
          team2: null, // null = bye
          winner: matchupPlayers[playerIndex], // Auto-advance team1
          played: true, // Bye is auto-completed
        });
        playerIndex += 1;
      }
    } else {
      // Regular matchup
      if (gameType === 'doubles') {
        firstRound.push({
          id: `match_1_${i}`,
          stage: 'round1',
          position: i,
          team1: [matchupPlayers[playerIndex], matchupPlayers[playerIndex + 1]],
          team2: [matchupPlayers[playerIndex + 2], matchupPlayers[playerIndex + 3]],
          winner: null,
          played: false,
        });
        playerIndex += 4;
      } else {
        firstRound.push({
          id: `match_1_${i}`,
          stage: 'round1',
          position: i,
          team1: [matchupPlayers[playerIndex]],
          team2: [matchupPlayers[playerIndex + 1]],
          winner: null,
          played: false,
        });
        playerIndex += 2;
      }
    }
  }

  // Calculate number of rounds needed
  const numRounds = Math.ceil(Math.log2(numMatchups));

  return {
    error: null,
    bracket: {
      format: 'single-elimination',
      gameType,
      playerCount: activePlayers.length,
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
 * Supports both singles (1v1) and doubles (2v2) match types
 */
export function generateDoubleEliminationBracket(players = [], gameType = 'singles') {
  if (!Array.isArray(players) || players.length < 2) {
    return { error: 'Minimum 2 players required for tournament', bracket: null };
  }

  const activePlayers = players.filter((p) => p?.active !== false);
  if (activePlayers.length < 2) {
    return { error: 'Minimum 2 active players required', bracket: null };
  }

  // Validate player count for even bracket
  const validation = validatePlayerCountForBracket(activePlayers.length, gameType);
  if (!validation.valid) {
    return { error: validation.error, bracket: null };
  }

  // For doubles, need minimum 4 players
  if (gameType === 'doubles' && activePlayers.length < 4) {
    return { error: 'Minimum 4 active players required for doubles tournament', bracket: null };
  }

  // Seed players
  const seeded = [...activePlayers].sort((a, b) => {
    const scoreA = (b.points || 0) + (b.wins || 0) * 10;
    const scoreB = (a.points || 0) + (a.wins || 0) * 10;
    return scoreA - scoreB;
  });

  let matchupPlayers = seeded;
  let numMatchups;

  if (gameType === 'doubles') {
    // For doubles, pair up players into teams
    matchupPlayers = seeded.slice(0, Math.floor(seeded.length / 2) * 2); // Remove odd player
    numMatchups = matchupPlayers.length / 4; // Each matchup needs 4 players (2 teams of 2)
  } else {
    // Singles
    numMatchups = Math.floor(matchupPlayers.length / 2);
  }

  const bracketSize = getNextPowerOf2(numMatchups);
  const byeCount = bracketSize - numMatchups;

  // Build winners bracket first round
  const winnersRound = [];
  let playerIndex = 0;

  for (let i = 0; i < bracketSize; i++) {
    if (i < byeCount) {
      if (gameType === 'doubles') {
        winnersRound.push({
          id: `match_w1_${i}`,
          stage: 'winners_round1',
          position: i,
          team1: [matchupPlayers[playerIndex], matchupPlayers[playerIndex + 1]],
          team2: null,
          winner: [matchupPlayers[playerIndex], matchupPlayers[playerIndex + 1]], // Auto-advance team1
          played: true, // Bye is auto-completed
        });
        playerIndex += 2;
      } else {
        winnersRound.push({
          id: `match_w1_${i}`,
          stage: 'winners_round1',
          position: i,
          team1: [matchupPlayers[playerIndex]],
          team2: null,
          winner: matchupPlayers[playerIndex], // Auto-advance team1
          played: true, // Bye is auto-completed
        });
        playerIndex += 1;
      }
    } else {
      if (gameType === 'doubles') {
        winnersRound.push({
          id: `match_w1_${i}`,
          stage: 'winners_round1',
          position: i,
          team1: [matchupPlayers[playerIndex], matchupPlayers[playerIndex + 1]],
          team2: [matchupPlayers[playerIndex + 2], matchupPlayers[playerIndex + 3]],
          winner: null,
          played: false,
        });
        playerIndex += 4;
      } else {
        winnersRound.push({
          id: `match_w1_${i}`,
          stage: 'winners_round1',
          position: i,
          team1: [matchupPlayers[playerIndex]],
          team2: [matchupPlayers[playerIndex + 1]],
          winner: null,
          played: false,
        });
        playerIndex += 2;
      }
    }
  }

  const numRounds = Math.ceil(Math.log2(numMatchups));

  return {
    error: null,
    bracket: {
      format: 'double-elimination',
      gameType,
      playerCount: activePlayers.length,
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

/**
 * Calculate group standings based on completed matches
 * Scoring: Win = 3 pts, Draw = 1 pt, Loss = 0 pts
 * Tiebreakers: Goal difference, then points scored
 */
export function calculateGroupStandings(bracket) {
  if (!bracket || bracket.format !== 'group-knockout') {
    return null;
  }

  const standings = [];

  bracket.rounds.forEach((round) => {
    if (round.bracketType === 'group') {
      const groupStandings = {};
      
      // Initialize standings
      round.players.forEach((player) => {
        groupStandings[player.id] = {
          player,
          wins: 0,
          draws: 0,
          losses: 0,
          pointsFor: 0,
          pointsAgainst: 0,
          goalDifference: 0,
          points: 0, // 3 for win, 1 for draw, 0 for loss
        };
      });

      // Process each match
      (round.matchups || []).forEach((match) => {
        if (!match.played || !match.winner) return;

        const team1Player = match.team1[0];
        const team2Player = match.team2[0];

        // Assume winner is the player object or array
        const winner = Array.isArray(match.winner) ? match.winner[0] : match.winner;
        const loser = winner.id === team1Player.id ? team2Player : team1Player;

        if (groupStandings[winner.id]) {
          groupStandings[winner.id].wins += 1;
          groupStandings[winner.id].points += 3;
        }
        if (groupStandings[loser.id]) {
          groupStandings[loser.id].losses += 1;
        }
      });

      // Sort by points (desc), then goal difference (desc)
      const sorted = Object.values(groupStandings).sort((a, b) => {
        if (b.points !== a.points) return b.points - a.points;
        if (b.goalDifference !== a.goalDifference) return b.goalDifference - a.goalDifference;
        return b.pointsFor - a.pointsFor;
      });

      standings.push({
        groupId: round.groupId,
        groupName: round.stageName,
        standings: sorted,
        top2: sorted.slice(0, 2), // Top 2 advance to knockout
      });
    }
  });

  return standings;
}

/**
 * Generate knockout bracket from top 2 teams of each group
 */
export function generateKnockoutFromGroups(bracket) {
  if (!bracket || bracket.format !== 'group-knockout') {
    return null;
  }

  const standings = calculateGroupStandings(bracket);
  if (!standings) return null;

  // Get top 2 from each group
  const advancedTeams = standings.flatMap(g => g.top2);
  
  // Create knockout matchups (1st of group A vs 2nd of group B, etc.)
  // For 2 groups: Group A 1st vs Group B 2nd, Group A 2nd vs Group B 1st
  // For 3 groups: More complex seeding
  
  const matchups = [];
  let matchupNum = 0;

  if (standings.length === 2) {
    // 2 groups: standard cross-over
    matchups.push({
      id: `match_ko_1`,
      stage: 'knockout_round1',
      position: 0,
      team1: [standings[0].top2[0].player], // A1
      team2: [standings[1].top2[1].player], // B2
      winner: null,
      played: false,
    });
    matchups.push({
      id: `match_ko_2`,
      stage: 'knockout_round1',
      position: 1,
      team1: [standings[0].top2[1].player], // A2
      team2: [standings[1].top2[0].player], // B1
      winner: null,
      played: false,
    });
  } else {
    // 3 groups: more complex seeding
    // A1 vs C2, B1 vs A2, C1 vs B2
    const groups = standings.map(g => g.top2);
    matchups.push({
      id: `match_ko_1`,
      stage: 'knockout_round1',
      position: 0,
      team1: [groups[0][0].player], // A1
      team2: [groups[2][1].player], // C2
      winner: null,
      played: false,
    });
    matchups.push({
      id: `match_ko_2`,
      stage: 'knockout_round1',
      position: 1,
      team1: [groups[1][0].player], // B1
      team2: [groups[0][1].player], // A2
      winner: null,
      played: false,
    });
    matchups.push({
      id: `match_ko_3`,
      stage: 'knockout_round1',
      position: 2,
      team1: [groups[2][0].player], // C1
      team2: [groups[1][1].player], // B2
      winner: null,
      played: false,
    });
  }

  return {
    roundNumber: 1,
    stageName: 'Round of ' + matchups.length * 2,
    bracketType: 'knockout',
    matchups,
  };
}

/**
 * Generate a group stage + knockout bracket
 * Players play round-robin in groups, top 2 advance to knockout
 */
export function generateGroupKnockoutBracket(players = [], gameType = 'singles') {
  if (!Array.isArray(players) || players.length < 6) {
    return { error: 'Minimum 6 players required for group stage tournament', bracket: null };
  }

  const activePlayers = players.filter((p) => p?.active !== false);
  if (activePlayers.length < 6) {
    return { error: 'Minimum 6 active players required', bracket: null };
  }

  // Validate player count for knockout stage (top 2 per group will advance)
  // 2 groups → 4 qualified teams (div by 4)
  // 3 groups → 6 qualified teams (div by 6, but need knockout to work with 4 or div by 5 for singles)
  // So overall player count must ensure knockout bracket is valid
  const validation = validatePlayerCountForBracket(activePlayers.length, gameType);
  if (!validation.valid) {
    return { error: validation.error, bracket: null };
  }

  // Shuffle players for random group assignment (World Cup style - NOT seeded)
  const shuffled = [...activePlayers].sort(() => Math.random() - 0.5);

  // Divide into groups randomly
  const numGroups = shuffled.length <= 8 ? 2 : 3;
  const playersPerGroup = Math.ceil(shuffled.length / numGroups);
  const groups = [];
  
  for (let i = 0; i < numGroups; i++) {
    groups.push(shuffled.slice(i * playersPerGroup, (i + 1) * playersPerGroup));
  }

  // Generate round-robin matchups for each group
  const groupRounds = groups.map((group, groupIdx) => {
    const matchups = [];
    
    // All vs all in group
    for (let i = 0; i < group.length; i++) {
      for (let j = i + 1; j < group.length; j++) {
        matchups.push({
          id: `match_g${groupIdx + 1}_${i}_${j}`,
          stage: `group_${groupIdx + 1}`,
          position: matchups.length,
          team1: [group[i]],
          team2: [group[j]],
          winner: null,
          played: false,
          groupId: groupIdx + 1,
        });
      }
    }
    
    return {
      roundNumber: 1,
      stageName: `Group ${String.fromCharCode(65 + groupIdx)}`,
      bracketType: 'group',
      groupId: groupIdx + 1,
      players: group,
      matchups,
      standings: group.map(p => ({
        player: p,
        wins: 0,
        losses: 0,
        pointsFor: 0,
        pointsAgainst: 0,
        goalDifference: 0,
      })),
    };
  });

  return {
    error: null,
    bracket: {
      format: 'group-knockout',
      gameType,
      playerCount: activePlayers.length,
      numGroups,
      playersPerGroup,
      totalRounds: Math.ceil(Math.log2(Math.ceil(activePlayers.length / numGroups) * 2)) + 1,
      seededPlayers: shuffled, // Randomly shuffled, not seeded
      stage: 'group', // Current stage: 'group' or 'knockout'
      rounds: groupRounds,
      knockoutRounds: [], // Populated when advancing from groups
      advancedTeams: [], // Top 2 from each group
      createdAt: new Date().toISOString(),
    },
  };
}
