'use client';

import { useState } from 'react';

/**
 * TournamentSetupModal
 * 
 * Modal to configure and start a new tournament bracket
 */
export default function TournamentSetupModal({
  isOpen,
  onClose,
  availablePlayers = [],
  onStartTournament,
}) {
  const [selectedFormat, setSelectedFormat] = useState('single-elimination');
  const [selectedPlayers, setSelectedPlayers] = useState(new Set());

  const handleTogglePlayer = (playerId) => {
    const updated = new Set(selectedPlayers);
    if (updated.has(playerId)) {
      updated.delete(playerId);
    } else {
      updated.add(playerId);
    }
    setSelectedPlayers(updated);
  };

  const handleSelectAll = () => {
    if (selectedPlayers.size === availablePlayers.length) {
      setSelectedPlayers(new Set());
    } else {
      setSelectedPlayers(new Set(availablePlayers.map((p) => p.id)));
    }
  };

  const handleStartTournament = () => {
    if (selectedPlayers.size < 2) {
      alert('Select at least 2 players to start tournament');
      return;
    }

    const players = availablePlayers.filter((p) => selectedPlayers.has(p.id));
    onStartTournament?.(players, selectedFormat);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="bg-gray-800 rounded-lg max-w-2xl w-full shadow-2xl my-8"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-gray-800 to-gray-750 px-6 py-4 border-b border-gray-700 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-white flex items-center gap-3">
            🏆 Start Tournament
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white text-2xl font-bold"
          >
            ×
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-6 space-y-6">
          {/* Format Selection */}
          <div>
            <label className="block text-sm font-semibold text-gray-300 mb-3">
              Bracket Format
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setSelectedFormat('single-elimination')}
                className={`p-4 rounded-lg border-2 transition ${
                  selectedFormat === 'single-elimination'
                    ? 'border-blue-500 bg-blue-900 bg-opacity-30 text-white'
                    : 'border-gray-600 bg-gray-700 text-gray-300 hover:border-gray-500'
                }`}
              >
                <div className="font-bold mb-1">🎯 Single Elimination</div>
                <div className="text-xs opacity-80">Losers are out</div>
              </button>
              <button
                onClick={() => setSelectedFormat('double-elimination')}
                className={`p-4 rounded-lg border-2 transition ${
                  selectedFormat === 'double-elimination'
                    ? 'border-blue-500 bg-blue-900 bg-opacity-30 text-white'
                    : 'border-gray-600 bg-gray-700 text-gray-300 hover:border-gray-500'
                }`}
              >
                <div className="font-bold mb-1">🔄 Double Elimination</div>
                <div className="text-xs opacity-80">Second chance bracket</div>
              </button>
            </div>
          </div>

          {/* Player Selection */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="block text-sm font-semibold text-gray-300">
                Select Players ({selectedPlayers.size} chosen)
              </label>
              <button
                onClick={handleSelectAll}
                className="text-xs bg-gray-700 hover:bg-gray-600 text-gray-300 px-2 py-1 rounded"
              >
                {selectedPlayers.size === availablePlayers.length ? 'Deselect All' : 'Select All'}
              </button>
            </div>

            <div className="bg-gray-900 rounded-lg p-4 max-h-48 overflow-y-auto space-y-2">
              {availablePlayers.length === 0 ? (
                <p className="text-gray-500 text-sm italic">No available players</p>
              ) : (
                availablePlayers.map((player) => (
                  <label
                    key={player.id}
                    className="flex items-center gap-3 p-2 rounded cursor-pointer hover:bg-gray-800 transition"
                  >
                    <input
                      type="checkbox"
                      checked={selectedPlayers.has(player.id)}
                      onChange={() => handleTogglePlayer(player.id)}
                      className="w-4 h-4 cursor-pointer"
                    />
                    <span className="flex-1 text-gray-300">
                      {player.name}
                      {player.gender && (
                        <span className="text-gray-500 ml-2">
                          {player.gender === 'male' ? '♂' : '♀'}
                        </span>
                      )}
                    </span>
                    {player.wins !== undefined && (
                      <span className="text-xs text-gray-500">
                        {player.wins}W {player.losses}L
                      </span>
                    )}
                  </label>
                ))
              )}
            </div>
          </div>

          {/* Info */}
          <div className="bg-blue-900 bg-opacity-20 border border-blue-600 rounded p-3 text-sm text-gray-300">
            <div className="font-semibold text-blue-400 mb-2">ℹ️ Tournament Info</div>
            <ul className="space-y-1 text-xs">
              <li>• Players will be seeded by current points & wins</li>
              <li>• Minimum 2 players required to start</li>
              <li>• Byes are automatically assigned for odd player counts</li>
              <li>• Winners advance automatically</li>
            </ul>
          </div>
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
            onClick={handleStartTournament}
            disabled={selectedPlayers.size < 2}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg font-bold transition-colors flex items-center gap-2"
          >
            🏆 Start Tournament
          </button>
        </div>
      </div>
    </div>
  );
}
