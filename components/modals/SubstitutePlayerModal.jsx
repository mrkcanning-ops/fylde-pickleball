'use client';

import { useState } from 'react';

/**
 * SubstitutePlayerModal
 * 
 * Allows users to substitute a player out and bring a player in
 * Shows available substitutes and lets user select both players
 */
export default function SubstitutePlayerModal({
  isOpen,
  onClose,
  currentMatchPlayers = [],
  availableSubstitutes = [],
  onConfirm,
  currentRound = 1,
}) {
  const [playerOut, setPlayerOut] = useState(null);
  const [playerIn, setPlayerIn] = useState(null);
  const [substitutionNotes, setSubstitutionNotes] = useState('');

  const handleConfirm = () => {
    if (!playerOut || !playerIn) {
      alert('Please select both a player to substitute out and a player to come in');
      return;
    }

    if (playerOut.id === playerIn.id) {
      alert('Cannot substitute a player for themselves');
      return;
    }

    onConfirm({
      playerOut,
      playerIn,
      notes: substitutionNotes,
      round: currentRound,
    });

    // Reset form
    setPlayerOut(null);
    setPlayerIn(null);
    setSubstitutionNotes('');
    onClose();
  };

  if (!isOpen) return null;

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
            🔄 Substitute Player
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
          {/* Round Info */}
          <div className="bg-gray-900 p-3 rounded text-sm text-gray-300">
            <span className="font-medium">Round:</span> {currentRound}
          </div>

          {/* Player Out Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Player Coming Out
            </label>
            <select
              value={playerOut?.id || ''}
              onChange={(e) => {
                const selected = currentMatchPlayers.find(
                  (p) => String(p?.id) === e.target.value
                );
                setPlayerOut(selected || null);
              }}
              className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
            >
              <option value="">Select player to substitute...</option>
              {(Array.isArray(currentMatchPlayers) ? currentMatchPlayers : []).map(
                (player) => (
                  <option key={player?.id} value={player?.id}>
                    {player?.name || 'Unknown'}{' '}
                    {player?.gender ? `(${player.gender === 'male' ? '♂' : '♀'})` : ''}
                  </option>
                )
              )}
            </select>
          </div>

          {/* Player In Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Player Coming In
            </label>
            <select
              value={playerIn?.id || ''}
              onChange={(e) => {
                const selected = availableSubstitutes.find(
                  (p) => String(p?.id) === e.target.value
                );
                setPlayerIn(selected || null);
              }}
              className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
            >
              <option value="">
                {availableSubstitutes?.length === 0
                  ? 'No available substitutes'
                  : 'Select substitute...'}
              </option>
              {(Array.isArray(availableSubstitutes) ? availableSubstitutes : []).map(
                (player) => (
                  <option key={player?.id} value={player?.id}>
                    {player?.name || 'Unknown'}{' '}
                    {player?.gender ? `(${player.gender === 'male' ? '♂' : '♀'})` : ''}
                  </option>
                )
              )}
            </select>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Notes (Optional)
            </label>
            <textarea
              value={substitutionNotes}
              onChange={(e) => setSubstitutionNotes(e.target.value)}
              placeholder="e.g., Injury, tactical change..."
              className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500 resize-none"
              rows="2"
            />
          </div>

          {/* Confirmation Preview */}
          {playerOut && playerIn && (
            <div className="bg-blue-900 bg-opacity-30 border border-blue-600 rounded p-3 text-sm text-gray-300">
              <div className="font-medium text-blue-300 mb-2">Substitution Preview:</div>
              <div className="flex items-center justify-between">
                <div className="text-red-400">
                  🔴 Out: {playerOut?.name}
                </div>
                <div className="text-green-400">
                  🟢 In: {playerIn?.name}
                </div>
              </div>
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
            disabled={!playerOut || !playerIn}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors"
          >
            Confirm Substitution
          </button>
        </div>
      </div>
    </div>
  );
}
