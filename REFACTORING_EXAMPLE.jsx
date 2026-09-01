/**
 * REFACTORING EXAMPLE
 * 
 * This file shows how the top of app/page.js should look after Phase 1 integration
 * It demonstrates:
 * 1. Importing hooks
 * 2. Replacing useState calls with hook calls
 * 3. Using modal components
 * 
 * Copy these patterns to app/page.js to complete the refactoring
 */

'use client';

import { useState, useEffect, useLayoutEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/AuthContext';
import { HybridStorage } from '@/lib/HybridStorage';
import HeaderStats from '@/components/HeaderStats';
import { supabase } from '@/lib/supabase';
import PreviousMatchesClient from './previous-matches/PreviousMatchesClient';
import { getLSRaw, getLSJson, setLSRaw, setLSJson, removeLS, getViewMode, setUserType } from '@/lib/ls';

// === NEW IMPORTS: Custom Hooks ===
import { 
  useStandingsLogic, 
  usePlayersLogic, 
  useMatchesLogic, 
  useSeasonLogic,
  useModalState,
} from '@/lib/hooks';

// === NEW IMPORTS: Modal Components ===
import { 
  AddPlayerModal, 
  RemovePlayerModal, 
  AddDivisionModal 
} from '@/components/modals';

// Match generators (unchanged)
import { 
  generate5PlayerChampMatches, 
  generateRoundRobinMatches, 
  generatePartnerPracticeMatches 
} from '../lib/matchGenerator';
import { 
  generatePartnerPracticeRandom, 
  generatePartnerPracticeGenderDoubles, 
  generatePartnerPracticeGenderMixed 
} from '../lib/matchGeneratorPartnerPractice';

const MIN_QUALIFY_GAMES = parseInt(process.env.NEXT_PUBLIC_MIN_QUALIFY_GAMES ?? '10', 10) || 10;

export default function HomePage() {
  const router = useRouter();
  const { user, userType, isLoading, logout } = useAuth();

  // ===== REFACTORED: Replace individual useState calls with custom hooks =====
  
  // Tab state (kept in main component - it's UI state)
  const [activeTab, setActiveTab] = useState('Standings');

  // Standings-related state → useStandingsLogic hook
  const standingsLogic = useStandingsLogic(getViewMode() || 'league', MIN_QUALIFY_GAMES);
  // Now has: division, divisions, leaderboard, minQualifyGames, etc.
  // Usage: standingsLogic.division, standingsLogic.modals.addDivision.isOpen

  // Players-related state → usePlayersLogic hook
  const playersLogic = usePlayersLogic(getViewMode() || 'league');
  // Now has: players, allDivisionPlayers, modals, newPlayerName, etc.
  // Usage: playersLogic.players, playersLogic.modals.addPlayer.open()

  // Matches-related state → useMatchesLogic hook
  const matchesLogic = useMatchesLogic(getViewMode() || 'league');
  // Now has: numCourts, court[1-6]Matches, court[1-6]Scores, etc.
  // Usage: matchesLogic.numCourts, matchesLogic.court1Matches

  // Seasons-related state → useSeasonLogic hook
  const seasonLogic = useSeasonLogic();
  // Now has: currentSeason, seasonSummariesList, previousMatches, etc.
  // Usage: seasonLogic.currentSeason, seasonLogic.modals.endSeasonChoice.isOpen

  // View mode state (global across app)
  const [viewMode, setViewMode] = useState('league');
  const [hydrated, setHydrated] = useState(false);
  const [serverError, setServerError] = useState(null);

  // ===== EXISTING AUTH LOGIC (UNCHANGED) =====
  useEffect(() => {
    if (!isLoading && (!user || !userType)) {
      router.push('/welcome');
    }
  }, [user, userType, isLoading, router]);

  useEffect(() => {
    if (userType) {
      setUserType(userType);
    }
  }, [userType]);

  const storage = typeof window !== 'undefined' && user && userType 
    ? new HybridStorage(userType, user.id)
    : null;

  // ===== REST OF EXISTING useEffect HOOKS (UNCHANGED) =====
  // loadRunningSeasonFromDb, fetchSummariesFromDb, etc. remain the same

  // ===== EXAMPLE: Using Modal Components in JSX =====
  // Instead of:
  //   {showAddPlayerModal && (
  //     <div className="fixed ...">...</div>
  //   )}
  // 
  // Now use:
  //   <AddPlayerModal isOpen={...} onClose={...} />

  if (isLoading || !user || !userType) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900">
        <div className="text-xl text-gray-300">Loading...</div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black text-gray-100 p-4 sm:p-8">
      {hydrated && (
        <>
          {/* Header unchanged */}
          <header className="mb-8">
            <div className="flex justify-between items-center">
              <h1 className="text-4xl font-bold text-center flex-1">⚡ Pickleball League Manager</h1>
              {user && (
                <button
                  onClick={logout}
                  className="bg-red-600 hover:bg-red-500 text-white px-4 py-2 rounded"
                >
                  Logout
                </button>
              )}
            </div>
          </header>

          <HeaderStats {...headerStatsProps} />

          {/* Tab buttons unchanged */}
          <section className="bg-gray-900 rounded-t-lg shadow px-4 py-4 mb-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {['Standings', 'Matches', 'Players', 'Previous Matches', 'Previous Seasons'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-4 py-3 rounded-lg text-sm font-medium transition ${
                    activeTab === tab
                      ? 'bg-white text-gray-900 shadow'
                      : 'bg-gray-800 text-gray-400'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
          </section>

          {/* === REFACTORED: Modal Components with Hook State === */}
          <AddPlayerModal
            isOpen={playersLogic.modals.addPlayer.isOpen}
            onClose={playersLogic.modals.addPlayer.close}
            onSubmit={handleConfirmAddPlayer}
            playerName={playersLogic.newPlayerName}
            onNameChange={playersLogic.setNewPlayerName}
            playerGender={playersLogic.newPlayerGender}
            onGenderChange={playersLogic.setNewPlayerGender}
          />

          <RemovePlayerModal
            isOpen={playersLogic.modals.confirmRemovePlayer.isOpen}
            onClose={playersLogic.modals.confirmRemovePlayer.close}
            selectedPlayer={playersLogic.selectedPlayerToRemove}
            onConfirm={handleConfirmRemovePlayer}
          />

          <AddDivisionModal
            isOpen={standingsLogic.modals.addDivision.isOpen}
            onClose={standingsLogic.modals.addDivision.close}
            onSubmit={handleConfirmAddDivision}
            divisionName={standingsLogic.newDivisionName}
            onNameChange={standingsLogic.setNewDivisionName}
          />

          {/* === Tab Content (can be extracted to components later) === */}
          {activeTab === 'Standings' && (
            <div>
              {/* Standings tab JSX here - unchanged for now */}
            </div>
          )}

          {activeTab === 'Players' && (
            <div>
              {/* Players tab JSX here - unchanged for now */}
            </div>
          )}

          {/* ... other tabs ... */}
        </>
      )}
    </main>
  );
}

/**
 * Handler functions (unchanged)
 * These interact with database and use state from hooks
 */
async function handleConfirmAddPlayer() {
  // Implementation unchanged - uses playersLogic state
}

async function handleConfirmRemovePlayer() {
  // Implementation unchanged - uses playersLogic state
}

async function handleConfirmAddDivision() {
  // Implementation unchanged - uses standingsLogic state
}

// ... other handlers remain unchanged ...
