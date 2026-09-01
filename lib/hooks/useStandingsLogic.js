'use client';

import { useState, useCallback, useEffect } from 'react';
import { getLSJson, setLSJson, removeLS } from '@/lib/ls';

/**
 * Custom hook for managing division and standing logic
 * Centralizes all state and handlers related to divisions and leaderboard
 * 
 * Returns: {
 *   // State
 *   divisions, setDivisions,
 *   division, setDivision,
 *   leaderboard, setLeaderboard,
 *   minQualifyByDivision, setMinQualifyByDivision,
 *   minQualifyGames, setMinQualifyGames,
 *   
 *   // Modals
 *   modals: {
 *     addDivision: { isOpen, open, close },
 *     removeDivision: { isOpen, open, close },
 *     confirmRemoveDivision: { isOpen, open, close },
 *     editMinQualify: { isOpen, open, close },
 *   },
 *   
 *   // Form state for modals
 *   newDivisionName, setNewDivisionName,
 *   selectedDivisionToRemove, setSelectedDivisionToRemove,
 *   minQualifyInput, setMinQualifyInput,
 *   
 *   // Handlers
 *   handleAddDivision, handleRemoveDivision, handleConfirmRemoveDivision,
 *   handleSaveMinQualify, handleCancelMinQualify
 * }
 */
export function useStandingsLogic(viewMode = 'league', MIN_QUALIFY_GAMES = 10) {
  // Main state
  const [division, setDivision] = useState(1);
  const [divisions, setDivisions] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [minQualifyByDivision, setMinQualifyByDivision] = useState({});
  const [minQualifyGames, setMinQualifyGames] = useState(MIN_QUALIFY_GAMES);

  // Modal states
  const [showAddDivisionModal, setShowAddDivisionModal] = useState(false);
  const [showSelectDivisionModal, setShowSelectDivisionModal] = useState(false);
  const [showConfirmRemoveDivisionModal, setShowConfirmRemoveDivisionModal] = useState(false);
  const [showEditMinModal, setShowEditMinModal] = useState(false);

  // Form states
  const [newDivisionName, setNewDivisionName] = useState('');
  const [selectedDivisionToRemove, setSelectedDivisionToRemove] = useState(null);
  const [minQualifyInput, setMinQualifyInput] = useState(String(MIN_QUALIFY_GAMES));
  const [pendingMinSave, setPendingMinSave] = useState(null);

  // Load saved division from localStorage on mount
  useEffect(() => {
    const savedDivision = getLSJson('division', 1);
    if (typeof savedDivision === 'number' && savedDivision > 0) {
      setDivision(savedDivision);
    }
  }, []);

  // Persist selected division to localStorage
  useEffect(() => {
    setLSJson('division', division);
  }, [division]);

  // Modal convenience object
  const modals = {
    addDivision: {
      isOpen: showAddDivisionModal,
      open: () => setShowAddDivisionModal(true),
      close: () => {
        setShowAddDivisionModal(false);
        setNewDivisionName('');
      },
    },
    removeDivision: {
      isOpen: showSelectDivisionModal,
      open: () => setShowSelectDivisionModal(true),
      close: () => setShowSelectDivisionModal(false),
    },
    confirmRemoveDivision: {
      isOpen: showConfirmRemoveDivisionModal,
      open: () => setShowConfirmRemoveDivisionModal(true),
      close: () => {
        setShowConfirmRemoveDivisionModal(false);
        setSelectedDivisionToRemove(null);
      },
    },
    editMinQualify: {
      isOpen: showEditMinModal,
      open: () => {
        setMinQualifyInput(String(minQualifyGames));
        setShowEditMinModal(true);
      },
      close: () => setShowEditMinModal(false),
    },
  };

  // Handlers
  const handleAddDivision = useCallback(() => {
    if (!newDivisionName.trim()) return;

    const newDivision = {
      id: `division_${Date.now()}`,
      name: newDivisionName,
    };

    setDivisions(prev => [...prev, newDivision]);
    setLSJson(`divisions${viewMode === 'doubles' ? '_doubles' : ''}`, 
      [...divisions, newDivision]);
    
    modals.addDivision.close();
  }, [newDivisionName, divisions, viewMode]);

  const handleSelectDivisionToRemove = useCallback((divId) => {
    setSelectedDivisionToRemove(divId);
    modals.removeDivision.close();
    modals.confirmRemoveDivision.open();
  }, []);

  const handleConfirmRemoveDivision = useCallback(() => {
    if (!selectedDivisionToRemove) return;

    const updatedDivisions = divisions.filter(d => d.id !== selectedDivisionToRemove);
    setDivisions(updatedDivisions);
    setLSJson(`divisions${viewMode === 'doubles' ? '_doubles' : ''}`, updatedDivisions);

    // Reset to first division if current was removed
    if (division === selectedDivisionToRemove || division > updatedDivisions.length) {
      setDivision(1);
    }

    modals.confirmRemoveDivision.close();
  }, [selectedDivisionToRemove, divisions, division, viewMode]);

  const handleSaveMinQualify = useCallback(() => {
    const value = parseInt(minQualifyInput, 10);
    if (!Number.isNaN(value) && value >= 0) {
      setMinQualifyGames(value);
      setLSJson('min_qualify_games', value);
      setPendingMinSave(null);
      modals.editMinQualify.close();
    }
  }, [minQualifyInput]);

  const handleCancelMinQualify = useCallback(() => {
    setMinQualifyInput(String(minQualifyGames));
    modals.editMinQualify.close();
  }, [minQualifyGames]);

  return {
    // State
    division,
    setDivision,
    divisions,
    setDivisions,
    leaderboard,
    setLeaderboard,
    minQualifyByDivision,
    setMinQualifyByDivision,
    minQualifyGames,
    setMinQualifyGames,

    // Modal objects
    modals,

    // Form state
    newDivisionName,
    setNewDivisionName,
    selectedDivisionToRemove,
    minQualifyInput,
    setMinQualifyInput,
    pendingMinSave,
    setPendingMinSave,

    // Handlers
    handleAddDivision,
    handleSelectDivisionToRemove,
    handleConfirmRemoveDivision,
    handleSaveMinQualify,
    handleCancelMinQualify,
  };
}
