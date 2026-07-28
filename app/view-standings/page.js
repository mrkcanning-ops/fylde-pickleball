'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function ViewStandingsPage() {
  const router = useRouter();
  const [leagues, setLeagues] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchLeagues();
  }, []);

  const fetchLeagues = async () => {
    try {
      // Fetch season summaries (completed leagues)
      const res = await fetch('/api/season-summaries');
      if (res.ok) {
        const data = await res.json();
        setLeagues(data.data || []);
      }
    } catch (err) {
      setError('Failed to load standings');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBack = () => {
    router.push('/welcome');
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900">
        <div className="text-xl text-gray-300">Loading standings...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-gray-300">
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700 p-6">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-white">Fylde Pickleball Club</h1>
            <p className="text-gray-400 mt-2">All League Standings</p>
          </div>
          <button
            onClick={handleBack}
            className="bg-gray-700 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded transition-colors"
          >
            Back
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-6xl mx-auto p-6">
        {error && (
          <div className="mb-6 p-4 bg-red-900 text-red-200 rounded">
            {error}
          </div>
        )}

        {leagues.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-xl text-gray-400">No standings available yet.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {leagues.map((league) => (
              <div
                key={league.id}
                className="bg-gray-800 rounded-lg border border-gray-700 p-6"
              >
                <h2 className="text-2xl font-bold text-white mb-4">
                  Division {league.division}
                </h2>
                <p className="text-gray-400 mb-4">
                  {new Date(league.timestamp).toLocaleDateString()}
                </p>

                {league.top_by_points && (
                  <div className="mb-6">
                    <h3 className="text-lg font-semibold text-white mb-3">
                      Top Players by Points
                    </h3>
                    <div className="space-y-2">
                      {league.top_by_points.slice(0, 5).map((player, idx) => (
                        <div
                          key={idx}
                          className="flex justify-between items-center p-3 bg-gray-700 rounded"
                        >
                          <span className="text-white">{player.name}</span>
                          <span className="font-bold text-blue-400">
                            {player.points} pts
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {league.top_by_wins && (
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-3">
                      Top Players by Wins
                    </h3>
                    <div className="space-y-2">
                      {league.top_by_wins.slice(0, 5).map((player, idx) => (
                        <div
                          key={idx}
                          className="flex justify-between items-center p-3 bg-gray-700 rounded"
                        >
                          <span className="text-white">{player.name}</span>
                          <span className="font-bold text-green-400">
                            {player.wins} wins
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
