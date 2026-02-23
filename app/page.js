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

  const handleAddPlayer = async () => {
    const name = prompt("Enter new player's name:");
    if (!name) return;

    const { data, error } = await supabase
      .from("players")
      .insert([{ name, wins: 0, draws: 0, losses: 0, points: 0, active: true }])
      .select();

    if (!error) setPlayers((prev) => [...prev, data[0]]);
  };

  const toggleAvailability = async (id) => {
    const player = players.find((p) => p.id === id);
    const newActive = !player.active;

    await supabase.from("players").update({ active: newActive }).eq("id", id);

    setPlayers((prev) =>
      prev.map((p) => (p.id === id ? { ...p, active: newActive } : p))
    );
  };

  const totalPlayers = players.length;
  const currentLeader = players[0]?.name || "—";

  const stats = [
    {
      label: "Total Players",
      value: totalPlayers,
      highlight: "blue",
      onClick: () => setActiveTab("Players"),
      cursorPointer: true,
    },
    { label: "Current Leader", value: currentLeader, highlight: "gold" },
  ];

  const tabs = ["Standings", "Matches", "Players", "Previous Matches"];

  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-800 px-4 py-6 sm:p-8 text-gray-300 font-sans">
      
      {/* Header */}
      <header className="mb-8 relative">
        <h1 className="flex items-center text-2xl sm:text-4xl font-extrabold text-white">
          <span className="mr-3 text-yellow-400 text-3xl sm:text-4xl">🏆</span>
          Fylde Pickleball League
        </h1>
      </header>

      <HeaderStats stats={stats} />

      {/* Tabs */}
      <section className="bg-gray-900 rounded-lg shadow px-3 py-3 mb-4">
        <div className="flex gap-2 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`whitespace-nowrap px-4 py-2 rounded text-sm ${
                activeTab === tab
                  ? "bg-white text-gray-900 font-semibold"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </section>

      {/* Content */}
      <section className="bg-gray-900 rounded-lg shadow p-4 sm:p-6">
        
        {/* ================= STANDINGS ================= */}
        {activeTab === "Standings" && (
          <>
            {/* Mobile Cards */}
            <div className="space-y-3 sm:hidden">
              {players.map((p, i) => (
                <div
                  key={p.id}
                  className="bg-white text-gray-800 rounded-lg p-4 shadow"
                >
                  <div className="flex justify-between items-center mb-2">
                    <div className="font-bold text-lg">
                      #{i + 1} {p.name}
                    </div>
                    <div className="font-bold text-yellow-600">
                      {p.points} pts
                    </div>
                  </div>

                  <div className="flex justify-between text-sm">
                    <span className="text-green-600">W: {p.wins}</span>
                    <span className="text-yellow-500">D: {p.draws}</span>
                    <span className="text-red-500">L: {p.losses}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop Table */}
            <div className="hidden sm:block bg-white text-gray-700 rounded shadow overflow-hidden">
              <table className="w-full text-left">
                <thead className="border-b">
                  <tr>
                    <th className="p-3">#</th>
                    <th className="p-3">Player</th>
                    <th className="p-3 text-center">W</th>
                    <th className="p-3 text-center">D</th>
                    <th className="p-3 text-center">L</th>
                    <th className="p-3 text-right">Points</th>
                  </tr>
                </thead>
                <tbody>
                  {players.map((p, i) => (
                    <tr key={p.id} className="border-b hover:bg-gray-100">
                      <td className="p-3">{i + 1}</td>
                      <td className="p-3 font-semibold">{p.name}</td>
                      <td className="p-3 text-center">{p.wins}</td>
                      <td className="p-3 text-center">{p.draws}</td>
                      <td className="p-3 text-center">{p.losses}</td>
                      <td className="p-3 text-right font-bold">
                        {p.points}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* ================= PLAYERS ================= */}
        {activeTab === "Players" && (
          <>
            {/* Mobile Cards */}
            <div className="space-y-3 sm:hidden">
              {players.map((p, i) => (
                <div
                  key={p.id}
                  className="bg-gray-800 rounded-lg p-4 shadow"
                >
                  <div className="flex justify-between items-center mb-2">
                    <div className="font-bold text-lg">
                      #{i + 1} {p.name}
                    </div>
                    <button
                      onClick={() => toggleAvailability(p.id)}
                      className={`px-3 py-1 rounded-full text-xs font-bold ${
                        p.active
                          ? "bg-green-500 text-white"
                          : "bg-red-500 text-white"
                      }`}
                    >
                      {p.active ? "Available" : "Unavailable"}
                    </button>
                  </div>

                  <div className="flex justify-between text-sm">
                    <span className="text-green-400">Wins: {p.wins}</span>
                    <span className="text-red-400">Losses: {p.losses}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop Table */}
            <div className="hidden sm:block bg-gray-700 rounded shadow overflow-hidden">
              <table className="w-full text-left text-gray-300">
                <thead className="border-b border-gray-600">
                  <tr>
                    <th className="p-3">#</th>
                    <th className="p-3">Name</th>
                    <th className="p-3 text-center">Wins</th>
                    <th className="p-3 text-center">Losses</th>
                    <th className="p-3 text-center">Available</th>
                  </tr>
                </thead>
                <tbody>
                  {players.map((p, i) => (
                    <tr key={p.id} className="border-b border-gray-600">
                      <td className="p-3">{i + 1}</td>
                      <td className="p-3">{p.name}</td>
                      <td className="p-3 text-center">{p.wins}</td>
                      <td className="p-3 text-center">{p.losses}</td>
                      <td className="p-3 text-center">
                        {p.active ? "Yes" : "No"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {activeTab === "Previous Matches" && (
          <p className="italic text-gray-400">
            Previous matches coming soon...
          </p>
        )}
      </section>
    </main>
  );
}