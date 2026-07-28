'use client';

import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/AuthContext';
import { useEffect } from 'react';
import { setLSRaw, setUserType } from '@/lib/ls';

export default function LeagueSelectorPage() {
  const router = useRouter();
  const { user, userType, isLoading, logout } = useAuth();

  useEffect(() => {
    // Redirect to welcome if not authenticated
    if (!isLoading && (!user || !userType)) {
      router.push('/welcome');
    }
  }, [user, userType, isLoading, router]);

  // Set user type in localStorage utilities for data isolation
  useEffect(() => {
    if (userType) {
      setUserType(userType);
    }
  }, [userType]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900">
        <div className="text-xl text-gray-300">Loading...</div>
      </div>
    );
  }

  const handleLogout = () => {
    logout();
    router.push('/welcome');
  };

  const handleSelectLeague = (leagueType) => {
    // Set the view mode based on league type
    const viewModeMap = {
      'pickleball-league': 'league',
      'point-difference': 'league',
      '5-player-champ': 'league',
      'round-robin': 'league',
    };
    
    const viewMode = viewModeMap[leagueType] || 'league';
    setLSRaw('view_mode', viewMode);
    
    // Also store the league type preference if needed
    setLSRaw('selected-league-type', leagueType);
    
    // Route to the main page
    router.push('/');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900">
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700 p-6">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-white">Fylde Pickleball Club</h1>
            <p className="text-gray-400 mt-2">
              {userType === 'guest'
                ? 'Guest Session'
                : `Logged in as: ${user?.username}`}
            </p>
          </div>
          <button
            onClick={handleLogout}
            className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded transition-colors"
          >
            Logout
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex items-center justify-center min-h-[calc(100vh-100px)]">
        <div className="text-center max-w-2xl">
          <h2 className="text-3xl font-bold text-white mb-12">
            Select a League Type
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <button
              onClick={() => handleSelectLeague('pickleball-league')}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-8 px-6 rounded-lg text-xl transition-colors transform hover:scale-105"
            >
              <div className="text-2xl mb-2">🏓</div>
              Pickleball League
            </button>

            <button
              onClick={() => handleSelectLeague('point-difference')}
              className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-8 px-6 rounded-lg text-xl transition-colors transform hover:scale-105"
            >
              <div className="text-2xl mb-2">📊</div>
              Point Difference
            </button>

            <button
              onClick={() => handleSelectLeague('5-player-champ')}
              className="bg-green-600 hover:bg-green-700 text-white font-bold py-8 px-6 rounded-lg text-xl transition-colors transform hover:scale-105"
            >
              <div className="text-2xl mb-2">👑</div>
              5 Player Champ
            </button>

            <button
              onClick={() => handleSelectLeague('round-robin')}
              className="bg-yellow-600 hover:bg-yellow-700 text-white font-bold py-8 px-6 rounded-lg text-xl transition-colors transform hover:scale-105"
            >
              <div className="text-2xl mb-2">🔄</div>
              Round Robin
            </button>
          </div>

          {userType === 'club-member' && (
            <div className="mt-12">
              <button
                onClick={() => router.push('/migrate-data')}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-6 rounded-lg transition-colors"
              >
                📦 Migrate Old Leagues to My Account
              </button>
              <p className="text-sm text-gray-400 mt-3">
                Have leagues from before your account? Click here to claim them.
              </p>
            </div>
          )}

          {userType === 'guest' && (
            <div className="mt-12 p-4 bg-yellow-900 text-yellow-200 rounded-lg">
              <p className="text-sm">
                💡 You are using the app as a guest. Your data will not be saved.
              </p>
              <p className="text-sm mt-2">
                To save your leagues and tournaments, create a club member account.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
