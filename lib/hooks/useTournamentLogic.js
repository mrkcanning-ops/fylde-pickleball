import { useState, useCallback, useEffect } from 'react';
import { getLSJson, setLSJson } from '@/lib/ls';
import {
  generateSingleEliminationBracket,
  generateDoubleEliminationBracket,
  generateGroupKnockoutBracket,
  calculateGroupStandings,
  generateKnockoutFromGroups,
  assignCourtsToRounds,
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
  const [tournamentGameType, setTournamentGameType] = useState('singles');
  const [showTournamentModal, setShowTournamentModal] = useState(false);
  const [selectedMatch, setSelectedMatch] = useState(null);
  const [showMatchResultModal, setShowMatchResultModal] = useState(false);

  /**
   * Load tournament from localStorage on mount
   */
  useEffect(() => {
    const clearTournamentStorage = () => {
      try {
        localStorage.removeItem('current_tournament_bracket');
        localStorage.removeItem('tournament_format');
        localStorage.removeItem('tournament_game_type');
        localStorage.removeItem('tournament_courts_count');
        localStorage.removeItem('tournament_doubles_config');
      } catch (e) {
        console.warn('Failed to clear tournament storage:', e);
      }
    };

    try {
      const bracket = getLSJson('current_tournament_bracket', null);
      const format = getLSJson('tournament_format', 'single-elimination');
      const gameType = getLSJson('tournament_game_type', 'singles');
      
      if (bracket && typeof bracket === 'object') {
        try {
          // Validate and sanitize bracket data
          // Remove any matchups with invalid team data
          if (bracket.rounds && Array.isArray(bracket.rounds)) {
            bracket.rounds = bracket.rounds.map(round => ({
              ...round,
              matchups: (round.matchups || []).filter(match => 
                match && 
                match.team1 && 
                Array.isArray(match.team1) &&
                match.team1.length > 0 &&
                (match.team2 || match.team1) // Keep only valid matchups
              )
            }));
          }
          
          if (bracket.knockoutRounds && Array.isArray(bracket.knockoutRounds)) {
            bracket.knockoutRounds = bracket.knockoutRounds.map(round => ({
              ...round,
              matchups: (round.matchups || []).filter(match =>
                match && 
                match.team1 && 
                Array.isArray(match.team1) &&
                match.team1.length > 0 &&
                (match.team2 || match.team1)
              )
            }));
          }
          
          setCurrentBracket(bracket);
          setTournamentFormat(format);
          setTournamentGameType(gameType);
        } catch (validationErr) {
          // If validation fails, clear corrupted data
          console.warn('Tournament bracket validation failed, clearing corrupted data:', validationErr);
          clearTournamentStorage();
        }
      }
    } catch (e) {
      // Any error during loading, silently clear and continue
      console.warn('Failed to load tournament:', e);
      clearTournamentStorage();
    }
  }, []);

  /**
   * Initialize a new tournament bracket
   */
  const initializeTournament = useCallback(
    (players, format = 'single-elimination', gameType = 'singles', courtsCount = 2, doublesConfig = {}) => {
      if (!Array.isArray(players) || players.length < 2) {
        return { error: 'Minimum 2 active players required' };
      }

      let result;
      
      if (format === 'group-knockout') {
        result = generateGroupKnockoutBracket(players, gameType, doublesConfig);
      } else if (format === 'double-elimination') {
        result = generateDoubleEliminationBracket(players, gameType, doublesConfig);
      } else {
        result = generateSingleEliminationBracket(players, gameType, doublesConfig);
      }

      if (result.error) {
        return { error: result.error };
      }

      const bracket = result.bracket;
      // Add courts count and doubles config to bracket
      bracket.courtsCount = courtsCount;
      bracket.doublesPartnerMode = doublesConfig.doublesPartnerMode;
      bracket.playerPartners = doublesConfig.playerPartners;
      const bracketWithCourts = assignCourtsToRounds(bracket, courtsCount);
      
      setTournamentFormat(format);
      setTournamentGameType(gameType);
      setCurrentBracket(bracketWithCourts);

      // Persist to localStorage (save bracketWithCourts to preserve court assignments)
      try {
        setLSJson('current_tournament_bracket', bracketWithCourts);
        setLSJson('tournament_format', format);
        setLSJson('tournament_game_type', gameType);
        setLSJson('tournament_courts_count', courtsCount);
        if (doublesConfig.doublesPartnerMode) {
          setLSJson('tournament_doubles_config', doublesConfig);
        }
      } catch (e) {
        console.warn('Failed to save tournament bracket:', e);
      }

      return { error: null, bracket };
    },
    []
  );

  /**
   * Load tournament from localStorage (manual load, mostly for dev/testing)
   */
  const loadTournament = useCallback(() => {
    try {
      const bracket = getLSJson('current_tournament_bracket', null);
      const format = getLSJson('tournament_format', 'single-elimination');
      const gameType = getLSJson('tournament_game_type', 'singles');
      
      if (bracket && typeof bracket === 'object') {
        // Validate and sanitize bracket data
        // Remove any matchups with invalid team data
        if (bracket.rounds && Array.isArray(bracket.rounds)) {
          bracket.rounds = bracket.rounds.map(round => ({
            ...round,
            matchups: (round.matchups || []).filter(match => 
              match && 
              match.team1 && 
              Array.isArray(match.team1) &&
              match.team1.length > 0 &&
              (match.team2 || match.team1) // Keep only valid matchups
            )
          }));
        }
        
        if (bracket.knockoutRounds && Array.isArray(bracket.knockoutRounds)) {
          bracket.knockoutRounds = bracket.knockoutRounds.map(round => ({
            ...round,
            matchups: (round.matchups || []).filter(match =>
              match && 
              match.team1 && 
              Array.isArray(match.team1) &&
              match.team1.length > 0 &&
              (match.team2 || match.team1)
            )
          }));
        }
        
        setCurrentBracket(bracket);
        setTournamentFormat(format);
        setTournamentGameType(gameType);
        return bracket;
      }
    } catch (e) {
      console.warn('Failed to load tournament:', e);
      // Clear corrupted tournament data
      try {
        localStorage.removeItem('current_tournament_bracket');
        localStorage.removeItem('tournament_format');
        localStorage.removeItem('tournament_game_type');
        localStorage.removeItem('tournament_courts_count');
        localStorage.removeItem('tournament_doubles_config');
      } catch (clearErr) {
        console.warn('Failed to clear corrupted tournament:', clearErr);
      }
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
   * Optionally accepts an updated bracket (used when matches have been marked as played)
   */
  const advanceToNextRound = useCallback((bracketToUse = null) => {
    const bracket = bracketToUse || currentBracket;
    
    if (!bracket || !bracket.rounds || bracket.rounds.length === 0) {
      console.warn('[advanceToNextRound] Invalid bracket:', bracket);
      return { error: 'No active bracket' };
    }

    // Special handling for group-knockout format
    if (bracket.format === 'group-knockout' && bracket.stage === 'group') {
      // Generate knockout bracket from group standings
      const knockoutRound = generateKnockoutFromGroups(bracket);
      if (!knockoutRound) {
        return { error: 'Failed to generate knockout bracket' };
      }

      const updated = {
        ...bracket,
        stage: 'knockout',
        knockoutRounds: [knockoutRound],
      };

      setCurrentBracket(updated);

      // Persist
      try {
        setLSJson('current_tournament_bracket', updated);
      } catch (e) {
        console.warn('Failed to save knockout bracket:', e);
      }

      return { error: null, round: knockoutRound };
    }

    // Standard elimination bracket progression
    const lastRound = bracket.rounds[bracket.rounds.length - 1];
    const result = generateNextRound(bracket, lastRound);

    if (result.error || !result.matchups) {
      return result;
    }

    // Add new round to bracket
    const newRound = {
      roundNumber: bracket.rounds.length + 1,
      stageName: `Round ${bracket.rounds.length + 1}`,
      matchups: result.matchups,
    };

    const updated = {
      ...bracket,
      rounds: [...bracket.rounds, newRound],
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
    try {
      if (!currentBracket || !currentBracket.rounds) return [];
      
      let allMatches = currentBracket.rounds
        .flatMap((r) => r.matchups || [])
        .filter((m) => !m.played && m.team2); // Exclude byes (team2 = null)
      
      // For group-knockout format, also include knockout round matches when in knockout stage
      if (currentBracket.format === 'group-knockout' && currentBracket.knockoutRounds) {
        const knockoutMatches = currentBracket.knockoutRounds
          .flatMap((r) => r.matchups || [])
          .filter((m) => !m.played && m.team2);
        allMatches = [...allMatches, ...knockoutMatches];
      }
      
      return allMatches;
    } catch (e) {
      console.warn('Error getting pending matches, returning empty:', e);
      return [];
    }
  }, [currentBracket]);

  /**
   * Get all completed matches
   */
  const getCompletedMatches = useCallback(() => {
    try {
      if (!currentBracket || !currentBracket.rounds) return [];
      return currentBracket.rounds
        .flatMap((r) => r.matchups || [])
        .filter((m) => m.played);
    } catch (e) {
      console.warn('Error getting completed matches, returning empty:', e);
      return [];
    }
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
