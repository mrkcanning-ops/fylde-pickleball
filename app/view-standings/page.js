'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function ViewStandingsPage() {
  const router = useRouter();
  const [allSummaries, setAllSummaries] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Filter state
  const [selectedDivision, setSelectedDivision] = useState(null);
  const [selectedSummary, setSelectedSummary] = useState(null);
  const [standingsView, setStandingsView] = useState('Leaderboard');
  
  // Derived states
  const [divisions, setDivisions] = useState([]);
  const [summariesForDivision, setSummariesForDivision] = useState([]);

  useEffect(() => {
    fetchAllSummaries();
  }, []);

  const fetchAllSummaries = async () => {
    try {
      const res = await fetch('/api/season-summaries');
      if (res.ok) {
        const data = await res.json();
        const summaries = data.data || [];
        setAllSummaries(summaries);
        
        // Extract unique divisions
        const divs = [...new Set(summaries.map(s => s.division))].sort((a, b) => a - b);
        setDivisions(divs);
        
        // Set first division as default
        if (divs.length > 0) {
          setSelectedDivision(divs[0]);
        }
      } else {
        setError('Failed to load standings');
      }
    } catch (err) {
      setError('Failed to load standings');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  // Update summaries when division changes
  useEffect(() => {
    if (selectedDivision !== null) {
      const filtered = allSummaries
        .filter(s => s.division === selectedDivision)
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      setSummariesForDivision(filtered);
      
      // Auto-select first summary
      if (filtered.length > 0 && !selectedSummary) {
        setSelectedSummary(filtered[0]);
      }
    }
  }, [selectedDivision, allSummaries]);

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

        {allSummaries.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-xl text-gray-400">No standings available yet.</p>
          </div>
        ) : (
          <>
            {/* Filter Dropdowns */}
            <div className="mb-6 grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-300 mb-2">
                  Division
                </label>
                <select
                  value={selectedDivision || ''}
                  onChange={(e) => {
                    const div = parseInt(e.target.value);
                    setSelectedDivision(div);
                    setSelectedSummary(null);
                  }}
                  className="w-full p-2 bg-gray-800 text-white border border-gray-600 rounded focus:outline-none focus:border-yellow-400"
                >
                  <option value="">Select a division</option>
                  {divisions.map(div => (
                    <option key={div} value={div}>
                      Division {div}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-300 mb-2">
                  Season/Date
                </label>
                <select
                  value={selectedSummary?.id || ''}
                  onChange={(e) => {
                    const summary = summariesForDivision.find(s => s.id === e.target.value);
                    setSelectedSummary(summary);
                  }}
                  className="w-full p-2 bg-gray-800 text-white border border-gray-600 rounded focus:outline-none focus:border-yellow-400"
                >
                  <option value="">Select a season</option>
                  {summariesForDivision.map(summary => (
                    <option key={summary.id} value={summary.id}>
                      {new Date(summary.timestamp).toLocaleDateString('en-GB', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric'
                      })}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* View Toggle */}
            {selectedSummary && (
              <>
                <div className="mb-6 flex gap-2">
                  <button
                    onClick={() => setStandingsView('Leaderboard')}
                    className={`px-4 py-2 rounded-lg text-sm font-semibold transition ${
                      standingsView === 'Leaderboard'
                        ? 'bg-yellow-500 text-white'
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }`}
                  >
                    Leaderboard
                  </button>
                  <button
                    onClick={() => setStandingsView('Tracker')}
                    className={`px-4 py-2 rounded-lg text-sm font-semibold transition ${
                      standingsView === 'Tracker'
                        ? 'bg-yellow-500 text-white'
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }`}
                  >
                    Tracker
                  </button>
                </div>

                {/* Leaderboard View */}
                {standingsView === 'Leaderboard' && selectedSummary.final_standings && (
                  <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
                    <h2 className="text-2xl font-bold text-white mb-6">
                      Division {selectedSummary.division} • {new Date(selectedSummary.timestamp).toLocaleDateString()}
                    </h2>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left">
                        <thead className="text-gray-400 text-sm uppercase border-b border-gray-600">
                          <tr>
                            <th className="p-3">#</th>
                            <th className="p-3">Player</th>
                            <th className="p-3 text-center">GP</th>
                            <th className="p-3 text-center text-green-400">W</th>
                            <th className="p-3 text-center text-red-400">L</th>
                            <th className="p-3 text-center text-yellow-400">D</th>
                            <th className="p-3 text-center">Diff</th>
                            <th className="p-3 text-center text-cyan-400">Win %</th>
                            <th className="p-3 text-center">Points</th>
                          </tr>
                        </thead>
                        <tbody>
                          {selectedSummary.final_standings.map((player, idx) => {
                            const gp = (player.wins || 0) + (player.losses || 0) + (player.draws || 0);
                            const winPct = gp > 0 ? (((player.wins || 0) / gp) * 100).toFixed(0) : 0;
                            const diff = (player.points_for || 0) - (player.points_against || 0);

                            return (
                              <tr
                                key={idx}
                                className={`border-b border-gray-700 transition ${
                                  idx === 0
                                    ? 'bg-yellow-900/30'
                                    : idx === 1
                                    ? 'bg-gray-700/30'
                                    : idx === 2
                                    ? 'bg-orange-900/30'
                                    : 'hover:bg-gray-700/20'
                                }`}
                              >
                                <td className="p-3 font-bold text-lg">
                                  {idx === 0 && '🥇'}
                                  {idx === 1 && '🥈'}
                                  {idx === 2 && '🥉'}
                                  {idx > 2 && idx + 1}
                                </td>
                                <td className="p-3 text-white font-medium">{player.name}</td>
                                <td className="p-3 text-center text-gray-300">{gp}</td>
                                <td className="p-3 text-center text-green-400 font-semibold">{player.wins || 0}</td>
                                <td className="p-3 text-center text-red-400 font-semibold">{player.losses || 0}</td>
                                <td className="p-3 text-center text-yellow-400 font-semibold">{player.draws || 0}</td>
                                <td className="p-3 text-center text-gray-300">{diff}</td>
                                <td className="p-3 text-center text-cyan-400 font-semibold">{winPct}%</td>
                                <td className="p-3 text-center font-bold text-yellow-300">{player.points || 0}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Tracker View */}
                {standingsView === 'Tracker' && selectedSummary.matches && (
                  <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
                    <h2 className="text-2xl font-bold text-white mb-6">
                      Match History • Division {selectedSummary.division}
                    </h2>

                    {selectedSummary.matches.length === 0 ? (
                      <p className="text-gray-400 italic">No matches recorded for this season.</p>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-gray-300 text-sm">
                          <thead className="text-gray-400 uppercase border-b border-gray-600">
                            <tr>
                              <th className="p-3">#</th>
                              <th className="p-3">Players</th>
                              <th className="p-3 text-center">Score</th>
                              <th className="p-3">Date</th>
                            </tr>
                          </thead>
                          <tbody>
                            {selectedSummary.matches.map((match, idx) => (
                              <tr
                                key={idx}
                                className="border-b border-gray-700 hover:bg-gray-700/20 transition"
                              >
                                <td className="p-3 font-semibold text-white">{idx + 1}</td>
                                <td className="p-3">
                                  {Array.isArray(match.players)
                                    ? match.players.join(' vs ')
                                    : 'N/A'}
                                </td>
                                <td className="p-3 text-center font-semibold">
                                  {match.scores?.team1 ?? '-'} – {match.scores?.team2 ?? '-'}
                                </td>
                                <td className="p-3 text-gray-400">
                                  {match.created_at ? new Date(match.created_at).toLocaleDateString() : '-'}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
