'use client';

/**
 * ConfirmRemoveDivisionModal Component
 * Confirmation modal for removing a division
 * 
 * Props:
 *   - isOpen: boolean
 *   - onClose: function
 *   - onConfirm: function - callback when deletion is confirmed
 */
export function ConfirmRemoveDivisionModal({
  isOpen,
  onClose,
  onConfirm,
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50">
      <div className="bg-gray-900 rounded-xl shadow-xl p-6 w-96 border border-gray-700">
        <h2 className="text-lg font-bold text-red-400 mb-4 text-center">Confirm Deletion</h2>
        <p className="text-gray-300 mb-4 text-center">Are you sure you want to permanently delete the selected division and all its players and matches? This action cannot be undone.</p>

        <div className="flex justify-between mt-5">
          <button
            onClick={onClose}
            className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded text-sm"
          >
            Cancel
          </button>

          <button
            onClick={onConfirm}
            className="bg-red-600 hover:bg-red-500 text-white px-4 py-2 rounded text-sm font-semibold"
          >
            Permanently Delete
          </button>
        </div>
      </div>
    </div>
  );
}
