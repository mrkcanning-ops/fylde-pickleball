// Partner Practice gameplay modes: Random, Gender Doubles, Gender Mixed

// Random mode: Partners stay together, any mix of players as opponents
export function generatePartnerPracticeRandom(players, numCourts = 2) {
  const activePlayers = players.filter((p) => p.active);

  if (activePlayers.length < 4) {
    return {
      courtMatches: [],
      error: `Partner Practice requires at least 4 players, currently have ${activePlayers.length}`,
    };
  }

  const n = activePlayers.length;
  const matches = [];

  // Build partner relationships
  const pairs = new Map();
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

  const numMatches = Math.floor(n / 4);
  if (numMatches === 0) {
    return {
      courtMatches: [],
      error: "Need at least 4 players to generate a match",
    };
  }

  // Simple approach: shuffle and cycle
  let playerIndex = 0;
  const shuffled = [...activePlayers].sort(() => Math.random() - 0.5);

  for (let matchCount = 0; matchCount < numMatches; matchCount++) {
    const quartet = [];
    
    for (let i = 0; i < 4; i++) {
      quartet.push(shuffled[playerIndex % n]);
      playerIndex++;
    }

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
        i--;
        break;
      }
    }

    // Second pass: fill remaining slots
    while (team1.length < 2 && quartet.length > 0) {
      team1.push(quartet.shift());
    }
    while (team2.length < 2 && quartet.length > 0) {
      team2.push(quartet.shift());
    }

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

