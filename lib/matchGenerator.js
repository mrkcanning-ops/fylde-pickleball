// Helper: generate all doubles pairs
function generateDoublesPairs(players) {
  const pairs = [];
  for (let i = 0; i < players.length; i++) {
    for (let j = i + 1; j < players.length; j++) {
      pairs.push([players[i], players[j]]);
    }
  }
  return pairs;
}

// Main function: split players and generate matches
export function generateWeeklyMatches(players) {
  // Filter active players
  const activePlayers = players.filter((p) => p.active);

  // Shuffle active players randomly
  const shuffled = [...activePlayers].sort(() => Math.random() - 0.5);

  // Split into courts
  const mid = Math.ceil(shuffled.length / 2);
  const court1Players = shuffled.slice(0, mid);
  const court2Players = shuffled.slice(mid);

  // Handle odd number of players: rotate if needed
  if (court1Players.length % 2 !== 0) {
    // move last player from court1 to court2
    court2Players.push(court1Players.pop());
  }
  if (court2Players.length % 2 !== 0) {
    // move last player from court2 to court1
    court1Players.push(court2Players.pop());
  }

  // Generate doubles pairs per court
  const court1Pairs = generateDoublesPairs(court1Players);
  const court2Pairs = generateDoublesPairs(court2Players);

  return {
    court1Pairs,
    court2Pairs,
  };
}

