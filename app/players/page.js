"use client";

import { useState } from "react";

export default function PlayersPage() {
  const [players, setPlayers] = useState([
    { name: "Maddie" },
    { name: "Nathan" },
    { name: "Helen" },
  ]);

  const addPlayer = () => {
    const name = prompt("Enter new player name:");
    if (name) setPlayers([...players, { name }]);
  };

  return (
    <div className="min-h-screen p-8 bg-gray-800 text-gray-300 font-sans">
      <h2 className="text-3xl font-bold mb-6 text-white">Players</h2>

      <button
        onClick={addPlayer}
        className="mb-6 px-4 py-2 bg-yellow-500 hover:bg-yellow-600 text-white rounded shadow"
      >
        Add Player
      </button>

      <div className="overflow-x-auto bg-gray-900 rounded shadow">
        <table className="min-w-full table-auto">
          <thead className="bg-gray-700 text-gray-300 uppercase text-sm">
            <tr>
              <th className="p-3 text-left">#</th>
              <th className="p-3 text-left">Player</th>
            </tr>
          </thead>
          <tbody>
            {players.map((player, index) => (
              <tr
                key={index}
                className="border-b border-gray-700 even:bg-gray-800/50"
              >
                <td className="p-3">{index + 1}</td>
                <td className="p-3">{player.name}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