// Gender Doubles mode: same-sex matches when possible, cross-gender teams only when needed
export function generatePartnerPracticeGenderDoubles(players, numCourts = 2) {
  const activePlayers = players.filter((p) => p.active);

  if (activePlayers.length < 4) {
    return {
      courtMatches: [],
      error: `Partner Practice requires at least 4 players, currently have ${activePlayers.length}`,
    };
  }

  // Build partner relationships
  const pairs = new Map();
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

  const matches = [];
  const n = activePlayers.length;
  const numMatches = Math.floor(n / 4);

  if (numMatches === 0) {
    return {
      courtMatches: [],
      error: "Need at least 4 players to generate a match",
    };
  }

  // Separate by gender and pair status
  let malesPaired = activePlayers.filter(p => p.gender === 'male' && pairedPlayers.has(p.id));
  let femalesPaired = activePlayers.filter(p => p.gender === 'female' && pairedPlayers.has(p.id));
  let malesUnpaired = activePlayers.filter(p => p.gender === 'male' && !pairedPlayers.has(p.id));
  let femalesUnpaired = activePlayers.filter(p => p.gender === 'female' && !pairedPlayers.has(p.id));

  let matchCount = 0;

  // Create same-sex matches from paired players
  while (malesPaired.length >= 2 && matchCount < numMatches) {
    const p1 = malesPaired.shift();
    if (!p1) break;
    
    const partner1 = activePlayers.find(pl => pl.id === pairs.get(p1.id));
    if (!partner1) continue;
    
    malesPaired = malesPaired.filter(pl => pl.id !== partner1.id);

    const p2 = malesPaired.shift();
    if (!p2) break;
    
    const partner2 = activePlayers.find(pl => pl.id === pairs.get(p2.id));
    if (!partner2) continue;
    
    malesPaired = malesPaired.filter(pl => pl.id !== partner2.id);

    matches.push([[p1, partner1], [p2, partner2]]);
    matchCount++;
  }

  // Create female same-sex matches
  while (femalesPaired.length >= 2 && matchCount < numMatches) {
    const p1 = femalesPaired.shift();
    if (!p1) break;
    
    const partner1 = activePlayers.find(pl => pl.id === pairs.get(p1.id));
    if (!partner1) continue;
    
    femalesPaired = femalesPaired.filter(pl => pl.id !== partner1.id);

    const p2 = femalesPaired.shift();
    if (!p2) break;
    
    const partner2 = activePlayers.find(pl => pl.id === pairs.get(p2.id));
    if (!partner2) continue;
    
    femalesPaired = femalesPaired.filter(pl => pl.id !== partner2.id);

    matches.push([[p1, partner1], [p2, partner2]]);
    matchCount++;
  }

  // Fill remaining matches with whatever players we have
  const remaining = [...malesPaired, ...femalesPaired, ...malesUnpaired, ...femalesUnpaired];

  while (remaining.length >= 4 && matchCount < numMatches) {
    const team1 = [];
    const team2 = [];

    // Try to keep pairs together
    for (let i = 0; i < remaining.length && team1.length < 2; i++) {
      const player = remaining[i];
      const partner = remaining.find(p => pairs.get(player.id) === p.id);
      
      if (partner) {
        team1.push(player);
        team1.push(partner);
        remaining.splice(remaining.indexOf(player), 1);
        remaining.splice(remaining.indexOf(partner), 1);
        break;
      }
    }

    while (team1.length < 2 && remaining.length > 0) {
      team1.push(remaining.shift());
    }
    while (team2.length < 2 && remaining.length > 0) {
      team2.push(remaining.shift());
    }

    if (team1.length === 2 && team2.length === 2) {
      matches.push([team1, team2]);
      matchCount++;
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

// Gender Mixed mode: each team must have 1 male + 1 female
export function generatePartnerPracticeGenderMixed(players, numCourts = 2) {
  const activePlayers = players.filter((p) => p.active);

  if (activePlayers.length < 4) {
    return {
      courtMatches: [],
      error: `Partner Practice requires at least 4 players, currently have ${activePlayers.length}`,
    };
  }

  // Build partner relationships
  const pairs = new Map();
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

  const matches = [];
  const n = activePlayers.length;
  const numMatches = Math.floor(n / 4);

  if (numMatches === 0) {
    return {
      courtMatches: [],
      error: "Need at least 4 players to generate a match",
    };
  }

  // Separate by gender
  let males = activePlayers.filter(p => p.gender === 'male');
  let females = activePlayers.filter(p => p.gender === 'female');

  // Ensure we have enough of both genders
  if (males.length < 2 || females.length < 2) {
    return {
      courtMatches: [],
      error: `Gender Mixed requires at least 2 males and 2 females. Currently: ${males.length} males, ${females.length} females`,
    };
  }

  const usedMales = new Set();
  const usedFemales = new Set();
  let matchCount = 0;

  // First, try to pair opposite-gender partners
  const malePartners = [];

  males.forEach(m => {
    if (pairs.has(m.id)) {
      const partner = activePlayers.find(p => p.id === pairs.get(m.id));
      if (partner && partner.gender === 'female') {
        malePartners.push({ male: m, female: partner });
      }
    }
  });

  // Create matches with opposite-gender partners
  for (const { male, female } of malePartners) {
    if (matchCount >= numMatches) break;
    if (!male || !female) continue;
    if (usedMales.has(male.id) || usedFemales.has(female.id)) continue;

    usedMales.add(male.id);
    usedFemales.add(female.id);

    // Find another male-female pair
    const remainingMales = males.filter(m => !usedMales.has(m.id));
    const remainingFemales = females.filter(f => !usedFemales.has(f.id));

    if (remainingMales.length >= 1 && remainingFemales.length >= 1) {
      const male2 = remainingMales[Math.floor(Math.random() * remainingMales.length)];
      const female2 = remainingFemales[Math.floor(Math.random() * remainingFemales.length)];

      if (male2 && female2) {
        usedMales.add(male2.id);
        usedFemales.add(female2.id);

        matches.push([[male, female], [male2, female2]]);
        matchCount++;
      }
    }
  }

  // Fill remaining matches with unpaired males and females
  const remainingMales = males.filter(m => !usedMales.has(m.id));
  const remainingFemales = females.filter(f => !usedFemales.has(f.id));

  while (remainingMales.length >= 2 && remainingFemales.length >= 2 && matchCount < numMatches) {
    const m1 = remainingMales.shift();
    const m2 = remainingMales.shift();
    const f1 = remainingFemales.shift();
    const f2 = remainingFemales.shift();

    if (m1 && m2 && f1 && f2) {
      matches.push([[m1, f1], [m2, f2]]);
      matchCount++;
    }
  }

  // Handle remaining players if any
  while (remainingMales.length >= 2 && remainingFemales.length >= 2 && matchCount < numMatches) {
    const m1 = remainingMales.shift();
    const m2 = remainingMales.shift();
    const f1 = remainingFemales.shift();
    const f2 = remainingFemales.shift();

    if (m1 && m2 && f1 && f2) {
      matches.push([[m1, f1], [m2, f2]]);
      matchCount++;
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
