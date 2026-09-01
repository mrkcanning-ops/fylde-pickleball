'use client';

/**
 * AddPlayerModal Component
 * Reusable modal for adding a new player
 * 
 * Props:
 *   - isOpen: boolean - whether modal is shown
 *   - onClose: function - callback when closing modal
 *   - onSubmit: function - callback with (name, gender) when submitting
 *   - playerName: string - current player name input
 *   - onNameChange: function - callback when name changes
 *   - playerGender: string - 'male', 'female', or null
 *   - onGenderChange: function - callback when gender changes
 *   - isLoading: boolean - if true, disable submit button
 */
export function AddPlayerModal({
  isOpen,
  onClose,
  onSubmit,
  playerName,
  onNameChange,
  playerGender,
  onGenderChange,
  isLoading = false,
}) {
  if (!isOpen) return null;

  const handleSubmit = () => {
    if (!playerName.trim()) {
      alert('Please enter a player name');
      return;
    }
    onSubmit(playerName, playerGender);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSubmit();
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50">
      <div className="bg-gray-900 rounded-xl shadow-xl p-6 w-96 border border-gray-700">
        <h2 className="text-xl font-bold text-blue-400 mb-4">👤 Add Player</h2>

        {/* Player Name Input */}
        <div className="mb-4">
          <label className="text-gray-300 text-sm block mb-2">Player Name</label>
          <input
            type="text"
            value={playerName}
            onChange={(e) => onNameChange(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Enter player name"
            className="w-full px-4 py-2 rounded bg-gray-800 text-white border border-gray-600 focus:outline-none focus:border-blue-400"
            autoFocus
            disabled={isLoading}
          />
        </div>

        {/* Gender Selection */}
        <div className="mb-6">
          <label className="text-gray-300 text-sm block mb-2">Gender (Optional)</label>
          <div className="flex gap-3">
            <button
              onClick={() => onGenderChange(playerGender === 'male' ? null : 'male')}
              disabled={isLoading}
              className={`flex-1 py-2 px-4 rounded font-semibold transition ${
                playerGender === 'male'
                  ? 'bg-blue-500 text-white shadow-md'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              ♂ Male
            </button>
            <button
              onClick={() => onGenderChange(playerGender === 'female' ? null : 'female')}
              disabled={isLoading}
              className={`flex-1 py-2 px-4 rounded font-semibold transition ${
                playerGender === 'female'
                  ? 'bg-pink-500 text-white shadow-md'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              ♀ Female
            </button>
          </div>
        </div>

        {/* Buttons */}
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
            className="flex-1 bg-blue-600 hover:bg-blue-500 text-white py-2 rounded font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Adding...' : 'Add Player'}
          </button>
        </div>
      </div>
    </div>
  );
}
