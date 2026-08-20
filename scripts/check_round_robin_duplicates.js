import { generateRoundRobinMatches } from '../lib/matchGenerator.js';

const players = Array.from({ length: 9 }, (_, i) => ({
  id: i + 1,
  active: true,
  name: `P${i + 1}`,
}));

const { courtMatches } = generateRoundRobinMatches(players, 2);
const maxRound = Math.max(...courtMatches.map((court) => court.length), 0);
let duplicateFound = false;

for (let roundIndex = 0; roundIndex < maxRound; roundIndex++) {
  const seen = new Set();

  for (let courtIndex = 0; courtIndex < courtMatches.length; courtIndex++) {
    const match = courtMatches[courtIndex][roundIndex];
    if (!match) continue;

    const ids = [...match[0], ...match[1]].map((p) => p.id);
    for (const id of ids) {
      if (seen.has(id)) {
        console.log('duplicate same round', {
          round: roundIndex + 1,
          court: courtIndex + 1,
          playerId: id,
        });
        duplicateFound = true;
      }
      seen.add(id);
    }
  }
}

if (duplicateFound) {
  console.log('RESULT: FAIL');
  process.exit(1);
}

console.log('RESULT: PASS');
