'use client';

/**
 * BulkRemoveDivisionsModal Component
 * Allows selecting and removing multiple divisions at once
 * 
 * Props:
 *   - isOpen: boolean
 *   - onClose: function
 *   - availableDivisions: array
 *   - selectedDivisions: array
 *   - onToggleDivision: function
 *   - onConfirm: function
 *   - isLoading: boolean
 */
export function BulkRemoveDivisionsModal({
  isOpen,
  onClose,
  availableDivisions = [],
  selectedDivisions = [],
  onToggleDivision,
  onConfirm,
  isLoading = false,
}) {
  if (!isOpen) return null;

  const handleConfirm = () => {
    if (selectedDivisions.length === 0) {
      alert('Please select at least one division to remove');
      return;
    }

    // Prevent removing all divisions
    if (selectedDivisions.length >= availableDivisions.length) {
      alert('You must keep at least one division');
      return;
    }

    const confirmed = window.confirm(
      `Remove ${selectedDivisions.length} division(s) and all associated players and matches? This action cannot be undone.`
    );
    if (confirmed) {
      onConfirm();
    }
  };

  const selectedSet = new Set(selectedDivisions.map((d) => String(d.id || d)));

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50">
      <div className="bg-gray-900 rounded-xl shadow-xl p-6 w-full max-w-2xl max-h-96 border border-gray-700 flex flex-col">
        <h2 className="text-xl font-bold text-red-400 mb-4">🗑️ Bulk Remove Divisions</h2>

        {availableDivisions.length === 0 ? (
          <div className="flex-1 flex items-center justify-center text-gray-400">
            <p>No divisions available to remove</p>
          </div>
        ) : availableDivisions.length === 1 ? (
          <div className="flex-1 flex items-center justify-center text-gray-400">
            <p>Cannot remove the last division</p>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto mb-4 bg-gray-800 rounded border border-gray-600">
              <div className="p-4 space-y-2">
                {availableDivisions.map((division) => {
                  const isSelected = selectedSet.has(String(division.id));
                  return (
                    <div
                      key={division.id}
                      className={`flex items-center gap-3 p-3 rounded cursor-pointer transition ${
                        isSelected
                          ? 'bg-red-900 bg-opacity-40 border border-red-500'
                          : 'bg-gray-700 hover:bg-gray-600 border border-gray-600'
                      }`}
                      onClick={() => onToggleDivision(division)}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => onToggleDivision(division)}
                        className="w-5 h-5 cursor-pointer"
                      />
                      <div className="flex-1">
                        <p className="font-semibold text-white">{division.name}</p>
                        <p className="text-xs text-gray-400">ID: {division.id}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <p className="text-sm text-gray-400 mb-4">
              {selectedDivisions.length} of {availableDivisions.length} divisions selected
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

          {availableDivisions.length > 1 && (
            <button
              onClick={handleConfirm}
              disabled={selectedDivisions.length === 0 || isLoading}
              className="flex-1 bg-red-600 hover:bg-red-500 text-white px-4 py-2 rounded font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Removing...' : `Remove ${selectedDivisions.length}`}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
