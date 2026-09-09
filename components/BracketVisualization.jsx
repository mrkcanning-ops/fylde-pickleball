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
}) {
  console.log('[BracketVisualization] Rendering bracket:', bracket?.format, bracket?.gameType, 'rounds:', bracket?.rounds?.length);
  const [showCourtSchedule, setShowCourtSchedule] = useState(true);
  const [showRoundsDetail, setShowRoundsDetail] = useState(false);

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
   * Returns one match per court (the first unplayed match)
   */
  const getCurrentRoundMatches = () => {
    const courtMatches = {};

    // Initialize courts
    for (let i = 1; i <= (bracket?.courtsCount || 1); i++) {
      courtMatches[i] = null;
    }

    // Get all rounds (group + knockout) - with defensive checks
    if (!bracket?.rounds && !bracket?.knockoutRounds) {
      return courtMatches; // No rounds to process
    }

    let allRounds = [...(bracket.rounds || [])];
    if (bracket.knockoutRounds) {
      allRounds = [...allRounds, ...bracket.knockoutRounds];
    }

    // Find first unplayed match for each court
    allRounds.forEach((round) => {
      if (!round || !Array.isArray(round.matchups)) return;
      
      (round.matchups || []).forEach((match) => {
        // Defensive: skip invalid matches
        if (!match || typeof match !== 'object') return;
        
        const courtNum = match.court || 1;
        // Only assign if this court doesn't have a match yet and this one isn't played
        if (!courtMatches[courtNum] && !match.played && match.team2) {
          courtMatches[courtNum] = { ...match, roundName: round.stageName };
        }
      });
    });

    return courtMatches;
  };

  const currentRoundMatches = getCurrentRoundMatches();
  const anyPendingMatches = Object.values(currentRoundMatches).some(m => m !== null);

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

      {/* Group Assignments Display (for group-knockout) */}
      {bracket.format === 'group-knockout' && bracket.stage === 'group' && bracket.numGroups && bracket.rounds && (
        <div className="mb-4 md:mb-6 bg-gray-700 bg-opacity-50 rounded-xl p-3 md:p-6 border-2 border-blue-500">
          <h4 className="font-bold text-base md:text-lg text-blue-400 mb-4 md:mb-6 flex items-center gap-3">
            👥 Group Assignments
          </h4>
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
                    {bracket.gameType === 'doubles' && bracket.doublesPartnerMode === 'known' && bracket.playerPartners
                      ? (() => {
                          // For known partners, show teams grouped by partnerships
                          const displayedPlayerIds = new Set();
                          const teams = [];
                          
                          round.players?.forEach((player) => {
                            if (displayedPlayerIds.has(player.id)) return;
                            
                            const partnerId = bracket.playerPartners[player.id];
                            if (partnerId) {
                              // Find partner player object
                              const partnerPlayer = round.players?.find(p => p.id === partnerId);
                              if (partnerPlayer) {
                                teams.push({ player1: player, player2: partnerPlayer });
                                displayedPlayerIds.add(player.id);
                                displayedPlayerIds.add(partnerId);
                              } else {
                                // Partner not in this group, show alone
                                teams.push({ player1: player });
                                displayedPlayerIds.add(player.id);
                              }
                            } else {
                              // No partner assigned, show alone
                              teams.push({ player1: player });
                              displayedPlayerIds.add(player.id);
                            }
                          });
                          
                          return teams.map((team, idx) => (
                            <div key={`team-${team.player1.id}`} className="text-xs md:text-sm text-gray-200 flex items-start md:items-center gap-2 md:gap-3 hover:bg-gray-700 p-1 md:p-2 rounded transition-colors">
                              <span className="text-purple-400 font-bold text-base md:text-lg flex-shrink-0">•</span>
                              <span className="flex-1 font-medium break-words">
                                {team.player1.name}
                                {team.player2 && ` & ${team.player2.name}`}
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

      {/* Current Round Matches - Collapsible Court Schedule */}
      <div className="mb-6">
        <button
          onClick={() => setShowCourtSchedule(!showCourtSchedule)}
          className="w-full flex items-center justify-between bg-cyan-900 bg-opacity-30 border border-cyan-500 rounded-lg p-4 hover:bg-opacity-40 transition"
        >
          <h4 className="font-semibold text-cyan-400 flex items-center gap-2">
            🏟️ Current Round - Court Schedule {showCourtSchedule ? '▼' : '▶'}
          </h4>
          <span className="text-sm text-cyan-300">
            {Object.values(currentRoundMatches).filter(m => m !== null).length} matches
          </span>
        </button>

        {showCourtSchedule && (
          <div className={`mt-4 grid gap-4 ${bracket.courtsCount > 2 ? 'grid-cols-2' : 'grid-cols-1'}`}>
            {Array.from({ length: bracket.courtsCount }, (_, courtIdx) => {
              const courtNum = courtIdx + 1;
              const match = currentRoundMatches[courtNum];

              return (
                <div
                  key={courtNum}
                  className="bg-gray-700 bg-opacity-50 rounded-lg p-4 border border-purple-500"
                >
                  <div className="font-bold text-purple-400 mb-3 text-sm">
                    Court {courtNum}
                  </div>
                  {!match ? (
                    <div className="text-xs text-gray-500 italic">No pending matches</div>
                  ) : (
                    <div
                      onClick={() => onSelectMatch?.(match)}
                      className="bg-gray-800 rounded p-3 cursor-pointer transition border-l-2 border-cyan-400 hover:bg-gray-750"
                    >
                      <div className="text-xs text-gray-400 mb-2 font-semibold">{match.roundName}</div>
                      <div className="text-sm font-semibold text-white mb-2">
                        {bracket.gameType === 'doubles'
                          ? (match.team1?.map(p => p?.name).join(' & ') || 'TBD')
                          : (match.team1?.[0]?.name || 'TBD')
                        }
                      </div>
                      <div className="text-xs text-center text-gray-500 mb-2">VS</div>
                      <div className="text-sm font-semibold text-white mb-3">
                        {bracket.gameType === 'doubles'
                          ? (match.team2?.map(p => p?.name).join(' & ') || 'TBD')
                          : (match.team2?.[0]?.name || 'TBD')
                        }
                      </div>
                      <div className="text-xs text-blue-400 font-semibold">
                        Click to enter score →
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Show message when all current matches complete */}
      {!anyPendingMatches && bracket.rounds?.length > 0 && (
        <div className="bg-green-900 bg-opacity-30 border border-green-500 rounded-lg p-4 mb-6">
          <div className="text-green-400 font-bold mb-2">✓ All current matches complete!</div>
          <div className="text-sm text-green-300">Click "Advance Round" to show the next set of matches.</div>
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
                      {bracket.gameType === 'doubles'
                        ? (match.team1?.map(p => p?.name).join(' & ') || 'TBD')
                        : (match.team1?.[0]?.name || 'TBD')
                      }
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
                          {bracket.gameType === 'doubles'
                            ? (match.team2?.map(p => p?.name).join(' & ') || 'TBD')
                            : (match.team2?.[0]?.name || 'TBD')
                          }
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
