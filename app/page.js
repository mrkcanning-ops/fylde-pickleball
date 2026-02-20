"use client";

import { useState, useEffect } from "react";
import HeaderStats from "../components/HeaderStats";
import Tabs from "../components/Tabs";
import { supabase } from "../lib/supabase"; // make sure this exists
import PreviousMatchesClient from "./PreviousMatchesClient"; // exact file name

export default function HomePage() {
  const [activeTab, setActiveTab] = useState("Standings");
  const [players, setPlayers] = useState([]);

  // Fetch players from Supabase on load
  useEffect(() => {
  const fetchPlayers = async () => {
    const { data, error } = await supabase
      .from("players")
      .select("*");

    if (error) {
      console.log("ERROR OBJECT:", JSON.stringify(error));
    } else {
      console.log("FETCH SUCCESS:", data);
      setPlayers(data);
    }
  };

  fetchPlayers();
}, []);

  // Handle Add Player
  const handleAddPlayer = async () => {
  const name = prompt("Enter new player's name:");
  if (!name) return;

  const { data, error } = await supabase
    .from("players")
    .insert([
      { name, wins: 0, draws: 0, losses: 0, points: 0, active: true }
    ])
    .select();

  if (error) {
    console.log("INSERT ERROR:", JSON.stringify(error));
  } else {
    console.log("INSERT SUCCESS:", data);
    setPlayers((prev) => [...prev, data[0]]);
  }
};

  // Stats calculation
  const totalPlayers = players.length;
  const currentLeader = players[0]?.name || "—";

  const mostImproved = players.reduce(
    (best, p) => (p.improved > (best.improved || 0) ? p : best),
    {}
  ).name || "—";

  const highestWinStreakPlayer = players.reduce(
    (best, p) => (p.win_streak > (best.win_streak || 0) ? p : best),
    {}
  );

  const stats = [
    {
      label: "Total Players",
      value: totalPlayers,
      highlight: "blue",
      onClick: () => setActiveTab("Players"),
      cursorPointer: true,
    },
    { label: "Current Leader", value: currentLeader, highlight: "gold" },
    { label: "Most Improved", value: mostImproved, highlight: "grayButton" },
    {
      label: "Highest Win Streak",
      value: highestWinStreakPlayer.name || "—",
      highlight: "grayButton",
      streak: highestWinStreakPlayer.win_streak || 0,
    },
  ];

  const tabs = ["Standings", "Matches", "Players", "Previous Matches"];

  return (
    <main className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 p-8 text-gray-300 font-sans">
      {/* Header */}
      <header className="mb-8 relative">
        <h1 className="flex items-center text-3xl font-bold text-white mb-1">
          <span className="mr-2 text-yellow-400 text-3xl">🏆</span> Fylde Pickleball League
        </h1>
        <p className="text-gray-400">
          Weekly Matches &middot; 8 Weeks &middot; Prize for winner &middot; 2 Courts
        </p>
      </header>

      {/* Stats */}
      <HeaderStats stats={stats} />

      {/* Tabs */}
      <section className="bg-gray-900 rounded-t-lg shadow px-6 py-3 flex space-x-4 mb-4">
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex items-center gap-1 px-4 py-2 rounded ${
              activeTab === tab
                ? "bg-white text-gray-900 font-semibold shadow"
                : "text-gray-400 cursor-pointer hover:text-white"
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
          <button className="ml-auto bg-gray-700 hover:bg-gray-600 text-white px-3 py-1 rounded flex items-center gap-1 text-sm">
            🔄 Generate Fixtures
          </button>
        )}
      </section>

      {/* Tab Content */}
      <section className="bg-gray-900 rounded-b-lg shadow overflow-hidden p-6 text-gray-300">
        {/* Standings */}
        {activeTab === "Standings" && (
          <div className="bg-white text-gray-700 rounded shadow overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 font-bold bg-gray-50 text-yellow-500">
              🏆 Leaderboard
            </div>
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
                  <tr
                    key={i}
                    className="border-b even:bg-yellow-50 dark:even:bg-yellow-900/20 hover:bg-gray-100 dark:hover:bg-gray-800"
                  >
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
            <div className="flex justify-between items-center px-6 py-4 border-b border-gray-600 font-bold text-gray-300">
              Players
            </div>
            <table className="w-full text-left text-gray-300">
              <thead className="text-gray-400 text-sm uppercase border-b border-gray-600">
                <tr>
                  <th className="p-2">#</th>
                  <th className="p-2">Name</th>
                  <th className="p-2">Wins</th>
                  <th className="p-2">Losses</th>
                </tr>
              </thead>
              <tbody>
                {players.map((p, i) => (
                  <tr key={i} className="border-b even:bg-gray-600/40 hover:bg-gray-500/30">
                    <td className="p-2">{i + 1}</td>
                    <td className="p-2">{p.name}</td>
                    <td className="p-2 text-green-400 text-center">{p.wins}</td>
                    <td className="p-2 text-red-400 text-center">{p.losses}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Matches */}
        {activeTab === "Matches" && (
          <div className="bg-gray-700 rounded shadow p-4">
            <p className="text-gray-300 italic">Matches content coming soon...</p>
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
