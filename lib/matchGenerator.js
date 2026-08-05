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
  const matches = [];
  const gamesPlayed = {};

  // Track which players each player has partnered with (set of player IDs)
  const partneredWith = {};
  activePlayers.forEach((p) => {
    gamesPlayed[p.id] = 0;
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

  // Generate matches until all players have partnered all others
  let round = 0;
  const maxRounds = 100; // Safety limit
  
  while (!allPartnershipsComplete() && round < maxRounds) {
    let bestPlan = null;

    // Try all possible quartets (4 players)
    for (let i = 0; i < n - 3; i++) {
      for (let j = i + 1; j < n - 2; j++) {
        for (let k = j + 1; k < n - 1; k++) {
          for (let l = k + 1; l < n; l++) {
            const quartet = [activePlayers[i], activePlayers[j], activePlayers[k], activePlayers[l]];

            // Try all team arrangements
            const teamOptions = [
              [[quartet[0], quartet[1]], [quartet[2], quartet[3]]],
              [[quartet[0], quartet[2]], [quartet[1], quartet[3]]],
              [[quartet[0], quartet[3]], [quartet[1], quartet[2]]],
            ];

            for (const [team1, team2] of teamOptions) {
              // Count NEW partnerships for THIS PLAYER (not unique partnerships)
              // A new partnership is when a player partners with someone they haven't partnered before
              let newPartnershipsCount = 0;
              
              if (!partneredWith[team1[0].id].has(team1[1].id)) newPartnershipsCount++;
              if (!partneredWith[team1[1].id].has(team1[0].id)) newPartnershipsCount++; // symmetric
              
              if (!partneredWith[team2[0].id].has(team2[1].id)) newPartnershipsCount++;
              if (!partneredWith[team2[1].id].has(team2[0].id)) newPartnershipsCount++; // symmetric

              // Prioritize arrangements that create new partnerships for players
              const projectedGamesPlayed = { ...gamesPlayed };
              quartet.forEach((p) => { projectedGamesPlayed[p.id] += 1; });

              const gamesSpread = calcSpread(Object.values(projectedGamesPlayed));

              // Score: HEAVILY prioritize new player partnerships, minimal game balance tiebreaker
              const score = newPartnershipsCount * 100 - gamesSpread * 1;

              if (!bestPlan || score > bestPlan.score) {
                bestPlan = { quartet, team1, team2, score };
              }
            }
          }
        }
      }
    }

    if (!bestPlan) {
      // No matches can be formed
      break;
    }

    matches.push([bestPlan.team1, bestPlan.team2]);
    bestPlan.quartet.forEach((p) => { gamesPlayed[p.id] += 1; });

    // Record partnerships (bidirectional)
    partneredWith[bestPlan.team1[0].id].add(bestPlan.team1[1].id);
    partneredWith[bestPlan.team1[1].id].add(bestPlan.team1[0].id);
    
    partneredWith[bestPlan.team2[0].id].add(bestPlan.team2[1].id);
    partneredWith[bestPlan.team2[1].id].add(bestPlan.team2[0].id);

    round++;
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

/**
 * Generate Partner Practice matches where designated partners play together
 * Partnered players get priority to play; unpaired players sit out first
 * Once all unpaired players have sat out, partnered pairs sit out
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
  const gamesPlayed = {};
  const unpairedRestCounts = {};
  const pairedRestCounts = {};

  // Separate paired and unpaired players
  const pairedPlayers = new Set();
  const pairs = new Map(); // player.id → partner.id

  activePlayers.forEach((p) => {
    gamesPlayed[p.id] = 0;
    unpairedRestCounts[p.id] = 0;
    pairedRestCounts[p.id] = 0;
  });

  // Build partner relationships
  activePlayers.forEach((p) => {
    if (p.partner_id && !pairedPlayers.has(p.id)) {
      const partner = activePlayers.find((pl) => pl.id === p.partner_id);
      if (partner) {
        pairedPlayers.add(p.id);
        pairedPlayers.add(partner.id);
        pairs.set(p.id, partner.id);
        pairs.set(partner.id, p.id);
      }
    }
  });

  const calcSpread = (values) => Math.max(...values, 0) - Math.min(...values, 0);

  // Generate matches until all players have adequate game time
  let round = 0;
  const maxRounds = Math.ceil(n * 1.5); // Allow reasonable number of rounds
  const targetGamesPerPlayer = Math.ceil(n * 0.75); // Most players should play 75% of available slots

  while (round < maxRounds) {
    let bestPlan = null;

    // Try all possible 4-player combinations
    for (let i = 0; i < n - 3; i++) {
      for (let j = i + 1; j < n - 2; j++) {
        for (let k = j + 1; k < n - 1; k++) {
          for (let l = k + 1; l < n; l++) {
            const quartet = [activePlayers[i], activePlayers[j], activePlayers[k], activePlayers[l]];
            const quartedIds = new Set(quartet.map((p) => p.id));

            // Check if this quartet violates game caps
            if (quartet.some((p) => gamesPlayed[p.id] >= targetGamesPerPlayer)) continue;

            // Identify resting players
            const resting = activePlayers.filter((p) => !quartedIds.has(p.id));

            // Count unpaired players in resting group
            const unpairedResting = resting.filter((p) => !pairedPlayers.has(p.id));

            // If there are unpaired players who haven't played much, don't let paired players rest yet
            const anyUnpairedCanPlay = unpairedResting.some((p) => gamesPlayed[p.id] < targetGamesPerPlayer);
            const allUnpairedHaveRested = unpairedResting.every((p) => unpairedRestCounts[p.id] > 0);

            // Enforce "unpaired sit out first" rule
            if (anyUnpairedCanPlay && allUnpairedHaveRested) {
              // Some unpaired players haven't sat out, shouldn't let pairs rest
              const pairedInResting = resting.filter((p) => pairedPlayers.has(p.id));
              if (pairedInResting.length > 0) continue; // Skip if pairs would rest
            }

            // Check if caps would be violated
            if (resting.some((p) => unpairedRestCounts[p.id] >= Math.ceil(n * 2))) continue;

            // Try all team arrangements
            const teamOptions = [
              [[quartet[0], quartet[1]], [quartet[2], quartet[3]]],
              [[quartet[0], quartet[2]], [quartet[1], quartet[3]]],
              [[quartet[0], quartet[3]], [quartet[1], quartet[2]]],
            ];

            for (const [team1, team2] of teamOptions) {
              // Prioritize matchups where designated partners play together
              let partnerBonusScore = 0;

              // Check if team1 is a designated partnership
              if (pairs.get(team1[0].id) === team1[1].id) {
                partnerBonusScore += 50; // Big bonus for keeping partners together
              }

              // Check if team2 is a designated partnership
              if (pairs.get(team2[0].id) === team2[1].id) {
                partnerBonusScore += 50; // Big bonus for keeping partners together
              }

              // Score game balance (minor factor)
              const projectedGamesPlayed = { ...gamesPlayed };
              quartet.forEach((p) => {
                projectedGamesPlayed[p.id] += 1;
              });
              const gamesSpread = calcSpread(Object.values(projectedGamesPlayed));

              // Score rest distribution
              const projectedRests = { ...unpairedRestCounts };
              resting.forEach((p) => {
                if (!pairedPlayers.has(p.id)) {
                  projectedRests[p.id] += 1;
                }
              });
              const restSpread = calcSpread(Object.values(projectedRests));

              const score = partnerBonusScore * 10 - gamesSpread * 2 - restSpread * 3;

              if (!bestPlan || score > bestPlan.score) {
                bestPlan = { quartet, team1, team2, resting, score, partnerBonusScore };
              }
            }
          }
        }
      }
    }

    if (!bestPlan) break;

    matches.push([bestPlan.team1, bestPlan.team2]);
    bestPlan.quartet.forEach((p) => {
      gamesPlayed[p.id] += 1;
    });
    bestPlan.resting.forEach((p) => {
      if (!pairedPlayers.has(p.id)) {
        unpairedRestCounts[p.id] += 1;
      } else {
        pairedRestCounts[p.id] += 1;
      }
    });

    round++;
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