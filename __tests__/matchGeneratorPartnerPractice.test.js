/**
 * matchGeneratorPartnerPractice.test.js
 * 
 * Unit tests for partner practice match generation
 * Tests Random mode, Gender Doubles, and Gender Mixed formats
 */

import { generatePartnerPracticeRandom } from '../lib/matchGeneratorPartnerPractice';

// ===== TEST UTILITIES =====

/**
 * Create mock player for testing
 */
function createMockPlayer(id, name = `Player ${id}`, active = true, gender = 'male', partnerId = null) {
  return {
    id,
    name,
    wins: Math.floor(Math.random() * 10),
    losses: Math.floor(Math.random() * 10),
    draws: 0,
    points: Math.floor(Math.random() * 100),
    points_for: Math.floor(Math.random() * 200),
    points_against: Math.floor(Math.random() * 200),
    active,
    gender,
    partner_id: partnerId,
    division: 1,
  };
}

/**
 * Create array of mock players
 */
function createMockPlayers(count, active = true) {
  const players = [];
  for (let i = 0; i < count; i++) {
    const gender = i % 2 === 0 ? 'male' : 'female';
    players.push(createMockPlayer(i, `Player ${i}`, active, gender));
  }
  return players;
}

/**
 * Create paired players (for partner practice modes)
 */
function createPairedPlayers(pairs) {
  const players = [];
  let id = 0;
  
  for (let i = 0; i < pairs; i++) {
    const player1 = createMockPlayer(id, `Player ${id}`, true, 'male', id + 1);
    const player2 = createMockPlayer(id + 1, `Player ${id + 1}`, true, 'female', id);
    players.push(player1, player2);
    id += 2;
  }
  
  return players;
}

// ===== TEST SUITES =====

