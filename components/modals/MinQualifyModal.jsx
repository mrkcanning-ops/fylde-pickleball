'use client';

/**
 * MinQualifyModal Component
 * Modal for editing minimum games required to qualify
 * 
 * Props:
 *   - isOpen: boolean
 *   - onClose: function
 *   - onSave: function - callback with (value) when saving
 *   - currentValue: number
 *   - inputValue: string - current input value
 *   - onInputChange: function - callback when input changes
 *   - isLoading: boolean
 */
export function MinQualifyModal({
  isOpen,
  onClose,
  onSave,
  currentValue,
  inputValue,
  onInputChange,
  isLoading = false,
}) {
  if (!isOpen) return null;

  const handleSave = () => {
    const value = parseInt(inputValue, 10);
    if (!Number.isNaN(value) && value >= 0) {
      onSave(value);
    } else {
      alert('Please enter a valid number');
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSave();
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50">
      <div className="bg-gray-900 rounded-xl shadow-xl p-6 w-96 border border-gray-700">
        <h2 className="text-lg font-bold text-yellow-400 mb-4">⚙️ Edit Min Qualify Games</h2>
        <p className="text-gray-300 mb-4 text-sm">Set the minimum number of games a player must complete to qualify for ranked standings.</p>

        <div className="mb-4">
          <label className="text-gray-300 text-sm block mb-2">Minimum Games</label>
          <input
            type="number"
            value={inputValue}
            onChange={(e) => onInputChange(e.target.value)}
            onKeyPress={handleKeyPress}
            min="0"
            className="w-full px-4 py-2 rounded bg-gray-800 text-white border border-gray-600 focus:outline-none focus:border-yellow-400"
            disabled={isLoading}
            autoFocus
          />
          <p className="text-xs text-gray-400 mt-1">Current: {currentValue}</p>
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
            onClick={handleSave}
            disabled={isLoading}
            className="flex-1 bg-yellow-600 hover:bg-yellow-500 text-white py-2 rounded font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}
