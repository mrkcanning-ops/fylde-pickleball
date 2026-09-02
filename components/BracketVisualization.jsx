'use client';

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
  if (!bracket) {
    return (
      <div className="bg-gray-800 rounded-lg p-6 text-center text-gray-400">
        No active tournament bracket
      </div>
    );
  }

  return (
    <div className="bg-gray-800 rounded-lg p-6 overflow-x-auto">
      <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
        🏆 {bracket.format === 'double-elimination' ? 'Double' : 'Single'} Elimination Bracket
      </h3>

      {/* Bracket Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <div className="bg-gray-700 rounded p-3">
          <div className="text-xs text-gray-400">Players</div>
          <div className="text-2xl font-bold text-white">{bracket.playerCount}</div>
        </div>
        <div className="bg-gray-700 rounded p-3">
          <div className="text-xs text-gray-400">Current Round</div>
          <div className="text-2xl font-bold text-white">{bracket.rounds.length}</div>
        </div>
        <div className="bg-gray-700 rounded p-3">
          <div className="text-xs text-gray-400">Total Rounds</div>
          <div className="text-2xl font-bold text-white">{bracket.totalRounds}</div>
        </div>
        <div className="bg-gray-700 rounded p-3">
          <div className="text-xs text-gray-400">Byes</div>
          <div className="text-2xl font-bold text-white">{bracket.byeCount}</div>
        </div>
      </div>

      {/* Rounds Display */}
      <div className="space-y-6">
        {bracket.rounds.map((round, roundIdx) => (
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
                    match.winner?.id === match.team1?.[0]?.id
                      ? 'bg-green-900 bg-opacity-50'
                      : 'bg-gray-600'
                  }`}>
                    <span className="text-sm text-white font-medium">
                      {match.team1?.[0]?.name || 'TBD'}
                    </span>
                    {match.played && match.winner?.id === match.team1?.[0]?.id && (
                      <span className="text-yellow-400 font-bold">🏆</span>
                    )}
                  </div>

                  {/* Bye or VS */}
                  {match.team2 ? (
                    <>
                      <div className="text-center text-xs text-gray-500 my-1">VS</div>

                      {/* Team 2 */}
                      <div className={`flex items-center justify-between p-2 rounded ${
                        match.winner?.id === match.team2?.[0]?.id
                          ? 'bg-green-900 bg-opacity-50'
                          : 'bg-gray-600'
                      }`}>
                        <span className="text-sm text-white font-medium">
                          {match.team2?.[0]?.name || 'TBD'}
                        </span>
                        {match.played && match.winner?.id === match.team2?.[0]?.id && (
                          <span className="text-yellow-400 font-bold">🏆</span>
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