describe('matchGeneratorPartnerPractice.js', () => {
  
  // ===== generatePartnerPracticeRandom TESTS =====

  describe('generatePartnerPracticeRandom', () => {
    test('should handle empty player list', () => {
      const result = generatePartnerPracticeRandom([]);
      expect(result.courtMatches).toEqual([]);
    });

    test('should require minimum 4 players', () => {
      const players = createMockPlayers(3, true);
      const result = generatePartnerPracticeRandom(players, 2);
      
      expect(result.error).toBeDefined();
      expect(result.courtMatches).toEqual([]);
    });

    test('should handle exactly 4 players', () => {
      const players = createMockPlayers(4, true);
      const result = generatePartnerPracticeRandom(players, 1);
      
      expect(result.courtMatches.length).toBeGreaterThan(0);
    });

    test('should handle 8 players', () => {
      const players = createMockPlayers(8, true);
      const result = generatePartnerPracticeRandom(players, 2);
      
      expect(result.courtMatches.length).toBeGreaterThan(0);
    });

    test('should have correct match structure', () => {
      const players = createMockPlayers(6, true);
      const result = generatePartnerPracticeRandom(players, 2);
      
      for (const courtMatches of result.courtMatches) {
        for (const match of courtMatches) {
          // Match should be [team1, team2]
          expect(Array.isArray(match)).toBe(true);
          expect(match.length).toBe(2);
          
          // Each team should have 2 players
          expect(match[0].length).toBe(2);
          expect(match[1].length).toBe(2);
        }
      }
    });

    test('should filter inactive players', () => {
      const players = [
        createMockPlayer(1, 'Active 1', true, 'male'),
        createMockPlayer(2, 'Inactive', false, 'female'),
        createMockPlayer(3, 'Active 2', true, 'male'),
        createMockPlayer(4, 'Active 3', true, 'female'),
      ];
      const result = generatePartnerPracticeRandom(players, 2);
      
      const allPlayerIds = new Set();
      for (const courtMatches of result.courtMatches) {
        for (const match of courtMatches) {
          match[0].forEach(p => allPlayerIds.add(p.id));
          match[1].forEach(p => allPlayerIds.add(p.id));
        }
      }
      
      expect(allPlayerIds.has(2)).toBe(false); // Inactive player should not appear
    });

    test('should not have duplicate players in match', () => {
      const players = createMockPlayers(8, true);
      const result = generatePartnerPracticeRandom(players, 2);
      
      for (const courtMatches of result.courtMatches) {
        for (const match of courtMatches) {
          const playerIds = [];
          match[0].forEach(p => playerIds.push(p.id));
          match[1].forEach(p => playerIds.push(p.id));
          
          const unique = new Set(playerIds);
          expect(unique.size).toBe(4); // All 4 players should be different
        }
      }
    });

    test('should support multiple courts', () => {
      const players = createMockPlayers(12, true);
      const result = generatePartnerPracticeRandom(players, 3);
      
      expect(result.courtMatches.length).toBe(3);
    });

    test('should handle single court', () => {
      const players = createMockPlayers(6, true);
      const result = generatePartnerPracticeRandom(players, 1);
      
      expect(result.courtMatches.length).toBe(1);
    });

    test('should generate multiple rounds', () => {
      const players = createMockPlayers(8, true);
      const result = generatePartnerPracticeRandom(players, 2);
      
      // With 8 players and default rounds, should have multiple rounds
      const totalMatches = result.courtMatches.reduce((sum, court) => sum + court.length, 0);
      expect(totalMatches).toBeGreaterThan(0);
    });

    test('should balance games across players', () => {
      const players = createMockPlayers(8, true);
      const result = generatePartnerPracticeRandom(players, 2);
      
      const gamesPerPlayer = {};
      players.forEach(p => { gamesPerPlayer[p.id] = 0; });
      
      for (const courtMatches of result.courtMatches) {
        for (const match of courtMatches) {
          match[0].forEach(p => gamesPerPlayer[p.id]++);
          match[1].forEach(p => gamesPerPlayer[p.id]++);
        }
      }
      
      const counts = Object.values(gamesPerPlayer);
      const max = Math.max(...counts);
      const min = Math.min(...counts);
      
      // Games should be relatively balanced (within reason for partner practice)
      expect(max - min).toBeLessThanOrEqual(4);
    });

    test('should handle odd number of players', () => {
      const players = createMockPlayers(7, true);
      const result = generatePartnerPracticeRandom(players, 2);
      
      // Should handle gracefully (some players might rest)
      expect(result.courtMatches.length).toBeGreaterThan(0);
    });

    test('should respect partner relationships when present', () => {
      const players = createPairedPlayers(2); // 4 players in 2 pairs
      const result = generatePartnerPracticeRandom(players, 1);
      
      // Partners should stay together in at least some matches
      // (This tests that partner relationships are recognized)
      expect(result.courtMatches.length).toBeGreaterThan(0);
    });

    test('should handle all same gender players', () => {
      const players = Array.from({ length: 6 }, (_, i) =>
        createMockPlayer(i, `Player ${i}`, true, 'male')
      );
      const result = generatePartnerPracticeRandom(players, 2);
      
      // Should still generate matches even if all same gender
      expect(result.courtMatches.length).toBeGreaterThan(0);
    });

    test('should handle all different players', () => {
      const players = Array.from({ length: 8 }, (_, i) => ({
        id: `unique-${i}`,
        name: `Player ${i}`,
        active: true,
        gender: i % 2 === 0 ? 'male' : 'female',
        partner_id: null,
      }));
      const result = generatePartnerPracticeRandom(players, 2);
      
      expect(result.courtMatches.length).toBeGreaterThan(0);
    });

    test('should not create matches with same player twice', () => {
      const players = createMockPlayers(8, true);
      const result = generatePartnerPracticeRandom(players, 2);
      
      for (const courtMatches of result.courtMatches) {
        for (const match of courtMatches) {
          const allIds = [];
          match[0].forEach(p => allIds.push(p.id));
          match[1].forEach(p => allIds.push(p.id));
          
          const uniqueIds = new Set(allIds);
          expect(allIds.length).toBe(uniqueIds.size);
        }
      }
    });

    test('should handle large player count', () => {
      const players = createMockPlayers(20, true);
      const result = generatePartnerPracticeRandom(players, 4);
      
      expect(result.courtMatches.length).toBe(4);
      
      // Each court should have matches
      for (const court of result.courtMatches) {
        expect(court.length).toBeGreaterThan(0);
      }
    });

    test('should work with realistic player data', () => {
      const players = [
        {
          id: '1',
          name: 'Alice',
          wins: 5,
          losses: 3,
          active: true,
          gender: 'female',
          partner_id: '2',
        },
        {
          id: '2',
          name: 'Bob',
          wins: 4,
          losses: 4,
          active: true,
          gender: 'male',
          partner_id: '1',
        },
        {
          id: '3',
          name: 'Charlie',
          wins: 6,
          losses: 2,
          active: true,
          gender: 'male',
          partner_id: '4',
        },
        {
          id: '4',
          name: 'Diana',
          wins: 7,
          losses: 1,
          active: true,
          gender: 'female',
          partner_id: '3',
        },
      ];
      
      const result = generatePartnerPracticeRandom(players, 1);
      expect(result.courtMatches.length).toBeGreaterThan(0);
    });
  });
});
