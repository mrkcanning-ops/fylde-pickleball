'use client';

/**
 * BulkAddDivisionsModal Component
 * Allows adding multiple divisions at once
 * 
 * Props:
 *   - isOpen: boolean
 *   - onClose: function
 *   - csvText: string
 *   - onCSVChange: function
 *   - parsedDivisions: array
 *   - onParse: function
 *   - onConfirm: function
 *   - isLoading: boolean
 */
export function BulkAddDivisionsModal({
  isOpen,
  onClose,
  csvText,
  onCSVChange,
  parsedDivisions,
  onParse,
  onConfirm,
  isLoading = false,
}) {
  if (!isOpen) return null;

  const handleParse = () => {
    onParse(csvText);
  };

  const handleConfirm = () => {
    if (parsedDivisions.length === 0) {
      alert('No divisions to add');
      return;
    }
    onConfirm();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50">
      <div className="bg-gray-900 rounded-xl shadow-xl p-6 w-full max-w-2xl max-h-96 border border-gray-700 flex flex-col">
        <h2 className="text-xl font-bold text-green-400 mb-4">➕ Bulk Add Divisions</h2>

        <div className="flex-1 flex flex-col gap-4 overflow-auto">
          {/* Text Input */}
          <div>
            <label className="text-gray-300 text-sm block mb-2">
              Paste division names (one per line):
            </label>
            <textarea
              value={csvText}
              onChange={(e) => onCSVChange(e.target.value)}
              placeholder="Beginners&#10;Intermediate&#10;Advanced"
              className="w-full px-4 py-3 rounded bg-gray-800 text-white border border-gray-600 focus:outline-none focus:border-green-400 font-mono text-sm resize-none"
              rows={5}
              disabled={parsedDivisions.length > 0 || isLoading}
            />
          </div>

          {/* Parsed Divisions Preview */}
          {parsedDivisions.length > 0 && (
            <div>
              <label className="text-gray-300 text-sm block mb-2">
                Preview ({parsedDivisions.length} divisions):
              </label>
              <div className="bg-gray-800 rounded p-3 max-h-40 overflow-y-auto border border-gray-600">
                {parsedDivisions.map((d) => (
                  <div key={d.id} className="text-sm text-gray-200 py-1 font-semibold">
                    {d.name}
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

          {parsedDivisions.length === 0 ? (
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
                onClick={() => onCSVChange('')}
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
                {isLoading ? 'Adding...' : `Add ${parsedDivisions.length} Divisions`}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
