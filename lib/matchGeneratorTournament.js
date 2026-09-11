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
 * Validate player count for group stage tournaments
 * Singles: minimum 12 (4 players per group in 3 groups), then only even numbers
 * Doubles: minimum 18 (3 pairs per group in 3 groups = 9 pairs), then only even numbers
 */
function validatePlayerCountForGroupStage(playerCount, gameType) {
  if (gameType === 'doubles') {
    // Doubles: minimum 18 players (3 groups of 3 pairs), must be even
    if (playerCount < 18) {
      return {
        valid: false,
        error: `Doubles group stage requires minimum 18 players (3 groups of 3 pairs). You have ${playerCount} players.`,
      };
    }
    if (playerCount % 2 !== 0) {
      return {
        valid: false,
        error: `Doubles group stage requires an even number of players. You have ${playerCount} players. Try ${playerCount + 1} or ${playerCount - 1} players.`,
      };
    }
  } else {
    // Singles: minimum 12 players (4 players per group in 3 groups), must be even
    if (playerCount < 12) {
      return {
        valid: false,
        error: `Singles group stage requires minimum 12 players (4 per group in 3 groups). You have ${playerCount} players.`,
      };
    }
    if (playerCount % 2 !== 0) {
      return {
        valid: false,
        error: `Singles group stage requires an even number of players. You have ${playerCount} players. Try ${playerCount + 1} or ${playerCount - 1} players.`,
      };
    }
  }
  
  return { valid: true, error: null };
}

/**
 * Assign court numbers to all matches in a bracket
 * Distributes matches across available courts
 */
export function assignCourtsToRounds(bracket, courtsCount = 2) {
  if (!bracket || !bracket.rounds || courtsCount < 1) {
    return bracket;
  }

  const updatedBracket = JSON.parse(JSON.stringify(bracket)); // Deep copy

  // Helper: Get all player IDs from a match
  const getPlayerIds = (match) => {
    const ids = new Set();
    if (match.team1) {
      (Array.isArray(match.team1) ? match.team1 : [match.team1]).forEach(p => {
        if (p && p.id) ids.add(p.id);
      });
    }
    if (match.team2) {
      (Array.isArray(match.team2) ? match.team2 : [match.team2]).forEach(p => {
        if (p && p.id) ids.add(p.id);
      });
    }
    return ids;
  };

  // Process group rounds with time-slot based assignment
  updatedBracket.rounds.forEach((round) => {
    if (!round.matchups || round.matchups.length === 0) return;

    // Split matches into time slots based on court availability
    const timeSlots = [];
    let currentTimeSlot = {
      courtPlayers: {},
      matches: []
    };

    // Initialize courts for this time slot
    for (let i = 1; i <= courtsCount; i++) {
      currentTimeSlot.courtPlayers[i] = new Set();
    }

    // Assign matches to time slots
    round.matchups.forEach((match) => {
      const playerIds = getPlayerIds(match);
      if (playerIds.size === 0) return;

      // Find first court in current time slot where all players are available
      let assignedCourt = null;
      for (let courtNum = 1; courtNum <= courtsCount; courtNum++) {
        const courtHasConflict = Array.from(playerIds).some(playerId => 
          currentTimeSlot.courtPlayers[courtNum].has(playerId)
        );

        if (!courtHasConflict) {
          assignedCourt = courtNum;
          break;
        }
      }

      // If no court in current time slot, start a new time slot
      if (assignedCourt === null) {
        timeSlots.push(currentTimeSlot);
        currentTimeSlot = {
          courtPlayers: {},
          matches: []
        };
        for (let i = 1; i <= courtsCount; i++) {
          currentTimeSlot.courtPlayers[i] = new Set();
        }
        assignedCourt = 1; // Assign to court 1 of new time slot
      }

      match.court = assignedCourt;
      match.timeSlot = timeSlots.length; // Track which time slot this match belongs to
      currentTimeSlot.matches.push(match);
      playerIds.forEach(playerId => currentTimeSlot.courtPlayers[assignedCourt].add(playerId));
    });

    // Add final time slot if it has matches
    if (currentTimeSlot.matches.length > 0) {
      timeSlots.push(currentTimeSlot);
    }
  });

  // Process knockout rounds with same logic
  if (updatedBracket.knockoutRounds) {
    updatedBracket.knockoutRounds.forEach((round) => {
      if (!round.matchups || round.matchups.length === 0) return;

      // Split matches into time slots based on court availability
      const timeSlots = [];
      let currentTimeSlot = {
        courtPlayers: {},
        matches: []
      };

      // Initialize courts for this time slot
      for (let i = 1; i <= courtsCount; i++) {
        currentTimeSlot.courtPlayers[i] = new Set();
      }

      // Assign matches to time slots
      round.matchups.forEach((match) => {
        const playerIds = getPlayerIds(match);
        if (playerIds.size === 0) return;

        // Find first court in current time slot where all players are available
        let assignedCourt = null;
        for (let courtNum = 1; courtNum <= courtsCount; courtNum++) {
          const courtHasConflict = Array.from(playerIds).some(playerId => 
            currentTimeSlot.courtPlayers[courtNum].has(playerId)
          );

          if (!courtHasConflict) {
            assignedCourt = courtNum;
            break;
          }
        }

        // If no court in current time slot, start a new time slot
        if (assignedCourt === null) {
          timeSlots.push(currentTimeSlot);
          currentTimeSlot = {
            courtPlayers: {},
            matches: []
          };
          for (let i = 1; i <= courtsCount; i++) {
            currentTimeSlot.courtPlayers[i] = new Set();
          }
          assignedCourt = 1; // Assign to court 1 of new time slot
        }

        match.court = assignedCourt;
        match.timeSlot = timeSlots.length; // Track which time slot this match belongs to
        currentTimeSlot.matches.push(match);
        playerIds.forEach(playerId => currentTimeSlot.courtPlayers[assignedCourt].add(playerId));
      });

      // Add final time slot if it has matches
      if (currentTimeSlot.matches.length > 0) {
        timeSlots.push(currentTimeSlot);
      }
    });
  }

  return updatedBracket;
}

