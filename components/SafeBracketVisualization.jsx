'use client';

import { BracketVisualization } from '@/components';

/**
 * SafeBracketVisualization
 * Wraps BracketVisualization with error handling to prevent crashes from malformed bracket data
 */
export default function SafeBracketVisualization({
  bracket = null,
  onSelectMatch = null,
  onRecordResult = null,
}) {
  try {
    // Validate bracket structure
    if (!bracket) {
      return (
        <div className="bg-gray-800 rounded-lg p-6 text-center text-gray-400">
          No active tournament bracket
        </div>
      );
    }

    // Ensure bracket has minimum required fields
    if (!bracket.format || !bracket.gameType) {
      return (
        <div className="bg-gray-800 rounded-lg p-6 text-center text-gray-400">
          Tournament bracket is corrupted. Please start a new tournament.
        </div>
      );
    }

    return (
      <BracketVisualization
        bracket={bracket}
        onSelectMatch={onSelectMatch}
        onRecordResult={onRecordResult}
      />
    );
  } catch (error) {
    console.error('Error rendering bracket:', error);
    return (
      <div className="bg-red-900 bg-opacity-30 border border-red-500 rounded-lg p-6 text-center">
        <div className="text-red-400 font-bold mb-2">⚠️ Error Displaying Tournament</div>
        <div className="text-red-300 text-sm mb-4">{error?.message || 'Unknown error occurred'}</div>
        <button
          onClick={() => {
            // Clear corrupted tournament data
            try {
              localStorage.removeItem('current_tournament_bracket');
              localStorage.removeItem('tournament_format');
              localStorage.removeItem('tournament_game_type');
              localStorage.removeItem('tournament_courts_count');
              localStorage.removeItem('tournament_doubles_config');
              window.location.reload();
            } catch (e) {
              console.error('Failed to clear tournament data:', e);
            }
          }}
          className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded text-sm font-semibold"
        >
          Clear Tournament & Reload
        </button>
      </div>
    );
  }
}
