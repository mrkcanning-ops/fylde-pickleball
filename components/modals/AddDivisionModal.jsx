'use client';

/**
 * AddDivisionModal Component
 * Reusable modal for adding a new division
 * 
 * Props:
 *   - isOpen: boolean
 *   - onClose: function
 *   - onSubmit: function - callback with (name) when submitting
 *   - divisionName: string
 *   - onNameChange: function
 *   - isLoading: boolean
 */
export function AddDivisionModal({
  isOpen,
  onClose,
  onSubmit,
  divisionName,
  onNameChange,
  isLoading = false,
}) {
  if (!isOpen) return null;

  const handleSubmit = () => {
    if (!divisionName.trim()) {
      alert('Please enter a division name');
      return;
    }
    onSubmit(divisionName);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSubmit();
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50">
      <div className="bg-gray-900 rounded-xl shadow-xl p-6 w-96 border border-gray-700">
        <h2 className="text-xl font-bold text-green-400 mb-4">➕ Add Division</h2>

        <div className="mb-4">
          <label className="text-gray-300 text-sm block mb-2">Division Name</label>
          <input
            type="text"
            value={divisionName}
            onChange={(e) => onNameChange(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="e.g., Beginners, Intermediate, Advanced"
            className="w-full px-4 py-2 rounded bg-gray-800 text-white border border-gray-600 focus:outline-none focus:border-green-400"
            autoFocus
            disabled={isLoading}
          />
        </div>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            disabled={isLoading}
            className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-2 rounded disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={isLoading}
            className="flex-1 bg-green-600 hover:bg-green-500 text-white py-2 rounded font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Adding...' : 'Add Division'}
          </button>
        </div>
      </div>
    </div>
  );
}