// League-style schedule generator: produces per-court rounds and byes similar to app/page.js buildCourt
export function generateLeagueSchedules(players, numCourts = 2) {
  const available = players.filter((p) => p.active);
  if (available.length < 4) return Array.from({ length: numCourts }, () => ({ matches: [], byes: [] }));

  const sortPlayersById = (a, b) => (a.id > b.id ? 1 : a.id < b.id ? -1 : 0);
  const sorted = [...available].sort(sortPlayersById);

  const buildCourt = (group) => {
    if (group.length < 4) return { matches: [], byes: [] };

    const matches = [];
    const byes = [];

    const partnerCounts = {};
    const restCounts = {};
    const gamesPlayed = {};
    const n = group.length;

    group.forEach((p) => {
      restCounts[p.id] = 0;
      gamesPlayed[p.id] = 0;
    });

    const pairKey = (a, b) => [a.id, b.id].sort().join("-");
    const getPartnerCount = (a, b) => partnerCounts[pairKey(a, b)] || 0;
    const calcSpread = (values) => Math.max(...values) - Math.min(...values);

    const getRoundConfig = (playerCount) => {
      if (playerCount === 7) return { rounds: 7, gamesPerPlayer: 4, byesPerPlayer: 3 };
      if (playerCount === 6) return { rounds: 6, gamesPerPlayer: 4, byesPerPlayer: 2 };
      if (playerCount === 8) return { rounds: 6, gamesPerPlayer: 3, byesPerPlayer: 3 };
      if (playerCount === 4) return { rounds: 3, gamesPerPlayer: 3, byesPerPlayer: 0 };
      return { rounds: 5, gamesPerPlayer: 4, byesPerPlayer: 1 };
    };

    const roundConfig = getRoundConfig(n);
    const targetRounds = roundConfig.rounds;
    const targetGamesPerPlayer = roundConfig.gamesPerPlayer;
    const targetByesPerPlayer = roundConfig.byesPerPlayer;

    for (let round = 0; round < targetRounds; round++) {
      let bestPlan = null;

      for (let i = 0; i < n - 3; i++) {
        for (let j = i + 1; j < n - 2; j++) {
          for (let k = j + 1; k < n - 1; k++) {
            for (let l = k + 1; l < n; l++) {
              const quartet = [group[i], group[j], group[k], group[l]];
              const quartedIds = new Set(quartet.map((p) => p.id));
              const resting = group.filter((p) => !quartedIds.has(p.id));

              const violatesGamesCap = quartet.some((p) => gamesPlayed[p.id] >= targetGamesPerPlayer);
              const violatesByesCap = resting.some((p) => restCounts[p.id] >= targetByesPerPlayer);
              if (violatesGamesCap || violatesByesCap) continue;

              const teamOptions = [
                [[quartet[0], quartet[1]], [quartet[2], quartet[3]]],
                [[quartet[0], quartet[2]], [quartet[1], quartet[3]]],
                [[quartet[0], quartet[3]], [quartet[1], quartet[2]]],
              ];

              for (const [team1, team2] of teamOptions) {
                const team1Count = getPartnerCount(team1[0], team1[1]);
                const team2Count = getPartnerCount(team2[0], team2[1]);
                const newPartners = (team1Count === 0 ? 1 : 0) + (team2Count === 0 ? 1 : 0);
                const repeatPartners = (team1Count > 0 ? team1Count : 0) + (team2Count > 0 ? team2Count : 0);

                const projectedRestCounts = { ...restCounts };
                resting.forEach((p) => { projectedRestCounts[p.id] += 1; });

                const projectedGamesPlayed = { ...gamesPlayed };
                quartet.forEach((p) => { projectedGamesPlayed[p.id] += 1; });

                const restSpread = calcSpread(Object.values(projectedRestCounts));
                const gamesSpread = calcSpread(Object.values(projectedGamesPlayed));

                const score = newPartners * 100 - repeatPartners * 40 - restSpread * 8 - gamesSpread * 4;

                if (!bestPlan || score > bestPlan.score) {
                  bestPlan = { quartet, team1, team2, resting, score };
                }
              }
            }
          }
        }
      }

      if (!bestPlan) break;

      matches.push([bestPlan.team1, bestPlan.team2]);
      byes.push(bestPlan.resting);

      bestPlan.quartet.forEach((p) => { gamesPlayed[p.id] += 1; });
      bestPlan.resting.forEach((p) => { restCounts[p.id] += 1; });

      const key1 = pairKey(bestPlan.team1[0], bestPlan.team1[1]);
      const key2 = pairKey(bestPlan.team2[0], bestPlan.team2[1]);
      partnerCounts[key1] = (partnerCounts[key1] || 0) + 1;
      partnerCounts[key2] = (partnerCounts[key2] || 0) + 1;
    }

    while (matches.length < targetRounds) {
      let bestPlan = null;
      for (let i = 0; i < n - 3; i++) {
        for (let j = i + 1; j < n - 2; j++) {
          for (let k = j + 1; k < n - 1; k++) {
            for (let l = k + 1; l < n; l++) {
              const quartet = [group[i], group[j], group[k], group[l]];
              const quartedIds = new Set(quartet.map((p) => p.id));
              const resting = group.filter((p) => !quartedIds.has(p.id));

              const teamOptions = [
                [[quartet[0], quartet[1]], [quartet[2], quartet[3]]],
                [[quartet[0], quartet[2]], [quartet[1], quartet[3]]],
                [[quartet[0], quartet[3]], [quartet[1], quartet[2]]],
              ];

              for (const [team1, team2] of teamOptions) {
                const team1Count = getPartnerCount(team1[0], team1[1]);
                const team2Count = getPartnerCount(team2[0], team2[1]);
                const newPartners = (team1Count === 0 ? 1 : 0) + (team2Count === 0 ? 1 : 0);
                const repeatPartners = (team1Count > 0 ? team1Count : 0) + (team2Count > 0 ? team2Count : 0);

                const projectedRestCounts = { ...restCounts };
                resting.forEach((p) => { projectedRestCounts[p.id] += 1; });

                const projectedGamesPlayed = { ...gamesPlayed };
                quartet.forEach((p) => { projectedGamesPlayed[p.id] += 1; });

                const restSpread = calcSpread(Object.values(projectedRestCounts));
                const gamesSpread = calcSpread(Object.values(projectedGamesPlayed));

                const score = newPartners * 100 - repeatPartners * 40 - restSpread * 8 - gamesSpread * 4;

                if (!bestPlan || score > bestPlan.score) {
                  bestPlan = { quartet, team1, team2, resting, score };
                }
              }
            }
          }
        }
      }

      if (!bestPlan) break;

      matches.push([bestPlan.team1, bestPlan.team2]);
      byes.push(bestPlan.resting);

      bestPlan.quartet.forEach((p) => { gamesPlayed[p.id] += 1; });
      bestPlan.resting.forEach((p) => { restCounts[p.id] += 1; });

      const key1 = pairKey(bestPlan.team1[0], bestPlan.team1[1]);
      const key2 = pairKey(bestPlan.team2[0], bestPlan.team2[1]);
      partnerCounts[key1] = (partnerCounts[key1] || 0) + 1;
      partnerCounts[key2] = (partnerCounts[key2] || 0) + 1;
    }

    return { matches, byes };
  };

  const buildGroups = (playersList, courts) => {
    const groups = Array.from({ length: courts }, () => []);
    const baseSize = Math.floor(playersList.length / courts);
    const extra = playersList.length % courts;
    let index = 0;
    for (let i = 0; i < courts; i += 1) {
      const size = baseSize + (i < extra ? 1 : 0);
      groups[i] = playersList.slice(index, index + size);
      index += size;
    }
    return groups;
  };

  const courtGroups = buildGroups(sorted, numCourts);
  return courtGroups.map(buildCourt);
}

