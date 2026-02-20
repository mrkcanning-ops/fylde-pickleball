"use client";

import { useState } from "react";

export default function MatchesPage() {
  // Example match data (replace with real data later)
  const [matches, setMatches] = useState([
    { player1: "Maddie", player2: "Nathan", score: "3-1", winner: "Maddie" },
    { player1: "Helen", player2: "Nathan", score: "2-3", winner: "Nathan" },
  ]);

  const generateFixtures = () => {
    // Placeholder function; replace with your fixture generation logic
    alert("Generate Fixtures clicked!");
  };

  return (
    <div className="p-8 min-h-screen bg-gray-800 text-gray-300 font-sans">
      <h2 className="text-2xl font-bold mb-4 text-white">Matches</h2>

      <button
        onClick={generateFixtures}
        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 mb-6"
      >
        Generate Fixtures
      </button>

      <div className="overflow-x-auto bg-gray-900 rounded shadow">
        <table className="min-w-full table-auto">
          <thead className="bg-gray-700 text-gray-300 uppercase text-sm">
            <tr>
              <th className="p-3 text-left">#</th>
              <th className="p-3 text-left">Player 1</th>
              <th className="p-3 text-left">Player 2</th>
              <th className="p-3 text-left">Score</th>
              <th className="p-3 text-left">Winner</th>
            </tr>
          </thead>

          <tbody>
            {matches.map((match, index) => (
              <tr
                key={index}
                className="border-b border-gray-700 even:bg-gray-800/50"
              >
                <td className="p-3">{index + 1}</td>
                <td className="p-3">{match.player1}</td>
                <td className="p-3">{match.player2}</td>
                <td className="p-3">{match.score}</td>
                <td className="p-3 font-semibold text-yellow-400">{match.winner}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
