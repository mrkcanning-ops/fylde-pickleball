"use client";

export default function Leaderboard({ players }) {
  return (
    <div className="overflow-x-auto">
      <div className="bg-gray-900 rounded-xl shadow-lg p-4">
        <table className="min-w-full table-auto border-collapse">
          <thead className="bg-gray-800 text-gray-300 uppercase text-sm">
            <tr>
              <th className="p-3 text-left">#</th>
              <th className="p-3 text-left">Player</th>
              <th className="p-3 text-left">Points</th>
            </tr>
          </thead>
          <tbody>
            {players.map((player, index) => (
              <tr
                key={index}
                className="border-b border-gray-700 even:bg-gray-800/50 hover:bg-gray-700/70 transition-colors duration-200 cursor-default"
              >
                <td className="p-3">{index + 1}</td>
                <td className="p-3 font-medium text-white">{player.name}</td>
                <td className="p-3 font-semibold text-yellow-400">
                  {player.points || 0}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}