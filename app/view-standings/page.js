'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function ViewStandingsPage() {
  const router = useRouter();
  const [allLeagues, setAllLeagues] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [expandedLeagueId, setExpandedLeagueId] = useState(null);
  const [format, setFormat] = useState('league'); // Default to league

  // Helper: Compute player form from matches
  const computePlayerFormFromMatches = (playerId, matches, limit = 10) => {
    if (!matches || matches.length === 0) return [];
    
    const results = [];
    for (const match of matches) {
      if (!Array.isArray(match.players)) continue;
      
      const playerIndex = match.players.findIndex(p => String(p) === String(playerId));
      if (playerIndex === -1) continue;

      const score = match.scores ? [match.scores.team1, match.scores.team2] : [0, 0];
      if (playerIndex < 2) {
        results.push(score[0] > score[1] ? 'W' : score[0] < score[1] ? 'L' : 'D');
      } else {
        results.push(score[1] > score[0] ? 'W' : score[1] < score[0] ? 'L' : 'D');
      }
    }
    
    return results.reverse().slice(0, limit);
  };

  // Helper: Calculate position changes by comparing positions at different time periods
  const calculatePositionChanges = (standings, matches) => {
    if (!matches || matches.length === 0 || !standings || standings.length === 0) {
      return standings.map((p) => ({ ...p, positionChange: 0 }));
    }

    // Split matches into two halves
    const midpoint = Math.floor(matches.length / 2);
    const matchesFirstHalf = matches.slice(0, midpoint);
    const matchesSecondHalf = matches.slice(midpoint);

    // Function to calculate standings from a subset of matches
    const computeStandingsFromMatches = (matchSubset) => {
      const stats = {};
      standings.forEach(p => {
        stats[p.id] = { wins: 0, losses: 0, draws: 0, points: 0 };
      });

      matchSubset.forEach(match => {
        if (!match.players || !match.scores) return;
        const playersArray = Array.isArray(match.players)
          ? match.players
          : JSON.parse(match.players || '[]');
        if (!Array.isArray(playersArray) || playersArray.length < 4) return;

        const score1 = Number(match.scores?.team1);
        const score2 = Number(match.scores?.team2);
        if (Number.isNaN(score1) || Number.isNaN(score2)) return;

        const team1 = playersArray.slice(0, 2);
        const team2 = playersArray.slice(2, 4);

        if (score1 > score2) {
          team1.forEach(pid => {
            if (stats[pid]) { stats[pid].wins++; stats[pid].points += 3; }
          });
          team2.forEach(pid => {
            if (stats[pid]) { stats[pid].losses++; }
          });
        } else if (score1 < score2) {
          team1.forEach(pid => {
            if (stats[pid]) { stats[pid].losses++; }
          });
          team2.forEach(pid => {
            if (stats[pid]) { stats[pid].wins++; stats[pid].points += 3; }
          });
        } else {
          team1.forEach(pid => {
            if (stats[pid]) { stats[pid].draws++; stats[pid].points += 1; }
          });
          team2.forEach(pid => {
            if (stats[pid]) { stats[pid].draws++; stats[pid].points += 1; }
          });
        }
      });

      return Object.entries(stats)
        .map(([pid, s]) => ({ id: Number(pid), ...s }))
        .sort((a, b) => b.points - a.points);
    };

    const prevStandings = computeStandingsFromMatches(matchesFirstHalf);
    const prevPositions = {};
    prevStandings.forEach((p, idx) => {
      prevPositions[p.id] = idx + 1;
    });

    return standings.map((p, idx) => ({
      ...p,
      positionChange: prevPositions[p.id] !== undefined ? prevPositions[p.id] - (idx + 1) : 0
    }));
  };

  useEffect(() => {
    fetchAllLeagues();
  }, [format]);

  const fetchAllLeagues = async () => {
    try {
      setIsLoading(true);
      const res = await fetch(`/api/season-summaries?format=${format}`);
      if (res.ok) {
        const data = await res.json();
        const leagues = (data.data || [])
          .sort((a, b) => new Date(b.timestamp || b.created_at || 0) - new Date(a.timestamp || a.created_at || 0));
        setAllLeagues(leagues);
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

  const toggleLeague = (leagueId) => {
    setExpandedLeagueId(expandedLeagueId === leagueId ? null : leagueId);
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
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
        <div className="max-w-7xl mx-auto">
          <h1 className="text-4xl font-bold text-white">Fylde Pickleball Club</h1>
          <div className="flex items-start justify-between mt-4">
            <p className="text-gray-400">All League Standings</p>
            <div className="flex flex-col gap-2">
              <button
                onClick={() => router.push('/welcome')}
                className="px-4 py-2 bg-blue-600 text-white rounded font-semibold hover:bg-blue-700 transition"
              >
                ← Back
              </button>
              <div className="flex gap-2">
                <button
                  onClick={() => setFormat('league')}
                  className={`px-4 py-2 rounded font-semibold transition ${
                    format === 'league'
                      ? 'bg-yellow-500 text-gray-900'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  League
                </button>
                <button
                  onClick={() => setFormat('points')}
                  className={`px-4 py-2 rounded font-semibold transition ${
                    format === 'points'
                      ? 'bg-yellow-500 text-gray-900'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  Points Difference
                </button>
                <button
                  onClick={() => setFormat('5player')}
                  className={`px-4 py-2 rounded font-semibold transition ${
                    format === '5player'
                      ? 'bg-yellow-500 text-gray-900'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  5 Player
                </button>
                <button
                  onClick={() => setFormat('roundrobin')}
                  className={`px-4 py-2 rounded font-semibold transition ${
                    format === 'roundrobin'
                      ? 'bg-yellow-500 text-gray-900'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  Round Robin
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto p-6">
        {error && (
          <div className="mb-6 p-4 bg-red-900 text-red-200 rounded">
            {error}
          </div>
        )}

        {allLeagues.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-xl text-gray-400">No standings available yet.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {allLeagues.map((league, idx) => {
              const isExpanded = expandedLeagueId === league.id;
              const leagueDate = league.timestamp ? formatDate(league.timestamp) : 'No date';
              const playerCount = league.final_standings?.length || 0;
              const divisionDisplay = league.divisionName || `Division ${league.division}`;

              return (
                <div key={league.id || idx} className="bg-gray-700 rounded-lg shadow border border-gray-600">
                  {/* League Header - Clickable */}
                  <button
                    onClick={() => toggleLeague(league.id || idx)}
                    className="w-full px-4 py-4 flex items-center justify-between hover:bg-gray-650 transition"
                  >
                    <div className="flex items-center gap-4 text-left flex-1">
                      <span className="text-2xl text-yellow-400">{isExpanded ? '▼' : '▶'}</span>
                      <div>
                        <h3 className="text-lg font-bold text-yellow-400">
                          {divisionDisplay}
                        </h3>
                        <p className="text-sm text-gray-400">{leagueDate} • {league.name}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-400">{playerCount} players</p>
                    </div>
                  </button>

                  {/* League Content - Leaderboard Table */}
                  {isExpanded && league.final_standings && (
                    <div className="border-t border-gray-600 px-4 py-4">
                      <div className="bg-gray-50 rounded-lg overflow-hidden">
                        <div className="overflow-x-auto">
                          <table className="w-full text-left text-sm">
                            <thead className="bg-gray-200 text-gray-900 font-semibold">
                              <tr>
                                <th className="p-3">#</th>
                                <th className="p-3">Player</th>
                                <th className="p-3 text-center">GP</th>
                                <th className="p-3 text-center text-green-600">W</th>
                                <th className="p-3 text-center text-red-500">L</th>
                                <th className="p-3 text-center text-yellow-600">D</th>
                                <th className="p-3 text-center">Diff</th>
                                <th className="p-3 text-center text-cyan-600 font-bold">Win %</th>
                                <th className="p-3">Change</th>
                                <th className="p-3">Form</th>
                                <th className="p-3 text-right">Points</th>
                              </tr>
                            </thead>
                            <tbody>
                              {(() => {
                                const standingsWithChanges = calculatePositionChanges(league.final_standings || [], league.matches || []);
                                return standingsWithChanges.map((player, idx) => {
                                  const gp = (player.wins || 0) + (player.losses || 0) + (player.draws || 0);
                                  const winPct = gp > 0 ? ((player.wins || 0) / gp * 100).toFixed(0) + '%' : '0%';
                                  const diff = (player.points_for || 0) - (player.points_against || 0);
                                  const form = computePlayerFormFromMatches(player.id, league.matches || []);
                                  const change = player.positionChange || 0;

                                  return (
                                    <tr
                                      key={player.id}
                                      className={`border-b transition ${
                                        idx === 0
                                          ? 'bg-yellow-100 hover:bg-yellow-150 shadow-[0_0_15px_rgba(255,215,0,0.35)]'
                                          : idx === 1
                                          ? 'bg-gray-150 hover:bg-gray-200 shadow-[0_0_12px_rgba(192,192,192,0.35)]'
                                          : idx === 2
                                          ? 'bg-orange-100 hover:bg-orange-150 shadow-[0_0_12px_rgba(205,127,50,0.35)]'
                                          : 'even:bg-yellow-50 hover:bg-yellow-100'
                                      }`}
                                    >
                                      <td className="p-3 font-bold text-gray-900">{idx + 1}</td>
                                      <td className="p-3 font-semibold text-gray-900 flex items-center gap-2">
                                        {idx === 0 && <span>🥇</span>}
                                        {idx === 1 && <span>🥈</span>}
                                        {idx === 2 && <span>🥉</span>}
                                        {player.name}
                                      </td>
                                      <td className="p-3 text-center text-gray-700">{gp}</td>
                                      <td className="p-3 text-center text-green-600 font-bold">{player.wins || 0}</td>
                                      <td className="p-3 text-center text-red-500 font-bold">{player.losses || 0}</td>
                                      <td className="p-3 text-center text-yellow-600 font-bold">{player.draws || 0}</td>
                                      <td className="p-3 text-center text-gray-700">{diff}</td>
                                      <td className="p-3 text-center text-cyan-600 font-bold">{winPct}</td>
                                      <td className="p-3 text-center">
                                        {change > 0 && (
                                          <span className="text-green-600 font-semibold flex items-center justify-center gap-1">
                                            <span>▲</span>
                                            <span className="text-sm">{change}</span>
                                          </span>
                                        )}
                                        {change < 0 && (
                                          <span className="text-red-600 font-semibold flex items-center justify-center gap-1">
                                            <span>▼</span>
                                            <span className="text-sm">{Math.abs(change)}</span>
                                          </span>
                                        )}
                                        {change === 0 && (
                                          <span className="text-gray-500">—</span>
                                        )}
                                      </td>
                                      <td className="p-3">
                                        <div className="flex gap-1">
                                          {form.map((result, i) => (
                                            <div
                                              key={i}
                                              className={`w-3 h-3 rounded-sm ${
                                                result === 'W'
                                                  ? 'bg-green-500'
                                                  : result === 'L'
                                                  ? 'bg-red-500'
                                                  : result === 'D'
                                                  ? 'bg-yellow-500'
                                                  : 'bg-gray-400'
                                              }`}
                                              title={`Match ${form.length - i}: ${result}`}
                                            />
                                          ))}
                                        </div>
                                      </td>
                                      <td className="p-3 text-right font-bold text-gray-900">
                                        {player.points || 0}
                                      </td>
                                    </tr>
                                  );
                                });
                              })()}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
