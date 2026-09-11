'use client';

import { useState, useEffect } from 'react';

/**
 * TournamentMatchResultModal
 * 
 * Modal to record match result and advance winner
 */
export default function TournamentMatchResultModal({
  isOpen,
  onClose,
  match = null,
  onRecordResult = null,
  onAdvanceRound = null,
}) {
  const [selectedWinner, setSelectedWinner] = useState(null);
  const [matchScore, setMatchScore] = useState({ team1: '', team2: '' });
  const [isDraw, setIsDraw] = useState(false);
  const [notes, setNotes] = useState('');

  // Check if this is a group stage match (draws allowed)
  const isGroupStage = match?.stage?.includes('group');
  
  // Check if this is a doubles match
  const isDoubles = match?.team1?.length > 1 || match?.team2?.length > 1;

  // Auto-detect winner based on score
  useEffect(() => {
    if (!match) return; // Guard against null match
    
    // Always record the winning side as a team array, including singles.
    const team1Winner = match.team1;
    const team2Winner = match.team2;
    
    // Only proceed if both scores are entered
    const score1 = matchScore.team1 !== '' ? parseInt(matchScore.team1, 10) : null;
    const score2 = matchScore.team2 !== '' ? parseInt(matchScore.team2, 10) : null;
    
    if (score1 !== null && score2 !== null) {
      if (score1 > score2) {
        // Team 1 has higher score
        setSelectedWinner(team1Winner);
        setIsDraw(false);
      } else if (score2 > score1) {
        // Team 2 has higher score
        setSelectedWinner(team2Winner);
        setIsDraw(false);
      } else if (isGroupStage) {
        // Equal scores in group stage = draw
        setSelectedWinner(null);
        setIsDraw(true);
      }
    }
  }, [matchScore, match, isGroupStage, isDoubles]);

  if (!isOpen) return null;
  if (!match) return null;

  const handleConfirm = () => {
    if (!selectedWinner && !isDraw) {
      alert('Please select a winner or record a draw');
      return;
    }

    const result = {
      winner: isDraw ? { draw: true } : selectedWinner,
      ...(matchScore.team1 !== '' && matchScore.team2 !== '' ? {
        score: {
          team1: Number(matchScore.team1),
          team2: Number(matchScore.team2),
        },
      } : {}),
    };
    
    onRecordResult?.(match.id, result);
    
    // Reset form
    setSelectedWinner(null);
    setIsDraw(false);
    setMatchScore({ team1: '', team2: '' });
    setNotes('');
    onClose();
  };

  // Helper to format team name for display
  const formatTeamName = (team) => {
    if (!team || team.length === 0) return 'TBD';
    return team.map(p => p?.name).filter(Boolean).join(' & ') || 'TBD';
  };

  // Helper to check if two teams are equal (for comparison)
  const areTeamsEqual = (team1, team2) => {
    if (!team1 || !team2) return false;
    if (team1.length !== team2.length) return false;
    return team1.every(p1 => team2.some(p2 => p2?.id === p1?.id));
  };

  const team1Display = formatTeamName(match.team1);
  const team2Display = formatTeamName(match.team2);

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-gray-800 rounded-lg max-w-md w-full shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-gray-800 to-gray-750 px-6 py-4 border-b border-gray-700 flex items-center justify-between">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            ⚔️ Record Match Result
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white text-2xl font-bold"
          >
            ×
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-6 space-y-4">
          {/* Match Info */}
          <div className="bg-gray-900 rounded p-3 space-y-2">
            <div className="text-sm text-gray-400">Match {match.position + 1}</div>
            <div className="grid grid-cols-3 gap-2 items-center">
              {/* Team 1 */}
              <div className="bg-gray-700 rounded p-2 text-center">
                <div className="text-sm font-semibold text-white truncate">
                  {team1Display}
                </div>
              </div>

              <div className="text-center text-gray-500 font-bold">VS</div>

              {/* Team 2 */}
              <div className="bg-gray-700 rounded p-2 text-center">
                <div className="text-sm font-semibold text-white truncate">
                  {team2Display}
                </div>
              </div>
            </div>
          </div>

          {/* Score Entry */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Final Score (Optional)
            </label>
            <div className="grid grid-cols-3 gap-2 items-center">
              <input
                type="number"
                min="0"
                value={matchScore.team1}
                onChange={(e) => setMatchScore({ ...matchScore, team1: e.target.value })}
                placeholder="0"
                className="bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white text-center focus:outline-none focus:border-blue-500"
              />
              <div className="text-center text-gray-500">-</div>
              <input
                type="number"
                min="0"
                value={matchScore.team2}
                onChange={(e) => setMatchScore({ ...matchScore, team2: e.target.value })}
                placeholder="0"
                className="bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white text-center focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          {/* Winner Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Select Result {matchScore.team1 !== '' && matchScore.team2 !== '' && parseInt(matchScore.team1, 10) !== parseInt(matchScore.team2, 10) && <span className="text-green-400 text-xs">(Auto-detected from score)</span>}
              {matchScore.team1 !== '' && matchScore.team2 !== '' && parseInt(matchScore.team1, 10) === parseInt(matchScore.team2, 10) && isGroupStage && <span className="text-blue-400 text-xs">(Auto-detected as Draw)</span>}
            </label>
            <div className="space-y-2">
              <button
                onClick={() => {
                  setSelectedWinner(match.team1);
                  setIsDraw(false);
                }}
                className={`w-full p-3 rounded-lg border-2 font-semibold transition ${
                  (isDoubles ? areTeamsEqual(selectedWinner, match.team1) : selectedWinner?.id === match.team1?.[0]?.id) && !isDraw
                    ? 'border-green-500 bg-green-900 bg-opacity-30 text-green-300'
                    : 'border-gray-600 bg-gray-700 text-white hover:border-gray-500'
                }`}
              >
                🏆 {team1Display} Wins
              </button>
              <button
                onClick={() => {
                  setSelectedWinner(match.team2);
                  setIsDraw(false);
                }}
                className={`w-full p-3 rounded-lg border-2 font-semibold transition ${
                  (isDoubles ? areTeamsEqual(selectedWinner, match.team2) : selectedWinner?.id === match.team2?.[0]?.id) && !isDraw
                    ? 'border-green-500 bg-green-900 bg-opacity-30 text-green-300'
                    : 'border-gray-600 bg-gray-700 text-white hover:border-gray-500'
                }`}
              >
                🏆 {team2Display} Wins
              </button>
              
              {/* Draw button for group stages */}
              {isGroupStage && (
                <button
                  onClick={() => {
                    setIsDraw(!isDraw);
                    setSelectedWinner(null);
                  }}
                  className={`w-full p-3 rounded-lg border-2 font-semibold transition ${
                    isDraw
                      ? 'border-blue-500 bg-blue-900 bg-opacity-30 text-blue-300'
                      : 'border-gray-600 bg-gray-700 text-white hover:border-gray-500'
                  }`}
                >
                  ⚖️ Draw (Both teams get 1 point)
                </button>
              )}
            </div>
          </div>

          {/* Confirmation */}
          {isDraw && (
            <div className="bg-blue-900 bg-opacity-30 border border-blue-600 rounded p-3 text-sm text-blue-300">
              ✓ Match will be recorded as a Draw (1 point to each team)
            </div>
          )}
          {selectedWinner && !isDraw && (
            <div className="bg-green-900 bg-opacity-30 border border-green-600 rounded p-3 text-sm text-green-300">
              ✓ {formatTeamName(selectedWinner)} will advance to the next round
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-gray-900 px-6 py-4 border-t border-gray-700 flex gap-3 justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-medium transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={!selectedWinner && !isDraw}
            className="px-6 py-2 bg-green-600 hover:bg-green-500 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg font-bold transition-colors"
          >
            Record Result
          </button>
        </div>
      </div>
    </div>
  );
}
