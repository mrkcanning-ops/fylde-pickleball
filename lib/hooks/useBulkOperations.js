import { useState, useCallback } from 'react';

/**
 * useBulkOperations Hook - Manages bulk add/remove operations for players and divisions
 * 
 * Usage:
 *   const bulkOps = useBulkOperations();
 *   // Add players: bulkOps.parsePlayerCSV(csvText)
 *   // Remove: bulkOps.setPlayersToRemove([player1, player2])
 */
export function useBulkOperations() {
  // Bulk add players state
  const [bulkPlayerCSVText, setBulkPlayerCSVText] = useState('');
  const [parsedBulkPlayers, setParsedBulkPlayers] = useState([]);
  const [showBulkAddPlayersModal, setShowBulkAddPlayersModal] = useState(false);

  // Bulk remove players state
  const [showBulkRemovePlayersModal, setShowBulkRemovePlayersModal] = useState(false);
  const [playersToRemove, setPlayersToRemove] = useState([]);

  // Bulk add divisions state
  const [bulkDivisionText, setBulkDivisionText] = useState('');
  const [parsedBulkDivisions, setParsedBulkDivisions] = useState([]);
  const [showBulkAddDivisionsModal, setShowBulkAddDivisionsModal] = useState(false);

  // Bulk remove divisions state
  const [showBulkRemoveDivisionsModal, setShowBulkRemoveDivisionsModal] = useState(false);
  const [divisionsToRemove, setDivisionsToRemove] = useState([]);

  // Parse CSV format: name, gender (optional)
  // Each line is a player: "John Smith, male" or just "John Smith"
  const parsePlayerCSV = useCallback((csvText) => {
    const lines = csvText
      .trim()
      .split('\n')
      .filter((line) => line.trim().length > 0);

    const players = lines.map((line) => {
      const parts = line.split(',').map((p) => p.trim());
      const name = parts[0];
      const gender = parts[1] || null;

      return {
        id: `temp-${Math.random().toString(36).slice(2, 9)}`,
        name,
        gender: gender ? gender.toLowerCase() : null,
        status: 'pending',
      };
    });

    setParsedBulkPlayers(players);
    return players;
  }, []);

  // Parse division CSV: one name per line
  const parseDivisionCSV = useCallback((csvText) => {
    const lines = csvText
      .trim()
      .split('\n')
      .filter((line) => line.trim().length > 0);

    const divisions = lines.map((line) => ({
      id: `temp-${Math.random().toString(36).slice(2, 9)}`,
      name: line.trim(),
      status: 'pending',
    }));

    setParsedBulkDivisions(divisions);
    return divisions;
  }, []);

  // Toggle player selection for removal
  const togglePlayerForRemoval = useCallback((playerId) => {
    setPlayersToRemove((prev) => {
      const isSelected = prev.some((p) => String(p.id) === String(playerId));
      if (isSelected) {
        return prev.filter((p) => String(p.id) !== String(playerId));
      } else {
        return [...prev, playerId];
      }
    });
  }, []);

  // Toggle division selection for removal
  const toggleDivisionForRemoval = useCallback((divisionId) => {
    setDivisionsToRemove((prev) => {
      const isSelected = prev.some((d) => String(d.id) === String(divisionId));
      if (isSelected) {
        return prev.filter((d) => String(d.id) !== String(divisionId));
      } else {
        return [...prev, divisionId];
      }
    });
  }, []);

  // Clear all selections
  const clearBulkAddPlayers = useCallback(() => {
    setBulkPlayerCSVText('');
    setParsedBulkPlayers([]);
    setShowBulkAddPlayersModal(false);
  }, []);

  const clearBulkRemovePlayers = useCallback(() => {
    setPlayersToRemove([]);
    setShowBulkRemovePlayersModal(false);
  }, []);

  const clearBulkAddDivisions = useCallback(() => {
    setBulkDivisionText('');
    setParsedBulkDivisions([]);
    setShowBulkAddDivisionsModal(false);
  }, []);

  const clearBulkRemoveDivisions = useCallback(() => {
    setDivisionsToRemove([]);
    setShowBulkRemoveDivisionsModal(false);
  }, []);

  return {
    // Bulk add players
    bulkPlayerCSVText,
    setBulkPlayerCSVText,
    parsedBulkPlayers,
    parsePlayerCSV,
    showBulkAddPlayersModal,
    setShowBulkAddPlayersModal,
    clearBulkAddPlayers,

    // Bulk remove players
    showBulkRemovePlayersModal,
    setShowBulkRemovePlayersModal,
    playersToRemove,
    setPlayersToRemove,
    togglePlayerForRemoval,
    clearBulkRemovePlayers,

    // Bulk add divisions
    bulkDivisionText,
    setBulkDivisionText,
    parsedBulkDivisions,
    parseDivisionCSV,
    showBulkAddDivisionsModal,
    setShowBulkAddDivisionsModal,
    clearBulkAddDivisions,

    // Bulk remove divisions
    showBulkRemoveDivisionsModal,
    setShowBulkRemoveDivisionsModal,
    divisionsToRemove,
    setDivisionsToRemove,
    toggleDivisionForRemoval,
    clearBulkRemoveDivisions,
  };
}