/**
 * Generate 15 games for 5-player championship format
 * All 5 players play with and against each other
 * Each game: 2v2 + 1 sitting out
 * 15 games ensures balanced partnerships and matchups
 */
export function generate5PlayerChampMatches(players) {
  const activePlayers = players.filter((p) => p.active);

  // Only works with exactly 5 players
  if (activePlayers.length !== 5) {
    console.warn(`5-Player Champ requires exactly 5 players, got ${activePlayers.length}`);
    return {
      matches: [],
      error: `Requires exactly 5 players, currently have ${activePlayers.length}`,
    };
  }

  const p = activePlayers; // [P1, P2, P3, P4, P5]

  // Predefined 15-game schedule (all partnerships rotated)
  // Format: [Team A players indices, Team B players indices, Sitting Out player index]
  const schedule = [
    [[0, 1], [2, 3], 4], // P1&P2 vs P3&P4, P5 out
    [[0, 2], [1, 4], 3], // P1&P3 vs P2&P5, P4 out
    [[0, 3], [2, 4], 1], // P1&P4 vs P3&P5, P2 out
    [[0, 4], [1, 3], 2], // P1&P5 vs P2&P4, P3 out
    [[1, 2], [3, 4], 0], // P2&P3 vs P4&P5, P1 out
    [[0, 1], [2, 4], 3], // P1&P2 vs P3&P5, P4 out
    [[0, 2], [3, 4], 1], // P1&P3 vs P4&P5, P2 out
    [[0, 3], [1, 2], 4], // P1&P4 vs P2&P3, P5 out
    [[0, 4], [1, 2], 3], // P1&P5 vs P2&P3, P4 out
    [[1, 3], [2, 4], 0], // P2&P4 vs P3&P5, P1 out
    [[0, 1], [3, 4], 2], // P1&P2 vs P4&P5, P3 out
    [[0, 2], [1, 3], 4], // P1&P3 vs P2&P4, P5 out
    [[0, 3], [1, 4], 2], // P1&P4 vs P2&P5, P3 out
    [[0, 4], [2, 3], 1], // P1&P5 vs P3&P4, P2 out
    [[1, 4], [2, 3], 0], // P2&P5 vs P3&P4, P1 out
  ];

  // Convert indices to actual player objects
  const matches = schedule.map((game, gameNum) => ({
    game: gameNum + 1,
    teamA: [p[game[0][0]], p[game[0][1]]],
    teamB: [p[game[1][0]], p[game[1][1]]],
    sittingOut: p[game[2]],
  }));

  return { matches };
}

/**
 * Generate fair round-robin matches where all players partner with all other players
 * Works with any number of players (4+)
 * Ensures balanced games played and rests per player
 */
