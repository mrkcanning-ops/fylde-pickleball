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