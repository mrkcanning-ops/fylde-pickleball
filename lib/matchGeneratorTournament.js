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
 * Winner can be a player/team object, or { draw: true } for group stage draws
 */
export function recordBracketMatchResult(bracket, matchId, winner) {
  if (!bracket || !matchId || !winner) {
    return { error: 'Invalid parameters', updated: false };
  }

  // Handle both winners and draws
  const isDraw = winner?.draw === true;

  // Find and update the match
  for (const round of bracket.rounds) {
    for (const match of round.matchups) {
      if (match.id === matchId) {
        if (isDraw) {
          // Mark as draw for group stage matches
          match.draw = true;
          match.winner = null;
        } else {
          match.winner = winner;
          match.draw = false;
        }
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

  if (!bracket.rounds || !Array.isArray(bracket.rounds)) {
    return [];
  }

  const standings = [];

  bracket.rounds.forEach((round) => {
    if (round.bracketType === 'group') {
      const groupStandings = {};
      
      // Initialize standings for all players/teams in the group
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
        if (!match.played) return;

        // Handle draws
        if (match.draw === true) {
          // Both teams get 1 point for a draw
          const team1Players = match.team1 || [];
          const team2Players = match.team2 || [];
          
          team1Players.forEach((player) => {
            if (groupStandings[player.id]) {
              groupStandings[player.id].draws += 1;
              groupStandings[player.id].points += 1;
            }
          });
          
          team2Players.forEach((player) => {
            if (groupStandings[player.id]) {
              groupStandings[player.id].draws += 1;
              groupStandings[player.id].points += 1;
            }
          });
          
          return; // Skip winner processing for draws
        }

        // Handle wins/losses (only if not a draw)
        if (!match.winner) return;

        // For both singles and doubles, extract the winning team and losing team
        // team1/team2 can be [player] for singles or [player1, player2] for doubles
        
        // Determine if this is doubles (team arrays have length > 1) or singles
        const isDoubles = match.team1 && Array.isArray(match.team1) && match.team1.length > 1;
        
        let winningPlayers, losingPlayers;
        
        // Guard against null/undefined teams
        if (!match.team1) {
          return;
        }
        
        // Guard against invalid team data
        if (!match.team1?.length || !match.team2?.length) {
          return; // Skip invalid matches
        }

        if (isDoubles) {
          // For doubles, winner is an array of players
          winningPlayers = Array.isArray(match.winner) ? match.winner : [match.winner];
          losingPlayers = winningPlayers[0]?.id === match.team1?.[0]?.id ? match.team2 : match.team1;
        } else {
          // For singles, winner is a player object
          const winner = Array.isArray(match.winner) ? match.winner[0] : match.winner;
          winningPlayers = [winner];
          losingPlayers = [winner?.id === match.team1?.[0]?.id ? match.team2?.[0] : match.team1?.[0]];
        }

        // Award points to winning players
        winningPlayers.forEach((player) => {
          if (groupStandings[player.id]) {
            groupStandings[player.id].wins += 1;
            groupStandings[player.id].points += 3;
          }
        });

        // Mark losses for losing players
        losingPlayers.forEach((player) => {
          if (groupStandings[player.id]) {
            groupStandings[player.id].losses += 1;
          }
        });
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

    // For doubles, we need to reconstruct team pairs from the round data
    if (bracket.gameType === 'doubles') {
      // Get the rounds to find original team pairings
      const group1Round = bracket.rounds.find(r => r.groupId === 1);
      const group2Round = bracket.rounds.find(r => r.groupId === 2);

      // Find matches involving the top players to reconstruct their teams
      const findTeamWithPlayer = (round, playerId) => {
        for (const match of round.matchups || []) {
          if (match.team1?.some(p => p.id === playerId)) return match.team1;
          if (match.team2?.some(p => p.id === playerId)) return match.team2;
        }
        return null;
      };

      const team1A = findTeamWithPlayer(group1Round, group1Top1.player.id) || [group1Top1.player];
      const team2A = findTeamWithPlayer(group1Round, group1Top2.player.id) || [group1Top2.player];
      const team1B = findTeamWithPlayer(group2Round, group2Top1.player.id) || [group2Top1.player];
      const team2B = findTeamWithPlayer(group2Round, group2Top2.player.id) || [group2Top2.player];

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
        team1: [standings[0].top2[0].player],
        team2: [standings[1].top2[1].player],
        winner: null,
        played: false,
      });
      matchups.push({
        id: `match_ko_2`,
        stage: 'knockout_round1',
        position: 1,
        team1: [standings[0].top2[1].player],
        team2: [standings[1].top2[0].player],
        winner: null,
        played: false,
      });
    }
  } else {
    // 3 groups: more complex seeding
    const groups = standings.map(g => g.top2);
    
    if (bracket.gameType === 'doubles') {
      // For doubles, reconstruct team pairs
      const findTeamWithPlayer = (groupId, playerId) => {
        const round = bracket.rounds.find(r => r.groupId === groupId);
        if (!round) return null;
        for (const match of round.matchups || []) {
          if (match.team1?.some(p => p.id === playerId)) return match.team1;
          if (match.team2?.some(p => p.id === playerId)) return match.team2;
        }
        return null;
      };

      const team1A = findTeamWithPlayer(1, groups[0][0].player.id) || [groups[0][0].player];
      const team2A = findTeamWithPlayer(1, groups[0][1].player.id) || [groups[0][1].player];
      const team1B = findTeamWithPlayer(2, groups[1][0].player.id) || [groups[1][0].player];
      const team2B = findTeamWithPlayer(2, groups[1][1].player.id) || [groups[1][1].player];
      const team1C = findTeamWithPlayer(3, groups[2][0].player.id) || [groups[2][0].player];
      const team2C = findTeamWithPlayer(3, groups[2][1].player.id) || [groups[2][1].player];

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
