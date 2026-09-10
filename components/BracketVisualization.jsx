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
}) {
  console.log('[BracketVisualization] Rendering bracket:', bracket?.format, bracket?.gameType, 'rounds:', bracket?.rounds?.length);
  const [showCourtSchedule, setShowCourtSchedule] = useState(true);
  const [showRoundsDetail, setShowRoundsDetail] = useState(false);
  const [showGroupAssignments, setShowGroupAssignments] = useState(true);
  const [matchScores, setMatchScores] = useState({}); // Track scores: { matchId: { team1: score, team2: score } }
  const [matchWinners, setMatchWinners] = useState({}); // Track detected winners: { matchId: winnerId or 'draw' }

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

  // Check if all current round matches have scores entered
  const allCurrentScoresEntered = () => {
    return Object.values(currentRoundMatches).every(match => {
      if (!match) return true; // No match = complete
      return matchScores[match.id] && matchScores[match.id].team1 !== '' && matchScores[match.id].team2 !== '';
    });
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

    // For knockout stage, show first unplayed knockout matches across courts
    let allRounds = [...(bracket.knockoutRounds || [])];

    // Find first unplayed match for each court, ensuring no player conflicts
    allRounds.forEach((round) => {
      if (!round || !Array.isArray(round.matchups)) return;
      
      (round.matchups || []).forEach((match) => {
        // Defensive: skip invalid matches
        if (!match || typeof match !== 'object') return;
        
        const courtNum = match.court || 1;
        
        // Skip if this court already has a match
        if (courtMatches[courtNum]) return;
        
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
        
        // No conflicts - assign this match to the court
        courtMatches[courtNum] = { ...match, roundName: round.stageName };
        
        // Mark all players as used
        matchPlayerIds.forEach(playerId => usedPlayers.add(playerId));
      });
    });

    return courtMatches;
  };

  const currentRoundMatches = getCurrentRoundMatches();
  const anyPendingMatches = Object.values(currentRoundMatches).some(m => m !== null);

  // Handle advancing to next round - first mark current matches as played
  const handleAdvanceRound = () => {
    console.log('[handleAdvanceRound] Called, allCurrentScoresEntered:', allCurrentScoresEntered());
    
    if (!allCurrentScoresEntered()) {
      console.warn('[handleAdvanceRound] Cannot advance: not all scores entered');
      return;
    }

    console.log('[handleAdvanceRound] All scores entered, preparing bracket update');
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
      
      return {
        ...round,
        matchups: round.matchups?.map(match => {
          const winner = matchWinners[match.id];
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
        
        return {
          ...round,
          matchups: round.matchups?.map(match => {
            const winner = matchWinners[match.id];
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
    <div className="bg-gray-800 rounded-lg p-6 overflow-x-auto space-y-6">
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
          {anyPendingMatches && (
            <button
              onClick={handleAdvanceRound}
              disabled={!allCurrentScoresEntered()}
              className={`w-full mt-6 py-3 px-4 rounded-lg font-bold transition ${
                allCurrentScoresEntered()
                  ? 'bg-green-600 hover:bg-green-500 text-white cursor-pointer'
                  : 'bg-gray-600 text-gray-400 cursor-not-allowed'
              }`}
            >
              {allCurrentScoresEntered() ? '→ Next Round' : 'Enter all scores to continue'}
            </button>
          )}
        </div>
      </div>

      {/* Show message when all current matches complete */}
      {!anyPendingMatches && bracket.rounds?.length > 0 && (
        <div className="bg-green-900 bg-opacity-30 border border-green-500 rounded-lg p-4 mb-6">
          <div className="text-green-400 font-bold mb-2">✓ Group stage complete!</div>
          <div className="text-sm text-green-300">All matches have been recorded.</div>
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

      {/* Seeding Info */}
      <div className="mt-8 bg-gray-900 rounded-lg p-4">
        <h4 className="font-semibold text-gray-300 mb-3 text-sm">🎯 Seeding</h4>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
          {(bracket.seededPlayers || []).map((player, idx) => (
            <div key={player.id} className="bg-gray-800 rounded p-2 text-xs">
              <div className="text-gray-400">#{idx + 1}</div>
              <div className="text-white font-semibold truncate">{player.name}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
