'use client';

import { useState, useCallback } from 'react';
import { setLSJson } from '@/lib/ls';

/**
 * Custom hook for managing match generation and display logic
 * Handles courts, matches, scores, rounds, and add/edit match modals
 * 
 * Returns: {
 *   // Court & Match state
 *   numCourts, setNumCourts,
 *   courtMatches, setCourt[N]Matches,
 *   courtScores, setCourt[N]Scores,
 *   courtRounds, setCourt[N]Round,
 *   currentRound, setCurrentRound,
 *   roundMatches, setRoundMatches,
 *   
 *   // Modals
 *   modals: {
 *     addMatch: { isOpen, open, close },
 *     editMatch: { isOpen, open, close },
 *     enterScore: { isOpen, open, close },
 *   },
 *   
 *   // Form state
 *   addMatchData, setAddMatchData,
 *   editMatchData, setEditMatchData,
 *   editingMatchId, setEditingMatchId,
 *   
 *   // Handlers
 *   handleAddMatch, handleSaveMatch, handleEditMatch, handleDeleteMatch
 * }
 */
export function useMatchesLogic(viewMode = 'league') {
  // Court state - one set of arrays per court
  const [numCourts, setNumCourts] = useState(2);

  // Courts 1-6 match lists
  const [court1Matches, setCourt1Matches] = useState([]);
  const [court2Matches, setCourt2Matches] = useState([]);
  const [court3Matches, setCourt3Matches] = useState([]);
  const [court4Matches, setCourt4Matches] = useState([]);
  const [court5Matches, setCourt5Matches] = useState([]);
  const [court6Matches, setCourt6Matches] = useState([]);

  // Courts 1-6 score lists
  const [court1Scores, setCourt1Scores] = useState([]);
  const [court2Scores, setCourt2Scores] = useState([]);
  const [court3Scores, setCourt3Scores] = useState([]);
  const [court4Scores, setCourt4Scores] = useState([]);
  const [court5Scores, setCourt5Scores] = useState([]);
  const [court6Scores, setCourt6Scores] = useState([]);

  // Courts 1-6 round tracking
  const [court1Round, setCourt1Round] = useState(0);
  const [court2Round, setCourt2Round] = useState(0);
  const [court3Round, setCourt3Round] = useState(0);
  const [court4Round, setCourt4Round] = useState(0);
  const [court5Round, setCourt5Round] = useState(0);
  const [court6Round, setCourt6Round] = useState(0);

  // Round state
  const [currentRound, setCurrentRound] = useState(0);
  const [roundMatches, setRoundMatches] = useState([]);

  // Modal states
  const [showAddMatchModal, setShowAddMatchModal] = useState(false);
  const [showEditMatchModal, setShowEditMatchModal] = useState(false);
  const [showEnterScore, setShowEnterScore] = useState(false);

  // Form states for add match
  const [addMatchData, setAddMatchData] = useState({
    date: new Date().toISOString().split('T')[0],
    team1Players: [],
    team1Name: '',
    team2Players: [],
    team2Name: '',
    team1Score: '',
    team2Score: '',
    court: 'court1',
  });
  const [addMatchError, setAddMatchError] = useState('');

  // Form states for edit match
  const [editingMatchId, setEditingMatchId] = useState(null);
  const [editMatchData, setEditMatchData] = useState({
    date: new Date().toISOString().split('T')[0],
    team1Players: [],
    team2Players: [],
    team1Score: '',
    team2Score: '',
    court: 'court1',
  });
  const [editMatchError, setEditMatchError] = useState('');
  const [pendingEditMatch, setPendingEditMatch] = useState(null);

  // Modal convenience object
  const modals = {
    addMatch: {
      isOpen: showAddMatchModal,
      open: () => setShowAddMatchModal(true),
      close: () => {
        setShowAddMatchModal(false);
        setAddMatchData({
          date: new Date().toISOString().split('T')[0],
          team1Players: [],
          team1Name: '',
          team2Players: [],
          team2Name: '',
          team1Score: '',
          team2Score: '',
          court: 'court1',
        });
        setAddMatchError('');
      },
    },
    editMatch: {
      isOpen: showEditMatchModal,
      open: () => setShowEditMatchModal(true),
      close: () => {
        setShowEditMatchModal(false);
        setEditingMatchId(null);
        setEditMatchData({
          date: new Date().toISOString().split('T')[0],
          team1Players: [],
          team2Players: [],
          team1Score: '',
          team2Score: '',
          court: 'court1',
        });
        setEditMatchError('');
      },
    },
    enterScore: {
      isOpen: showEnterScore,
      open: () => setShowEnterScore(true),
      close: () => setShowEnterScore(false),
    },
  };

  // Helper to get court setters by index
  const getCourtSetter = useCallback((courtIndex, type = 'matches') => {
    const setters = {
      matches: [setCourt1Matches, setCourt2Matches, setCourt3Matches, setCourt4Matches, setCourt5Matches, setCourt6Matches],
      scores: [setCourt1Scores, setCourt2Scores, setCourt3Scores, setCourt4Scores, setCourt5Scores, setCourt6Scores],
      rounds: [setCourt1Round, setCourt2Round, setCourt3Round, setCourt4Round, setCourt5Round, setCourt6Round],
    };
    return setters[type][courtIndex - 1] || null;
  }, []);

  // Helper to get court state by index
  const getCourtState = useCallback((courtIndex, type = 'matches') => {
    const states = {
      matches: [court1Matches, court2Matches, court3Matches, court4Matches, court5Matches, court6Matches],
      scores: [court1Scores, court2Scores, court3Scores, court4Scores, court5Scores, court6Scores],
      rounds: [court1Round, court2Round, court3Round, court4Round, court5Round, court6Round],
    };
    return states[type][courtIndex - 1] || null;
  }, [court1Matches, court2Matches, court3Matches, court4Matches, court5Matches, court6Matches,
      court1Scores, court2Scores, court3Scores, court4Scores, court5Scores, court6Scores,
      court1Round, court2Round, court3Round, court4Round, court5Round, court6Round]);

  // Handle add match
  const handleAddMatch = useCallback(() => {
    if (!addMatchData.team1Score || !addMatchData.team2Score) {
      setAddMatchError('Both scores required');
      return;
    }

    const newMatch = {
      id: `match_${Date.now()}`,
      date: addMatchData.date,
      team1: addMatchData.team1Players,
      team2: addMatchData.team2Players,
      team1Name: addMatchData.team1Name,
      team2Name: addMatchData.team2Name,
      team1Score: parseInt(addMatchData.team1Score, 10),
      team2Score: parseInt(addMatchData.team2Score, 10),
      court: addMatchData.court,
    };

    // Save to appropriate court
    const courtNum = parseInt(addMatchData.court.replace('court', ''), 10);
    const setter = getCourtSetter(courtNum, 'matches');
    if (setter) {
      setter(prev => [...(prev || []), newMatch]);
    }

    modals.addMatch.close();
  }, [addMatchData, getCourtSetter]);

  // Handle edit match
  const handleEditMatch = useCallback((matchId) => {
    // Find match from any court
    let match = null;
    for (let i = 1; i <= 6; i++) {
      const courtMatches = getCourtState(i, 'matches');
      const found = courtMatches?.find(m => m.id === matchId);
      if (found) {
        match = found;
        break;
      }
    }

    if (match) {
      setPendingEditMatch(match);
      setEditingMatchId(match.id);
      setEditMatchData({
        date: match.date,
        team1Players: match.team1,
        team2Players: match.team2,
        team1Score: String(match.team1Score),
        team2Score: String(match.team2Score),
        court: match.court,
      });
      modals.editMatch.open();
    }
  }, [getCourtState]);

  // Handle save edited match
  const handleSaveEditMatch = useCallback(() => {
    if (!editingMatchId) return;

    const updatedMatch = {
      ...pendingEditMatch,
      date: editMatchData.date,
      team1: editMatchData.team1Players,
      team2: editMatchData.team2Players,
      team1Score: parseInt(editMatchData.team1Score, 10),
      team2Score: parseInt(editMatchData.team2Score, 10),
      court: editMatchData.court,
    };

    // Update in court
    const courtNum = parseInt(editMatchData.court.replace('court', ''), 10);
    const setter = getCourtSetter(courtNum, 'matches');
    if (setter) {
      setter(prev => 
        (prev || []).map(m => m.id === editingMatchId ? updatedMatch : m)
      );
    }

    modals.editMatch.close();
  }, [editingMatchId, editMatchData, pendingEditMatch, getCourtSetter]);

  // Handle delete match
  const handleDeleteMatch = useCallback((matchId, courtNum) => {
    const setter = getCourtSetter(courtNum, 'matches');
    if (setter) {
      setter(prev => (prev || []).filter(m => m.id !== matchId));
    }
  }, [getCourtSetter]);

  return {
    // Court & Match state
    numCourts,
    setNumCourts,
    
    // Individual court match arrays
    court1Matches, setCourt1Matches,
    court2Matches, setCourt2Matches,
    court3Matches, setCourt3Matches,
    court4Matches, setCourt4Matches,
    court5Matches, setCourt5Matches,
    court6Matches, setCourt6Matches,

    // Individual court score arrays
    court1Scores, setCourt1Scores,
    court2Scores, setCourt2Scores,
    court3Scores, setCourt3Scores,
    court4Scores, setCourt4Scores,
    court5Scores, setCourt5Scores,
    court6Scores, setCourt6Scores,

    // Individual court round numbers
    court1Round, setCourt1Round,
    court2Round, setCourt2Round,
    court3Round, setCourt3Round,
    court4Round, setCourt4Round,
    court5Round, setCourt5Round,
    court6Round, setCourt6Round,

    // Round state
    currentRound,
    setCurrentRound,
    roundMatches,
    setRoundMatches,

    // Modal objects
    modals,

    // Form state
    addMatchData,
    setAddMatchData,
    addMatchError,
    setAddMatchError,
    editMatchData,
    setEditMatchData,
    editMatchError,
    setEditMatchError,
    editingMatchId,
    setEditingMatchId,
    pendingEditMatch,
    setPendingEditMatch,

    // Handlers
    handleAddMatch,
    handleEditMatch,
    handleSaveEditMatch,
    handleDeleteMatch,
    getCourtSetter,
    getCourtState,
  };
}
