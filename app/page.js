"use client";

import { useState, useEffect } from "react";
import HeaderStats from "../components/HeaderStats";
import { supabase } from "../lib/supabase";

export default function HomePage() {
  const [activeTab, setActiveTab] = useState("Standings");
  const [players, setPlayers] = useState([]);
  const [court1Matches, setCourt1Matches] = useState([]);
  const [court2Matches, setCourt2Matches] = useState([]);
  const [court1Scores, setCourt1Scores] = useState([]);
  const [court2Scores, setCourt2Scores] = useState([]);

  // Fetch players on load
  useEffect(() => {
    fetchPlayers();
  }, []);

  const fetchPlayers = async () => {
    const { data, error } = await supabase
      .from("players")
      .select("*")
      .order("points", { ascending: false });
    if (!error) setPlayers(data || []);
  };

  // Add new player
  const handleAddPlayer = async () => {
    const name = prompt("Enter new player's name:");
    if (!name) return;

    const { data, error } = await supabase
      .from("players")
      .insert([{ name, wins: 0, draws: 0, losses: 0, points: 0, active: true }])
      .select();

    if (!error) setPlayers((prev) => [...prev, data[0]]);
    else console.error("Error inserting player:", error);
  };

  // Toggle player availability
  const toggleAvailability = async (id) => {
    const player = players.find((p) => p.id === id);
    const newActive = !player.active;
    await supabase.from("players").update({ active: newActive }).eq("id", id);
    setPlayers((prev) => prev.map((p) => (p.id === id ? { ...p, active: newActive } : p)));
  };

  // Stats
  const totalPlayers = players.length;
  const currentLeader = players[0]?.name || "—";
  const mostImproved = players.reduce((best, p) => (p.improved > (best.improved || 0) ? p : best), {}).name || "—";
  const highestWinStreakPlayer = players.reduce((best, p) => (p.win_streak > (best.win_streak || 0) ? p : best), {});

  const stats = [
    { label: "Total Players", value: totalPlayers, highlight: "blue", onClick: () => setActiveTab("Players"), cursorPointer: true },
    { label: "Current Leader", value: currentLeader, highlight: "gold" },
    { label: "Most Improved", value: mostImproved, highlight: "grayButton" },
    { label: "Highest Win Streak", value: highestWinStreakPlayer.name || "—", highlight: "grayButton", streak: highestWinStreakPlayer.win_streak || 0 },
  ];

  const tabs = ["Standings", "Matches", "Players", "Previous Matches"];

  // Generate matches
  const generateMatches = () => {
    const available = players.filter((p) => p.active);
    let topHalf = [];
    let bottomHalf = [];

    if (available.length < 7) {
      topHalf = available;
      bottomHalf = [];
    } else {
      const half = Math.ceil(available.length / 2);
      topHalf = available.slice(0, half);
      bottomHalf = available.slice(half);
    }

    const pairMatches = (arr) => {
      const matches = [];
      for (let i = 0; i < arr.length - 3; i++) {
        for (let j = i + 1; j < arr.length - 2; j++) {
          for (let k = j + 1; k < arr.length - 1; k++) {
            for (let l = k + 1; l < arr.length; l++) {
              matches.push([arr[i], arr[j], arr[k], arr[l]]);
            }
          }
        }
      }
      return matches;
    };

    const c1 = pairMatches(topHalf);
    const c2 = bottomHalf.length > 0 ? pairMatches(bottomHalf) : [];

    setCourt1Matches(c1);
    setCourt2Matches(c2);
    setCourt1Scores(c1.map(() => ({ team1: 0, team2: 0 })));
    setCourt2Scores(c2.map(() => ({ team1: 0, team2: 0 })));
  };

  // Update score in real-time
  const updateScore = (idx, team, value, court) => {
    const numericValue = value === "" ? 0 : parseInt(value);
    if (court === "court1") {
      const newScores = [...court1Scores];
      if (!newScores[idx]) newScores[idx] = { team1: 0, team2: 0 };
      newScores[idx][team] = numericValue;
      setCourt1Scores(newScores);
    } else {
      const newScores = [...court2Scores];
      if (!newScores[idx]) newScores[idx] = { team1: 0, team2: 0 };
      newScores[idx][team] = numericValue;
      setCourt2Scores(newScores);
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-800 p-8 text-gray-300 font-sans">
      {/* Header */}
      <header className="mb-10 relative">
        <h1 className="flex items-center text-4xl font-extrabold text-white tracking-tight">
          <span className="mr-3 text-yellow-400 text-4xl drop-shadow-md">🏆</span> Fylde Pickleball League
        </h1>
        <p className="text-gray-400 mt-2 text-sm tracking-wide">
          Weekly Matches • 8 Weeks • Prize for Winner • 2 Courts
        </p>
        <div className="absolute -bottom-4 left-0 w-24 h-1 bg-yellow-400 rounded-full" />
      </header>

      {/* Stats */}
      <HeaderStats stats={stats} />

      {/* Tabs */}
      <section className="bg-gray-900 rounded-t-lg shadow px-6 py-3 flex flex-wrap gap-2 mb-4">
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex items-center gap-1 px-4 py-2 rounded ${
              activeTab === tab ? "bg-white text-gray-900 font-semibold shadow" : "text-gray-400 cursor-pointer hover:text-white"
            }`}
          >
            {tab === "Standings" && "🏆"}
            {tab === "Matches" && "⚔"}
            {tab === "Players" && "👥"}
            {tab === "Previous Matches" && "🕒"}
            {tab}
          </button>
        ))}

        {activeTab === "Players" && (
          <button
            onClick={handleAddPlayer}
            className="ml-auto bg-gray-700 hover:bg-gray-600 text-white px-3 py-1 rounded flex items-center gap-1 text-sm"
          >
            👤 Add Player
          </button>
        )}

        {activeTab === "Matches" && (
          <button onClick={generateMatches} className="ml-auto bg-gray-700 hover:bg-gray-600 text-white px-3 py-1 rounded flex items-center gap-1 text-sm">
            🔄 Generate Fixtures
          </button>
        )}
      </section>

      {/* Tab Content */}
      <section className="bg-gray-900 rounded-b-lg shadow overflow-hidden p-6 text-gray-300">
        {/* Standings */}
        {activeTab === "Standings" && (
          <div className="bg-white text-gray-700 rounded shadow overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 font-bold bg-gray-50 text-yellow-500">🏆 Leaderboard</div>
            <table className="w-full text-left">
              <thead className="text-gray-400 text-sm uppercase border-b border-gray-200">
                <tr>
                  <th className="p-2">#</th>
                  <th className="p-2">Player</th>
                  <th className="p-2 text-green-600">W</th>
                  <th className="p-2 text-yellow-500">D</th>
                  <th className="p-2 text-red-400">L</th>
                  <th className="p-2 text-right">Points</th>
                </tr>
              </thead>
              <tbody>
                {players.map((p, i) => (
                  <tr key={i} className="border-b even:bg-yellow-50 dark:even:bg-yellow-900/20 hover:bg-gray-100 dark:hover:bg-gray-800">
                    <td className="p-2">{i + 1}</td>
                    <td className="p-2 font-semibold">{p.name}</td>
                    <td className="p-2 text-green-600 text-center">{p.wins}</td>
                    <td className="p-2 text-yellow-500 text-center">{p.draws}</td>
                    <td className="p-2 text-red-400 text-center">{p.losses}</td>
                    <td className="p-2 text-right font-semibold">{p.points}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Players */}
        {activeTab === "Players" && (
          <div className="bg-gray-700 rounded shadow overflow-hidden">
            <div className="flex justify-between items-center px-6 py-4 border-b border-gray-600 font-bold text-gray-300">Players</div>
            <table className="w-full text-left text-gray-300">
              <thead className="text-gray-400 text-sm uppercase border-b border-gray-600">
                <tr>
                  <th className="p-2">#</th>
                  <th className="p-2">Name</th>
                  <th className="p-2">Wins</th>
                  <th className="p-2">Losses</th>
                  <th className="p-2">Available</th>
                </tr>
              </thead>
              <tbody>
                {players.map((p, i) => (
                  <tr key={i} className="border-b even:bg-gray-600/40 hover:bg-gray-500/30">
                    <td className="p-2">{i + 1}</td>
                    <td className="p-2">{p.name}</td>
                    <td className="p-2 text-green-400 text-center">{p.wins}</td>
                    <td className="p-2 text-red-400 text-center">{p.losses}</td>
                    <td className="p-2 text-center">
                      <button
                        onClick={() => toggleAvailability(p.id)}
                        className={`px-2 py-1 rounded-full font-bold transition-colors ${
                          p.active ? "bg-green-500 text-white" : "bg-red-500 text-white"
                        }`}
                      >
                        {p.active ? "Yes" : "No"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Matches */}
        {activeTab === "Matches" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Court 1 */}
            <div className="bg-gray-700 rounded shadow p-4">
              <h2 className="text-yellow-400 font-bold mb-4 text-xl">Court 1</h2>
              {court1Matches.map((match, idx) => (
                <div key={idx} className="mb-4 p-3 sm:p-4 bg-gray-800 rounded-lg shadow hover:bg-gray-700 transition">
                  <div className="mb-2 font-semibold text-gray-200 text-sm sm:text-base break-words">
                    {match[0].name} & {match[1].name} vs {match[2].name} & {match[3].name}
                  </div>
                  <div className="flex items-center space-x-2 mt-2 bg-gray-900 p-2 rounded-lg">
                    <input
                      type="number"
                      min={0}
                      value={court1Scores[idx]?.team1 || ""}
                      onChange={(e) => updateScore(idx, "team1", e.target.value, "court1")}
                      className="w-16 sm:w-20 px-2 py-1 rounded-lg text-gray-900 font-bold text-center shadow-inner focus:outline-none focus:ring-2 focus:ring-yellow-400"
                    />
                    <span className="font-bold text-gray-300">-</span>
                    <input
                      type="number"
                      min={0}
                      value={court1Scores[idx]?.team2 || ""}
                      onChange={(e) => updateScore(idx, "team2", e.target.value, "court1")}
                      className="w-16 sm:w-20 px-2 py-1 rounded-lg text-gray-900 font-bold text-center shadow-inner focus:outline-none focus:ring-2 focus:ring-yellow-400"
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* Court 2 */}
            <div className="bg-gray-700 rounded shadow p-4">
              <h2 className="text-yellow-400 font-bold mb-4 text-xl">Court 2</h2>
              {court2Matches.map((match, idx) => (
                <div key={idx} className="mb-4 p-3 sm:p-4 bg-gray-800 rounded-lg shadow hover:bg-gray-700 transition">
                  <div className="mb-2 font-semibold text-gray-200 text-sm sm:text-base break-words">
                    {match[0].name} & {match[1].name} vs {match[2].name} & {match[3].name}
                  </div>
                  <div className="flex items-center space-x-2 mt-2 bg-gray-900 p-2 rounded-lg">
                    <input
                      type="number"
                      min={0}
                      value={court2Scores[idx]?.team1 || ""}
                      onChange={(e) => updateScore(idx, "team1", e.target.value, "court2")}
                      className="w-16 sm:w-20 px-2 py-1 rounded-lg text-gray-900 font-bold text-center shadow-inner focus:outline-none focus:ring-2 focus:ring-yellow-400"
                    />
                    <span className="font-bold text-gray-300">-</span>
                    <input
                      type="number"
                      min={0}
                      value={court2Scores[idx]?.team2 || ""}
                      onChange={(e) => updateScore(idx, "team2", e.target.value, "court2")}
                      className="w-16 sm:w-20 px-2 py-1 rounded-lg text-gray-900 font-bold text-center shadow-inner focus:outline-none focus:ring-2 focus:ring-yellow-400"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Previous Matches */}
        {activeTab === "Previous Matches" && (
          <div className="bg-gray-700 rounded shadow p-4">
            <p className="text-gray-300 italic">Previous matches content coming soon...</p>
          </div>
        )}
      </section>
    </main>
  );
}