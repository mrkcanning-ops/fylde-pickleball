import { useState, useCallback } from 'react';
import { getLSJson, setLSJson } from '@/lib/ls';

/**
 * useSubstitutionLogic
 * 
 * Manages player substitution state and handlers for mid-match swaps
 * Tracks substitution history and validates substitution availability
 */
export function useSubstitutionLogic() {
  // Modal state for substitution
  const [showSubstituteModal, setShowSubstituteModal] = useState(false);
  const [selectedMatchId, setSelectedMatchId] = useState(null);
  const [selectedCourt, setSelectedCourt] = useState(null);
  
  // Substitution selection state
  const [playerOut, setPlayerOut] = useState(null);
  const [playerIn, setPlayerIn] = useState(null);
  const [substitutionRound, setSubstitutionRound] = useState(1);
  
  // Substitution history - stored in localStorage with match data
  const [substitutionHistory, setSubstitutionHistory] = useState([]);

  /**
   * Open substitution modal for a specific match/court
   */
  const openSubstituteModal = useCallback((matchId, court, currentRound = 1) => {
    setSelectedMatchId(matchId);
    setSelectedCourt(court);
    setSubstitutionRound(currentRound);
    setPlayerOut(null);
    setPlayerIn(null);
    setShowSubstituteModal(true);
  }, []);

  /**
   * Close substitution modal
   */
  const closeSubstituteModal = useCallback(() => {
    setShowSubstituteModal(false);
    setSelectedMatchId(null);
    setSelectedCourt(null);
    setPlayerOut(null);
    setPlayerIn(null);
  }, []);

  /**
   * Record a substitution event
   * Stores substitution in match history for tracking
   */
  const recordSubstitution = useCallback((matchId, court, outPlayer, inPlayer, round) => {
    const substitution = {
      id: `sub_${Date.now()}`,
      matchId,
      court,
      playerOut: {
        id: outPlayer?.id,
        name: outPlayer?.name,
        gender: outPlayer?.gender,
      },
      playerIn: {
        id: inPlayer?.id,
        name: inPlayer?.name,
        gender: inPlayer?.gender,
      },
      round,
      timestamp: new Date().toISOString(),
    };

    // Load existing substitution history from localStorage
    const key = `substitutions_${matchId}`;
    const existing = getLSJson(key, []) || [];
    const updated = [...existing, substitution];
    
    try {
      setLSJson(key, updated);
    } catch (e) {
      console.warn('Failed to store substitution history:', e);
    }

    setSubstitutionHistory(updated);
    return substitution;
  }, []);

  /**
   * Get substitution history for a specific match
   */
  const getSubstitutionHistory = useCallback((matchId) => {
    try {
      const history = getLSJson(`substitutions_${matchId}`, []) || [];
      return history;
    } catch (e) {
      console.warn('Failed to load substitution history:', e);
      return [];
    }
  }, []);

  /**
   * Get number of times a player was substituted in/out
   */
  const getPlayerSubstitutionStats = useCallback((playerId, matchId) => {
    const history = getSubstitutionHistory(matchId);
    const subOut = history.filter(s => s.playerOut?.id === playerId).length;
    const subIn = history.filter(s => s.playerIn?.id === playerId).length;
    return { subOut, subIn, totalSubs: subOut + subIn };
  }, [getSubstitutionHistory]);

  /**
   * Get available players for substitution (not already in match, are active)
   */
  const getAvailableSubstitutes = useCallback((allPlayers, currentMatchPlayers) => {
    if (!Array.isArray(allPlayers) || !Array.isArray(currentMatchPlayers)) {
      return [];
    }
    
    const currentPlayerIds = new Set(
      currentMatchPlayers.map(p => String(p?.id || p))
    );
    
    return allPlayers.filter(
      p => p?.active && !currentPlayerIds.has(String(p?.id))
    );
  }, []);

  /**
   * Clear substitution history for a match (e.g., if match is deleted)
   */
  const clearSubstitutionHistory = useCallback((matchId) => {
    try {
      const key = `substitutions_${matchId}`;
      localStorage.removeItem(key);
    } catch (e) {
      console.warn('Failed to clear substitution history:', e);
    }
  }, []);

  return {
    // Modal state
    showSubstituteModal,
    openSubstituteModal,
    closeSubstituteModal,
    
    // Selection state
    selectedMatchId,
    selectedCourt,
    playerOut,
    setPlayerOut,
    playerIn,
    setPlayerIn,
    substitutionRound,
    setSubstitutionRound,
    
    // Substitution history
    substitutionHistory,
    recordSubstitution,
    getSubstitutionHistory,
    getPlayerSubstitutionStats,
    getAvailableSubstitutes,
    clearSubstitutionHistory,
  };
}