export function generateRoundRobinMatches(players, numCourts = 2) {
  const activePlayers = players.filter((p) => p.active);

  if (activePlayers.length < 4) {
    return {
      courtMatches: [],
      error: `Round Robin requires at least 4 players, currently have ${activePlayers.length}`,
    };
  }

  const n = activePlayers.length;
  const gamesPlayed = {};
  const restCounts = {};
  const partneredWith = {};

  // Track which players each player has partnered with (set of player IDs)
  // Also track how many times each player has rested
  activePlayers.forEach((p) => {
    gamesPlayed[p.id] = 0;
    restCounts[p.id] = 0;
    partneredWith[p.id] = new Set();
  });

  const calcSpread = (values) => Math.max(...values, 0) - Math.min(...values, 0);

  // Helper: check if a player has partnered with all others
  const hasPartneredAll = (player) => {
    return partneredWith[player.id].size === n - 1;
  };

  // Helper: check if all players have partnered all others
  const allPartnershipsComplete = () => {
    return activePlayers.every(p => hasPartneredAll(p));
  };

  const rounds = [];
  let safety = 0;
  const playerCourtHistory = {}; // Track which court each player was on in previous round
  const playersRestingLastRound = new Set(); // Track players who rested in previous round
  activePlayers.forEach(p => { playerCourtHistory[p.id] = null; }); // -1 = court1, 1 = court2, null = no history

  // Build round-based matches, limiting each round to the available courts.
  // This prevents one player appearing on multiple courts in the same round.
  // Also balances rest distribution fairly.
  // Also tries to rotate players across different courts between rounds.
  while (!allPartnershipsComplete() && safety < 500) {
    const roundMatches = [];
    const usedThisRound = new Set();
    const restingThisRound = [];
    const courtAssignmentsThisRound = {}; // Track which court players go to this round
    activePlayers.forEach(p => { courtAssignmentsThisRound[p.id] = null; });

    while (roundMatches.length < numCourts) {
      const candidates = []; // Collect all valid quartets with scores

      // Try all possible quartets (4 players)
      for (let i = 0; i < n - 3; i++) {
        for (let j = i + 1; j < n - 2; j++) {
          for (let k = j + 1; k < n - 1; k++) {
            for (let l = k + 1; l < n; l++) {
              const quartet = [activePlayers[i], activePlayers[j], activePlayers[k], activePlayers[l]];

              // Do not reuse players already assigned in this round.
              if (quartet.some((p) => usedThisRound.has(p.id))) continue;

              // Get the players who would be resting with this quartet
              const resting = activePlayers.filter(
                p => !quartet.some(q => q.id === p.id) && !usedThisRound.has(p.id)
              );

              const teamOptions = [
                [[quartet[0], quartet[1]], [quartet[2], quartet[3]]],
                [[quartet[0], quartet[2]], [quartet[1], quartet[3]]],
                [[quartet[0], quartet[3]], [quartet[1], quartet[2]]],
              ];

              for (const [team1, team2] of teamOptions) {
                // Ensure no duplicate players in this round across matches.
                if (team1.some((p) => usedThisRound.has(p.id)) || team2.some((p) => usedThisRound.has(p.id))) {
                  continue;
                }

                let newPartnershipsCount = 0;

                if (!partneredWith[team1[0].id].has(team1[1].id)) newPartnershipsCount++;
                if (!partneredWith[team1[1].id].has(team1[0].id)) newPartnershipsCount++;

                if (!partneredWith[team2[0].id].has(team2[1].id)) newPartnershipsCount++;
                if (!partneredWith[team2[1].id].has(team2[0].id)) newPartnershipsCount++;

                const projectedGamesPlayed = { ...gamesPlayed };
                quartet.forEach((p) => { projectedGamesPlayed[p.id] += 1; });

                const gamesSpread = calcSpread(Object.values(projectedGamesPlayed));
                
                // Calculate rest fairness: prefer resting players with fewer rest counts
                const projectedRestCounts = { ...restCounts };
                resting.forEach(p => { projectedRestCounts[p.id] += 1; });
                const restSpread = calcSpread(Object.values(projectedRestCounts));
                
                // Bonus for choosing players with below-average rests to sit out
                const avgRests = Object.values(restCounts).reduce((a, b) => a + b, 0) / activePlayers.length;
                let restFairnessBonus = 0;
                let consecutiveRestPenalty = 0;
                resting.forEach(p => {
                  if (restCounts[p.id] < avgRests) {
                    restFairnessBonus += 10; // Bonus for letting under-rested players rest
                  }
                  // HEAVILY penalize consecutive rests (player rested last round and would rest this round)
                  if (playersRestingLastRound.has(p.id)) {
                    consecutiveRestPenalty -= 500; // Very large penalty to avoid this unless necessary
                  }
                });
                
                // Score: prioritize new partnerships (100x), minimize games spread (-1x), heavily minimize rest spread (-50x)
                // This makes rest fairness almost as important as partnership fairness
                const score = newPartnershipsCount * 100 - gamesSpread * 1 - restSpread * 50 + restFairnessBonus + consecutiveRestPenalty;

                candidates.push({ quartet, team1, team2, score, resting });
              }
            }
          }
        }
      }

      if (candidates.length === 0) break;

      // Instead of always picking the best, randomly select from top candidates
      // This creates more randomness while maintaining fairness constraints
      candidates.sort((a, b) => b.score - a.score);
      const topN = Math.max(1, Math.ceil(candidates.length * 0.3)); // Top 30% of candidates
      const randomCandidate = candidates[Math.floor(Math.random() * topN)];
      const bestPlan = randomCandidate;

      roundMatches.push([bestPlan.team1, bestPlan.team2]);
      bestPlan.quartet.forEach((p) => {
        usedThisRound.add(p.id);
        gamesPlayed[p.id] += 1;
      });

      // Update rest counts for players who are resting this round
      bestPlan.resting.forEach((p) => {
        restCounts[p.id] += 1;
        restingThisRound.push(p.id);
      });

      // Record partnerships (bidirectional)
      const [matchTeam1, matchTeam2] = [bestPlan.team1, bestPlan.team2];
      partneredWith[matchTeam1[0].id].add(matchTeam1[1].id);
      partneredWith[matchTeam1[1].id].add(matchTeam1[0].id);
      partneredWith[matchTeam2[0].id].add(matchTeam2[1].id);
      partneredWith[matchTeam2[1].id].add(matchTeam2[0].id);
    }

    if (roundMatches.length === 0) break;
    rounds.push(roundMatches);
    
    // Update which players rested in this round for next round's penalty calculation
    playersRestingLastRound.clear();
    restingThisRound.forEach(playerId => {
      playersRestingLastRound.add(playerId);
    });
    
    safety++;
  }

  // Convert round-based match groups into court arrays while intelligently distributing
  // players across courts to prevent the same groups from staying on the same court
  const courtMatches = Array.from({ length: numCourts }, () => []);
  let previousRoundCourtAssignment = {}; // Track which court each player was on previously
  
  rounds.forEach((roundSet, roundIdx) => {
    // Shuffle the matches themselves to ensure players don't always appear in the same match position
    const shuffledMatches = [...roundSet];
    for (let i = shuffledMatches.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffledMatches[i], shuffledMatches[j]] = [shuffledMatches[j], shuffledMatches[i]];
    }

    // Also randomize the order of teams within each match (50% chance to swap team1/team2)
    shuffledMatches.forEach((match, idx) => {
      if (Math.random() < 0.5) {
        const [team1, team2] = match;
        shuffledMatches[idx] = [team2, team1];
      }
    });

    // Smart court assignment: try to move players to different courts than previous round
    // Generate all valid permutations of court assignments for this round's matches
    
    // Helper: generate permutations of K courts from N total courts
    const generatePermutations = (numCourts, numMatches) => {
      if (numMatches > numCourts) {
        // More matches than courts - shouldn't happen, but handle gracefully
        return [[...Array(numMatches).keys()]];
      }
      
      const perms = [];
      const courts = Array.from({ length: numCourts }, (_, i) => i);
      
      // For small permutations, generate all possibilities
      // Use heap's algorithm for generating permutations
      const heapPermute = (arr, k, result) => {
        if (k === 1) {
          result.push(arr.slice(0, numMatches));
        } else {
          for (let i = 0; i < k; i++) {
            heapPermute(arr, k - 1, result);
            if (k % 2 === 1) {
              [arr[0], arr[k - 1]] = [arr[k - 1], arr[0]];
            } else {
              [arr[i], arr[k - 1]] = [arr[k - 1], arr[i]];
            }
          }
        }
      };
      
      // Generate all ways to pick numMatches courts from numCourts
      // Simplified: just generate all permutations of first numMatches courts
      // and variations by rotating through available courts
      const combinations = [];
      
      const generateCombos = (start, current) => {
        if (current.length === numMatches) {
          combinations.push([...current]);
          return;
        }
        for (let i = start; i < numCourts; i++) {
          current.push(i);
          generateCombos(i + 1, current);
          current.pop();
        }
      };
      
      generateCombos(0, []);
      return combinations;
    };
    
    const possibleAssignments = generatePermutations(numCourts, shuffledMatches.length);
    let bestAssignment = null;
    let bestScore = -Infinity;
    
    for (const assignment of possibleAssignments) {
      // Calculate how many players are moving to a different court
      let courtSwapScore = 0;
      
      assignment.forEach((courtIdx, matchIdx) => {
        if (matchIdx < shuffledMatches.length) {
          const match = shuffledMatches[matchIdx];
          const allPlayersInMatch = [...match[0], ...match[1]]; // both teams
          
          allPlayersInMatch.forEach(player => {
            const prevCourt = previousRoundCourtAssignment[player.id];
            // Bonus for players moving to a different court (+1 per player)
            if (prevCourt !== null && prevCourt !== courtIdx) {
              courtSwapScore += 1;
            }
          });
        }
      });
      
      // Pick assignment that maximizes court switching
      if (courtSwapScore > bestScore) {
        bestScore = courtSwapScore;
        bestAssignment = assignment;
      }
    }
    
    // If no valid assignment found, distribute matches evenly across courts
    if (!bestAssignment) {
      bestAssignment = Array.from({ length: shuffledMatches.length }, (_, i) => i % numCourts);
    }
    
    // Assign matches to courts
    const currentRoundCourtAssignment = {};
    shuffledMatches.forEach((match, matchIndex) => {
      const courtIndex = bestAssignment[matchIndex];
      if (courtIndex < numCourts) {
        courtMatches[courtIndex].push(match);
        
        // Track which court these players are on for next round
        const allPlayersInMatch = [...match[0], ...match[1]];
        allPlayersInMatch.forEach(player => {
          currentRoundCourtAssignment[player.id] = courtIndex;
        });
      }
    });
    
    // Update court history for next round
    previousRoundCourtAssignment = currentRoundCourtAssignment;
  });

  return { courtMatches };
}

