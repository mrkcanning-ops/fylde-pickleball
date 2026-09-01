'use client';

/**
 * RemovePlayerModal Component
 * Reusable modal for removing a player
 * 
 * Props:
 *   - isOpen: boolean
 *   - onClose: function
 *   - selectedPlayer: object - player to remove
 *   - onConfirm: function - callback when confirming removal
 *   - isLoading: boolean
 */
export function RemovePlayerModal({
  isOpen,
  onClose,
  selectedPlayer,
  onConfirm,
  isLoading = false,
}) {
  if (!isOpen || !selectedPlayer) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50">
      <div className="bg-gray-900 rounded-xl shadow-xl p-6 w-96 border border-gray-700">
        <h2 className="text-xl font-bold text-red-400 mb-4">🗑️ Remove Player</h2>

        <p className="text-gray-300 mb-4">
          Are you sure you want to remove <strong>{selectedPlayer.name}</strong>?
        </p>

        <p className="text-sm text-gray-400 mb-6">
          This action cannot be undone. All match history for this player will remain.
        </p>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            disabled={isLoading}
            className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-2 rounded disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button
            onClick={() => onConfirm(selectedPlayer.id)}
            disabled={isLoading}
            className="flex-1 bg-red-600 hover:bg-red-500 text-white py-2 rounded font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Removing...' : 'Remove Player'}
          </button>
        </div>
      </div>
    </div>
  );
}
