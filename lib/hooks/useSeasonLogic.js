'use client';

import { useState, useCallback } from 'react';

/**
 * Custom hook for managing season and previous matches logic
 * Handles season selection, summaries, and end-of-season modals
 * 
 * Returns: {
 *   // Season state
 *   currentSeason, setCurrentSeason,
 *   seasonSummariesList, setSeasonSummariesList,
 *   selectedSeasonSummaryId, setSelectedSeasonSummaryId,
 *   
 *   // Match state
 *   previousMatches, setPreviousMatches,
 *   
 *   // Modals
 *   modals: {
 *     endSeason: { isOpen, open, close },
 *     confirmReset: { isOpen, open, close },
 *     endSeasonChoice: { isOpen, open, close },
 *   },
 *   
 *   // Form state
 *   newSeasonName, setNewSeasonName,
 *   endSummaryContext, setEndSummaryContext,
 *   serverError, setServerError,
 *   
 *   // Handlers
 *   handleEndSeason, handleConfirmReset, handleStartNewSeason, handleClearPlayers
 * }
 */
export function useSeasonLogic() {
  // Season state
  const [currentSeason, setCurrentSeason] = useState(null);
  const [seasonSummariesList, setSeasonSummariesList] = useState([]);
  const [selectedSeasonSummaryId, setSelectedSeasonSummaryId] = useState(null);

  // Match state
  const [previousMatches, setPreviousMatches] = useState([]);

  // Modal states
  const [showRecalculateModal, setShowRecalculateModal] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [showEndSeasonChoiceModal, setShowEndSeasonChoiceModal] = useState(false);

  // Form states
  const [newSeasonName, setNewSeasonName] = useState('');
  const [endSummaryContext, setEndSummaryContext] = useState(null);
  const [serverError, setServerError] = useState(null);

  // Modal convenience object
  const modals = {
    recalculate: {
      isOpen: showRecalculateModal,
      open: () => setShowRecalculateModal(true),
      close: () => setShowRecalculateModal(false),
    },
    reset: {
      isOpen: showResetModal,
      open: () => setShowResetModal(true),
      close: () => setShowResetModal(false),
    },
    endSeasonChoice: {
      isOpen: showEndSeasonChoiceModal,
      open: () => setShowEndSeasonChoiceModal(true),
      close: () => {
        setShowEndSeasonChoiceModal(false);
        setEndSummaryContext(null);
        setNewSeasonName('');
      },
    },
  };

  // These are stubbed - actual handlers will be in the main page component
  // since they interact with database and other state
  const handleEndSeason = useCallback(() => {
    modals.reset.open();
  }, []);

  const handleConfirmReset = useCallback(() => {
    modals.reset.close();
    // Actual reset logic handled by parent
  }, []);

  const handleStartNewSeason = useCallback(() => {
    modals.endSeasonChoice.close();
  }, []);

  const handleClearPlayers = useCallback(() => {
    modals.endSeasonChoice.close();
  }, []);

  return {
    // Season state
    currentSeason,
    setCurrentSeason,
    seasonSummariesList,
    setSeasonSummariesList,
    selectedSeasonSummaryId,
    setSelectedSeasonSummaryId,

    // Match state
    previousMatches,
    setPreviousMatches,

    // Modal objects
    modals,

    // Form state
    newSeasonName,
    setNewSeasonName,
    endSummaryContext,
    setEndSummaryContext,
    serverError,
    setServerError,

    // Handlers (stubbed, implemented in page.js)
    handleEndSeason,
    handleConfirmReset,
    handleStartNewSeason,
    handleClearPlayers,
  };
}