/**
 * Generate pairs for doubles based on partner mode
 * Returns array of [player1, player2] pairs
 */
function generateDoublesPairs(players, doublesConfig = {}) {
  if (!players || players.length < 2) return [];
  
  // If known partners mode with predefined pairings, use those
  if (doublesConfig.doublesPartnerMode === 'known' && doublesConfig.playerPartners) {
    const partners = doublesConfig.playerPartners;
    const pairs = [];
    const used = new Set();
    
    for (const player of players) {
      if (used.has(player.id)) continue;
      
      const partnerId = partners[player.id];
      const partner = players.find(p => p.id === partnerId);
      
      if (partner && !used.has(partner.id)) {
        pairs.push([player, partner]);
        used.add(player.id);
        used.add(partner.id);
      }
    }
    
    return pairs;
  }
  
  // Random pairing mode - shuffle and pair
  const shuffled = [...players].sort(() => Math.random() - 0.5);
  const pairs = [];
  
  for (let i = 0; i < shuffled.length - 1; i += 2) {
    pairs.push([shuffled[i], shuffled[i + 1]]);
  }
  
  return pairs;
}

/**
 * Extract pairs from a group of players based on known partners or random pairing
 * Used within group stages to maintain partnership integrity
 */
function getPairsFromGroup(groupPlayers, playerPartners = {}, isKnownPartnerMode = false) {
  if (!Array.isArray(groupPlayers) || groupPlayers.length < 2) {
    return [];
  }
  
  const pairs = [];
  const used = new Set();
  
  if (isKnownPartnerMode && playerPartners) {
    // Try to pair known partners first
    for (const player of groupPlayers) {
      if (used.has(player.id)) continue;
      
      const partnerId = playerPartners[player.id];
      const partner = groupPlayers.find(p => p.id === partnerId);
      
      if (partner && !used.has(partner.id)) {
        pairs.push([player, partner]);
        used.add(player.id);
        used.add(partner.id);
      }
    }
  }
  
  // If random mode or not all partners found, pair remaining sequentially
  const remaining = groupPlayers.filter(p => !used.has(p.id));
  for (let i = 0; i < remaining.length - 1; i += 2) {
    pairs.push([remaining[i], remaining[i + 1]]);
  }
  
  return pairs;
}

/**
 * Get next power of 2 for bracket size (for byes)
 */
function getNextPowerOf2(n) {
  let p = 1;
  while (p < n) p *= 2;
  return p;
}

function normalizeWinner(winner) {
  if (!winner || winner.draw === true) return winner;
  return (Array.isArray(winner) ? winner : [winner]).flat().filter(Boolean);
}

/**
 * Generate a single elimination bracket
 * Returns a tournament structure with rounds and matchups
 * Supports both singles (1v1) and doubles (2v2) match types
 */
