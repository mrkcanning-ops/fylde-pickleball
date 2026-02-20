"use client";

export default function Leaderboard() {
  const players = [
    { name: "Maddie", wins: 3, draws: 1, losses: 0, points: 10 },
    { name: "Nathan", wins: 2, draws: 2, losses: 0, points: 8 },
    { name: "Helen", wins: 1, draws: 1, losses: 2, points: 4 },
  ];

  return (
    <section className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 font-bold bg-gray-50 dark:bg-gray-900 text-yellow-400">
        🏆 Leaderboard
      </div>

      {/* Table */}
      <table className="w-full text-left">
        <thead className="text-gray-400 text-sm uppercase border-b border-gray-200 dark:border-gray-700">
          <tr>
            <th className="p-3">#</th>
            <th className="p-3">Player</th>
            <th className="p-3">P</th>
            <th className="p-3 text-green-600">W</th>
            <th className="p-3 text-yellow-500">D</th>
            <th className="p-3 text-red-400">L</th>
            <th className="p-3 text-right">Points</th>
          </tr>
        </thead>

        <tbody>
          {players.map((player, index) => (
            <tr
              key={index}
              className="border-b border-gray-200 dark:border-gray-700 even:bg-yellow-50 dark:even:bg-yellow-900/20"
            >
              <td className="p-3">{index + 1}</td>
              <td className="p-3 font-semibold">{player.name}</td>
              <td className="p-3">{player.wins + player.draws + player.losses}</td>
              <td className="p-3 text-green-600 text-center">{player.wins}</td>
              <td className="p-3 text-yellow-500 text-center">{player.draws}</td>
              <td className="p-3 text-red-400 text-center">{player.losses}</td>
              <td className="p-3 text-right font-semibold">{player.points} pts</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
