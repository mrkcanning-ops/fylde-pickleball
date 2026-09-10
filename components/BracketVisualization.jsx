'use client';

import { useState } from 'react';

/**
 * BracketVisualization
 * 
 * Displays tournament bracket with visual layout
 * Shows match progression, winners, and allows result entry
 */
export default function BracketVisualization({
  bracket = null,
  onSelectMatch = null,
  onRecordResult = null,
  onAdvanceRound = null,
  onTransitionToKnockout = null,
}) {
  console.log('[BracketVisualization] Rendering bracket:', bracket?.format, bracket?.gameType, 'rounds:', bracket?.rounds?.length);
  const [showCourtSchedule, setShowCourtSchedule] = useState(true);
  const [showRoundsDetail, setShowRoundsDetail] = useState(false);
  const [showGroupAssignments, setShowGroupAssignments] = useState(true);
  const [matchScores, setMatchScores] = useState({}); // Track scores: { matchId: { team1: score, team2: score } }
  const [matchWinners, setMatchWinners] = useState({}); // Track detected winners: { matchId: winnerId or 'draw' }
  const [testingMode, setTestingMode] = useState(false); // Testing mode: auto-generate results to skip manual score entry
  const [tournamentComplete, setTournamentComplete] = useState(false); // Track if tournament is finished

  // Helper function to format team names for display
  const formatTeamName = (team) => {
    if (!team || team.length === 0) return 'TBD';
    
    // For all teams (singles or doubles), just join player names
    return team.map(p => p?.name).filter(Boolean).join(' & ') || 'TBD';
  };

  // Helper to update match score and auto-detect winner
  const updateMatchScore = (matchId, team, score) => {
    const newScores = { ...matchScores };
    if (!newScores[matchId]) {
      newScores[matchId] = { team1: '', team2: '' };
    }
    newScores[matchId][team] = score;
    setMatchScores(newScores);

    // Auto-detect winner if both scores are entered
    if (newScores[matchId].team1 !== '' && newScores[matchId].team2 !== '') {
      const s1 = parseInt(newScores[matchId].team1, 10);
      const s2 = parseInt(newScores[matchId].team2, 10);
      
      if (s1 > s2) {
        setMatchWinners({ ...matchWinners, [matchId]: 'team1' });
      } else if (s2 > s1) {
        setMatchWinners({ ...matchWinners, [matchId]: 'team2' });
      } else {
        setMatchWinners({ ...matchWinners, [matchId]: 'draw' });
      }
    }
  };

  // Check if all current round matches have scores entered (for group stage display)
  // In testing mode, allow advancing without scores (auto-generate team1 as winner)
  const allCurrentScoresEntered = () => {
    return Object.values(currentRoundMatches).every(match => {
      if (!match) return true; // No match = complete
      if (testingMode) return true; // Testing mode: always allow advance
      return matchScores[match.id] && matchScores[match.id].team1 !== '' && matchScores[match.id].team2 !== '';
    });
  };

  // Check if all matches in the current knockout round are COMPLETE (have winners)
  // In knockout, we need ALL matches played before advancing, not just the currently displayed ones
  // In testing mode, allow advancing without marking winners (auto-generated in handleAdvanceRound)
  const allCurrentKnockoutRoundComplete = () => {
    if (bracket.stage !== 'knockout' || !bracket.knockoutRounds || bracket.knockoutRounds.length === 0) {
      return false;
    }
    
    const lastKnockoutRound = bracket.knockoutRounds[bracket.knockoutRounds.length - 1];
    if (!lastKnockoutRound || !lastKnockoutRound.matchups) {
      return false;
    }

    // In testing mode, always allow (auto-generate winners in handleAdvanceRound)
    if (testingMode) {
      console.log('[allCurrentKnockoutRoundComplete] Testing mode: allowing advance');
      return true;
    }
    
    console.log('[allCurrentKnockoutRoundComplete] Checking round:', lastKnockoutRound.stageName, 'Matches:', lastKnockoutRound.matchups.length);
    const allPlayed = lastKnockoutRound.matchups.every(match => {
      const isComplete = match.played && match.winner;
      console.log('[allCurrentKnockoutRoundComplete] Match', match.id, 'played:', match.played, 'winner:', !!match.winner);
      return isComplete;
    });
    
    console.log('[allCurrentKnockoutRoundComplete] Result:', allPlayed);
    return allPlayed;
  };

  if (!bracket) {
    console.log('[BracketVisualization] No bracket');
    return (
      <div className="bg-gray-800 rounded-lg p-6 text-center text-gray-400">
        No active tournament bracket
      </div>
    );
  }

  // Validate bracket structure before rendering
  if (!bracket.format || !bracket.gameType) {
    return (
      <div className="bg-gray-800 rounded-lg p-6 text-center text-gray-400">
        <p className="mb-2">Tournament bracket is invalid or corrupted</p>
        <p className="text-xs text-gray-500">Missing format or game type data</p>
      </div>
    );
  }

  // Validate rounds have valid structure
  const validRounds = bracket.rounds?.filter(r => 
    r && Array.isArray(r.matchups) && r.matchups.length > 0 &&
    r.matchups.every(m => m && m.team1 && Array.isArray(m.team1))
  ) || [];

  const validKnockoutRounds = bracket.knockoutRounds?.filter(r =>
    r && Array.isArray(r.matchups) && r.matchups.length > 0 &&
    r.matchups.every(m => m && m.team1 && Array.isArray(m.team1))
  ) || [];

  const hasValidData = validRounds.length > 0 || validKnockoutRounds.length > 0;

  if (!hasValidData) {
    return (
      <div className="bg-gray-800 rounded-lg p-6 text-center text-gray-400">
        <p className="mb-2">Tournament bracket has no valid matches</p>
        <p className="text-xs text-gray-500">All match data is corrupted or empty</p>
      </div>
    );
  }

  /**
   * Check if tournament is complete (final and 3rd place playoff both finished)
   */
  const isTournamentComplete = () => {
    if (!bracket.knockoutRounds || bracket.knockoutRounds.length < 2) return false;
    
    // Find Final and 3rd Place Playoff rounds
    const finalRound = bracket.knockoutRounds.find(r => r.stageName === 'Final');
    const thirdPlaceRound = bracket.knockoutRounds.find(r => r.stageName === '3rd Place Playoff');
    
    const finalDone = finalRound?.matchups?.[0]?.played;
    const thirdPlaceDone = thirdPlaceRound?.matchups?.[0]?.played;
    
    return finalDone && thirdPlaceDone;
  };

  /**
   * Get tournament results (1st, 2nd, 3rd place)
   */
  const getTournamentResults = () => {
    if (!bracket.knockoutRounds) return { first: null, second: null, third: null };
    
    const finalRound = bracket.knockoutRounds.find(r => r.stageName === 'Final');
    const thirdPlaceRound = bracket.knockoutRounds.find(r => r.stageName === '3rd Place Playoff');
    
    const finalMatch = finalRound?.matchups?.[0];
    const thirdPlaceMatch = thirdPlaceRound?.matchups?.[0];
    
    return {
      first: finalMatch?.winner || null,
      second: finalMatch ? (finalMatch.winner?.id === finalMatch.team1?.[0]?.id || 
                           finalMatch.winner?.some?.(p => finalMatch.team1?.some(t => t?.id === p?.id))
                           ? finalMatch.team2 : finalMatch.team1) : null,
      third: thirdPlaceMatch?.winner || null,
    };
  };

  /**
   * Check if we're on the final round (last unplayed round before tournament complete)
   */
  const isOnFinalRound = () => {
    if (!bracket.knockoutRounds || bracket.knockoutRounds.length < 2) return false;
    
    const finalRound = bracket.knockoutRounds.find(r => r.stageName === 'Final');
    const thirdPlaceRound = bracket.knockoutRounds.find(r => r.stageName === '3rd Place Playoff');
    
    const finalUnplayed = finalRound && finalRound.matchups?.some(m => !m.played);
    const thirdPlaceUnplayed = thirdPlaceRound && thirdPlaceRound.matchups?.some(m => !m.played);
    
    return finalUnplayed || thirdPlaceUnplayed;
  };

  /**
   * Get next unplayed match for each court
   * In group stage: find first unplayed match from EACH GROUP on different courts (fair progression)
   * In knockout: show first unplayed match per court
   * Returns one match per court, ensuring no player appears on multiple courts
   */
  const getCurrentRoundMatches = () => {
    const courtMatches = {};
    const usedPlayers = new Set(); // Track players already assigned to courts

    // Initialize courts
    for (let i = 1; i <= (bracket?.courtsCount || 1); i++) {
      courtMatches[i] = null;
    }

    // Get all rounds (group + knockout) - with defensive checks
    if (!bracket?.rounds && !bracket?.knockoutRounds) {
      return courtMatches; // No rounds to process
    }

    // For group stage, show one unplayed match from each group on different courts (fair progression)
    if (bracket.stage === 'group' && bracket.rounds) {
      console.log('[getCurrentRoundMatches] Group stage - finding first unplayed match from each group');
      
      let courtNum = 1;
      const maxCourts = bracket.courtsCount || 1;

      // For each group round, find first unplayed match
      bracket.rounds.forEach((round) => {
        if (!round || !Array.isArray(round.matchups) || courtNum > maxCourts) return;
        
        // Find first unplayed match in this group
        const unplayedMatch = round.matchups.find(match =>
          match && !match.played && match.team2
        );

        if (unplayedMatch) {
          // Check for player conflicts
          const matchPlayerIds = new Set();
          if (unplayedMatch.team1) {
            unplayedMatch.team1.forEach(p => {
              if (p && p.id) matchPlayerIds.add(p.id);
            });
          }
          if (unplayedMatch.team2) {
            unplayedMatch.team2.forEach(p => {
              if (p && p.id) matchPlayerIds.add(p.id);
            });
          }
          
          // Check for conflicts
          const hasConflict = Array.from(matchPlayerIds).some(playerId => 
            usedPlayers.has(playerId)
          );
          
          if (!hasConflict) {
            courtMatches[courtNum] = { ...unplayedMatch, roundName: round.stageName };
            matchPlayerIds.forEach(playerId => usedPlayers.add(playerId));
            console.log(`[getCurrentRoundMatches] Court ${courtNum}: ${round.stageName}`);
            courtNum++;
          }
        }
      });
      
      return courtMatches;
    }

    // For knockout stage, show ALL unplayed knockout matches across courts (one per court)
    let allRounds = [...(bracket.knockoutRounds || [])];
    let nextCourtNum = 1;

    // Find first unplayed match for each court, ensuring no player conflicts
    allRounds.forEach((round) => {
      if (!round || !Array.isArray(round.matchups)) return;
      
      (round.matchups || []).forEach((match) => {
        // Defensive: skip invalid matches
        if (!match || typeof match !== 'object') return;
        
        // Skip if this court is already filled
        if (nextCourtNum > (bracket.courtsCount || 1)) return;
        
        // Skip if match is already played
        if (match.played) return;
        
        // Skip if match doesn't have both teams
        if (!match.team2) return;
        
        // Check for player conflicts with already-assigned matches
        const matchPlayerIds = new Set();
        if (match.team1) {
          match.team1.forEach(p => {
            if (p && p.id) matchPlayerIds.add(p.id);
          });
        }
        if (match.team2) {
          match.team2.forEach(p => {
            if (p && p.id) matchPlayerIds.add(p.id);
          });
        }
        
        // Skip this match if any player is already assigned to another court
        const hasConflict = Array.from(matchPlayerIds).some(playerId => 
          usedPlayers.has(playerId)
        );
        
        if (hasConflict) return;
        
        // No conflicts - assign this match to the next available court
        const courtNum = nextCourtNum;
        courtMatches[courtNum] = { ...match, roundName: round.stageName };
        
        // Mark all players as used
        matchPlayerIds.forEach(playerId => usedPlayers.add(playerId));
        
        // Move to next court for next match
        nextCourtNum++;
      });
    });

    return courtMatches;
  };

  const currentRoundMatches = getCurrentRoundMatches();
  const anyPendingMatches = Object.values(currentRoundMatches).some(m => m !== null);

  // Check if all group stage matches are complete
  // This should show even after transitioning to knockout, as long as all group rounds are done
  const groupRounds = bracket.rounds?.filter(r => r.bracketType === 'group') || [];
  const allGroupMatchesComplete = groupRounds.length > 0 && 
    groupRounds.every(round => 
      round.matchups?.every(match => match.played)
    );

  // Handle advancing to knockout stage explicitly
  const handleAdvanceToKnockout = () => {
    console.log('[handleAdvanceToKnockout] Advancing to knockout stage');
    console.log('[handleAdvanceToKnockout] Current bracket stage:', bracket.stage);
    console.log('[handleAdvanceToKnockout] Current bracket rounds:', bracket.rounds?.length);
    
    // Log each round's played status
    bracket.rounds?.forEach((round, idx) => {
      const unplayedCount = round.matchups?.filter(m => !m.played).length || 0;
      const totalCount = round.matchups?.length || 0;
      console.log(`[handleAdvanceToKnockout] Round ${idx} (${round.stageName}): ${totalCount} matches, ${unplayedCount} unplayed`);
    });
    
    // Call the hook's transitionToKnockout function
    console.log('[handleAdvanceToKnockout] Calling onTransitionToKnockout');
    onTransitionToKnockout?.();
  };

  // Calculate group standings
  const getGroupStandings = () => {
    if (!bracket.rounds) return null;

    // Filter only group stage rounds
    const groupRoundsData = bracket.rounds.filter(r => r.bracketType === 'group');
    if (groupRoundsData.length === 0) return null;

    const standings = [];
    groupRoundsData.forEach((round) => {
      let groupStandings = {};

      if (bracket.gameType === 'doubles') {
        // For doubles, track TEAMS, not individual players
        // Extract unique teams from matchups
        const teams = [];
        const seenTeamPairs = new Set();

        round.matchups?.forEach((match) => {
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
          };
        });

        // Calculate team stats from matches
        round.matchups?.forEach((match) => {
          if (!match.played || !match.winner) return;

          const team1Key = match.team1.map(p => p?.id).sort().join('|');
          const team2Key = match.team2.map(p => p?.id).sort().join('|');

          if (match.winner?.draw) {
            groupStandings[team1Key].draws++;
            groupStandings[team1Key].pointsFor++;
            groupStandings[team2Key].draws++;
            groupStandings[team2Key].pointsFor++;
          } else {
            // Check if team1 won
            const team1Won = match.winner?.some(w => 
              match.team1.some(t => t.id === w.id)
            );

            if (team1Won) {
              groupStandings[team1Key].wins++;
              groupStandings[team1Key].pointsFor += 3;
              groupStandings[team2Key].losses++;
            } else {
              groupStandings[team2Key].wins++;
              groupStandings[team2Key].pointsFor += 3;
              groupStandings[team1Key].losses++;
            }
          }
        });
      } else {
        // For singles, track individual players
        // Initialize standings for all players in the group
        round.players?.forEach((player) => {
          groupStandings[player.id] = {
            player,
            wins: 0,
            draws: 0,
            losses: 0,
            pointsFor: 0,
            pointsAgainst: 0,
          };
        });

        // Calculate stats from matches
        round.matchups?.forEach((match) => {
          if (!match.played || !match.winner) return;

          const p1 = match.team1?.[0];
          const p2 = match.team2?.[0];

          if (p1 && !groupStandings[p1.id]) {
            groupStandings[p1.id] = {
              player: p1,
              wins: 0,
              draws: 0,
              losses: 0,
              pointsFor: 0,
              pointsAgainst: 0,
            };
          }
          if (p2 && !groupStandings[p2.id]) {
            groupStandings[p2.id] = {
              player: p2,
              wins: 0,
              draws: 0,
              losses: 0,
              pointsFor: 0,
              pointsAgainst: 0,
            };
          }

          if (match.winner?.draw) {
            if (p1) groupStandings[p1.id].draws++;
            if (p2) groupStandings[p2.id].draws++;
            if (p1) groupStandings[p1.id].pointsFor++;
            if (p2) groupStandings[p2.id].pointsFor++;
          } else {
            const winnerId = match.winner?.[0]?.id;
            if (p1) {
              if (p1.id === winnerId) {
                groupStandings[p1.id].wins++;
                groupStandings[p1.id].pointsFor += 3;
              } else {
                groupStandings[p1.id].losses++;
              }
            }
            if (p2) {
              if (p2.id === winnerId) {
                groupStandings[p2.id].wins++;
                groupStandings[p2.id].pointsFor += 3;
              } else {
                groupStandings[p2.id].losses++;
              }
            }
          }
        });
      }

      const sorted = Object.values(groupStandings).sort((a, b) => {
        const aPts = a.wins * 3 + a.draws;
        const bPts = b.wins * 3 + b.draws;
        return bPts - aPts;
      });

      standings.push({
        groupName: round.stageName,
        standings: sorted,
        top2: sorted.slice(0, 2),
      });
    });

    return standings;
  };

  const groupStandings = getGroupStandings();

  // Handle advancing to next round - first mark current matches as played
  const handleAdvanceRound = () => {
    console.log('[handleAdvanceRound] Called');
    
    // In knockout stage, verify all matches are complete
    if (bracket.stage === 'knockout') {
      console.log('[handleAdvanceRound] Knockout stage - verifying all matches complete');
      if (!allCurrentKnockoutRoundComplete()) {
        console.warn('[handleAdvanceRound] Cannot advance: not all knockout matches complete');
        return;
      }
    } else {
      // In group stage, verify all scores are entered
      console.log('[handleAdvanceRound] Group stage - verifying all scores entered');
      if (!allCurrentScoresEntered()) {
        console.warn('[handleAdvanceRound] Cannot advance: not all scores entered');
        return;
      }
    }

    console.log('[handleAdvanceRound] All conditions met, preparing bracket update');
    console.log('[handleAdvanceRound] matchWinners:', matchWinners);
    console.log('[handleAdvanceRound] currentRoundMatches:', currentRoundMatches);
    console.log('[handleAdvanceRound] Bracket stage:', bracket.stage);

    // Prepare bracket update with winners marked
    const updatedBracket = { ...bracket };
    let roundsUpdated = false;

    // Handle group rounds (always)
    updatedBracket.rounds = bracket.rounds?.map(round => {
      // Check if any match in this round is in currentRoundMatches
      const roundHasPendingMatches = Object.values(currentRoundMatches).some(m => 
        m && round.matchups?.some(match => match.id === m.id)
      );

      if (!roundHasPendingMatches) {
        return round;
      }

      // This is the current round - update its matches
      roundsUpdated = true;
      console.log('[handleAdvanceRound] Updating rounds array:', round.stageName);
      
      // Get the current round's displayed match IDs
      const currentRoundMatchIds = new Set(
        Object.values(currentRoundMatches)
          .filter(m => m && round.matchups?.some(match => match.id === m.id))
          .map(m => m.id)
      );
      
      return {
        ...round,
        matchups: round.matchups?.map(match => {
          // Only mark matches that are currently displayed
          if (!currentRoundMatchIds.has(match.id)) {
            return match;
          }
          
          let winner = matchWinners[match.id];
          
          // In testing mode, if no winner selected, default to team1
          if (testingMode && !winner) {
            winner = 'team1';
            console.log('[handleAdvanceRound] Testing mode: defaulting match', match.id, 'to team1 win');
          }
          
          if (winner) {
            console.log('[handleAdvanceRound] Match', match.id, 'winner:', winner);
            // Determine which team won
            const winningTeam = winner === 'team1' ? match.team1 : winner === 'team2' ? match.team2 : null;
            return {
              ...match,
              played: true,
              winner: winningTeam || (winner === 'draw' ? { draw: true } : null),
            };
          }
          return match;
        }) || [],
      };
    }) || [];

    // Handle knockout rounds (when in knockout stage)
    if (bracket.stage === 'knockout' && bracket.knockoutRounds) {
      updatedBracket.knockoutRounds = bracket.knockoutRounds?.map(round => {
        // Check if any match in this round is in currentRoundMatches
        const roundHasPendingMatches = Object.values(currentRoundMatches).some(m => 
          m && round.matchups?.some(match => match.id === m.id)
        );

        if (!roundHasPendingMatches) {
          return round;
        }

        // This is the current round - update its matches
        console.log('[handleAdvanceRound] Updating knockoutRounds array:', round.stageName);
        
        // Get the current round's displayed match IDs
        const currentRoundMatchIds = new Set(
          Object.values(currentRoundMatches)
            .filter(m => m && round.matchups?.some(match => match.id === m.id))
            .map(m => m.id)
        );
        
        return {
          ...round,
          matchups: round.matchups?.map(match => {
            // Only mark matches that are currently displayed
            if (!currentRoundMatchIds.has(match.id)) {
              return match;
            }
            
            let winner = matchWinners[match.id];
            
            // In testing mode, if no winner selected, default to team1
            if (testingMode && !winner) {
              winner = 'team1';
              console.log('[handleAdvanceRound] Testing mode: defaulting match', match.id, 'to team1 win');
            }
            
            if (winner) {
              console.log('[handleAdvanceRound] Match', match.id, 'winner:', winner);
              // Determine which team won
              const winningTeam = winner === 'team1' ? match.team1 : winner === 'team2' ? match.team2 : null;
              return {
                ...match,
                played: true,
                winner: winningTeam || (winner === 'draw' ? { draw: true } : null),
              };
            }
            return match;
          }) || [],
        };
      }) || [];
    }

    console.log('[handleAdvanceRound] Updated bracket:', updatedBracket);
    console.log('[handleAdvanceRound] Calling onAdvanceRound callback');
    
    // Pass the updated bracket with the callback
    onAdvanceRound?.(updatedBracket);
  };

  return (
    <div className="bg-gray-800 sm:rounded-lg p-6 -mx-6 sm:mx-0 overflow-x-auto space-y-6">
      <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
        🏆 {bracket.format === 'group-knockout' ? 'Group Stage + Knockout' : bracket.format === 'double-elimination' ? 'Double' : 'Single'} {bracket.format !== 'group-knockout' && 'Elimination'} ({bracket.gameType === 'doubles' ? 'Doubles' : 'Singles'})
      </h3>

      {/* Bracket Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-gray-700 rounded p-3">
          <div className="text-xs text-gray-400">Players</div>
          <div className="text-2xl font-bold text-white">{bracket.playerCount}</div>
        </div>
        <div className="bg-gray-700 rounded p-3">
          <div className="text-xs text-gray-400">Current Round</div>
          <div className="text-2xl font-bold text-white">{bracket.rounds?.length || 0}</div>
        </div>
        <div className="bg-gray-700 rounded p-3">
          <div className="text-xs text-gray-400">Total Rounds</div>
          <div className="text-2xl font-bold text-white">{bracket.totalRounds}</div>
        </div>
        <div className="bg-gray-700 rounded p-3">
          <div className="text-xs text-gray-400">Courts</div>
          <div className="text-2xl font-bold text-white">{bracket.courtsCount || 1}</div>
        </div>
      </div>

      {/* Testing Mode Toggle */}
      <div className="flex items-center gap-3 bg-yellow-900 bg-opacity-20 border border-yellow-600 rounded-lg p-4 mb-6">
        <input
          type="checkbox"
          id="testingMode"
          checked={testingMode}
          onChange={(e) => setTestingMode(e.target.checked)}
          className="w-4 h-4 cursor-pointer"
        />
        <label htmlFor="testingMode" className="cursor-pointer flex-1 text-yellow-400 font-semibold">
          🧪 Testing Mode: Skip score entry (auto-generate team1 as winner)
        </label>
      </div>

      {/* Group Assignments Display (for group-knockout) - COLLAPSIBLE */}
      {bracket.format === 'group-knockout' && bracket.stage === 'group' && bracket.numGroups && bracket.rounds && (
        <div className="mb-4 md:mb-6">
          <button
            onClick={() => setShowGroupAssignments(!showGroupAssignments)}
            className="w-full flex items-center justify-between bg-blue-900 bg-opacity-30 border border-blue-600 rounded-lg p-3 hover:bg-opacity-40 transition"
          >
            <h4 className="font-semibold text-blue-400 text-sm">
              👥 Group Assignments {showGroupAssignments ? '▼' : '▶'}
            </h4>
          </button>

          {showGroupAssignments && (
            <div className="mt-4 bg-gray-700 bg-opacity-50 rounded-xl p-3 md:p-6 border-2 border-blue-500">
              <div className="grid gap-3 md:gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                {bracket.rounds?.map((round, idx) => (
                  round.bracketType === 'group' && (
                    <div key={idx} className="bg-gray-800 bg-opacity-80 rounded-lg p-3 md:p-5 border-2 border-green-500 hover:border-green-400 hover:shadow-lg transition-all">
                      <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-3 md:mb-4 gap-2">
                        <div className="font-bold text-base md:text-lg text-green-400">
                          {round.stageName}
                        </div>
                        <div className="text-xs md:text-sm font-semibold text-gray-400 bg-gray-900 rounded-full px-2 md:px-3 py-1">
                          {round.players?.length || 0} players
                        </div>
                      </div>
                      <div className="space-y-1 md:space-y-2">
                        {bracket.gameType === 'doubles' && round.matchups
                          ? (() => {
                              // For doubles, extract unique teams from matchups
                              const teams = [];
                              const seenTeamPairs = new Set();
                              
                              round.matchups?.forEach((match) => {
                                // Extract team1
                                if (match.team1 && match.team1.length > 0) {
                                  const team1Names = match.team1.map(p => p?.id).sort().join('|');
                                  if (!seenTeamPairs.has(team1Names)) {
                                    teams.push({ players: match.team1 });
                                    seenTeamPairs.add(team1Names);
                                  }
                                }
                                
                                // Extract team2
                                if (match.team2 && match.team2.length > 0) {
                                  const team2Names = match.team2.map(p => p?.id).sort().join('|');
                                  if (!seenTeamPairs.has(team2Names)) {
                                    teams.push({ players: match.team2 });
                                    seenTeamPairs.add(team2Names);
                                  }
                                }
                              });
                              
                              return teams.map((team, idx) => (
                                <div key={`team-${idx}`} className="text-xs md:text-sm text-gray-200 flex items-start md:items-center gap-2 md:gap-3 hover:bg-gray-700 p-1 md:p-2 rounded transition-colors">
                                  <span className="text-purple-400 font-bold text-base md:text-lg flex-shrink-0">•</span>
                                  <span className="flex-1 font-medium break-words">
                                    {team.players?.map(p => p?.name).join(' & ')}
                                  </span>
                                </div>
                              ));
                            })()
                          : // For singles or random doubles, show individual players
                            round.players?.map((player) => (
                              <div key={player.id} className="text-xs md:text-sm text-gray-200 flex items-start md:items-center gap-2 md:gap-3 hover:bg-gray-700 p-1 md:p-2 rounded transition-colors">
                                <span className="text-green-400 font-bold text-base md:text-lg flex-shrink-0">•</span>
                                <span className="flex-1 font-medium break-words">{player.name}</span>
                                {player.gender && (
                                  <span className="text-xs text-gray-400 bg-gray-900 rounded px-1.5 md:px-2 py-0.5 md:py-1 flex-shrink-0">
                                    {player.gender === 'male' ? '♂ M' : '♀ F'}
                                  </span>
                                )}
                              </div>
                            ))}
                      </div>
                    </div>
                  )
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Current Round Matches - Inline Score Entry */}
      {/* Hide ONLY when showing group standings (all group matches complete AND still in group stage) */}
      {!(allGroupMatchesComplete && bracket.stage === 'group') && (
      <div className="mb-6">
        <div className="bg-cyan-900 bg-opacity-30 border border-cyan-500 rounded-lg p-4 mb-4">
          <h4 className="font-semibold text-cyan-400 flex items-center gap-2 mb-4">
            🏟️ Current Round - Enter Scores
          </h4>
          
          <div className="grid gap-6 grid-cols-1">
            {Array.from({ length: bracket.courtsCount }, (_, courtIdx) => {
              const courtNum = courtIdx + 1;
              const match = currentRoundMatches[courtNum];
              const matchScoreData = matchScores[match?.id];
              const winner = matchWinners[match?.id];

              return (
                <div
                  key={courtNum}
                  className="bg-gray-800 bg-opacity-80 rounded-lg p-6 border-2 border-purple-500 hover:border-purple-400 transition-all"
                >
                  {/* Court Header */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="font-bold text-lg text-purple-400">Court {courtNum}</div>
                    <div className="text-xs font-semibold text-gray-400 bg-gray-900 rounded-full px-3 py-1">
                      {match?.roundName || 'No match'}
                    </div>
                  </div>

                  {!match ? (
                    <div className="text-center text-gray-400 py-6">
                      <div className="text-sm italic">No pending matches</div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {/* Team 1 */}
                      <div className={`bg-gray-700 rounded-lg p-4 ${winner === 'team1' ? 'border-2 border-green-500' : winner === 'draw' ? 'border-2 border-blue-500' : 'border border-gray-600'}`}>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-white font-semibold">{formatTeamName(match.team1)}</span>
                          {winner === 'team1' && <span className="text-yellow-400 font-bold text-lg">🏆</span>}
                        </div>
                        <input
                          type="number"
                          min="0"
                          value={matchScoreData?.team1 || ''}
                          onChange={(e) => updateMatchScore(match.id, 'team1', e.target.value)}
                          placeholder="Score"
                          className="w-full bg-gray-600 border border-gray-500 rounded px-3 py-2 text-white text-center text-lg font-bold focus:outline-none focus:border-blue-500"
                        />
                      </div>

                      {/* VS */}
                      <div className="text-center text-gray-500 font-bold">VS</div>

                      {/* Team 2 */}
                      <div className={`bg-gray-700 rounded-lg p-4 ${winner === 'team2' ? 'border-2 border-green-500' : winner === 'draw' ? 'border-2 border-blue-500' : 'border border-gray-600'}`}>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-white font-semibold">{formatTeamName(match.team2)}</span>
                          {winner === 'team2' && <span className="text-yellow-400 font-bold text-lg">🏆</span>}
                        </div>
                        <input
                          type="number"
                          min="0"
                          value={matchScoreData?.team2 || ''}
                          onChange={(e) => updateMatchScore(match.id, 'team2', e.target.value)}
                          placeholder="Score"
                          className="w-full bg-gray-600 border border-gray-500 rounded px-3 py-2 text-white text-center text-lg font-bold focus:outline-none focus:border-blue-500"
                        />
                      </div>

                      {/* Result Indicator */}
                      {winner && (
                        <div className={`text-center p-2 rounded font-semibold text-sm ${
                          winner === 'draw' 
                            ? 'bg-blue-900 bg-opacity-30 text-blue-300 border border-blue-600' 
                            : 'bg-green-900 bg-opacity-30 text-green-300 border border-green-600'
                        }`}>
                          {winner === 'draw' ? '⚖️ Draw' : '✓ Winner detected'}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Next Round Button */}
          {(anyPendingMatches || isTournamentComplete()) && !tournamentComplete && (
            <button
              onClick={() => {
                // If tournament is already complete, just show the celebration
                if (isTournamentComplete()) {
                  setTournamentComplete(true);
                  return;
                }
                
                // Otherwise, advance the round
                handleAdvanceRound();
                
                // Check if this was the final round
                if (isOnFinalRound()) {
                  // After Final and 3rd Place are done, mark tournament as complete
                  setTimeout(() => {
                    if (isTournamentComplete()) {
                      setTournamentComplete(true);
                    }
                  }, 100);
                }
              }}
              disabled={isTournamentComplete() ? false : (bracket.stage === 'knockout' ? !allCurrentKnockoutRoundComplete() : !allCurrentScoresEntered())}
              className={`w-full mt-6 py-3 px-4 rounded-lg font-bold transition ${
                isTournamentComplete() || (bracket.stage === 'knockout' ? allCurrentKnockoutRoundComplete() : allCurrentScoresEntered())
                  ? 'bg-green-600 hover:bg-green-500 text-white cursor-pointer'
                  : 'bg-gray-600 text-gray-400 cursor-not-allowed'
              }`}
            >
              {isTournamentComplete()
                ? '🏆 End Tournament'
                : bracket.stage === 'knockout' 
                ? allCurrentKnockoutRoundComplete() ? '→ Next Round' : `Complete all ${bracket.knockoutRounds?.[bracket.knockoutRounds.length - 1]?.matchups?.length || 0} matches to continue`
                : allCurrentScoresEntered() ? '→ Next Round' : 'Enter all scores to continue'}
            </button>
          )}
        </div>
      </div>
      )}

      {/* Show message when all current matches complete */}
      {!anyPendingMatches && bracket.rounds?.length > 0 && (
        <div className="bg-green-900 bg-opacity-30 border border-green-500 rounded-lg p-4 mb-6">
          <div className="text-green-400 font-bold mb-2">✓ Group stage complete!</div>
          <div className="text-sm text-green-300">All matches have been recorded.</div>
        </div>
      )}

      {/* Group Standings - Show when all group matches complete but knockout not yet started */}
      {allGroupMatchesComplete && groupStandings && (!bracket.knockoutRounds || bracket.knockoutRounds.length === 0) && (
        <div className="bg-purple-900 bg-opacity-20 border border-purple-500 rounded-lg p-6 mb-6">
          <h4 className="font-bold text-purple-400 mb-6 flex items-center gap-2">
            📊 Group Stage Standings (Top 2 Advance to Knockout)
          </h4>

          <div className="grid gap-6 grid-cols-1">
            {groupStandings.map((group, idx) => (
              <div key={idx} className="bg-gray-800 rounded-lg p-4 border border-gray-700">
                <h5 className="font-semibold text-cyan-400 mb-4">{group.groupName}</h5>
                <div className="space-y-2">
                  {group.standings.map((standing, sIdx) => {
                    const isTop2 = sIdx < 2;
                    const points = standing.wins * 3 + standing.draws;
                    
                    // For doubles: show team names together; for singles: show individual name
                    const displayName = bracket.gameType === 'doubles' 
                      ? standing.teamNames 
                      : standing.player.name;
                    const uniqueKey = bracket.gameType === 'doubles'
                      ? standing.teamNames
                      : standing.player.id;
                    
                    return (
                      <div
                        key={uniqueKey}
                        className={`p-3 rounded transition-all ${
                          isTop2
                            ? 'bg-green-900 bg-opacity-50 border-2 border-green-500 shadow-lg'
                            : 'bg-gray-700 border border-gray-600'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="font-semibold text-white break-words text-sm">
                              {sIdx < 2 && <span className="text-yellow-400">★ </span>}
                              {displayName}
                            </div>
                            <div className="text-xs text-gray-400 mt-1">
                              {standing.wins}W-{standing.draws}D-{standing.losses}L
                            </div>
                          </div>
                          <div className="text-right font-bold text-white whitespace-nowrap">
                            {points} pts
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* Advance to Knockout Button - Only show if knockout not yet generated */}
          {!bracket.knockoutRounds || bracket.knockoutRounds.length === 0 ? (
            <button
              onClick={handleAdvanceToKnockout}
              className="w-full mt-6 py-4 px-4 rounded-lg font-bold text-white bg-purple-600 hover:bg-purple-500 transition text-lg"
            >
              🚀 Advance to Knockout Stage
            </button>
          ) : (
            <div className="w-full mt-6 py-4 px-4 rounded-lg font-bold text-white bg-gray-600 text-center">
              ✓ Knockout stage in progress
            </div>
          )}
        </div>
      )}

      {/* Knockout Bracket Visualization - Show when in knockout stage */}
      {bracket.knockoutRounds && bracket.knockoutRounds.length > 0 && (
        <div className="mb-6">
          <div className="bg-red-900 bg-opacity-20 border border-red-500 rounded-lg p-6">
            <h4 className="font-bold text-red-400 mb-6 flex items-center gap-2">
              🏆 Knockout Bracket
            </h4>

            <div className="overflow-x-auto">
              <div className="min-w-max flex gap-8 pb-6">
                {/* Generate columns for each round */}
                {bracket.knockoutRounds.map((round, roundIdx) => {
                  const matchups = round.matchups || [];
                  const isCurrentRound = roundIdx < bracket.knockoutRounds.length && 
                    matchups.some(m => !m.played);
                  
                  return (
                    <div key={roundIdx} className="flex-shrink-0">
                      {/* Round Header */}
                      <div className="text-center mb-6">
                        <h5 className="font-bold text-lg text-red-400 mb-2">
                          {round.stageName}
                        </h5>
                        <div className="text-xs text-gray-400">
                          {matchups.length} match{matchups.length !== 1 ? 'es' : ''}
                        </div>
                      </div>

                      {/* Matchups in this round */}
                      <div className="space-y-8">
                        {matchups.map((match, matchIdx) => (
                          <div key={match.id} className="w-56">
                            {/* Match Container */}
                            <div className="bg-gray-800 rounded-lg border-2 border-red-500 overflow-hidden">
                              {/* Team 1 */}
                              <div
                                className={`px-4 py-3 border-b border-gray-700 cursor-pointer transition ${
                                  match.played && match.winner
                                    ? bracket.gameType === 'doubles'
                                      ? match.winner.some(p => match.team1?.some(t => t?.id === p?.id))
                                        ? 'bg-green-900 bg-opacity-60'
                                        : 'bg-gray-700'
                                      : match.winner?.[0]?.id === match.team1?.[0]?.id
                                      ? 'bg-green-900 bg-opacity-60'
                                      : 'bg-gray-700'
                                    : 'bg-gray-700 hover:bg-gray-650'
                                }`}
                              >
                                <div className="flex items-center justify-between gap-2">
                                  <span className="text-sm font-semibold text-white truncate flex-1">
                                    {formatTeamName(match.team1)}
                                  </span>
                                  {match.played && match.winner && (
                                    bracket.gameType === 'doubles'
                                      ? match.winner.some(p => match.team1?.some(t => t?.id === p?.id)) && (
                                        <span className="text-yellow-400 font-bold text-lg flex-shrink-0">★</span>
                                      )
                                      : match.winner?.[0]?.id === match.team1?.[0]?.id && (
                                        <span className="text-yellow-400 font-bold text-lg flex-shrink-0">★</span>
                                      )
                                  )}
                                </div>
                                {match.played && (
                                  <div className="text-xs text-gray-400 mt-1">
                                    Score: {matchScores[match.id]?.team1 || '—'}
                                  </div>
                                )}
                              </div>

                              {/* Team 2 */}
                              <div
                                className={`px-4 py-3 cursor-pointer transition ${
                                  match.played && match.winner
                                    ? bracket.gameType === 'doubles'
                                      ? match.winner.some(p => match.team2?.some(t => t?.id === p?.id))
                                        ? 'bg-green-900 bg-opacity-60'
                                        : 'bg-gray-700'
                                      : match.winner?.[0]?.id === match.team2?.[0]?.id
                                      ? 'bg-green-900 bg-opacity-60'
                                      : 'bg-gray-700'
                                    : 'bg-gray-700 hover:bg-gray-650'
                                }`}
                              >
                                <div className="flex items-center justify-between gap-2">
                                  <span className="text-sm font-semibold text-white truncate flex-1">
                                    {formatTeamName(match.team2)}
                                  </span>
                                  {match.played && match.winner && (
                                    bracket.gameType === 'doubles'
                                      ? match.winner.some(p => match.team2?.some(t => t?.id === p?.id)) && (
                                        <span className="text-yellow-400 font-bold text-lg flex-shrink-0">★</span>
                                      )
                                      : match.winner?.[0]?.id === match.team2?.[0]?.id && (
                                        <span className="text-yellow-400 font-bold text-lg flex-shrink-0">★</span>
                                      )
                                  )}
                                </div>
                                {match.played && (
                                  <div className="text-xs text-gray-400 mt-1">
                                    Score: {matchScores[match.id]?.team2 || '—'}
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Status Badge */}
                            {match.played ? (
                              <div className="mt-2 text-center">
                                <span className="inline-block text-xs bg-green-600 text-white px-3 py-1 rounded-full">
                                  ✓ Complete
                                </span>
                              </div>
                            ) : isCurrentRound ? (
                              <div className="mt-2 text-center">
                                <span className="inline-block text-xs bg-yellow-600 text-white px-3 py-1 rounded-full animate-pulse">
                                  ⏳ Upcoming
                                </span>
                              </div>
                            ) : null}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Bracket Legend */}
            <div className="mt-6 pt-6 border-t border-red-500 grid grid-cols-2 gap-4 text-xs text-gray-300">
              <div className="flex items-center gap-2">
                <span className="text-yellow-400 font-bold">★</span>
                <span>Match Winner</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-green-900 bg-opacity-60"></div>
                <span>Won Match</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-gray-700"></div>
                <span>Lost Match</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tree-Style Bracket Visualization - Show when in knockout stage */}
      {bracket.knockoutRounds && bracket.knockoutRounds.length > 0 && (
        <div className="mb-6">
          <div className="bg-blue-900 bg-opacity-20 border border-blue-500 rounded-lg p-6">
            <h4 className="font-bold text-blue-400 mb-6 flex items-center gap-2">
              � World Cup Style Bracket
            </h4>

            <div className="overflow-auto">
              <svg width="1400" height="900" className="min-w-full bg-gray-900 bg-opacity-30 rounded border border-blue-400">
                <defs>
                  <style>{`
                    .bracket-team { font-size: 11px; font-weight: bold; fill: white; }
                    .bracket-round-label { font-size: 13px; font-weight: bold; fill: #60a5fa; }
                    .bracket-line { stroke: #60a5fa; stroke-width: 2; fill: none; }
                  `}</style>
                </defs>

                {(() => {
                  // Find quarterfinals, semifinals, final, and 3rd place rounds
                  const qfRound = bracket.knockoutRounds.find(r => r.stageName === 'Quarterfinals');
                  const sfRound = bracket.knockoutRounds.find(r => r.stageName === 'Semifinals');
                  const finalRound = bracket.knockoutRounds.find(r => r.stageName === 'Final');
                  const thirdPlaceRound = bracket.knockoutRounds.find(r => r.stageName === '3rd Place Playoff');

                  const matchBoxHeight = 40;
                  const matchBoxWidth = 160;
                  const gapBetweenTeams = 8;

                  // Helper to draw a match box
                  const MatchBox = ({ x, y, match, isWinner1 }) => {
                    if (!match || !match.team1) return null;

                    const isTeam1Winner = match.played && match.winner
                      ? bracket.gameType === 'doubles'
                        ? match.winner.some(p => match.team1?.some(t => t?.id === p?.id))
                        : match.winner?.[0]?.id === match.team1?.[0]?.id
                      : false;

                    const isTeam2Winner = match.played && match.winner
                      ? bracket.gameType === 'doubles'
                        ? match.winner.some(p => match.team2?.some(t => t?.id === p?.id))
                        : match.winner?.[0]?.id === match.team2?.[0]?.id
                      : false;

                    return (
                      <g key={`${x}-${y}`}>
                        {/* Team 1 */}
                        <rect
                          x={x} y={y} width={matchBoxWidth} height={matchBoxHeight / 2 - gapBetweenTeams / 2}
                          fill={isTeam1Winner ? '#166534' : '#1f2937'}
                          stroke={isTeam1Winner ? '#22c55e' : '#6b7280'}
                          strokeWidth="1.5"
                          rx="3"
                        />
                        <text x={x + 6} y={y + 18} className="bracket-team">
                          {formatTeamName(match.team1).substring(0, 18)}
                        </text>
                        {isTeam1Winner && <text x={x + matchBoxWidth - 8} y={y + 18} className="bracket-team" fill="#fbbf24">★</text>}

                        {/* Team 2 */}
                        <rect
                          x={x} y={y + matchBoxHeight / 2 + gapBetweenTeams / 2} width={matchBoxWidth} height={matchBoxHeight / 2 - gapBetweenTeams / 2}
                          fill={isTeam2Winner ? '#166534' : '#1f2937'}
                          stroke={isTeam2Winner ? '#22c55e' : '#6b7280'}
                          strokeWidth="1.5"
                          rx="3"
                        />
                        <text x={x + 6} y={y + matchBoxHeight + 6} className="bracket-team">
                          {formatTeamName(match.team2).substring(0, 18)}
                        </text>
                        {isTeam2Winner && <text x={x + matchBoxWidth - 8} y={y + matchBoxHeight + 6} className="bracket-team" fill="#fbbf24">★</text>}
                      </g>
                    );
                  };

                  // Helper to draw connecting lines
                  const ConnectLine = ({ x1, y1, x2, y2 }) => (
                    <path d={`M ${x1} ${y1} L ${x1 + 20} ${y1} L ${x1 + 20} ${y2} L ${x2} ${y2}`} className="bracket-line" />
                  );

                  return (
                    <>
                      {/* QUARTERFINALS */}
                      <text x="20" y="30" className="bracket-round-label">QUARTERFINALS</text>

                      {/* LEFT SIDE QF (Groups A & B) */}
                      {qfRound?.matchups.slice(0, 2).map((match, idx) => (
                        <g key={`qf-left-${idx}`}>
                          <MatchBox x={20} y={60 + idx * 130} match={match} />
                          {/* Line to SF */}
                          <ConnectLine x1={20 + matchBoxWidth} y1={60 + idx * 130 + matchBoxHeight / 2} x2={340} y2={100 + idx * 130} />
                        </g>
                      ))}

                      {/* RIGHT SIDE QF (Groups C & D) */}
                      {qfRound?.matchups.slice(2, 4).map((match, idx) => (
                        <g key={`qf-right-${idx}`}>
                          <MatchBox x={1220} y={60 + idx * 130} match={match} />
                          {/* Line to SF */}
                          <ConnectLine x1={1220} y1={60 + idx * 130 + matchBoxHeight / 2} x2={1040} y2={100 + idx * 130} />
                        </g>
                      ))}

                      {/* SEMIFINALS */}
                      <text x="500" y="30" className="bracket-round-label">SEMIFINALS</text>

                      {/* LEFT SF */}
                      {sfRound?.matchups[0] && (
                        <g key="sf-left">
                          <MatchBox x={340} y={80} match={sfRound.matchups[0]} />
                          {/* Line to Final */}
                          <ConnectLine x1={340 + matchBoxWidth} y1={80 + matchBoxHeight / 2} x2={600} y2={320} />
                        </g>
                      )}

                      {/* RIGHT SF */}
                      {sfRound?.matchups[1] && (
                        <g key="sf-right">
                          <MatchBox x={1040} y={80} match={sfRound.matchups[1]} />
                          {/* Line to Final */}
                          <ConnectLine x1={1040} y1={80 + matchBoxHeight / 2} x2={760} y2={320} />
                        </g>
                      )}

                      {/* FINAL */}
                      <text x="640" y="290" className="bracket-round-label">FINAL</text>
                      {finalRound?.matchups[0] && (
                        <MatchBox x={600} y={320} match={finalRound.matchups[0]} />
                      )}

                      {/* 3RD PLACE PLAYOFF */}
                      <text x="1050" y="730" className="bracket-round-label">3RD PLACE PLAYOFF</text>
                      {thirdPlaceRound?.matchups[0] && (
                        <MatchBox x={980} y={750} match={thirdPlaceRound.matchups[0]} />
                      )}

                      {/* Decorative Title */}
                      <text x="700" y="850" style={{ fontSize: '24px', fontWeight: 'bold', fill: '#fbbf24', textAnchor: 'middle' }}>
                        🏆 Tournament Bracket 🏆
                      </text>
                    </>
                  );
                })()}
              </svg>
            </div>

            {/* Legend */}
            <div className="mt-6 pt-4 border-t border-blue-500 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs text-gray-300">
              <div className="flex items-center gap-2">
                <span className="text-yellow-400 font-bold">★</span>
                <span>Match Winner</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-green-700"></div>
                <span>Won Match</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-gray-700"></div>
                <span>Lost Match</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-px bg-blue-400"></div>
                <span>Advancement</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Rounds Detail - Collapsible */}
      <div className="mb-6">
        <button
          onClick={() => setShowRoundsDetail(!showRoundsDetail)}
          className="w-full flex items-center justify-between bg-yellow-900 bg-opacity-30 border border-yellow-600 rounded-lg p-3 hover:bg-opacity-40 transition"
        >
          <h4 className="font-semibold text-yellow-400 text-sm">
            📋 Detailed Results {showRoundsDetail ? '▼' : '▶'}
          </h4>
        </button>

        {showRoundsDetail && (
          <div className="mt-4 space-y-6">
            {bracket.rounds?.map((round, roundIdx) => (
              <div key={roundIdx} className="border-l-2 border-blue-500 pl-4">
                <h4 className="font-semibold text-yellow-400 mb-3 text-sm">
                  {round.stageName}
                </h4>

                <div className="space-y-2">
                  {(round.matchups || []).map((match) => (
                <div
                  key={match.id}
                  className={`bg-gray-700 rounded p-3 cursor-pointer transition ${
                    match.played ? 'border-l-2 border-green-500' : 'border-l-2 border-gray-600'
                  } hover:bg-gray-650`}
                  onClick={() => onSelectMatch?.(match)}
                >
                  {/* Match Header */}
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-gray-400">Match {match.position + 1}</span>
                    {match.played && (
                      <span className="text-xs bg-green-600 text-white px-2 py-1 rounded">
                        ✓ Completed
                      </span>
                    )}
                  </div>

                  {/* Team 1 */}
                  <div className={`flex items-center justify-between p-2 rounded mb-1 ${
                    match.played && match.winner
                      ? bracket.gameType === 'doubles'
                        ? Array.isArray(match.winner) && match.winner.some?.(p => match.team1?.some(t => t?.id === p?.id))
                          ? 'bg-green-900 bg-opacity-50'
                          : 'bg-gray-600'
                        : match.winner?.id === match.team1?.[0]?.id
                        ? 'bg-green-900 bg-opacity-50'
                        : 'bg-gray-600'
                      : 'bg-gray-600'
                  }`}>
                    <span className="text-sm text-white font-medium">
                      {formatTeamName(match.team1)}
                    </span>
                    {match.played && match.winner && (
                      bracket.gameType === 'doubles'
                        ? Array.isArray(match.winner) && match.winner.every(p => match.team1?.some(t => t?.id === p?.id)) && (
                          <span className="text-yellow-400 font-bold">🏆</span>
                        )
                        : match.winner?.id === match.team1?.[0]?.id && (
                          <span className="text-yellow-400 font-bold">🏆</span>
                        )
                    )}
                  </div>

                  {/* Bye or VS */}
                  {match.team2 ? (
                    <>
                      <div className="text-center text-xs text-gray-500 my-1">VS</div>

                      {/* Team 2 */}
                      <div className={`flex items-center justify-between p-2 rounded ${
                        match.played && match.winner
                          ? bracket.gameType === 'doubles'
                            ? Array.isArray(match.winner) && match.winner.some?.(p => match.team2?.some(t => t?.id === p?.id))
                              ? 'bg-green-900 bg-opacity-50'
                              : 'bg-gray-600'
                            : match.winner?.id === match.team2?.[0]?.id
                            ? 'bg-green-900 bg-opacity-50'
                            : 'bg-gray-600'
                          : 'bg-gray-600'
                      }`}>
                        <span className="text-sm text-white font-medium">
                          {formatTeamName(match.team2)}
                        </span>
                        {match.played && match.winner && (
                          bracket.gameType === 'doubles'
                            ? Array.isArray(match.winner) && match.winner.every(p => match.team2?.some(t => t?.id === p?.id)) && (
                              <span className="text-yellow-400 font-bold">🏆</span>
                            )
                            : match.winner?.id === match.team2?.[0]?.id && (
                              <span className="text-yellow-400 font-bold">🏆</span>
                            )
                        )}
                      </div>
                    </>
                  ) : (
                    <div className="text-center text-xs text-gray-500 italic py-2">
                      BYE - Auto-advances
                    </div>
                  )}

                  {/* Action */}
                  {!match.played && match.team2 && (
                    <div className="mt-2 text-xs text-blue-400 font-semibold">
                      Click to record result →
                    </div>
                  )}
                </div>
              ))}
            </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Tournament Completion - Celebration Page */}
      {tournamentComplete && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="bg-gradient-to-b from-yellow-900 to-gray-900 rounded-2xl p-8 max-w-2xl w-full border-4 border-yellow-400 shadow-2xl">
            {/* Fireworks animation effect */}
            <div className="text-center mb-8 animate-pulse">
              <div className="text-8xl mb-4">🎉🏆🎉</div>
              <h1 className="text-5xl font-bold text-yellow-300 mb-2">Tournament Complete!</h1>
              <div className="text-2xl text-yellow-200">Congratulations to all participants</div>
            </div>

            {(() => {
              const results = getTournamentResults();
              return (
                <div className="space-y-8 mb-8">
                  {/* 1st Place */}
                  {results.first && (
                    <div className="bg-yellow-400 bg-opacity-20 rounded-xl p-6 border-3 border-yellow-400">
                      <div className="flex items-center justify-center gap-4 mb-3">
                        <span className="text-5xl">🥇</span>
                        <div className="text-center">
                          <div className="text-sm text-yellow-300 font-semibold">1ST PLACE - CHAMPION</div>
                          <div className="text-2xl font-bold text-white mt-1">
                            {formatTeamName(results.first)}
                          </div>
                        </div>
                        <span className="text-5xl">🏆</span>
                      </div>
                    </div>
                  )}

                  {/* 2nd Place */}
                  {results.second && (
                    <div className="bg-gray-400 bg-opacity-20 rounded-xl p-6 border-2 border-gray-400">
                      <div className="flex items-center justify-center gap-4">
                        <span className="text-4xl">🥈</span>
                        <div className="text-center">
                          <div className="text-sm text-gray-300 font-semibold">2ND PLACE - RUNNER-UP</div>
                          <div className="text-xl font-bold text-white mt-1">
                            {formatTeamName(results.second)}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* 3rd Place */}
                  {results.third && (
                    <div className="bg-orange-600 bg-opacity-20 rounded-xl p-6 border-2 border-orange-500">
                      <div className="flex items-center justify-center gap-4">
                        <span className="text-4xl">🥉</span>
                        <div className="text-center">
                          <div className="text-sm text-orange-300 font-semibold">3RD PLACE</div>
                          <div className="text-xl font-bold text-white mt-1">
                            {formatTeamName(results.third)}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}

            {/* Action Buttons */}
            <div className="flex flex-col gap-3 mt-8">
              <button
                onClick={() => setTournamentComplete(false)}
                className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 px-4 rounded-lg transition text-lg"
              >
                📊 View Full Bracket
              </button>
              <button
                onClick={() => window.location.href = '/'}
                className="w-full bg-gray-600 hover:bg-gray-500 text-white font-bold py-3 px-4 rounded-lg transition text-lg"
              >
                🏠 Return to Home
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