/**
 * Generate Partner Practice matches where designated partners play together
 * Unpaired players get priority to play; pairs sit out until all unpaired players have rested fairly
 */
export function generatePartnerPracticeMatches(players, numCourts = 2) {
  const activePlayers = players.filter((p) => p.active);

  if (activePlayers.length < 4) {
    return {
      courtMatches: [],
      error: `Partner Practice requires at least 4 players, currently have ${activePlayers.length}`,
    };
  }

  const n = activePlayers.length;
  const matches = [];

  // Build partner relationships (simple and permissive)
  const pairs = new Map(); // player.id → partner.id
  const pairedPlayers = new Set();
  const processedIds = new Set();

  activePlayers.forEach((p) => {
    if (p.partner_id && !processedIds.has(p.id)) {
      const partner = activePlayers.find((pl) => pl.id === p.partner_id);
      if (partner) {
        pairedPlayers.add(p.id);
        pairedPlayers.add(partner.id);
        pairs.set(p.id, partner.id);
        pairs.set(partner.id, p.id);
        processedIds.add(p.id);
        processedIds.add(partner.id);
      }
    }
  });

  const unpairedPlayers = activePlayers.filter((p) => !pairedPlayers.has(p.id));

  // Simple strategy: fill matches naturally with no fairness constraints
  // Goal 1: Get everyone playing
  // Goal 2: Keep designated pairs together when possible
  // That's it!

  const numMatches = Math.floor(n / 4);
  if (numMatches === 0) {
    return {
      courtMatches: [],
      error: "Need at least 4 players to generate a match",
    };
  }

  // Simple approach: create matches by cycling through players
  let playerIndex = 0;
  const shuffled = [...activePlayers].sort(() => Math.random() - 0.5);

  for (let matchCount = 0; matchCount < numMatches; matchCount++) {
    const quartet = [];
    
    // Try to fill 4 slots, wrapping around if needed
    for (let i = 0; i < 4; i++) {
      quartet.push(shuffled[playerIndex % n]);
      playerIndex++;
    }

    // Arrange into two teams of 2
    // Strategy: try to put designated partners on same team
    const team1 = [];
    const team2 = [];

    // First pass: place paired players
    for (let i = 0; i < quartet.length; i++) {
      const player = quartet[i];
      const partner = quartet.find((p) => pairs.get(player.id) === p.id);
      
      if (partner && (team1.length < 2 || team2.length < 2)) {
        if (team1.length < 2) {
          team1.push(player);
          team1.push(partner);
        } else if (team2.length < 2) {
          team2.push(player);
          team2.push(partner);
        }
        quartet.splice(quartet.indexOf(player), 1);
        quartet.splice(quartet.indexOf(partner), 1);
        i--; // Adjust index since we removed elements
        break;
      }
    }

    // Second pass: fill remaining slots with unpaired players
    while (team1.length < 2 && quartet.length > 0) {
      team1.push(quartet.shift());
    }
    while (team2.length < 2 && quartet.length > 0) {
      team2.push(quartet.shift());
    }

    // If we have a valid match (4 players total), add it
    if (team1.length === 2 && team2.length === 2) {
      matches.push([team1, team2]);
    }
  }

  // Shuffle matches to randomize court assignments
  const shuffledMatches = [...matches].sort(() => Math.random() - 0.5);

  // Split matches across courts
  const courtMatches = Array.from({ length: numCourts }, () => []);
  shuffledMatches.forEach((match, idx) => {
    courtMatches[idx % numCourts].push(match);
  });

  return { courtMatches };
}