'use client';

import { useState, useMemo } from 'react';

/**
 * Validate player count for tournament format
 */
function validateTournamentPlayerCount(playerCount, format, gameType) {
  if (playerCount < 2) {
    return {
      valid: false,
      error: `Need at least 2 players`,
      minPlayers: 2,
    };
  }

  if (format === 'group-knockout') {
    // Group knockout validation
    if (gameType === 'doubles') {
      // Doubles: 18 minimum (3 groups of 3 pairs), must be even
      if (playerCount < 18) {
        return {
          valid: false,
          error: `Doubles group stage needs minimum 18 players (3 groups of 3 pairs). You have ${playerCount}.`,
          minPlayers: 18,
        };
      }
      if (playerCount % 2 !== 0) {
        return {
          valid: false,
          error: `Doubles group stage requires an even number of players. You have ${playerCount} (try ${playerCount + 1} or ${playerCount - 1}).`,
          minPlayers: 18,
        };
      }
    } else {
      // Singles: 12 minimum (4 players per group in 3 groups), must be even
      if (playerCount < 12) {
        return {
          valid: false,
          error: `Singles group stage needs minimum 12 players (4 per group in 3 groups). You have ${playerCount}.`,
          minPlayers: 12,
        };
      }
      if (playerCount % 2 !== 0) {
        return {
          valid: false,
          error: `Singles group stage requires an even number of players. You have ${playerCount} (try ${playerCount + 1} or ${playerCount - 1}).`,
          minPlayers: 12,
        };
      }
    }
  } else {
    // Single/Double elimination validation
    if (gameType === 'doubles') {
      // Doubles: divisible by 4
      if (playerCount % 4 !== 0) {
        const nearest4 = Math.round(playerCount / 4) * 4;
        return {
          valid: false,
          error: `Doubles bracket needs player count divisible by 4. You have ${playerCount} (try ${nearest4}).`,
          minPlayers: 4,
        };
      }
    } else {
      // Singles: divisible by 4 or 5
      const divisibleBy4 = playerCount % 4 === 0;
      const divisibleBy5 = playerCount % 5 === 0;
      if (!divisibleBy4 && !divisibleBy5) {
        const nearest4 = Math.round(playerCount / 4) * 4;
        const nearest5 = Math.round(playerCount / 5) * 5;
        return {
          valid: false,
          error: `Singles bracket needs players divisible by 4 or 5. You have ${playerCount} (try ${nearest4} or ${nearest5}).`,
          minPlayers: 4,
        };
      }
    }
  }

  return { valid: true, error: null, minPlayers: null };
}

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
  const [selectedGameType, setSelectedGameType] = useState('singles');
  const [selectedPlayers, setSelectedPlayers] = useState(new Set());
  const [courtsCount, setCourtsCount] = useState(2);

  // Validate player count whenever format, gameType, or selectedPlayers changes
  const validationResult = useMemo(
    () => validateTournamentPlayerCount(selectedPlayers.size, selectedFormat, selectedGameType),
    [selectedPlayers.size, selectedFormat, selectedGameType]
  );

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
    if (!validationResult.valid) {
      return; // Button should be disabled, but just in case
    }

    const players = availablePlayers.filter((p) => selectedPlayers.has(p.id));
    onStartTournament?.(players, selectedFormat, selectedGameType, courtsCount);
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
        <div className="px-6 py-6 space-y-6 max-h-[70vh] overflow-y-auto">
          {/* Game Type Selection */}
          <div>
            <label className="block text-sm font-semibold text-gray-300 mb-3">
              Game Type
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setSelectedGameType('singles')}
                className={`p-4 rounded-lg border-2 transition ${
                  selectedGameType === 'singles'
                    ? 'border-green-500 bg-green-900 bg-opacity-30 text-white'
                    : 'border-gray-600 bg-gray-700 text-gray-300 hover:border-gray-500'
                }`}
              >
                <div className="font-bold mb-1">👤 Singles</div>
                <div className="text-xs opacity-80">1v1 matches</div>
              </button>
              <button
                onClick={() => setSelectedGameType('doubles')}
                className={`p-4 rounded-lg border-2 transition ${
                  selectedGameType === 'doubles'
                    ? 'border-green-500 bg-green-900 bg-opacity-30 text-white'
                    : 'border-gray-600 bg-gray-700 text-gray-300 hover:border-gray-500'
                }`}
              >
                <div className="font-bold mb-1">👥 Doubles</div>
                <div className="text-xs opacity-80">2v2 matches</div>
              </button>
            </div>
          </div>

          {/* Courts Available */}
          <div>
            <label className="block text-sm font-semibold text-gray-300 mb-3">
              Number of Courts Available
            </label>
            <div className="grid grid-cols-6 gap-2">
              {[1, 2, 3, 4, 5, 6].map((num) => (
                <button
                  key={num}
                  onClick={() => setCourtsCount(num)}
                  className={`p-3 rounded-lg border-2 transition font-bold ${
                    courtsCount === num
                      ? 'border-purple-500 bg-purple-900 bg-opacity-40 text-white'
                      : 'border-gray-600 bg-gray-700 text-gray-300 hover:border-gray-500'
                  }`}
                >
                  🏟️ {num}
                </button>
              ))}
            </div>
          </div>

          {/* Format Selection */}
          <div>
            <label className="block text-sm font-semibold text-gray-300 mb-3">
              Bracket Format
            </label>
            <div className="grid grid-cols-3 gap-3">
              <button
                onClick={() => setSelectedFormat('single-elimination')}
                className={`p-4 rounded-lg border-2 transition ${
                  selectedFormat === 'single-elimination'
                    ? 'border-blue-500 bg-blue-900 bg-opacity-30 text-white'
                    : 'border-gray-600 bg-gray-700 text-gray-300 hover:border-gray-500'
                }`}
              >
                <div className="font-bold mb-1">🎯 Single Elim</div>
                <div className="text-xs opacity-80">Losers out</div>
              </button>
              <button
                onClick={() => setSelectedFormat('double-elimination')}
                className={`p-4 rounded-lg border-2 transition ${
                  selectedFormat === 'double-elimination'
                    ? 'border-blue-500 bg-blue-900 bg-opacity-30 text-white'
                    : 'border-gray-600 bg-gray-700 text-gray-300 hover:border-gray-500'
                }`}
              >
                <div className="font-bold mb-1">🔄 Double Elim</div>
                <div className="text-xs opacity-80">2nd chance</div>
              </button>
              <button
                onClick={() => setSelectedFormat('group-knockout')}
                className={`p-4 rounded-lg border-2 transition ${
                  selectedFormat === 'group-knockout'
                    ? 'border-blue-500 bg-blue-900 bg-opacity-30 text-white'
                    : 'border-gray-600 bg-gray-700 text-gray-300 hover:border-gray-500'
                }`}
              >
                <div className="font-bold mb-1">🏘️ Groups+KO</div>
                <div className="text-xs opacity-80">Round robin→elim</div>
              </button>
            </div>
          </div>

          {/* Player Selection */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className={`block text-sm font-semibold ${validationResult.valid ? 'text-gray-300' : 'text-red-400'}`}>
                Select Players ({selectedPlayers.size} chosen{selectedGameType === 'doubles' && `, ${Math.floor(selectedPlayers.size / 2)} teams`})
                {!validationResult.valid && <span className="text-red-400 ml-2">✗</span>}
                {validationResult.valid && selectedPlayers.size > 0 && <span className="text-green-400 ml-2">✓</span>}
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

          {/* Validation Error Alert */}
          {!validationResult.valid && (
            <div className="bg-red-900 bg-opacity-30 border border-red-500 rounded p-4 text-sm">
              <div className="font-semibold text-red-400 mb-2">⚠️ Cannot Start Tournament</div>
              <div className="text-red-300">{validationResult.error}</div>
            </div>
          )}

          {/* Info */}
          <div className="bg-blue-900 bg-opacity-20 border border-blue-600 rounded p-3 text-sm text-gray-300">
            <div className="font-semibold text-blue-400 mb-2">ℹ️ Tournament Requirements</div>
            <ul className="space-y-1 text-xs">
              {selectedFormat === 'group-knockout' ? (
                <>
                  {selectedGameType === 'doubles' ? (
                    <>
                      <li>• <span className="font-bold">Minimum 18 players</span> (3 groups of 3 pairs)</li>
                      <li>• <span className="font-bold">Must be EVEN</span> number of players</li>
                      <li>• Round-robin play within groups</li>
                      <li>• Top 2 from each group advance to knockout stage</li>
                    </>
                  ) : (
                    <>
                      <li>• <span className="font-bold">Minimum 12 players</span> (4 per group in 3 groups)</li>
                      <li>• <span className="font-bold">Must be EVEN</span> number of players</li>
                      <li>• Round-robin play within groups</li>
                      <li>• Top 2 from each group advance to knockout stage</li>
                    </>
                  )}
                </>
              ) : (
                <>
                  {selectedGameType === 'doubles' ? (
                    <>
                      <li>• <span className="font-bold">Players must be divisible by 4</span></li>
                      <li>• Teams auto-paired from selected players</li>
                      <li>• Byes automatically assigned for odd matchups</li>
                      <li>• Winners advance automatically</li>
                    </>
                  ) : (
                    <>
                      <li>• <span className="font-bold">Players must be divisible by 4 or 5</span></li>
                      <li>• Players seeded by current points & wins</li>
                      <li>• Byes automatically assigned for odd matchups</li>
                      <li>• Winners advance automatically</li>
                    </>
                  )}
                </>
              )}
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
            disabled={!validationResult.valid}
            title={!validationResult.valid ? validationResult.error : 'Start tournament'}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-600 disabled:cursor-not-allowed disabled:opacity-50 text-white rounded-lg font-bold transition-colors flex items-center gap-2"
          >
            🏆 Start Tournament
          </button>
        </div>
      </div>
    </div>
  );
}
