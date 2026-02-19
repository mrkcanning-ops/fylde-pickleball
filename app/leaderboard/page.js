'use client';

import { useState, useEffect } from 'react';
import { getPlayers } from '../../lib/players';

export default function Leaderboard() {
  const [players, setPlayers] = useState([]);

  // Load players from localStorage on mount
  useEffect(() => {
    setPlayers(getPlayers());
  }, []);

  // Sort players: wins descending, then losses ascending, then name A→Z
  const sortedPlayers = [...players].sort((a, b) => {
    if (b.wins !== a.wins) return b.wins - a.wins;
    if (a.losses !== b.losses) return a.losses - b.losses;
    return a.name.localeCompare(b.name);
  });
  // Reset full leaderboard (wipe all stats)
const resetLeaderboard = () => {
  const resetPlayers = players.map(p => ({
    ...p,
    wins: 0,
    losses: 0,
    draws: 0
  }));

  savePlayers(resetPlayers);
};

  return (
    <main style={{ padding: '20px', fontFamily: 'Arial', maxWidth: '600px', margin: '0 auto' }}>
      <h1>🏆 Fylde Pickleball Leaderboard</h1>

      {sortedPlayers.length === 0 ? (
        <p>No players yet. Add players on the Admin page.</p>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '20px' }}>
          <thead>
            <tr>
              <th style={{ borderBottom: '2px solid #000', textAlign: 'left', padding: '8px' }}>Player</th>
              <th style={{ borderBottom: '2px solid #000', padding: '8px', textAlign: 'center' }}>Wins</th>
              <th style={{ borderBottom: '2px solid #000', padding: '8px', textAlign: 'center' }}>Losses</th>
              <th style={{ borderBottom: '2px solid #000', padding: '8px', textAlign: 'center' }}>Draws</th>
            </tr>
          </thead>
          <tbody>
            {sortedPlayers.map((p, i) => (
              <tr key={i}>
                <td style={{ padding: '8px 0' }}>{p.name}</td>
                <td style={{ textAlign: 'center' }}>{p.wins}</td>
                <td style={{ textAlign: 'center' }}>{p.losses}</td>
                <td style={{ textAlign: 'center' }}>{p.draws}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </main>
  );
}