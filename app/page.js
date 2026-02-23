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
  const mostImproved =
    players.reduce(
      (best, p) =>
        p.improved > (best.improved || 0) ? p : best,
      {}
    ).name || "—";

  const highestWinStreakPlayer =
    players.reduce(
      (best, p) =>
        p.win_streak > (best.win_streak || 0) ? p : best,
      {}
    ) || {};

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

  const generateMatches = () => {
    const available = players.filter((p) => p.active);
    let topHalf = [];
    let bottomHalf = [];

    if (available.length < 7) {
      topHalf = available;
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
    const c2 = bottomHalf.length ? pairMatches(bottomHalf) : [];

    setCourt1Matches(c1);
    setCourt2Matches(c2);
    setCourt1Scores(c1.map(() => ({ team1: 0, team2: 0 })));
    setCourt2Scores(c2.map(() => ({ team1: 0, team2: 0 })));
  };

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
    <main className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-800 px-4 py-6 sm:p-8 text-gray-300 font-sans">
      
      {/* Header */}
      <header className="mb-8 sm:mb-10 relative">
        <h1 className="flex items-center text-2xl sm:text-4xl font-extrabold text-white tracking-tight">
          <span className="mr-3 text-yellow-400 text-3xl sm:text-4xl drop-shadow-md">
            🏆
          </span>
          Fylde Pickleball League
        </h1>
        <p className="text-gray-400 mt-2 text-xs sm:text-sm tracking-wide">
          Weekly Matches • 8 Weeks • Prize for Winner • 2 Courts
        </p>
        <div className="absolute -bottom-3 left-0 w-20 sm:w-24 h-1 bg-yellow-400 rounded-full" />
      </header>

      <HeaderStats stats={stats} />

      {/* Tabs */}
      <section className="bg-gray-900 rounded-t-lg shadow px-3 sm:px-6 py-3 mb-4">
        <div className="flex gap-2 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`whitespace-nowrap flex items-center gap-1 px-4 py-2 rounded text-sm sm:text-base ${
                activeTab === tab
                  ? "bg-white text-gray-900 font-semibold shadow"
                  : "text-gray-400 hover:text-white"
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
              className="ml-auto bg-gray-700 hover:bg-gray-600 text-white px-3 py-2 rounded text-sm whitespace-nowrap"
            >
              👤 Add
            </button>
          )}

          {activeTab === "Matches" && (
            <button
              onClick={generateMatches}
              className="ml-auto bg-gray-700 hover:bg-gray-600 text-white px-3 py-2 rounded text-sm whitespace-nowrap"
            >
              🔄 Generate
            </button>
          )}
        </div>
      </section>

      {/* Content */}
      <section className="bg-gray-900 rounded-b-lg shadow overflow-hidden p-4 sm:p-6 text-gray-300">
        
        {/* Standings */}
{activeTab === "Standings" && (
  <div className="bg-white text-gray-700 rounded shadow overflow-hidden">
    <div className="px-6 py-4 border-b border-gray-200 font-bold bg-gray-50 text-yellow-500">
      🏆 Leaderboard
    </div>

    {/* ================= MOBILE CARDS ================= */}
    <div className="sm:hidden p-4 space-y-3 bg-gray-50">
      {players.map((p, i) => (
        <div
          key={p.id}
          className="bg-white rounded-lg shadow border border-gray-200 p-4"
        >
          <div className="flex justify-between items-center mb-2">
            <span className="font-bold text-gray-900">
              #{i + 1} {p.name}
            </span>
            <span className="font-bold text-gray-900">
              {p.points} pts
            </span>
          </div>

          <div className="flex justify-between text-sm font-semibold">
            <span className="text-green-600">W {p.wins}</span>
            <span className="text-yellow-500">D {p.draws}</span>
            <span className="text-red-400">L {p.losses}</span>
          </div>
        </div>
      ))}
    </div>

    {/* ================= DESKTOP TABLE (UNCHANGED STYLE) ================= */}
    <table className="hidden sm:table w-full text-left">
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
            key={p.id}
            className="border-b even:bg-yellow-50 hover:bg-gray-100"
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

        {/* Matches */}
        {activeTab === "Matches" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
            {[{
              title: "Court 1",
              matches: court1Matches,
              scores: court1Scores,
              court: "court1"
            },{
              title: "Court 2",
              matches: court2Matches,
              scores: court2Scores,
              court: "court2"
            }].map(({ title, matches, scores, court }) => (
              <div key={title} className="bg-gray-700 rounded shadow p-4">
                <h2 className="text-yellow-400 font-bold mb-4 text-lg sm:text-xl">
                  {title}
                </h2>

                {matches.map((match, idx) => (
                  <div key={idx} className="mb-4 p-3 bg-gray-800 rounded-lg">
                    <div className="mb-3 font-semibold text-gray-200 text-sm break-words">
                      {match[0].name} & {match[1].name}
                      <br className="sm:hidden" />
                      <span className="hidden sm:inline"> vs </span>
                      <br className="sm:hidden" />
                      {match[2].name} & {match[3].name}
                    </div>

                    <div className="flex justify-center items-center gap-3 bg-gray-900 p-3 rounded-lg">
                      <input
                        type="number"
                        min={0}
                        value={scores[idx]?.team1 || ""}
                        onChange={(e) =>
                          updateScore(idx, "team1", e.target.value, court)
                        }
                        className="w-16 px-2 py-2 rounded text-gray-900 font-bold text-center focus:ring-2 focus:ring-yellow-400"
                      />
                      <span className="font-bold text-gray-300">-</span>
                      <input
                        type="number"
                        min={0}
                        value={scores[idx]?.team2 || ""}
                        onChange={(e) =>
                          updateScore(idx, "team2", e.target.value, court)
                        }
                        className="w-16 px-2 py-2 rounded text-gray-900 font-bold text-center focus:ring-2 focus:ring-yellow-400"
                      />
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}

        {activeTab === "Previous Matches" && (
          <div className="bg-gray-700 rounded shadow p-4">
            <p className="text-gray-300 italic text-sm">
              Previous matches content coming soon...
            </p>
          </div>
        )}
      </section>
    </main>
  );
}