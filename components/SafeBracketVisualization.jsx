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
  onAdvanceRound = null,
  onTransitionToKnockout = null,
  onTournamentComplete = null,
  tournamentCompleted = false,
}) {
  console.log('[SafeBracketVisualization] Rendering with bracket:', bracket ? 'EXISTS' : 'NULL', bracket?.format, bracket?.gameType);
  
  try {
    // Validate bracket structure
    if (!bracket) {
      console.log('[SafeBracketVisualization] No bracket provided');
      return (
        <div className="bg-gray-800 rounded-lg p-6 text-center text-gray-400">
          No active tournament bracket
        </div>
      );
    }

    console.log('[SafeBracketVisualization] Bracket exists, checking format/gameType');
    // Ensure bracket has minimum required fields
    if (!bracket.format || !bracket.gameType) {
      console.log('[SafeBracketVisualization] Missing format or gameType');
      return (
        <div className="bg-gray-800 rounded-lg p-6 text-center text-gray-400">
          Tournament bracket is corrupted. Please start a new tournament.
        </div>
      );
    }

    console.log('[SafeBracketVisualization] About to render BracketVisualization');
    return (
      <BracketVisualization
        bracket={bracket}
        onSelectMatch={onSelectMatch}
        onRecordResult={onRecordResult}
        onAdvanceRound={onAdvanceRound}
        onTransitionToKnockout={onTransitionToKnockout}
        onTournamentComplete={onTournamentComplete}
        tournamentCompleted={tournamentCompleted}
      />
    );
  } catch (error) {
    console.error('[SafeBracketVisualization] CAUGHT ERROR:', error?.message, error?.stack);
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
