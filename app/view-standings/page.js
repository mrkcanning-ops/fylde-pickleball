'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

const COLORS = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E2',
  '#F8B739', '#52B788', '#F94144', '#F3722C', '#8ECAE6', '#FB5607', '#FFBE0B', '#FB5607'
];

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

  // Helper: Build bump chart data from season summary
  const getBumpChartDataForSummary = (summary) => {
    if (!summary?.tracker || summary.tracker.length === 0) {
      return { weeks: [], lines: [] };
    }

    const tracker = summary.tracker || [];
    const weeks = tracker.map((snap, i) => `Match ${i + 1}`);

    const playerHistory = {};
    
    tracker.forEach((snap, weekIndex) => {
      (snap.standings || []).forEach((player, rankIndex) => {
        const playerId = player.id;
        if (!playerHistory[playerId]) {
          playerHistory[playerId] = { name: player.name, positions: [] };
        }
        playerHistory[playerId].positions.push({ weekIndex, rank: rankIndex + 1 });
      });
    });

    const lines = Object.values(playerHistory)
      .sort((a, b) => {
        const aLastRank = a.positions[a.positions.length - 1]?.rank || Infinity;
        const bLastRank = b.positions[b.positions.length - 1]?.rank || Infinity;
        return aLastRank - bLastRank;
      })
      .map((player, idx) => ({
        name: player.name,
        positions: player.positions,
        color: COLORS[idx % COLORS.length]
      }));

    return { weeks, lines };
  };

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
                  <div className="p-6 bg-gray-50">
                    <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
                      <h2 className="text-xl font-bold text-gray-900 mb-6">
                        Standings • Division {selectedSummary.division}
                      </h2>

                      <div className="overflow-x-auto">
                        <table className="w-full text-left">
                          <thead className="text-gray-400 text-sm uppercase border-b border-gray-200">
                            <tr>
                              <th className="p-2">#</th>
                              <th className="p-2">Player</th>
                              <th className="p-2 text-center text-gray-700">GP</th>
                              <th className="p-2 text-green-600">W</th>
                              <th className="p-2 text-red-400">L</th>
                              <th className="p-2 text-yellow-500">D</th>
                              <th className="p-2 text-center text-gray-700">Diff</th>
                              <th className="p-2 text-center text-cyan-600 font-black">Win %</th>
                              <th className="p-2">Change</th>
                              <th className="p-2">Form</th>
                              <th className="p-2 text-right">Points</th>
                            </tr>
                          </thead>
                          <tbody>
                            {selectedSummary.final_standings.map((player, idx) => {
                              const gp = (player.wins || 0) + (player.losses || 0) + (player.draws || 0);
                              const winPct = gp > 0 ? ((player.wins || 0) / gp * 100).toFixed(0) + '%' : '0%';
                              const diff = (player.points_for || 0) - (player.points_against || 0);
                              const form = computePlayerFormFromMatches(player.id, selectedSummary.matches || []);

                              return (
                                <tr
                                  key={player.id}
                                  className={`border-b hover:bg-gray-100 transition ${
                                    idx === 0
                                      ? 'bg-yellow-50 shadow-[0_0_15px_rgba(255,215,0,0.35)]'
                                      : idx === 1
                                      ? 'bg-gray-100 shadow-[0_0_12px_rgba(192,192,192,0.35)]'
                                      : idx === 2
                                      ? 'bg-orange-50 shadow-[0_0_12px_rgba(205,127,50,0.35)]'
                                      : 'even:bg-yellow-50'
                                  }`}
                                >
                                  <td className="p-2">{idx + 1}</td>
                                  <td className="p-2 font-semibold flex items-center gap-2">
                                    {idx === 0 && <span>🥇</span>}
                                    {idx === 1 && <span>🥈</span>}
                                    {idx === 2 && <span>🥉</span>}
                                    {player.name}
                                  </td>
                                  <td className="p-2 text-center text-gray-700">{gp}</td>
                                  <td className="p-2 text-green-600 text-center">{player.wins || 0}</td>
                                  <td className="p-2 text-red-400 text-center">{player.losses || 0}</td>
                                  <td className="p-2 text-yellow-500 text-center">{player.draws || 0}</td>
                                  <td className="p-2 text-center text-gray-700">{diff}</td>
                                  <td className="p-2 text-center text-cyan-600 font-black text-base">{winPct}</td>
                                  <td className="p-2 text-center">
                                    {player.positionChange !== undefined ? (
                                      (() => {
                                        const change = player.positionChange;
                                        if (change > 0) {
                                          return (
                                            <span className="text-green-600 font-semibold flex items-center justify-center gap-1">
                                              <span>▲</span>
                                              <span className="text-sm">{change}</span>
                                            </span>
                                          );
                                        }
                                        if (change < 0) {
                                          return (
                                            <span className="text-red-600 font-semibold flex items-center justify-center gap-1">
                                              <span>▼</span>
                                              <span className="text-sm">{Math.abs(change)}</span>
                                            </span>
                                          );
                                        }
                                        return <span className="text-gray-400">—</span>;
                                      })()
                                    ) : (
                                      <span className="text-gray-400">—</span>
                                    )}
                                  </td>
                                  <td className="p-2">
                                    <div className="flex gap-1 justify-start">
                                      {(() => {
                                        const padded = Array(Math.max(0, 10 - (form.length || 0)))
                                          .fill(null)
                                          .concat(form.length ? form : [])
                                          .slice(0, 10);
                                        return padded.map((r, formIdx) => (
                                          <span
                                            key={formIdx}
                                            className={`w-3 h-3 rounded-sm inline-block border ${
                                              r === 'W'
                                                ? 'bg-green-500 border-green-600'
                                                : r === 'L'
                                                ? 'bg-red-500 border-red-600'
                                                : r === 'D'
                                                ? 'bg-yellow-400 border-yellow-500'
                                                : 'bg-gray-200 border-gray-300'
                                            }`}
                                            title={
                                              r === 'W' ? 'Win' : r === 'L' ? 'Loss' : r === 'D' ? 'Draw' : 'No match'
                                            }
                                          />
                                        ));
                                      })()}
                                    </div>
                                  </td>
                                  <td className="p-2 text-right font-semibold">{player.points}</td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}

                {/* Tracker View */}
                {standingsView === 'Tracker' && selectedSummary && (
                  <div className="p-6 bg-gray-50">
                    <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-4">
                        <div>
                          <h2 className="text-xl font-bold text-gray-900">Tracker</h2>
                          <p className="text-sm text-gray-500">A bump chart showing player ranking position each match.</p>
                        </div>
                      </div>

                      {(() => {
                        const trackerData = getBumpChartDataForSummary(selectedSummary);
                        if (trackerData.weeks.length === 0) {
                          return (
                            <p className="text-gray-500">No tracker data available for this season.</p>
                          );
                        }

                        const maxRank = Math.max(
                          ...trackerData.lines.flatMap(line => line.positions.map(p => p.rank)),
                          5
                        );
                        const rowHeight = 28;
                        const topPadding = 25;
                        const bottomPadding = 25;
                        const chartHeight = topPadding + maxRank * rowHeight + bottomPadding;
                        const viewBoxWidth = Math.max(800, trackerData.weeks.length * 80);

                        return (
                          <div className="bg-gray-800 rounded-lg p-6 overflow-x-auto">
                            <svg width="100%" height={Math.max(400, chartHeight)} className="min-w-full" viewBox={`0 0 ${viewBoxWidth} ${chartHeight}`}>
                              {/* Background grid */}
                              {trackerData.weeks.map((_, weekIdx) => (
                                <line
                                  key={`grid-v-${weekIdx}`}
                                  x1={80 + weekIdx * 80}
                                  y1={topPadding}
                                  x2={80 + weekIdx * 80}
                                  y2={topPadding + maxRank * rowHeight}
                                  stroke="#374151"
                                  strokeWidth="0.5"
                                  strokeDasharray="2,2"
                                />
                              ))}
                              {Array.from({ length: maxRank }).map((_, i) => (
                                <line
                                  key={`grid-h-${i}`}
                                  x1="50"
                                  y1={topPadding + i * rowHeight}
                                  x2={viewBoxWidth - 20}
                                  y2={topPadding + i * rowHeight}
                                  stroke="#374151"
                                  strokeWidth="0.5"
                                  strokeDasharray="2,2"
                                />
                              ))}

                              {/* Y-axis (rankings) */}
                              {Array.from({ length: maxRank }).map((_, i) => (
                                <text key={`y-label-${i}`} x="40" y={topPadding + 10 + i * rowHeight} fontSize="10" fontWeight="600" textAnchor="end" fill="#9CA3AF">
                                  {i + 1}
                                </text>
                              ))}

                              {/* X-axis (weeks/matches) */}
                              {trackerData.weeks.map((week, weekIdx) => (
                                <text key={`x-label-${weekIdx}`} x={80 + weekIdx * 80} y={topPadding + maxRank * rowHeight + 18} fontSize="9" textAnchor="middle" fill="#9CA3AF">
                                  {week}
                                </text>
                              ))}

                              {/* Y-axis and X-axis lines */}
                              <line x1="50" y1={topPadding} x2="50" y2={topPadding + maxRank * rowHeight} stroke="#6B7280" strokeWidth="2" />
                              <line x1="50" y1={topPadding + maxRank * rowHeight} x2={viewBoxWidth - 20} y2={topPadding + maxRank * rowHeight} stroke="#6B7280" strokeWidth="2" />

                              {/* Player lines and dots with position numbers */}
                              {trackerData.lines.map((line, lineIdx) => {
                                const points = line.positions
                                  .map((pos) => {
                                    const x = 80 + pos.weekIndex * 80;
                                    const y = topPadding + (pos.rank - 1) * rowHeight;
                                    return `${x},${y}`;
                                  })
                                  .join(' ');

                                return (
                                  <g key={lineIdx}>
                                    {/* Line */}
                                    <polyline
                                      points={points}
                                      fill="none"
                                      stroke={line.color}
                                      strokeWidth="2.5"
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      opacity="0.85"
                                    />
                                    {/* Dots with position numbers */}
                                    {line.positions.map((pos, posIdx) => {
                                      const cx = 80 + pos.weekIndex * 80;
                                      const cy = topPadding + (pos.rank - 1) * rowHeight;
                                      return (
                                        <g key={`dot-${posIdx}`}>
                                          {/* Colored dot */}
                                          <circle
                                            cx={cx}
                                            cy={cy}
                                            r="4"
                                            fill={line.color}
                                            opacity="0.95"
                                          />
                                          {/* Position number text */}
                                          <text
                                            x={cx}
                                            y={cy}
                                            textAnchor="middle"
                                            dominantBaseline="middle"
                                            fontSize="7.5"
                                            fontWeight="700"
                                            fill="white"
                                            pointerEvents="none"
                                          >
                                            {pos.rank}
                                          </text>
                                        </g>
                                      );
                                    })}
                                    {/* End label with player name */}
                                    {line.positions.length > 0 && (
                                      <text
                                        x={80 + (line.positions[line.positions.length - 1].weekIndex + 1) * 80 + 12}
                                        y={topPadding + (line.positions[line.positions.length - 1].rank - 1) * rowHeight + 4}
                                        fontSize="11"
                                        fontWeight="600"
                                        fill={line.color}
                                      >
                                        {line.name}
                                      </text>
                                    )}
                                  </g>
                                );
                              })}
                            </svg>
                          </div>
                        );
                      })()}
                    </div>
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
