"use client";

import { useState } from "react";

export default function Home() {
  const [activeTab, setActiveTab] = useState("Standings");

  // Sample players data
  const players = [
    { name: "Maddie", wins: 5, draws: 1, losses: 2, points: 16 },
    { name: "Nathan", wins: 3, draws: 2, losses: 3, points: 11 },
    { name: "Helen", wins: 4, draws: 1, losses: 3, points: 13 },
    { name: "Alex", wins: 2, draws: 3, losses: 3, points: 9 },
  ];

  // Stats boxes
  const stats = [
    {
      label: "Total Players",
      value: players.length,
      highlight: "blue",
      onClick: () => setActiveTab("Players"),
      cursorPointer: true,
    },
    { label: "Current Leader", value: "Maddie", highlight: "gold" },
    { label: "Most Improved", value: "Nathan", highlight: "grayButton" },
    { label: "Highest Win Streak", value: "Helen (7)", highlight: "grayButton" },
  ];

  // Tabs
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

      {/* Stats Cards */}
      <section className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-8">
        {stats.map(({ label, value, highlight, onClick, cursorPointer }, i) => (
          <div
            key={i}
            onClick={onClick}
            className={`rounded-lg p-6 shadow select-none transition-colors duration-200 ${
              highlight === "gold"
                ? "bg-yellow-800 text-yellow-300 hover:bg-yellow-700"
                : highlight === "blue"
                ? "bg-blue-900 text-blue-200 hover:bg-blue-800"
                : highlight === "grayButton"
                ? "bg-gray-700 text-gray-300 hover:bg-gray-600"
                : "bg-gray-700 text-gray-300"
            } ${cursorPointer ? "cursor-pointer" : ""}`}
          >
            <div className="text-xs uppercase mb-1 flex items-center gap-1 font-semibold">
              {label === "Total Players" && (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M17 20h5v-2a4 4 0 00-3-3.87M9 20H4v-2a4 4 0 013-3.87M16 7a4 4 0 11-8 0 4 4 0 018 0z"
                  />
                </svg>
              )}
              {label}
            </div>
            <div className="text-3xl font-bold">{value}</div>
          </div>
        ))}
      </section>

      {/* Tabs & Buttons */}
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
          <button className="ml-auto bg-gray-700 hover:bg-gray-600 text-white px-3 py-1 rounded flex items-center gap-1 text-sm">
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
        {/* Standings / Leaderboard */}
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
                {players.map((player, index) => (
                  <tr
                    key={index}
                    className="border-b even:bg-yellow-50 dark:even:bg-yellow-900/20 hover:bg-gray-100 dark:hover:bg-gray-800"
                  >
                    <td className="p-2">{index + 1}</td>
                    <td className="p-2 font-semibold">{player.name}</td>
                    <td className="p-2 text-green-600 text-center">{player.wins}</td>
                    <td className="p-2 text-yellow-500 text-center">{player.draws}</td>
                    <td className="p-2 text-red-400 text-center">{player.losses}</td>
                    <td className="p-2 text-right font-semibold">{player.points}</td>
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
                {players.map((player, index) => (
                  <tr key={index} className="border-b even:bg-gray-600/40 hover:bg-gray-500/30">
                    <td className="p-2">{index + 1}</td>
                    <td className="p-2">{player.name}</td>
                    <td className="p-2 text-green-400 text-center">{player.wins}</td>
                    <td className="p-2 text-red-400 text-center">{player.losses}</td>
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
