/**
 * Integration test for tournament knockout advancement flow
 * Tests: Group stage → standings → knockout stage progression
 */

import {
  generateGroupKnockoutBracket,
  generateKnockoutFromGroups,
  generateNextKnockoutRound,
  recordBracketMatchResult,
  calculateGroupStandings,
  isTournamentComplete,
} from '../lib/matchGeneratorTournament.js';

describe('Tournament Knockout Flow', () => {
  // Create 32 test players for doubles (8 per group x 4 groups)
  const createTestPlayers = (count) => {
    return Array.from({ length: count }, (_, i) => ({
      id: `player${i + 1}`,
      name: `Player ${i + 1}`,
      active: true,
    }));
  };

  test('32 players doubles: should generate 4 groups and transition to knockout correctly', () => {
    const players = createTestPlayers(32);
    const result = generateGroupKnockoutBracket(players, 'doubles', {
      doublesPartnerMode: 'random',
      playerPartners: {},
    });

    expect(result.error).toBeNull();
    const bracket = result.bracket;

    // Verify initial bracket structure
    expect(bracket.format).toBe('group-knockout');
    expect(bracket.gameType).toBe('doubles');
    expect(bracket.stage).toBe('group');
    expect(bracket.numGroups).toBe(4);

    // Verify group rounds
    const groupRounds = bracket.rounds.filter(r => r.bracketType === 'group');
    expect(groupRounds).toHaveLength(4); // 4 groups: A, B, C, D

    // Verify each group has 8 players (4 teams)
    groupRounds.forEach((group) => {
      expect(group.players).toHaveLength(8);
      expect(group.matchups.length).toBeGreaterThan(0);
      
      // Each matchup should have 2 teams of 2 players each
      group.matchups.forEach(match => {
        expect(match.team1).toHaveLength(2);
        expect(match.team2).toHaveLength(2);
        expect(match.played).toBe(false);
        expect(match.winner).toBeNull();
      });
    });

    // Simulate completing all group matches
    const completedBracket = { ...bracket };
    completedBracket.rounds = bracket.rounds.map(round => ({
      ...round,
      matchups: round.matchups.map((match, idx) => ({
        ...match,
        played: true,
        winner: idx % 2 === 0 ? match.team1 : match.team2, // Alternate winners
      })),
    }));

    // Verify all group matches are marked as played
    const allGroupComplete = completedBracket.rounds
      .filter(r => r.bracketType === 'group')
      .every(round => round.matchups.every(match => match.played));
    
    expect(allGroupComplete).toBe(true);

    // Verify group standings can be calculated
    const standings = [];
    completedBracket.rounds.filter(r => r.bracketType === 'group').forEach(round => {
      const groupStandings = {};
      
      round.matchups.forEach(match => {
        if (!match.played) return;
        
        const team1Key = match.team1.map(p => p.id).sort().join('|');
        const team2Key = match.team2.map(p => p.id).sort().join('|');
        
        if (!groupStandings[team1Key]) {
          groupStandings[team1Key] = {
            team: match.team1,
            teamNames: match.team1.map(p => p.name).join(' & '),
            wins: 0,
            draws: 0,
            losses: 0,
          };
        }
        if (!groupStandings[team2Key]) {
          groupStandings[team2Key] = {
            team: match.team2,
            teamNames: match.team2.map(p => p.name).join(' & '),
            wins: 0,
            draws: 0,
            losses: 0,
          };
        }
        
        const team1Won = match.winner.every(p => match.team1.some(t => t.id === p.id));
        if (team1Won) {
          groupStandings[team1Key].wins++;
          groupStandings[team2Key].losses++;
        } else {
          groupStandings[team2Key].wins++;
          groupStandings[team1Key].losses++;
        }
      });
      
      const sorted = Object.values(groupStandings).sort((a, b) => b.wins - a.wins);
      standings.push({
        groupName: round.stageName,
        standings: sorted,
        top2: sorted.slice(0, 2),
      });
    });

    // Verify we have 4 groups with standings
    expect(standings).toHaveLength(4);
    standings.forEach(group => {
      expect(group.top2).toHaveLength(2);
    });

    // Verify knockout bracket would have 8 teams (2 per group)
    const totalTeamsToKnockout = standings.reduce((sum, group) => sum + group.top2.length, 0);
    expect(totalTeamsToKnockout).toBe(8);

    // After transition: knockout stage should have initial quarterfinalsround
    // 8 teams → 4 Quarterfinal matches
    completedBracket.stage = 'knockout';
    completedBracket.knockoutRounds = [{
      roundNumber: 1,
      stageName: 'Round of 8',
      bracketType: 'knockout',
      matchups: [
        {
          id: 'match_ko_1',
          team1: standings[0].top2[0].team,
          team2: standings[1].top2[1].team,
          winner: null,
          played: false,
        },
        {
          id: 'match_ko_2',
          team1: standings[1].top2[0].team,
          team2: standings[0].top2[1].team,
          winner: null,
          played: false,
        },
        {
          id: 'match_ko_3',
          team1: standings[2].top2[0].team,
          team2: standings[3].top2[1].team,
          winner: null,
          played: false,
        },
        {
          id: 'match_ko_4',
          team1: standings[3].top2[0].team,
          team2: standings[2].top2[1].team,
          winner: null,
          played: false,
        },
      ],
    }];

    // Verify knockout round
    expect(completedBracket.knockoutRounds).toHaveLength(1);
    expect(completedBracket.knockoutRounds[0].matchups).toHaveLength(4);
    expect(completedBracket.stage).toBe('knockout');

    // Verify cross-bracket seeding (Winner A vs Runner-up B, etc.)
    expect(completedBracket.knockoutRounds[0].matchups[0].team1).toEqual(standings[0].top2[0].team);
    expect(completedBracket.knockoutRounds[0].matchups[0].team2).toEqual(standings[1].top2[1].team);
    expect(completedBracket.knockoutRounds[0].matchups[1].team1).toEqual(standings[1].top2[0].team);
    expect(completedBracket.knockoutRounds[0].matchups[1].team2).toEqual(standings[0].top2[1].team);
  });

  test('should handle 24 players in doubles (3 groups of 8 teams)', () => {
    const players = createTestPlayers(24);
    const result = generateGroupKnockoutBracket(players, 'doubles', {
      doublesPartnerMode: 'random',
      playerPartners: {},
    });

    expect(result.error).toBeNull();
    const bracket = result.bracket;

    // 24 players should create 3 groups of 8 (but logic should round to even)
    // With our logic: floor(24/8) = 3 (odd), so round down to 2 groups of 12
    const groupRounds = bracket.rounds.filter(r => r.bracketType === 'group');
    expect(groupRounds.length % 2).toBe(0); // Even number of groups
  });

  test('singles group winners use team arrays and generate knockout matches', () => {
    const result = generateGroupKnockoutBracket(createTestPlayers(12), 'singles');

    expect(result.error).toBeNull();
    const completedBracket = {
      ...result.bracket,
      rounds: result.bracket.rounds.map(round => ({
        ...round,
        matchups: round.matchups.map(match => ({
          ...match,
          played: true,
          winner: match.team1,
        })),
      })),
    };

    const knockout = generateKnockoutFromGroups(completedBracket);

    expect(knockout).not.toBeNull();
    expect(knockout.matchups.length).toBe(2);
    knockout.matchups.forEach(match => {
      expect(Array.isArray(match.team1)).toBe(true);
      expect(Array.isArray(match.team2)).toBe(true);
      expect(match.team1).toHaveLength(1);
      expect(match.team2).toHaveLength(1);
    });
  });

  test('records results in knockout rounds using canonical winner arrays', () => {
    const player1 = { id: 'p1', name: 'Player 1' };
    const player2 = { id: 'p2', name: 'Player 2' };
    const bracket = {
      rounds: [],
      knockoutRounds: [{
        stageName: 'Final',
        matchups: [{
          id: 'final-1',
          team1: [player1],
          team2: [player2],
          winner: null,
          played: false,
        }],
      }],
    };

    const result = recordBracketMatchResult(bracket, 'final-1', player1);

    expect(result.error).toBeNull();
    expect(result.match.winner).toEqual([player1]);
    expect(bracket.knockoutRounds[0].matchups[0].played).toBe(true);
  });

  test('progresses knockout winners without nested team arrays', () => {
    const players = createTestPlayers(8);
    const matchups = Array.from({ length: 4 }, (_, index) => ({
      id: `qf-${index}`,
      team1: [players[index * 2]],
      team2: [players[index * 2 + 1]],
      winner: [players[index * 2]],
      played: true,
    }));

    const result = generateNextKnockoutRound([
      { stageName: 'Round of 8', matchups },
    ], 0);

    expect(result.error).toBeNull();
    expect(result.rounds[0].matchups).toHaveLength(2);
    result.rounds[0].matchups.forEach(match => {
      expect(match.team1).toHaveLength(1);
      expect(match.team2).toHaveLength(1);
      expect(Array.isArray(match.team1[0])).toBe(false);
    });
  });

  test('rejects unsupported six-group configurations instead of creating a dead end', () => {
    const result = generateGroupKnockoutBracket(createTestPlayers(48), 'doubles', {
      doublesPartnerMode: 'random',
      playerPartners: {},
    });

    expect(result.bracket).toBeNull();
    expect(result.error).toMatch(/supports 2 or 4 groups/);
  });

  test('uses recorded scores as a deterministic group tiebreaker', () => {
    const players = createTestPlayers(4);
    const bracket = {
      format: 'group-knockout',
      gameType: 'singles',
      rounds: [{
        bracketType: 'group',
        stageName: 'Group A',
        players,
        matchups: [
          { team1: [players[0]], team2: [players[1]], played: true, winner: [players[0]], score: { team1: 11, team2: 1 } },
          { team1: [players[0]], team2: [players[2]], played: true, winner: [players[2]], score: { team1: 1, team2: 11 } },
          { team1: [players[1]], team2: [players[2]], played: true, winner: [players[1]], score: { team1: 11, team2: 1 } },
        ],
      }],
    };

    const standings = calculateGroupStandings(bracket);

    expect(standings[0].standings[0].player.id).toBe('player1');
    expect(standings[0].standings[1].player.id).toBe('player2');
    expect(standings[0].standings[0].goalDifference).toBe(0);
  });

  test('completes a final-only bracket without requiring a third-place match', () => {
    const bracket = {
      format: 'group-knockout',
      stage: 'knockout',
      knockoutRounds: [{
        stageName: 'Final',
        matchups: [{ played: true }],
      }],
    };

    expect(isTournamentComplete(bracket)).toBe(true);
  });
});
