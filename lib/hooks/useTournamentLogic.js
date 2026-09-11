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
  generateNextKnockoutRound,
  recordBracketMatchResult,
  getBracketStats,
  getTournamentWinner,
  isTournamentComplete,
  getActiveKnockoutRound,
} from '@/lib/matchGeneratorTournament';

function sanitizeStoredBracket(value) {
  if (!value || typeof value !== 'object' || !value.format || !value.gameType) {
    return null;
  }

  const bracket = JSON.parse(JSON.stringify(value));
  const sanitizeRounds = rounds => (Array.isArray(rounds) ? rounds.map(round => ({
    ...round,
    matchups: Array.isArray(round.matchups) ? round.matchups.filter(match =>
      match && Array.isArray(match.team1) && match.team1.length > 0 &&
      match.team1.every(player => player && player.id) &&
      (!match.team2 || (
        Array.isArray(match.team2) &&
        match.team2.length > 0 &&
        match.team2.every(player => player && player.id)
      ))
    ) : [],
  })) : []);

  bracket.rounds = sanitizeRounds(bracket.rounds);
  bracket.knockoutRounds = sanitizeRounds(bracket.knockoutRounds);
  if (bracket.rounds.length === 0 && bracket.knockoutRounds.length === 0) return null;
  return bracket;
}

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
          const sanitizedBracket = sanitizeStoredBracket(bracket);
          if (!sanitizedBracket) throw new Error('Stored tournament bracket is invalid');
          setCurrentBracket(sanitizedBracket);
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

      return { error: null, bracket: bracketWithCourts };
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
        const sanitizedBracket = sanitizeStoredBracket(bracket);
        if (!sanitizedBracket) return null;
        setCurrentBracket(sanitizedBracket);
        setTournamentFormat(format);
        setTournamentGameType(gameType);
        return sanitizedBracket;
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

      const updatedBracket = JSON.parse(JSON.stringify(currentBracket));
      const result = recordBracketMatchResult(updatedBracket, matchId, winner);
      if (result.error || !result.updated) {
        return result;
      }

      // Update state
      setCurrentBracket(updatedBracket);

      // Persist
      try {
        setLSJson('current_tournament_bracket', updatedBracket);
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
    console.log('[advanceToNextRound] Called with bracketToUse:', bracketToUse ? 'provided' : 'null, will use currentBracket');
    
    const bracket = bracketToUse || currentBracket;
    
    if (!bracket || !bracket.rounds || bracket.rounds.length === 0) {
      console.error('[advanceToNextRound] Invalid bracket:', bracket);
      return { error: 'No active bracket' };
    }

    console.log('[advanceToNextRound] Using bracket format:', bracket.format, 'stage:', bracket.stage);
    console.log('[advanceToNextRound] Rounds count:', bracket.rounds.length);

    // Special handling for group-knockout format
    if (bracket.format === 'group-knockout' && bracket.stage === 'group') {
      // Find first round with unplayed matches
      console.log('[advanceToNextRound] Group-knockout format detected, checking group rounds');
      console.log('[advanceToNextRound] Total rounds:', bracket.rounds.length);
      
      // Log details of each round
      bracket.rounds.forEach((round, idx) => {
        const unplayedCount = round.matchups?.filter(m => !m.played).length || 0;
        console.log(`[advanceToNextRound] Round ${idx} (${round.stageName}): ${round.matchups?.length || 0} matchups, ${unplayedCount} unplayed`);
      });

      const currentRoundIdx = bracket.rounds.findIndex(round =>
        round.matchups?.some(match => !match.played)
      );

      console.log('[advanceToNextRound] currentRoundIdx:', currentRoundIdx);

      if (currentRoundIdx === -1) {
        // All group rounds are complete - but DON'T auto-transition
        // Wait for user to explicitly click "Advance to Knockout Stage" button
        console.log('[advanceToNextRound] All group rounds complete - waiting for user to advance to knockout');
        setCurrentBracket(bracket);
        try {
          setLSJson('current_tournament_bracket', bracket);
        } catch (e) {
          console.warn('Failed to save bracket:', e);
        }
        return { error: null };
      }

      // Current round with unplayed matches found
      // Generate next round based on the current (just-completed) group round
      const currentRound = bracket.rounds[currentRoundIdx];
      console.log('[advanceToNextRound] Found unplayed round at index:', currentRoundIdx, 'Round:', currentRound.stageName);

      // Update state with the bracket (which should have played matches marked from handleAdvanceRound)
      console.log('[advanceToNextRound] Updating state with bracket containing played matches');
      setCurrentBracket(bracket);

      // Persist to localStorage
      try {
        setLSJson('current_tournament_bracket', bracket);
      } catch (e) {
        console.warn('Failed to save group bracket:', e);
      }

      // For group stage, we don't need to generate - all rounds are pre-created
      // Just return success and let UI show the next round's unplayed matches
      console.log('[advanceToNextRound] Group stage has remaining rounds to play');
      return { error: null, round: currentRound, stage: 'group' };
    }

    // Standard elimination bracket progression
    console.log('[advanceToNextRound] Processing standard bracket progression');
    
    // Determine which rounds array to use based on stage
    const roundsArray = bracket.stage === 'knockout' ? bracket.knockoutRounds : bracket.rounds;
    const lastRound = bracket.stage === 'knockout'
      ? getActiveKnockoutRound(roundsArray || [])
      : roundsArray?.[roundsArray.length - 1];
    if (!lastRound) {
      return { error: 'No active round' };
    }
    console.log('[advanceToNextRound] Last round:', lastRound.stageName);
    console.log('[advanceToNextRound] Last round matchups:', lastRound.matchups.length);
    
    // Check if this is the final round (1 match) and if it's been played
    if (bracket.stage === 'knockout' && isTournamentComplete(bracket)) {
      console.log('[advanceToNextRound] Tournament complete! Final match has been played.');
      return { error: null, round: lastRound, stage: 'complete' };
    }

    const result = bracket.stage === 'knockout'
      ? generateNextKnockoutRound(bracket.knockoutRounds, bracket.knockoutRounds.indexOf(lastRound))
      : generateNextRound(bracket, lastRound);

    if (result.error || !result.matchups && bracket.stage !== 'knockout' || !result.rounds && bracket.stage === 'knockout') {
      console.error('[advanceToNextRound] generateNextRound/Knockout failed:', result.error);
      return result;
    }

    console.log('[advanceToNextRound] generateNextRound succeeded, matchups count:', result.matchups?.length || result.rounds?.length);

    // Handle knockout rounds (may add multiple rounds)
    if (bracket.stage === 'knockout' && result.rounds && result.rounds.length > 0) {
      const updated = {
        ...bracket,
        knockoutRounds: [...bracket.knockoutRounds, ...result.rounds],
      };

      console.log('[advanceToNextRound] Adding', result.rounds.length, 'knockout rounds');
      setCurrentBracket(updated);

      // Persist
      try {
        setLSJson('current_tournament_bracket', updated);
        console.log('[advanceToNextRound] Knockout bracket persisted to localStorage');
      } catch (e) {
        console.warn('[advanceToNextRound] Failed to save knockout bracket:', e);
      }

      console.log('[advanceToNextRound] Complete, returning first new round');
      return { error: null, round: result.rounds[0] };
    }

    // Handle standard/group rounds (single round)
    const newRound = {
      roundNumber: (bracket.knockoutRounds || bracket.rounds).length + 1,
      stageName: bracket.stage === 'knockout' 
        ? `Knockout Round ${(bracket.knockoutRounds || bracket.rounds).length}` 
        : `Round ${bracket.rounds.length + 1}`,
      matchups: result.matchups,
    };

    console.log('[advanceToNextRound] Creating new round:', newRound.stageName);

    const updated = bracket.stage === 'knockout'
      ? {
          ...bracket,
          knockoutRounds: [...bracket.knockoutRounds, newRound],
        }
      : {
          ...bracket,
          rounds: [...bracket.rounds, newRound],
        };

    console.log('[advanceToNextRound] Updated bracket total rounds:', updated.rounds?.length || 0, 'knockout rounds:', updated.knockoutRounds?.length || 0);
    console.log('[advanceToNextRound] Calling setCurrentBracket');
    setCurrentBracket(updated);

    // Persist
    try {
      setLSJson('current_tournament_bracket', updated);
      console.log('[advanceToNextRound] Bracket persisted to localStorage');
    } catch (e) {
      console.warn('Failed to save next round:', e);
    }

    console.log('[advanceToNextRound] Complete, returning new round');
    return { error: null, round: newRound };
  }, [currentBracket]);

  /**
   * Explicitly transition from group stage to knockout stage
   * This is called when user clicks "Advance to Knockout Stage" button
   */
  const transitionToKnockout = useCallback(() => {
    if (!currentBracket) {
      console.error('[transitionToKnockout] No active bracket');
      return { error: 'No active bracket' };
    }

    if (currentBracket.stage !== 'group') {
      console.warn('[transitionToKnockout] Already in knockout stage');
      return { error: 'Already in knockout stage' };
    }

    // Verify all group rounds are complete
    const groupRounds = currentBracket.rounds?.filter(r => r.bracketType === 'group') || [];
    const allGroupsComplete = groupRounds.length > 0 && groupRounds.every(round =>
      round.matchups?.every(match => match.played)
    );

    if (!allGroupsComplete) {
      console.error('[transitionToKnockout] Not all group rounds are complete');
      return { error: 'Not all group rounds are complete' };
    }

    console.log('[transitionToKnockout] Generating knockout bracket');
    const knockoutRound = generateKnockoutFromGroups(currentBracket);
    if (!knockoutRound) {
      console.error('[transitionToKnockout] Failed to generate knockout bracket');
      return { error: 'Failed to generate knockout bracket' };
    }

    const updated = {
      ...currentBracket,
      stage: 'knockout',
      knockoutRounds: [knockoutRound],
    };

    console.log('[transitionToKnockout] Updating bracket to knockout stage');
    console.log('[transitionToKnockout] New knockoutRounds:', updated.knockoutRounds);
    setCurrentBracket(updated);

    // Persist
    try {
      setLSJson('current_tournament_bracket', updated);
      console.log('[transitionToKnockout] Knockout bracket persisted to localStorage');
    } catch (e) {
      console.warn('[transitionToKnockout] Failed to save knockout bracket:', e);
    }

    console.log('[transitionToKnockout] Complete');
    return { error: null, round: knockoutRound };
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
      localStorage.removeItem('tournament_game_type');
      localStorage.removeItem('tournament_courts_count');
      localStorage.removeItem('tournament_doubles_config');
    } catch (e) {
      console.warn('Failed to reset tournament:', e);
    }
  }, []);

  /**
   * Get all pending matches
   */
  const getPendingMatches = useCallback(() => {
    try {
      if (!currentBracket) return [];
      
      let allMatches = (currentBracket.rounds || [])
        .flatMap((r) => r.matchups || [])
        .filter((m) => !m.played && m.team2); // Exclude byes (team2 = null)
      
      // For group-knockout format, also include knockout round matches when in knockout stage
      if (currentBracket.knockoutRounds) {
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
      if (!currentBracket) return [];
      const completed = (currentBracket.rounds || [])
        .flatMap((r) => r.matchups || [])
        .filter((m) => m.played);
      if (currentBracket.knockoutRounds) {
        completed.push(...currentBracket.knockoutRounds
          .flatMap((r) => r.matchups || [])
          .filter((m) => m.played));
      }
      return completed;
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
    transitionToKnockout,
    resetTournament,
    getStats,
    getWinner,
    getPendingMatches,
    getCompletedMatches,
  };
}
