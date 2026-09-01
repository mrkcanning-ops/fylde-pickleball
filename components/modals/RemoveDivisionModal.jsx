'use client';

/**
 * RemoveDivisionModal Component
 * Modal for selecting a division to remove
 * 
 * Props:
 *   - isOpen: boolean
 *   - onClose: function
 *   - divisions: array - list of divisions
 *   - selectedId: string - currently selected division id
 *   - onSelect: function - callback when division is selected
 *   - onConfirm: function - callback when delete is confirmed
 */
export function RemoveDivisionModal({
  isOpen,
  onClose,
  divisions,
  selectedId,
  onSelect,
  onConfirm,
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50">
      <div className="bg-gray-900 rounded-xl shadow-xl p-6 w-96 border border-gray-700">
        <h2 className="text-lg font-bold text-red-400 mb-4 text-center">Select Division to Remove</h2>
        <p className="text-gray-300 mb-4 text-center text-sm">Choose which division to delete. This will remove the division from the local UI.</p>

        <div className="mb-4 max-h-48 overflow-auto">
          {divisions.map((d) => (
            <label key={d.id} className="flex items-center gap-2 mb-2">
              <input
                type="radio"
                name="removeDivision"
                value={d.id}
                checked={selectedId === d.id}
                onChange={() => onSelect(d.id)}
                className="accent-red-500"
              />
              <span className="text-gray-200">{d.name}</span>
            </label>
          ))}
        </div>

        <div className="flex justify-between mt-5">
          <button
            onClick={onClose}
            className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded text-sm"
          >
            Cancel
          </button>

          <button
            onClick={onConfirm}
            className="bg-red-600 hover:bg-red-500 text-white px-4 py-2 rounded text-sm"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}
