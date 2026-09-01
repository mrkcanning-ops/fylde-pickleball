'use client';

import { useState, useCallback } from 'react';
import { setLSJson } from '@/lib/ls';

/**
 * Custom hook for managing player-related logic
 * Handles player list, add/remove modals, and form state
 * 
 * Returns: {
 *   // State
 *   players, setPlayers,
 *   allDivisionPlayers, setAllDivisionPlayers,
 *   
 *   // Modals
 *   modals: {
 *     addPlayer: { isOpen, open, close },
 *     selectPlayerToRemove: { isOpen, open, close },
 *     confirmRemovePlayer: { isOpen, open, close },
 *   },
 *   
 *   // Form state
 *   newPlayerName, setNewPlayerName,
 *   newPlayerGender, setNewPlayerGender,
 *   selectedPlayerToRemove, setSelectedPlayerToRemove,
 *   
 *   // Handlers
 *   handleAddPlayer, handleSelectPlayerToRemove, handleConfirmRemovePlayer,
 *   resetAddPlayerForm
 * }
 */
export function usePlayersLogic(viewMode = 'league') {
  // Main state
  const [players, setPlayers] = useState([]);
  const [allDivisionPlayers, setAllDivisionPlayers] = useState([]);

  // Modal states
  const [showAddPlayerModal, setShowAddPlayerModal] = useState(false);
  const [showSelectPlayerModal, setShowSelectPlayerModal] = useState(false);
  const [showRemovePlayerModal, setShowRemovePlayerModal] = useState(false);

  // Form states
  const [newPlayerName, setNewPlayerName] = useState('');
  const [newPlayerGender, setNewPlayerGender] = useState(null);
  const [selectedPlayerToRemove, setSelectedPlayerToRemove] = useState(null);

  // Modal convenience object
  const modals = {
    addPlayer: {
      isOpen: showAddPlayerModal,
      open: () => setShowAddPlayerModal(true),
      close: () => {
        setShowAddPlayerModal(false);
        resetAddPlayerForm();
      },
    },
    selectPlayerToRemove: {
      isOpen: showSelectPlayerModal,
      open: () => setShowSelectPlayerModal(true),
      close: () => setShowSelectPlayerModal(false),
    },
    confirmRemovePlayer: {
      isOpen: showRemovePlayerModal,
      open: () => setShowRemovePlayerModal(true),
      close: () => {
        setShowRemovePlayerModal(false);
        setSelectedPlayerToRemove(null);
      },
    },
  };

  // Reset form after add
  const resetAddPlayerForm = useCallback(() => {
    setNewPlayerName('');
    setNewPlayerGender(null);
  }, []);

  // Handle add player
  const handleAddPlayer = useCallback(() => {
    if (!newPlayerName.trim()) return;

    const newPlayer = {
      id: `player_${Date.now()}`,
      name: newPlayerName.trim(),
      gender: newPlayerGender,
      active: true,
      wins: 0,
      losses: 0,
      points: 0,
    };

    const updatedPlayers = [...players, newPlayer];
    setPlayers(updatedPlayers);
    setAllDivisionPlayers(updatedPlayers);
    
    // Save to localStorage
    setLSJson(`players${viewMode === 'doubles' ? '_doubles' : ''}`, updatedPlayers);
    
    modals.addPlayer.close();
  }, [newPlayerName, newPlayerGender, players, viewMode]);

  // Handle selecting player to remove
  const handleSelectPlayerToRemove = useCallback((playerId) => {
    setSelectedPlayerToRemove(playerId);
    modals.selectPlayerToRemove.close();
    modals.confirmRemovePlayer.open();
  }, []);

  // Handle confirming player removal
  const handleConfirmRemovePlayer = useCallback(() => {
    if (!selectedPlayerToRemove) return;

    const updatedPlayers = players.filter(p => p.id !== selectedPlayerToRemove);
    setPlayers(updatedPlayers);
    setAllDivisionPlayers(updatedPlayers);
    
    setLSJson(`players${viewMode === 'doubles' ? '_doubles' : ''}`, updatedPlayers);
    
    modals.confirmRemovePlayer.close();
  }, [selectedPlayerToRemove, players, viewMode]);

  return {
    // State
    players,
    setPlayers,
    allDivisionPlayers,
    setAllDivisionPlayers,

    // Modal objects
    modals,

    // Form state
    newPlayerName,
    setNewPlayerName,
    newPlayerGender,
    setNewPlayerGender,
    selectedPlayerToRemove,
    setSelectedPlayerToRemove,

    // Handlers
    handleAddPlayer,
    handleSelectPlayerToRemove,
    handleConfirmRemovePlayer,
    resetAddPlayerForm,
  };
}
