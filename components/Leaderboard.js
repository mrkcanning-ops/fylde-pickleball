"use client";

export default function Leaderboard({ players }) {
  return (
    <div className="overflow-x-auto bg-gray-900 rounded shadow">
      <table className="min-w-full table-auto">
        <thead className="bg-gray-700 text-gray-300 uppercase text-sm">
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
              className="border-b border-gray-700 even:bg-gray-800/50"
            >
              <td className="p-3">{index + 1}</td>
              <td className="p-3">{player.name}</td>
              <td className="p-3">{player.points || 0}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
