'use client';

/**
 * BulkRemovePlayersModal Component
 * Allows selecting and removing multiple players at once
 * 
 * Props:
 *   - isOpen: boolean
 *   - onClose: function
 *   - availablePlayers: array - all players to choose from
 *   - selectedPlayers: array - currently selected players
 *   - onTogglePlayer: function - callback to toggle player selection
 *   - onConfirm: function - callback to remove selected players
 *   - isLoading: boolean
 */
export function BulkRemovePlayersModal({
  isOpen,
  onClose,
  availablePlayers = [],
  selectedPlayers = [],
  onTogglePlayer,
  onConfirm,
  isLoading = false,
}) {
  if (!isOpen) return null;

  const handleConfirm = () => {
    if (selectedPlayers.length === 0) {
      alert('Please select at least one player to remove');
      return;
    }
    const confirmed = window.confirm(
      `Remove ${selectedPlayers.length} player(s)? This action cannot be undone.`
    );
    if (confirmed) {
      onConfirm();
    }
  };

  const selectedSet = new Set(selectedPlayers.map((p) => String(p.id || p)));

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50">
      <div className="bg-gray-900 rounded-xl shadow-xl p-6 w-full max-w-2xl max-h-96 border border-gray-700 flex flex-col">
        <h2 className="text-xl font-bold text-red-400 mb-4">🗑️ Bulk Remove Players</h2>

        {availablePlayers.length === 0 ? (
          <div className="flex-1 flex items-center justify-center text-gray-400">
            <p>No players available to remove</p>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto mb-4 bg-gray-800 rounded border border-gray-600">
              <div className="p-4 space-y-2">
                {availablePlayers.map((player) => {
                  const isSelected = selectedSet.has(String(player.id));
                  return (
                    <div
                      key={player.id}
                      className={`flex items-center gap-3 p-3 rounded cursor-pointer transition ${
                        isSelected
                          ? 'bg-red-900 bg-opacity-40 border border-red-500'
                          : 'bg-gray-700 hover:bg-gray-600 border border-gray-600'
                      }`}
                      onClick={() => onTogglePlayer(player)}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => onTogglePlayer(player)}
                        className="w-5 h-5 cursor-pointer"
                      />
                      <div className="flex-1">
                        <p className="font-semibold text-white">{player.name}</p>
                        <p className="text-xs text-gray-400">
                          {player.wins || 0}W - {player.losses || 0}L -{' '}
                          {player.draws || 0}D
                        </p>
                      </div>
                      {player.gender && (
                        <span className="text-lg">
                          {player.gender === 'male' ? '♂️' : '♀️'}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <p className="text-sm text-gray-400 mb-4">
              {selectedPlayers.length} of {availablePlayers.length} players selected
            </p>
          </>
        )}

        {/* Actions */}
        <div className="flex gap-3 pt-4 border-t border-gray-700">
          <button
            onClick={onClose}
            disabled={isLoading}
            className="flex-1 bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>

          <button
            onClick={handleConfirm}
            disabled={selectedPlayers.length === 0 || isLoading}
            className="flex-1 bg-red-600 hover:bg-red-500 text-white px-4 py-2 rounded font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Removing...' : `Remove ${selectedPlayers.length}`}
          </button>
        </div>
      </div>
    </div>
  );
}