export function generateSingleEliminationBracket(players = [], gameType = 'singles', doublesConfig = {}) {
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
  let doublePairs = []; // Store pairs for later use

  if (gameType === 'doubles') {
    // For doubles, pair up players based on partner configuration
    // Generate pairs using known partners or random pairing
    doublePairs = generateDoublesPairs(seeded, doublesConfig);
    matchupPlayers = doublePairs.flat(); // Flatten pairs back to linear array for matchup creation
    numMatchups = doublePairs.length / 2; // Each matchup needs 2 pairs (4 players)
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
          winner: [matchupPlayers[playerIndex]], // Auto-advance team1
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
      doublesPartnerMode: doublesConfig.doublesPartnerMode,
      playerPartners: doublesConfig.playerPartners,
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
export function generateDoubleEliminationBracket(players = [], gameType = 'singles', doublesConfig = {}) {
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
  let doublePairs = [];

  if (gameType === 'doubles') {
    // For doubles, pair up players based on partner configuration
    doublePairs = generateDoublesPairs(seeded, doublesConfig);
    matchupPlayers = doublePairs.flat();
    numMatchups = doublePairs.length / 2; // Each matchup needs 2 pairs (4 players)
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
          winner: [matchupPlayers[playerIndex]], // Auto-advance team1
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
      doublesPartnerMode: doublesConfig.doublesPartnerMode,
      playerPartners: doublesConfig.playerPartners,
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
 * Generate next knockout round(s) for proper tournament progression
 * Handles: QF → SF → (Final + 3rd Place Playoff)
 * Returns array of rounds to add
 */
export function generateNextKnockoutRound(knockoutRounds, currentRoundIndex) {
  if (!knockoutRounds || knockoutRounds.length === 0) {
    return { error: 'Invalid knockout rounds', rounds: [] };
  }

  const currentRound = knockoutRounds[currentRoundIndex];
  if (!currentRound) {
    return { error: 'Invalid current round index', rounds: [] };
  }

  const matchups = currentRound.matchups || [];
  const winners = matchups
    .filter(m => m.winner && !m.winner.draw)
    .map(m => normalizeWinner(m.winner));
  const losers = matchups
    .filter(m => m.winner && !m.winner.draw) // Only losers from matches that have been played
    .map((m, idx) => {
      // Determine who lost in this match
      const winnerTeam = normalizeWinner(m.winner);
      return winnerTeam.some(winnerPlayer =>
        m.team1?.some(teamPlayer => teamPlayer?.id === winnerPlayer?.id)
      ) ? m.team2 : m.team1;
    })
    .filter(Boolean);

  if (winners.length < 2) {
    return { error: 'Need at least 2 winners to advance', rounds: [] };
  }

  const roundsToAdd = [];
  const numMatches = matchups.length;

  // Determine tournament stage based on number of matches
  if (numMatches === 4) {
    // Quarterfinals → Generate Semifinals (2 matches from 4 winners)
    const semifinalMatchups = [];
    for (let i = 0; i < winners.length; i += 2) {
      if (i + 1 < winners.length) {
        semifinalMatchups.push({
          id: `match_ko_sf_${Math.floor(i / 2) + 1}`,
          stage: 'knockout_round2',
          position: Math.floor(i / 2),
          team1: winners[i],
          team2: winners[i + 1],
          winner: null,
          played: false,
        });
      }
    }

    roundsToAdd.push({
      roundNumber: knockoutRounds.length + 1,
      stageName: 'Semifinals',
      bracketType: 'knockout',
      matchups: semifinalMatchups,
    });
  } else if (numMatches === 2) {
    // Semifinals → Generate Final and 3rd Place Playoff (2 matches: winners + losers)
    // Final: winners of SF
    const finalMatchup = {
      id: 'match_ko_final',
      stage: 'knockout_final',
      position: 0,
      team1: winners[0],
      team2: winners[1],
      winner: null,
      played: false,
    };

    // 3rd Place Playoff: losers of SF
    const thirdPlaceMatchup = losers.length >= 2 ? {
      id: 'match_ko_3rd_place',
      stage: 'knockout_3rd_place',
      position: 0,
      team1: losers[0],
      team2: losers[1],
      winner: null,
      played: false,
    } : null;

    roundsToAdd.push({
      roundNumber: knockoutRounds.length + 1,
      stageName: 'Final',
      bracketType: 'knockout',
      matchups: [finalMatchup],
    });

    if (thirdPlaceMatchup) {
      roundsToAdd.push({
        roundNumber: knockoutRounds.length + 2,
        stageName: '3rd Place Playoff',
        bracketType: 'knockout',
        matchups: [thirdPlaceMatchup],
      });
    }
  }

  return { error: null, rounds: roundsToAdd };
}

/**
 * Generate next round matchups based on current winners
 * Called after each round completes (for non-knockout stages)
 */
export function generateNextRound(bracket, currentRound) {
  if (!bracket || !currentRound) {
    return { error: 'Invalid bracket or round', matchups: null };
  }

  const { format, rounds } = bracket;
  const lastRoundMatchups = currentRound.matchups || [];
  const winners = lastRoundMatchups
    .filter((m) => m.winner)
    .map((m) => normalizeWinner(m.winner));

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
        team1: winners[i],
        team2: winners[i + 1],
        winner: null,
        played: false,
      });
    } else if (winners.length % 2 === 1) {
      // Bye for odd player
      nextRound.push({
        id: `match_${rounds.length}_${Math.floor(i / 2)}`,
        stage: `round${rounds.length + 1}`,
        position: Math.floor(i / 2),
        team1: winners[i],
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
 * Winner is stored as a team array, or { draw: true } for group stage draws.
 */
export function recordBracketMatchResult(bracket, matchId, winner) {
  if (!bracket || !matchId || !winner) {
    return { error: 'Invalid parameters', updated: false };
  }

  // Accept either a winner value or { winner, score } from the result modal.
  const result = winner && winner.winner !== undefined ? winner : { winner };
  const resultWinner = result.winner;
  const isDraw = resultWinner?.draw === true;

  // Search both group/elimination rounds and generated knockout rounds.
  const roundCollections = [bracket.rounds, bracket.knockoutRounds];
  for (const rounds of roundCollections) {
    if (!Array.isArray(rounds)) continue;
    for (const round of rounds) {
    for (const match of round.matchups || []) {
      if (match.id === matchId) {
        if (isDraw) {
          // Mark as draw for group stage matches
          match.draw = true;
          match.winner = null;
        } else {
          match.winner = normalizeWinner(resultWinner);
          match.draw = false;
        }
        if (result.score) {
          match.score = {
            team1: Number(result.score.team1),
            team2: Number(result.score.team2),
          };
        }
        match.played = true;
        match.completedAt = new Date().toISOString();
        return { error: null, updated: true, match };
      }
    }
  }
  }

  return { error: 'Match not found', updated: false };
}

/**
 * Get bracket statistics - active matches, completed rounds, standings
 */
export function getBracketStats(bracket) {
  if (!bracket || (!bracket.rounds && !bracket.knockoutRounds)) {
    return null;
  }

  const allRounds = [
    ...(bracket.rounds || []),
    ...(bracket.knockoutRounds || []),
  ];
  const allMatchups = allRounds.flatMap((r) => r.matchups || []);
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
    currentRound: bracket.stage === 'knockout'
      ? (bracket.knockoutRounds || []).length
      : (bracket.rounds || []).length,
    playerProgress,
  };
}

/**
 * Get tournament winner
 */
export function getTournamentWinner(bracket) {
  if (!bracket) {
    return null;
  }

  const rounds = bracket.stage === 'knockout' ? bracket.knockoutRounds : bracket.rounds;
  if (!Array.isArray(rounds) || rounds.length === 0) return null;

  // Final round is the named final when available, otherwise the last round.
  const lastRound = rounds.find(round => round.stageName === 'Final') || rounds[rounds.length - 1];
  if (!lastRound || !lastRound.matchups || lastRound.matchups.length === 0) {
    return null;
  }

  // Only one matchup in final round
  const finalMatch = lastRound.matchups[0];
  return finalMatch?.winner || null;
}

export function isTournamentComplete(bracket) {
  if (!bracket) return false;

  if (bracket.format === 'group-knockout') {
    const rounds = bracket.knockoutRounds || [];
    const final = rounds.find(round => round.stageName === 'Final');
    const placementMatches = rounds
      .filter(round => ['Final', '3rd Place Playoff'].includes(round.stageName))
      .flatMap(round => round.matchups || []);
    return Boolean(final?.matchups?.[0]?.played) &&
      placementMatches.every(match => match.played);
  }

  const rounds = bracket.rounds || [];
  const final = rounds[rounds.length - 1];
  return Boolean(final?.matchups?.length === 1 && final.matchups[0].played);
}

export function getActiveKnockoutRound(knockoutRounds = []) {
  return knockoutRounds.find(round =>
    (round.matchups || []).some(match => !match.played)
  ) || knockoutRounds.find(round => round.stageName === 'Final') || null;
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

  if (!bracket.rounds || !Array.isArray(bracket.rounds)) {
    return [];
  }

  const standings = [];

  bracket.rounds.forEach((round) => {
    if (round.bracketType === 'group') {
      const groupStandings = {};
      
      if (bracket.gameType === 'doubles') {
        // For doubles: track TEAM standings, not individual players
        // Extract unique teams from matchups
        const teams = [];
        const seenTeamPairs = new Set();

        (round.matchups || []).forEach((match) => {
          // Extract team1
          if (match.team1 && match.team1.length > 0) {
            const team1Names = match.team1.map(p => p?.id).sort().join('|');
            if (!seenTeamPairs.has(team1Names)) {
              teams.push(match.team1);
              seenTeamPairs.add(team1Names);
            }
          }

          // Extract team2
          if (match.team2 && match.team2.length > 0) {
            const team2Names = match.team2.map(p => p?.id).sort().join('|');
            if (!seenTeamPairs.has(team2Names)) {
              teams.push(match.team2);
              seenTeamPairs.add(team2Names);
            }
          }
        });

        // Initialize standings for each team
        teams.forEach((team) => {
          const teamKey = team.map(p => p?.id).sort().join('|');
          groupStandings[teamKey] = {
            team,
            teamNames: team.map(p => p?.name).join(' & '),
            wins: 0,
            draws: 0,
            losses: 0,
            pointsFor: 0,
            pointsAgainst: 0,
            goalDifference: 0,
            points: 0,
          };
        });

        // Process each match
        (round.matchups || []).forEach((match) => {
          if (!match.played) return;

          const team1Key = match.team1.map(p => p?.id).sort().join('|');
          const team2Key = match.team2.map(p => p?.id).sort().join('|');

          if (match.score && Number.isFinite(Number(match.score.team1)) && Number.isFinite(Number(match.score.team2))) {
            const score1 = Number(match.score.team1);
            const score2 = Number(match.score.team2);
            groupStandings[team1Key].pointsFor += score1;
            groupStandings[team1Key].pointsAgainst += score2;
            groupStandings[team1Key].goalDifference += score1 - score2;
            groupStandings[team2Key].pointsFor += score2;
            groupStandings[team2Key].pointsAgainst += score1;
            groupStandings[team2Key].goalDifference += score2 - score1;
          }

          if (match.winner?.draw) {
            groupStandings[team1Key].draws++;
            groupStandings[team1Key].points++;
            groupStandings[team2Key].draws++;
            groupStandings[team2Key].points++;
          } else {
            // Check if team1 won - handle both array and object winner formats
            const winnerArray = Array.isArray(match.winner) ? match.winner : (match.winner ? [match.winner] : []);
            const team1Won = winnerArray.some(w => 
              match.team1.some(t => t?.id === w?.id)
            );

            if (team1Won) {
              groupStandings[team1Key].wins++;
              groupStandings[team1Key].points += 3;
              groupStandings[team2Key].losses++;
            } else {
              groupStandings[team2Key].wins++;
              groupStandings[team2Key].points += 3;
              groupStandings[team1Key].losses++;
            }
          }
        });
      } else {
        // For singles: track individual player standings
        // Defensive: if round.players is missing, extract from matchups
        let playersToProcess = round.players || [];
        
        if (!playersToProcess || playersToProcess.length === 0) {
          // Fallback: extract unique players from all matchups in this round
          const playersSet = new Set();
          (round.matchups || []).forEach((match) => {
            if (match.team1 && match.team1.length > 0) playersSet.add(match.team1[0]);
            if (match.team2 && match.team2.length > 0) playersSet.add(match.team2[0]);
          });
          playersToProcess = Array.from(playersSet);
        }
        
        playersToProcess.forEach((player) => {
          groupStandings[player.id] = {
            player,
            wins: 0,
            draws: 0,
            losses: 0,
            pointsFor: 0,
            pointsAgainst: 0,
            goalDifference: 0,
            points: 0,
          };
        });

        // Process each match
        (round.matchups || []).forEach((match) => {
          if (!match.played) return;

          const p1 = match.team1?.[0];
          const p2 = match.team2?.[0];

          if (!p1 || !p2) return;

          if (match.score && Number.isFinite(Number(match.score.team1)) && Number.isFinite(Number(match.score.team2))) {
            const score1 = Number(match.score.team1);
            const score2 = Number(match.score.team2);
            groupStandings[p1.id].pointsFor += score1;
            groupStandings[p1.id].pointsAgainst += score2;
            groupStandings[p1.id].goalDifference += score1 - score2;
            groupStandings[p2.id].pointsFor += score2;
            groupStandings[p2.id].pointsAgainst += score1;
            groupStandings[p2.id].goalDifference += score2 - score1;
          }

          if (match.winner?.draw) {
            groupStandings[p1.id].draws++;
            groupStandings[p1.id].points++;
            groupStandings[p2.id].draws++;
            groupStandings[p2.id].points++;
          } else {
            // Handle winner: could be a player object or array of players
            let winnerId = null;
            if (match.winner && typeof match.winner === 'object') {
              if (Array.isArray(match.winner)) {
                winnerId = match.winner[0]?.id;
              } else {
                winnerId = match.winner.id;
              }
            }
            
            if (winnerId === p1.id) {
              groupStandings[p1.id].wins++;
              groupStandings[p1.id].points += 3;
              groupStandings[p2.id].losses++;
            } else if (winnerId === p2.id) {
              groupStandings[p2.id].wins++;
              groupStandings[p2.id].points += 3;
              groupStandings[p1.id].losses++;
            }
          }
        });
      }

      // Sort by points, then point difference, then points scored, then name.
      const sorted = Object.values(groupStandings).sort((a, b) => {
        const pointsDifference = (b.points || 0) - (a.points || 0);
        if (pointsDifference !== 0) return pointsDifference;
        const goalDifference = (b.goalDifference || 0) - (a.goalDifference || 0);
        if (goalDifference !== 0) return goalDifference;
        const pointsForDifference = (b.pointsFor || 0) - (a.pointsFor || 0);
        if (pointsForDifference !== 0) return pointsForDifference;
        return (a.teamNames || a.player?.name || '').localeCompare(b.teamNames || b.player?.name || '');
      });

      standings.push({
        groupId: round.groupId,
        groupName: round.stageName,
        standings: sorted,
        top2: sorted.slice(0, 2), // Top 2 teams (for doubles) or top 2 players (for singles)
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
  if (!standings || standings.length < 2) return null; // Need at least 2 groups

  const matchups = [];

  if (standings.length === 2) {
    // Validate we have top2 in both groups
    if (!standings[0].top2?.[1] || !standings[1].top2?.[1]) {
      return null; // Missing data for knockout
    }

    // 2 groups: standard cross-over
    const group1Top1 = standings[0].top2[0];
    const group1Top2 = standings[0].top2[1];
    const group2Top1 = standings[1].top2[0];
    const group2Top2 = standings[1].top2[1];

    if (bracket.gameType === 'doubles') {
      // For doubles, standings contain team data
      const team1A = group1Top1.team || [group1Top1.player]; // Winner Group A
      const team2A = group1Top2.team || [group1Top2.player]; // Runner-up Group A
      const team1B = group2Top1.team || [group2Top1.player]; // Winner Group B
      const team2B = group2Top2.team || [group2Top2.player]; // Runner-up Group B

      matchups.push({
        id: `match_ko_1`,
        stage: 'knockout_round1',
        position: 0,
        team1: team1A,
        team2: team2B,
        winner: null,
        played: false,
      });
      matchups.push({
        id: `match_ko_2`,
        stage: 'knockout_round1',
        position: 1,
        team1: team2A,
        team2: team1B,
        winner: null,
        played: false,
      });
    } else {
      // Singles: just use the player objects
      matchups.push({
        id: `match_ko_1`,
        stage: 'knockout_round1',
        position: 0,
        team1: [group1Top1.player],
        team2: [group2Top2.player],
        winner: null,
        played: false,
      });
      matchups.push({
        id: `match_ko_2`,
        stage: 'knockout_round1',
        position: 1,
        team1: [group1Top2.player],
        team2: [group2Top1.player],
        winner: null,
        played: false,
      });
    }
  } else if (standings.length === 3) {
    // 3 groups: more complex seeding
    const groups = standings.map(g => g.top2);
    
    if (bracket.gameType === 'doubles') {
      // For doubles, standings contain team data
      const team1A = groups[0][0].team || [groups[0][0].player];
      const team2A = groups[0][1].team || [groups[0][1].player];
      const team1B = groups[1][0].team || [groups[1][0].player];
      const team2B = groups[1][1].team || [groups[1][1].player];
      const team1C = groups[2][0].team || [groups[2][0].player];
      const team2C = groups[2][1].team || [groups[2][1].player];

      matchups.push({
        id: `match_ko_1`,
        stage: 'knockout_round1',
        position: 0,
        team1: team1A,
        team2: team2C,
        winner: null,
        played: false,
      });
      matchups.push({
        id: `match_ko_2`,
        stage: 'knockout_round1',
        position: 1,
        team1: team1B,
        team2: team2A,
        winner: null,
        played: false,
      });
      matchups.push({
        id: `match_ko_3`,
        stage: 'knockout_round1',
        position: 2,
        team1: team1C,
        team2: team2B,
        winner: null,
        played: false,
      });
    } else {
      // Singles: just use the player objects
      matchups.push({
        id: `match_ko_1`,
        stage: 'knockout_round1',
        position: 0,
        team1: [groups[0][0].player],
        team2: [groups[2][1].player],
        winner: null,
        played: false,
      });
      matchups.push({
        id: `match_ko_2`,
        stage: 'knockout_round1',
        position: 1,
        team1: [groups[1][0].player],
        team2: [groups[0][1].player],
        winner: null,
        played: false,
      });
      matchups.push({
        id: `match_ko_3`,
        stage: 'knockout_round1',
        position: 2,
        team1: [groups[2][0].player],
        team2: [groups[1][1].player],
        winner: null,
        played: false,
      });
    }
  } else if (standings.length === 4) {
    // 4 groups: cross-bracket seeding for quarterfinals
    // Winner A vs Runner-up B
    // Winner B vs Runner-up A
    // Winner C vs Runner-up D
    // Winner D vs Runner-up C

    const groups = standings.map(g => g.top2);

    if (bracket.gameType === 'doubles') {
      // For doubles, standings already contain teams from calculateGroupStandings
      const team1A = groups[0][0].team || [groups[0][0].player]; // Winner Group A
      const team2A = groups[0][1].team || [groups[0][1].player]; // Runner-up Group A
      const team1B = groups[1][0].team || [groups[1][0].player]; // Winner Group B
      const team2B = groups[1][1].team || [groups[1][1].player]; // Runner-up Group B
      const team1C = groups[2][0].team || [groups[2][0].player]; // Winner Group C
      const team2C = groups[2][1].team || [groups[2][1].player]; // Runner-up Group C
      const team1D = groups[3][0].team || [groups[3][0].player]; // Winner Group D
      const team2D = groups[3][1].team || [groups[3][1].player]; // Runner-up Group D

      // Quarterfinal matchups with cross-bracket seeding
      matchups.push({
        id: `match_ko_1`,
        stage: 'knockout_round1',
        position: 0,
        team1: team1A, // Winner Group A
        team2: team2B, // Runner-up Group B
        winner: null,
        played: false,
      });
      matchups.push({
        id: `match_ko_2`,
        stage: 'knockout_round1',
        position: 1,
        team1: team1B, // Winner Group B
        team2: team2A, // Runner-up Group A
        winner: null,
        played: false,
      });
      matchups.push({
        id: `match_ko_3`,
        stage: 'knockout_round1',
        position: 2,
        team1: team1C, // Winner Group C
        team2: team2D, // Runner-up Group D
        winner: null,
        played: false,
      });
      matchups.push({
        id: `match_ko_4`,
        stage: 'knockout_round1',
        position: 3,
        team1: team1D, // Winner Group D
        team2: team2C, // Runner-up Group C
        winner: null,
        played: false,
      });
    } else {
      // Singles: same cross-bracket seeding
      matchups.push({
        id: `match_ko_1`,
        stage: 'knockout_round1',
        position: 0,
        team1: [groups[0][0].player], // Winner Group A
        team2: [groups[1][1].player], // Runner-up Group B
        winner: null,
        played: false,
      });
      matchups.push({
        id: `match_ko_2`,
        stage: 'knockout_round1',
        position: 1,
        team1: [groups[1][0].player], // Winner Group B
        team2: [groups[0][1].player], // Runner-up Group A
        winner: null,
        played: false,
      });
      matchups.push({
        id: `match_ko_3`,
        stage: 'knockout_round1',
        position: 2,
        team1: [groups[2][0].player], // Winner Group C
        team2: [groups[3][1].player], // Runner-up Group D
        winner: null,
        played: false,
      });
      matchups.push({
        id: `match_ko_4`,
        stage: 'knockout_round1',
        position: 3,
        team1: [groups[3][0].player], // Winner Group D
        team2: [groups[2][1].player], // Runner-up Group C
        winner: null,
        played: false,
      });
    }
  }

  if (matchups.length === 0) {
    console.error('[generateKnockoutFromGroups] ERROR: No knockout matchups generated!', {
      standingsCount: standings.length,
      groups: standings.map(s => ({ name: s.groupName, top2: s.top2?.length || 0 }))
    });
    return null;
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
export function generateGroupKnockoutBracket(players = [], gameType = 'singles', doublesConfig = {}) {
  const activePlayers = players.filter((p) => p?.active !== false);

  // Validate player count for group stage format
  const validation = validatePlayerCountForGroupStage(activePlayers.length, gameType);
  if (!validation.valid) {
    return { error: validation.error, bracket: null };
  }

  // Shuffle players for random group assignment (World Cup style - NOT seeded)
  const shuffled = [...activePlayers].sort(() => Math.random() - 0.5);

  // Calculate groups based on game type
  // For doubles: 8 players per group (4 teams of 2)
  // For singles: 4 players per group
  const targetPlayersPerGroup = gameType === 'doubles' ? 8 : 4;
  let numGroups = Math.floor(shuffled.length / targetPlayersPerGroup);
  
  // Ensure even number of groups for fair knockout bracket (top 2 from each group)
  if (numGroups % 2 !== 0) {
    numGroups = Math.max(2, numGroups - 1); // Round down to nearest even, minimum 2
  }

  // The current seeding and progression logic supports two or four groups.
  if (numGroups !== 2 && numGroups !== 4) {
    return {
      error: `Group knockout currently supports 2 or 4 groups. ${activePlayers.length} players would create ${numGroups} groups.`,
      bracket: null,
    };
  }
  
  // Recalculate players per group based on even number of groups
  const playersPerGroup = Math.ceil(shuffled.length / numGroups);
  console.log(`[generateGroupKnockoutBracket] Total players: ${shuffled.length}, Groups: ${numGroups}, Players per group: ${playersPerGroup}`);
  
  const groups = [];
  for (let i = 0; i < numGroups; i++) {
    groups.push(shuffled.slice(i * playersPerGroup, (i + 1) * playersPerGroup));
  }

  // Generate round-robin matchups for each group
  const groupRounds = groups.map((group, groupIdx) => {
    const matchups = [];
    
    let groupPlayers = group;
    
    // For doubles, pair up players within the group
    if (gameType === 'doubles') {
      // Remove odd player if necessary
      groupPlayers = group.slice(0, Math.floor(group.length / 2) * 2);
      
      // Create teams by pairing, respecting known partners if applicable
      const isKnownPartnerMode = doublesConfig.doublesPartnerMode === 'known';
      const teams = getPairsFromGroup(groupPlayers, doublesConfig.playerPartners, isKnownPartnerMode);
      
      // All teams vs all other teams in group (round-robin)
      for (let i = 0; i < teams.length; i++) {
        for (let j = i + 1; j < teams.length; j++) {
          matchups.push({
            id: `match_g${groupIdx + 1}_${i}_${j}`,
            stage: `group_${groupIdx + 1}`,
            position: matchups.length,
            team1: teams[i],
            team2: teams[j],
            winner: null,
            played: false,
            groupId: groupIdx + 1,
          });
        }
      }
    } else {
      // Singles: all players vs all others in group
      for (let i = 0; i < groupPlayers.length; i++) {
        for (let j = i + 1; j < groupPlayers.length; j++) {
          matchups.push({
            id: `match_g${groupIdx + 1}_${i}_${j}`,
            stage: `group_${groupIdx + 1}`,
            position: matchups.length,
            team1: [groupPlayers[i]],
            team2: [groupPlayers[j]],
            winner: null,
            played: false,
            groupId: groupIdx + 1,
          });
        }
      }
    }
    
    return {
      roundNumber: 1,
      stageName: `Group ${String.fromCharCode(65 + groupIdx)}`,
      bracketType: 'group',
      groupId: groupIdx + 1,
      players: groupPlayers,
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
      doublesPartnerMode: doublesConfig.doublesPartnerMode,
      playerPartners: doublesConfig.playerPartners,
      stage: 'group', // Current stage: 'group' or 'knockout'
      rounds: groupRounds,
      knockoutRounds: [], // Populated when advancing from groups
      advancedTeams: [], // Top 2 from each group
      createdAt: new Date().toISOString(),
    },
  };
}
