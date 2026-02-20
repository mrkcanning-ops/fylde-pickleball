"use client";

import { useState, useEffect } from "react";

export default function PlayersClient() {
  const [players, setPlayers] = useState(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("players");
      return saved ? JSON.parse(saved) : [
        { name: "Maddie" },
        { name: "Nathan" },
        { name: "Helen" },
      ];
    }
    return [];
  });

  useEffect(() => {
    localStorage.setItem("players", JSON.stringify(players));
  }, [players]);

  const addPlayer = () => {
    const name = prompt("Enter new player name:");
    if (name) setPlayers([...players, { name }]);
  };

  const deletePlayer = (index) => {
    if (confirm(`Delete ${players[index].name}?`)) {
      setPlayers(players.filter((_, i) => i !== index));
    }
  };

  const editPlayer = (index) => {
    const name = prompt("Edit player name:", players[index].name);
    if (name) {
      const updated = [...players];
      updated[index].name = name;
      setPlayers(updated);
    }
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
              <th className="p-3 text-left">Actions</th>
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
                <td className="p-3 space-x-2">
                  <button
                    onClick={() => editPlayer(index)}
                    className="px-2 py-1 bg-blue-500 hover:bg-blue-600 text-white rounded"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => deletePlayer(index)}
                    className="px-2 py-1 bg-red-500 hover:bg-red-600 text-white rounded"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}