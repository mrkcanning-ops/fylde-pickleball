'use client';

import { useState } from 'react';

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
  const [notes, setNotes] = useState('');

  if (!match) return null;

  const handleConfirm = () => {
    if (!selectedWinner) {
      alert('Please select a winner');
      return;
    }

    onRecordResult?.(match.id, selectedWinner);
    
    // Reset form
    setSelectedWinner(null);
    setMatchScore({ team1: '', team2: '' });
    setNotes('');
    onClose();
  };

  if (!isOpen) return null;

  const team1 = match.team1?.[0];
  const team2 = match.team2?.[0];

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
                  {team1?.name || 'TBD'}
                </div>
              </div>

              <div className="text-center text-gray-500 font-bold">VS</div>

              {/* Team 2 */}
              <div className="bg-gray-700 rounded p-2 text-center">
                <div className="text-sm font-semibold text-white truncate">
                  {team2?.name || 'TBD'}
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
              Select Winner
            </label>
            <div className="space-y-2">
              <button
                onClick={() => setSelectedWinner(team1)}
                className={`w-full p-3 rounded-lg border-2 font-semibold transition ${
                  selectedWinner?.id === team1?.id
                    ? 'border-green-500 bg-green-900 bg-opacity-30 text-green-300'
                    : 'border-gray-600 bg-gray-700 text-white hover:border-gray-500'
                }`}
              >
                🏆 {team1?.name || 'TBD'} Wins
              </button>
              <button
                onClick={() => setSelectedWinner(team2)}
                className={`w-full p-3 rounded-lg border-2 font-semibold transition ${
                  selectedWinner?.id === team2?.id
                    ? 'border-green-500 bg-green-900 bg-opacity-30 text-green-300'
                    : 'border-gray-600 bg-gray-700 text-white hover:border-gray-500'
                }`}
              >
                🏆 {team2?.name || 'TBD'} Wins
              </button>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Notes (Optional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g., Close match, injury, etc."
              className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500 resize-none"
              rows="2"
            />
          </div>

          {/* Confirmation */}
          {selectedWinner && (
            <div className="bg-green-900 bg-opacity-30 border border-green-600 rounded p-3 text-sm text-green-300">
              ✓ {selectedWinner.name} will advance to the next round
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
            disabled={!selectedWinner}
            className="px-6 py-2 bg-green-600 hover:bg-green-500 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg font-bold transition-colors"
          >
            Record Result
          </button>
        </div>
      </div>
    </div>
  );
}
