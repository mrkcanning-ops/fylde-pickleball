import { useState, useCallback } from 'react';
import { getLSJson, setLSJson } from '@/lib/ls';
import {
  generateSingleEliminationBracket,
  generateDoubleEliminationBracket,
  generateNextRound,
  recordBracketMatchResult,
  getBracketStats,
  getTournamentWinner,
} from '@/lib/matchGeneratorTournament';

/**
 * useTournamentLogic
 * 
 * Manages tournament bracket state, progression, and results
 * Handles both single and double elimination formats
 */
export function useTournamentLogic() {
  // Tournament state
  const [currentBracket, setCurrentBracket] = useState(null);
  const [tournamentFormat, setTournamentFormat] = useState('single-elimination');
  const [showTournamentModal, setShowTournamentModal] = useState(false);
  const [selectedMatch, setSelectedMatch] = useState(null);
  const [showMatchResultModal, setShowMatchResultModal] = useState(false);

  /**
   * Initialize a new tournament bracket
   */
  const initializeTournament = useCallback(
    (players, format = 'single-elimination') => {
      if (!Array.isArray(players) || players.length < 2) {
        return { error: 'Minimum 2 active players required' };
      }

      const result =
        format === 'double-elimination'
          ? generateDoubleEliminationBracket(players)
          : generateSingleEliminationBracket(players);

      if (result.error) {
        return { error: result.error };
      }

      const bracket = result.bracket;
      setTournamentFormat(format);
      setCurrentBracket(bracket);

      // Persist to localStorage
      try {
        setLSJson('current_tournament_bracket', bracket);
        setLSJson('tournament_format', format);
      } catch (e) {
        console.warn('Failed to save tournament bracket:', e);
      }

      return { error: null, bracket };
    },
    []
  );

  /**
   * Load tournament from localStorage
   */
  const loadTournament = useCallback(() => {
    try {
      const bracket = getLSJson('current_tournament_bracket', null);
      const format = getLSJson('tournament_format', 'single-elimination');
      if (bracket) {
        setCurrentBracket(bracket);
        setTournamentFormat(format);
        return bracket;
      }
    } catch (e) {
      console.warn('Failed to load tournament:', e);
    }
    return null;
  }, []);

  /**
   * Record match result and advance winner
   */
  const recordMatchResult = useCallback(
    (matchId, winner) => {
      if (!currentBracket) {
        return { error: 'No active tournament' };
      }

      const result = recordBracketMatchResult(currentBracket, matchId, winner);
      if (result.error || !result.updated) {
        return result;
      }

      // Update state
      setCurrentBracket({ ...currentBracket });

      // Persist
      try {
        setLSJson('current_tournament_bracket', currentBracket);
      } catch (e) {
        console.warn('Failed to save match result:', e);
      }

      return { error: null, match: result.match };
    },
    [currentBracket]
  );

  /**
   * Generate next round after current round completes
   */
  const advanceToNextRound = useCallback(() => {
    if (!currentBracket || currentBracket.rounds.length === 0) {
      return { error: 'No active bracket' };
    }

    const lastRound = currentBracket.rounds[currentBracket.rounds.length - 1];
    const result = generateNextRound(currentBracket, lastRound);

    if (result.error || !result.matchups) {
      return result;
    }

    // Add new round to bracket
    const newRound = {
      roundNumber: currentBracket.rounds.length + 1,
      stageName: `Round ${currentBracket.rounds.length + 1}`,
      matchups: result.matchups,
    };

    const updated = {
      ...currentBracket,
      rounds: [...currentBracket.rounds, newRound],
    };

    setCurrentBracket(updated);

    // Persist
    try {
      setLSJson('current_tournament_bracket', updated);
    } catch (e) {
      console.warn('Failed to save next round:', e);
    }

    return { error: null, round: newRound };
  }, [currentBracket]);

  /**
   * Get bracket statistics
   */
  const getStats = useCallback(() => {
    if (!currentBracket) return null;
    return getBracketStats(currentBracket);
  }, [currentBracket]);

  /**
   * Get tournament winner
   */
  const getWinner = useCallback(() => {
    if (!currentBracket) return null;
    return getTournamentWinner(currentBracket);
  }, [currentBracket]);

  /**
   * Reset tournament
   */
  const resetTournament = useCallback(() => {
    setCurrentBracket(null);
    setTournamentFormat('single-elimination');
    try {
      localStorage.removeItem('current_tournament_bracket');
      localStorage.removeItem('tournament_format');
    } catch (e) {
      console.warn('Failed to reset tournament:', e);
    }
  }, []);

  /**
   * Get all pending matches
   */
  const getPendingMatches = useCallback(() => {
    if (!currentBracket) return [];
    return currentBracket.rounds
      .flatMap((r) => r.matchups || [])
      .filter((m) => !m.played);
  }, [currentBracket]);

  /**
   * Get all completed matches
   */
  const getCompletedMatches = useCallback(() => {
    if (!currentBracket) return [];
    return currentBracket.rounds
      .flatMap((r) => r.matchups || [])
      .filter((m) => m.played);
  }, [currentBracket]);

  return {
    // State
    currentBracket,
    tournamentFormat,
    showTournamentModal,
    setShowTournamentModal,
    selectedMatch,
    setSelectedMatch,
    showMatchResultModal,
    setShowMatchResultModal,

    // Methods
    initializeTournament,
    loadTournament,
    recordMatchResult,
    advanceToNextRound,
    resetTournament,
    getStats,
    getWinner,
    getPendingMatches,
    getCompletedMatches,
  };
}
