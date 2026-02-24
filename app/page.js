"use client";

import { useState, useEffect } from "react";
import HeaderStats from "../components/HeaderStats";
import { supabase } from "../lib/supabase";

export default function HomePage() {
  const [activeTab, setActiveTab] = useState("Standings");
  const [division, setDivision] = useState(1); // 1 or 2
  const [players, setPlayers] = useState([]);

  const [court1Matches, setCourt1Matches] = useState([]);
  const [court2Matches, setCourt2Matches] = useState([]);

  const [court1Scores, setCourt1Scores] = useState([]);
  const [court2Scores, setCourt2Scores] = useState([]);

  const [court1Round, setCourt1Round] = useState(0);
const [court2Round, setCourt2Round] = useState(0);

  const [currentRound, setCurrentRound] = useState(0);
const [roundMatches, setRoundMatches] = useState([]); // flattened all matches by round

  useEffect(() => {
    fetchPlayers();
  }, [division]);

  const fetchPlayers = async () => {
    const { data, error } = await supabase
      .from("players")
      .select("*")
      .eq("division", division) // filter by current division
      .order("points", { ascending: false });

    if (!error) setPlayers(data || []);
  };

  const toggleDivision = () => {
    setDivision(division === 1 ? 2 : 1);
  };

  const handleAddPlayer = async () => {
    const name = prompt("Enter new player's name:");
    if (!name) return;

    const { data, error } = await supabase
      .from("players")
      .insert([{ name, wins: 0, draws: 0, losses: 0, points: 0, active: true, division }])
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

  const currentLeader = players[0]?.name || "—";
  const mostImproved =
    players.reduce(
      (best, p) => (p.improved > (best.improved || 0) ? p : best),
      {}
    ).name || "—";

  const highestWinStreakPlayer =
    players.reduce(
      (best, p) => (p.win_streak > (best.win_streak || 0) ? p : best),
      {}
    ) || {};

  const stats = [
    {
  label: "Division",
  value: division, // keep a value so HeaderStats shows the stat
  highlight: "blue",
  onClick: toggleDivision,
  renderCustom: () => (
    <div className="flex flex-col items-center cursor-pointer select-none">
      {/* Current division */}
      <span className="text-yellow-400 font-extrabold text-lg">
        Division {division}
      </span>
      {/* Other division */}
      <span className="text-gray-400 text-sm mt-1">
        Division {division === 1 ? 2 : 1}
      </span>
    </div>
  ),
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
  if (available.length < 4) {
    alert("At least 4 active players required.");
    return;
  }

  // Split roughly in half for 2 courts
  const half = Math.ceil(available.length / 2);
  const court1Group = available.slice(0, half);
  const court2Group = available.slice(half);

  // Function to generate round-robin 2v2 schedule for a court
  const buildCourtRounds = (group) => {
    const N = group.length;
    const rounds = [];
    const usedPairs = new Set();

    // Generate all 2-player combinations
    const pairs = [];
    for (let i = 0; i < N; i++) {
      for (let j = i + 1; j < N; j++) {
        pairs.push([group[i], group[j]]);
      }
    }

    // Each round, pick 2 pairs (4 players) that haven't been together yet
    // Remaining players sit out as bye
    for (let round = 0; round < N; round++) {
      const roundPlayers = new Set();
      const roundPairs = [];
      const byePlayers = [];

      // Pick 2 pairs for this round
      for (const [a, b] of pairs) {
        const key = [a.id, b.id].sort().join("-");
        if (!usedPairs.has(key) && !roundPlayers.has(a.id) && !roundPlayers.has(b.id)) {
          roundPairs.push([a, b]);
          roundPlayers.add(a.id);
          roundPlayers.add(b.id);
          usedPairs.add(key);
          if (roundPairs.length === 2) break;
        }
      }

      // Handle cases where not enough new pairs left: fill with any available
      if (roundPairs.length < 2) {
        for (let i = 0; i < group.length; i++) {
          if (!roundPlayers.has(group[i].id)) {
            roundPlayers.add(group[i].id);
            byePlayers.push(group[i]);
          }
        }
        // If fewer than 4 players, pad roundPairs with bye players to 2v2
        while (roundPairs.flat().length < 4 && byePlayers.length > 0) {
          const p = byePlayers.shift();
          roundPairs.push([p, p]); // dummy pairing, will never happen
        }
      }

      // Calculate bye players (not in roundPairs)
      group.forEach((p) => {
        if (!roundPlayers.has(p.id)) byePlayers.push(p);
      });

      rounds.push({ match: roundPairs, bye: byePlayers });
    }

    return rounds;
  };

  const court1Rounds = buildCourtRounds(court1Group);
  const court2Rounds = buildCourtRounds(court2Group);

  // Save matches and scores
  setCourt1Matches(court1Rounds.map((r) => r.match));
  setCourt1Scores(court1Rounds.map(() => ({ team1: 0, team2: 0 })));
  setCourt1Round(0);

  setCourt2Matches(court2Rounds.map((r) => r.match));
  setCourt2Scores(court2Rounds.map(() => ({ team1: 0, team2: 0 })));
  setCourt2Round(0);

  // Save bye players for JSX display
  setRoundMatches({
    court1: court1Rounds.map((r) => r.bye),
    court2: court2Rounds.map((r) => r.bye),
  });
};

  const updateScore = (idx, team, value, court) => {
  if (court === "court1") {
    const newScores = [...court1Scores];
    if (!newScores[idx]) newScores[idx] = { team1: "", team2: "" };
    newScores[idx][team] = value; // keep as string
    setCourt1Scores(newScores);
  } else {
    const newScores = [...court2Scores];
    if (!newScores[idx]) newScores[idx] = { team1: "", team2: "" };
    newScores[idx][team] = value; // keep as string
    setCourt2Scores(newScores);
  }
};

const saveMatches = () => {
  alert("Save logic coming next.");
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
      <section className="bg-gray-900 rounded-t-lg shadow px-4 py-4 mb-4">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {tabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex items-center justify-center gap-2 px-4 py-3 rounded-lg text-sm sm:text-base font-medium transition ${
                activeTab === tab
                  ? "bg-white text-gray-900 shadow"
                  : "bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700"
              }`}
            >
              {tab === "Standings" && "🏆"}
              {tab === "Matches" && "⚔"}
              {tab === "Players" && "👥"}
              {tab === "Previous Matches" && "🕒"}
              <span>{tab}</span>
            </button>
          ))}
        </div>

        {activeTab === "Players" && (
          <div className="mt-4 flex justify-end">
            <button
              onClick={handleAddPlayer}
              className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded text-sm"
            >
              👤 Add Player
            </button>
          </div>
        )}

        {activeTab === "Matches" && (
          <div className="mt-4 flex justify-end">
            <button
              onClick={generateMatches}
              className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded text-sm"
            >
              🔄 Generate Fixtures
            </button>
          </div>
        )}
      </section>

      {/* Content */}
      <section className="bg-gray-900 rounded-b-lg shadow overflow-hidden p-4 sm:p-6 text-gray-300">

        {/* Standings */}
{activeTab === "Standings" && (
  <div className="bg-white text-gray-700 rounded-2xl shadow-lg overflow-hidden">
    <div className="px-6 py-4 border-b border-gray-200 font-bold bg-gray-50 text-yellow-500">
      🏆 Leaderboard
    </div>

    {/* Mobile Cards */}
<div className="sm:hidden p-4 space-y-2 bg-gray-50">
  {/* Header Row */}
  <div className="grid grid-cols-7 text-xs font-bold text-gray-400 text-center mb-1">
    <span>GP</span>
    <span className="text-green-600">W</span>
    <span className="text-red-400">L</span>
    <span className="text-yellow-500">D</span>
    <span>Diff</span>
    <span>Win %</span>
    <span>Pts</span>
  </div>

  {players.map((p, i) => {
    const gp = p.wins + p.losses + p.draws;
    const winPct = gp > 0 ? ((p.wins / gp) * 100).toFixed(0) + "%" : "0%";
    const diff = p.points - (gp - p.points); // Adjust as needed

    return (
      <div
        key={p.id}
        className={`rounded-lg shadow border p-4 transition
          ${
            i === 0
              ? "bg-yellow-50 border-yellow-300 shadow-[0_0_20px_rgba(255,215,0,0.5)]"
              : i === 1
              ? "bg-gray-100 border-gray-300 shadow-[0_0_18px_rgba(192,192,192,0.5)]"
              : i === 2
              ? "bg-orange-50 border-orange-300 shadow-[0_0_18px_rgba(205,127,50,0.5)]"
              : "bg-white border-gray-200"
          }`}
      >
        {/* Player Name and Rank */}
        <div className="flex justify-between items-center mb-2">
          <span className="font-bold text-gray-900 flex items-center gap-2">
            {i === 0 && "🥇"}
            {i === 1 && "🥈"}
            {i === 2 && "🥉"}
            #{i + 1} {p.name}
          </span>
          <span className="font-bold text-gray-900">{p.points} pts</span>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-7 text-sm font-semibold gap-1 text-center">
          <span className="text-gray-700">{gp}</span>
          <span className="text-green-600">{p.wins}</span>
          <span className="text-red-400">{p.losses}</span>
          <span className="text-yellow-500">{p.draws}</span>
          <span className="text-gray-700">{diff}</span>
          <span className="text-gray-700">{winPct}</span>
          <span className="text-gray-900 font-bold">{p.points}</span>
        </div>
      </div>
    );
  })}
</div>

    {/* Desktop Table */}
    <table className="hidden sm:table w-full text-left">
      <thead className="text-gray-400 text-sm uppercase border-b border-gray-200">
        <tr>
          <th className="p-2">#</th>
          <th className="p-2">Player</th>
          <th className="p-2 text-center text-gray-700">GP</th>
          <th className="p-2 text-green-600">W</th>
          <th className="p-2 text-red-400">L</th>
          <th className="p-2 text-yellow-500">D</th>
          <th className="p-2 text-center text-gray-700">Diff</th>
          <th className="p-2 text-center text-gray-700">Win %</th>
          <th className="p-2 text-right">Points</th>
        </tr>
      </thead>
      <tbody>
        {players.map((p, i) => {
          const gp = p.wins + p.losses + p.draws;
          const winPct = gp > 0 ? ((p.wins / gp) * 100).toFixed(0) + "%" : "0%";
          const diff = p.points - (gp - p.points); // Adjust as needed
          return (
            <tr
              key={p.id}
              className={`border-b hover:bg-gray-100 transition
                ${
                  i === 0
                    ? "bg-yellow-50 shadow-[0_0_15px_rgba(255,215,0,0.35)]"
                    : i === 1
                    ? "bg-gray-100 shadow-[0_0_12px_rgba(192,192,192,0.35)]"
                    : i === 2
                    ? "bg-orange-50 shadow-[0_0_12px_rgba(205,127,50,0.35)]"
                    : "even:bg-yellow-50"
                }`}
            >
              <td className="p-2">{i + 1}</td>
              <td className="p-2 font-semibold flex items-center gap-2">
                {i === 0 && <span>🥇</span>}
                {i === 1 && <span>🥈</span>}
                {i === 2 && <span>🥉</span>}
                {p.name}
              </td>
              <td className="p-2 text-center text-gray-700">{gp}</td>
              <td className="p-2 text-green-600 text-center">{p.wins}</td>
              <td className="p-2 text-red-400 text-center">{p.losses}</td>
              <td className="p-2 text-yellow-500 text-center">{p.draws}</td>
              <td className="p-2 text-center text-gray-700">{diff}</td>
              <td className="p-2 text-center text-gray-700">{winPct}</td>
              <td className="p-2 text-right font-semibold">{p.points}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  </div>
)}

        {/* Players Tab */}
{activeTab === "Players" && (
  <div className="bg-white text-gray-700 rounded-2xl shadow-lg overflow-hidden">
    <div className="px-6 py-4 border-b border-gray-200 font-bold bg-gray-50 text-yellow-500">
      👥 Players
    </div>

    {/* Mobile Players */}
    <div className="sm:hidden p-4 space-y-3 bg-gray-50">
      {players.map((p) => (
        <div
          key={p.id}
          className="rounded-lg shadow border p-4 transition bg-white border-gray-200 flex justify-between items-center"
        >
          <span className="font-semibold">{p.name}</span>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={p.active}
              onChange={() => toggleAvailability(p.id)}
              className="sr-only"
            />
            {/* Track */}
            <div
              className={`w-16 h-7 rounded-full transition-colors duration-300 ease-in-out ${
                p.active ? "bg-green-500" : "bg-red-500"
              }`}
            />
            {/* Thumb with text */}
            <span
              className={`absolute left-0 top-0 w-8 h-7 flex items-center justify-center text-xs font-bold text-white rounded-full shadow-md transform transition-transform duration-300 ease-in-out ${
                p.active ? "translate-x-8 scale-105" : "translate-x-0 scale-100"
              }`}
            >
              {p.active ? "Yes" : "No"}
            </span>
          </label>
        </div>
      ))}
    </div>

    {/* Desktop Players Table */}
    <table className="hidden sm:table w-full text-left">
      <thead className="text-gray-400 text-sm uppercase border-b border-gray-200">
        <tr>
          <th className="p-2">#</th>
          <th className="p-2">Player</th>
          <th className="p-2 text-center">Available</th>
        </tr>
      </thead>
      <tbody>
        {players.map((p, i) => (
          <tr
            key={p.id}
            className={`border-b hover:bg-gray-100 transition`}
          >
            <td className="p-2">{i + 1}</td>
            <td className="p-2 font-semibold">{p.name}</td>
            <td className="p-2 text-center">
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={p.active}
                  onChange={() => toggleAvailability(p.id)}
                  className="sr-only"
                />
                <div
                  className={`w-16 h-7 rounded-full transition-colors duration-300 ease-in-out ${
                    p.active ? "bg-green-500" : "bg-red-500"
                  }`}
                />
                <span
                  className={`absolute left-0 top-0 w-8 h-7 flex items-center justify-center text-xs font-bold text-white rounded-full shadow-md transform transition-transform duration-300 ease-in-out ${
                    p.active ? "translate-x-8 scale-105" : "translate-x-0 scale-100"
                  }`}
                >
                  {p.active ? "Yes" : "No"}
                </span>
              </label>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
)}

        {/* Matches */}
{activeTab === "Matches" && (
  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
    {/* Court 1 */}
<div className="bg-gray-700 rounded shadow p-4">
  <h2 className="text-yellow-400 font-bold mb-4 text-lg sm:text-xl">Court 1</h2>
  {court1Matches[court1Round] ? (
    <>
      <div className="mb-2 bg-white rounded-2xl shadow-xl p-6 text-gray-900">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 items-center">
          {/* Team 1 */}
          <div className="text-center">
            <div className="font-bold text-lg mb-3 text-gray-700">
              {court1Matches[court1Round][0].map(p => p.name).join(" & ")}
            </div>
            <input
              type="number"
              min={0}
              value={court1Scores[court1Round]?.team1 ?? ""}
              onChange={(e) =>
                updateScore(court1Round, "team1", e.target.value, "court1")
              }
              className="w-24 h-20 text-4xl font-extrabold text-center rounded-xl border-2 border-gray-300 focus:border-yellow-400 focus:ring-4 focus:ring-yellow-200 outline-none transition"
            />
          </div>

          {/* Team 2 */}
          <div className="text-center">
            <div className="font-bold text-lg mb-3 text-gray-700">
              {court1Matches[court1Round][1].map(p => p.name).join(" & ")}
            </div>
            <input
              type="number"
              min={0}
              value={court1Scores[court1Round]?.team2 ?? ""}
              onChange={(e) =>
                updateScore(court1Round, "team2", e.target.value, "court1")
              }
              className="w-24 h-20 text-4xl font-extrabold text-center rounded-xl border-2 border-gray-300 focus:border-yellow-400 focus:ring-4 focus:ring-yellow-200 outline-none transition"
            />
          </div>
        </div>

        <div className="text-center text-gray-400 font-bold mt-6 text-lg tracking-widest">
          VS
        </div>

        {/* Bye players */}
        {roundMatches?.court1?.[court1Round]?.length > 0 && (
          <div className="mt-2 text-gray-400 text-sm italic text-center">
            Resting: {roundMatches.court1[court1Round].map(p => p.name).join(", ")}
          </div>
        )}
      </div>
    </>
  ) : (
    <p className="text-gray-300 italic">No matches scheduled for this court.</p>
  )}

  <div className="flex justify-between mt-4">
    <button
      onClick={() => setCourt1Round(prev => Math.max(prev - 1, 0))}
      disabled={court1Round === 0}
      className="bg-gray-600 hover:bg-gray-500 text-white px-4 py-2 rounded disabled:opacity-50"
    >
      ◀ Previous Round
    </button>
    <button
      onClick={() => setCourt1Round(prev => Math.min(prev + 1, court1Matches.length - 1))}
      disabled={court1Round >= court1Matches.length - 1}
      className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded"
    >
      Next Round ▶
    </button>
  </div>
</div>

{/* Court 2 */}
<div className="bg-gray-700 rounded shadow p-4">
  <h2 className="text-yellow-400 font-bold mb-4 text-lg sm:text-xl">Court 2</h2>
  {court2Matches[court2Round] ? (
    <>
      <div className="mb-2 bg-white rounded-2xl shadow-xl p-6 text-gray-900">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 items-center">
          {/* Team 1 */}
          <div className="text-center">
            <div className="font-bold text-lg mb-3 text-gray-700">
              {court2Matches[court2Round][0].map(p => p.name).join(" & ")}
            </div>
            <input
              type="number"
              min={0}
              value={court2Scores[court2Round]?.team1 ?? ""}
              onChange={(e) =>
                updateScore(court2Round, "team1", e.target.value, "court2")
              }
              className="w-24 h-20 text-4xl font-extrabold text-center rounded-xl border-2 border-gray-300 focus:border-yellow-400 focus:ring-4 focus:ring-yellow-200 outline-none transition"
            />
          </div>

          {/* Team 2 */}
          <div className="text-center">
            <div className="font-bold text-lg mb-3 text-gray-700">
              {court2Matches[court2Round][1].map(p => p.name).join(" & ")}
            </div>
            <input
              type="number"
              min={0}
              value={court2Scores[court2Round]?.team2 ?? ""}
              onChange={(e) =>
                updateScore(court2Round, "team2", e.target.value, "court2")
              }
              className="w-24 h-20 text-4xl font-extrabold text-center rounded-xl border-2 border-gray-300 focus:border-yellow-400 focus:ring-4 focus:ring-yellow-200 outline-none transition"
            />
          </div>
        </div>

        <div className="text-center text-gray-400 font-bold mt-6 text-lg tracking-widest">
          VS
        </div>

        {/* Bye players */}
        {roundMatches?.court2?.[court2Round]?.length > 0 && (
          <div className="mt-2 text-gray-400 text-sm italic text-center">
            Resting: {roundMatches.court2[court2Round].map(p => p.name).join(", ")}
          </div>
        )}
      </div>
    </>
  ) : (
    <p className="text-gray-300 italic">No matches scheduled for this court.</p>
  )}

  <div className="flex justify-between mt-4">
    <button
      onClick={() => setCourt2Round(prev => Math.max(prev - 1, 0))}
      disabled={court2Round === 0}
      className="bg-gray-600 hover:bg-gray-500 text-white px-4 py-2 rounded disabled:opacity-50"
    >
      ◀ Previous Round
    </button>
    <button
      onClick={() => setCourt2Round(prev => Math.min(prev + 1, court2Matches.length - 1))}
      disabled={court2Round >= court2Matches.length - 1}
      className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded"
    >
      Next Round ▶
    </button>
  </div>
</div>

    {/* Save All Matches */}
    <div className="col-span-1 md:col-span-2 flex justify-center mt-4">
      <button onClick={saveMatches} className="bg-green-600 hover:bg-green-500 text-white px-6 py-2 rounded">
        💾 Save Matches
      </button>
    </div>
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