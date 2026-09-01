/**
 * Toast Component - Individual notification display
 * Renders a single toast with type-specific styling
 */
export function Toast({ id, message, type = 'info', onClose }) {
  const baseClasses =
    'flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg font-medium max-w-sm animate-in slide-in-from-right-5 duration-300';

  const typeClasses = {
    success: 'bg-green-600 text-white border border-green-700',
    error: 'bg-red-600 text-white border border-red-700',
    info: 'bg-blue-600 text-white border border-blue-700',
    warning: 'bg-yellow-500 text-gray-900 border border-yellow-600',
  };

  const iconTypes = {
    success: '✓',
    error: '✕',
    info: 'ℹ',
    warning: '⚠',
  };

  return (
    <div className={`${baseClasses} ${typeClasses[type] || typeClasses.info}`}>
      <span className="text-lg font-bold">{iconTypes[type]}</span>
      <span className="flex-1">{message}</span>
      <button
        onClick={() => onClose(id)}
        className="ml-2 text-lg leading-none hover:opacity-70 transition-opacity"
        aria-label="Close notification"
      >
        ✕
      </button>
    </div>
  );
}
