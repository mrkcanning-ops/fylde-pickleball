'use client';

/**
 * BulkAddPlayersModal Component
 * Allows adding multiple players at once via CSV format
 * 
 * Props:
 *   - isOpen: boolean
 *   - onClose: function
 *   - csvText: string - current CSV input
 *   - onCSVChange: function
 *   - parsedPlayers: array - parsed players
 *   - onParse: function - callback to parse CSV
 *   - onConfirm: function - callback to add all players
 *   - isLoading: boolean
 */
export function BulkAddPlayersModal({
  isOpen,
  onClose,
  csvText,
  onCSVChange,
  parsedPlayers,
  onParse,
  onConfirm,
  isLoading = false,
}) {
  if (!isOpen) return null;

  const handleParse = () => {
    onParse(csvText);
  };

  const handleConfirm = () => {
    if (parsedPlayers.length === 0) {
      alert('No players to add');
      return;
    }
    onConfirm();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50">
      <div className="bg-gray-900 rounded-xl shadow-xl p-6 w-full max-w-2xl max-h-96 border border-gray-700 flex flex-col">
        <h2 className="text-xl font-bold text-green-400 mb-4">➕ Bulk Add Players</h2>

        <div className="flex-1 flex flex-col gap-4 overflow-auto">
          {/* CSV Input */}
          <div>
            <label className="text-gray-300 text-sm block mb-2">
              Paste player list (one per line):
              <br />
              <span className="text-xs text-gray-400">Format: "Name, gender" or just "Name"</span>
            </label>
            <textarea
              value={csvText}
              onChange={(e) => onCSVChange(e.target.value)}
              placeholder="John Smith, male&#10;Jane Doe, female&#10;Bob Johnson"
              className="w-full px-4 py-3 rounded bg-gray-800 text-white border border-gray-600 focus:outline-none focus:border-green-400 font-mono text-sm resize-none"
              rows={5}
              disabled={parsedPlayers.length > 0 || isLoading}
            />
          </div>

          {/* Parsed Players Preview */}
          {parsedPlayers.length > 0 && (
            <div>
              <label className="text-gray-300 text-sm block mb-2">
                Preview ({parsedPlayers.length} players):
              </label>
              <div className="bg-gray-800 rounded p-3 max-h-40 overflow-y-auto border border-gray-600">
                {parsedPlayers.map((p) => (
                  <div key={p.id} className="text-sm text-gray-200 py-1 flex gap-2">
                    <span className="font-semibold">{p.name}</span>
                    {p.gender && (
                      <span className="text-gray-500">
                        ({p.gender === 'male' ? '♂️' : '♀️'} {p.gender})
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-3 mt-4 pt-4 border-t border-gray-700">
          <button
            onClick={onClose}
            disabled={isLoading}
            className="flex-1 bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>

          {parsedPlayers.length === 0 ? (
            <button
              onClick={handleParse}
              disabled={!csvText.trim() || isLoading}
              className="flex-1 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
            >
              Preview
            </button>
          ) : (
            <>
              <button
                onClick={() => {
                  onCSVChange('');
                  // Re-parse with empty string to clear
                }}
                disabled={isLoading}
                className="flex-1 bg-gray-600 hover:bg-gray-500 text-white px-4 py-2 rounded disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Edit
              </button>
              <button
                onClick={handleConfirm}
                disabled={isLoading}
                className="flex-1 bg-green-600 hover:bg-green-500 text-white px-4 py-2 rounded font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Adding...' : `Add ${parsedPlayers.length} Players`}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
