'use client';

import { useState, useEffect } from 'react';
import { getPlayers, setPlayers } from '../../lib/players';

export default function Admin() {
  const [players, setLocalPlayers] = useState([]);
  const [name, setName] = useState('');

  // Load players from localStorage on mount
  useEffect(() => {
    setLocalPlayers(getPlayers());
  }, []);

  // Save players to state and localStorage
  const savePlayers = (newPlayers) => {
    setLocalPlayers(newPlayers);
    setPlayers(newPlayers);
  };

  // Add a new player
  const addPlayer = () => {
    if (!name.trim()) return;
    const newPlayers = [
      ...players,
      { name: name.trim(), available: true, wins: 0, losses: 0, draws: 0 }
    ];
    savePlayers(newPlayers);
    setName('');
  };

  // Toggle availability
  const toggleAvailable = (index) => {
    const newPlayers = [...players];
    newPlayers[index].available = !newPlayers[index].available;
    savePlayers(newPlayers);
  };

  // Record result for a player
  const recordResult = (playerName, result) => {
    const newPlayers = players.map(p => {
      if (p.name === playerName) {
        if (result === 'win') p.wins += 1;
        if (result === 'loss') p.losses += 1;
        if (result === 'draw') p.draws += 1;
      }
      return p;
    });
    savePlayers(newPlayers);
  };

  // Split available players into courts
  const getCourts = () => {
    const available = players.filter(p => p.available);
    const mid = Math.ceil(available.length / 2);
    const court1 = available.slice(0, mid);
    const court2 = available.slice(mid);
    const sittingOut = players.filter(p => !p.available);
    return { court1, court2, sittingOut };
  };

  // Generate round-robin doubles matches
  const generateMatches = (courtPlayers) => {
    const matches = [];
    let list = courtPlayers.length % 2 === 1 ? [...courtPlayers, { name: 'BYE' }] : [...courtPlayers];

    for (let i = 0; i < list.length - 1; i++) {
      const round = [];
      for (let j = 0; j < list.length / 2; j++) {
        const player1 = list[j];
        const player2 = list[list.length - 1 - j];
        if (player1.name !== 'BYE' && player2.name !== 'BYE') round.push([player1.name, player2.name]);
      }
      matches.push(round);

      // Rotate players except first
      const first = list[0];
      const rest = list.slice(1);
      list = [first, rest[rest.length - 1], ...rest.slice(0, rest.length - 1)];
    }
    return matches;
  };
   // Reset weekly availability (keep leaderboard stats)
const resetWeek = () => {
  const resetPlayers = players.map(p => ({
    ...p,
    available: true
  }));

  savePlayers(resetPlayers);
};
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

  const { court1, court2, sittingOut } = getCourts();
  const court1Matches = generateMatches(court1);
  const court2Matches = generateMatches(court2);

  return (
    <main style={{
  padding: '20px',
  fontFamily: 'system-ui',
  maxWidth: '1000px',
  margin: '0 auto'
}}>
      <h1>⚡ Fylde Pickleball Admin</h1>
      <button
  onClick={resetWeek}
  style={{
    padding: '8px 12px',
    marginBottom: '20px',
    backgroundColor: '#ff9800',
    color: 'white',
    border: 'none',
    borderRadius: '4px'
  }}
>
  🔄 Reset Week (Keep Leaderboard)
</button>
<button
  onClick={resetLeaderboard}
  style={{
    padding: '8px 12px',
    marginLeft: '10px',
    backgroundColor: '#e53935',
    color: 'white',
    border: 'none',
    borderRadius: '4px'
  }}
  
>
  🗑 Reset Leaderboard
</button>

      {/* Add Player */}
      <div style={{ marginBottom: '20px' }}>
        <input
          type="text"
          value={name}
          placeholder="Enter player name"
          onChange={(e) => setName(e.target.value)}
          style={{ padding: '8px', width: '70%' }}
        />
        <button onClick={addPlayer} style={{ padding: '8px 12px', marginLeft: '10px' }}>Add Player</button>
      </div>

      {/* Player List */}
      <h2>All Players</h2>
      <ul style={{ listStyle: 'none', padding: 0 }}>
        {players.length === 0 ? (
          <li>No players yet</li>
        ) : (
          players.map((p, i) => (
            <li key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #ccc' }}>
              <span>{p.name}</span>
              <button onClick={() => toggleAvailable(i)}>
                {p.available ? 'Available ✅' : 'Unavailable ❌'}
              </button>
            </li>
          ))
        )}
      </ul>

      {/* Courts & Matches */}
      <h2>Courts & Matches</h2>
      <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
        {[
          { name: 'Court 1', matches: court1Matches },
          { name: 'Court 2', matches: court2Matches }
        ].map((court, i) => (
          <div key={i} style={{ flex: '1', minWidth: '300px', marginBottom: '20px' }}>
            <h3>{court.name}</h3>
            <ul>
              {(i === 0 ? court1 : court2).map(p => <li key={p.name}>{p.name}</li>)}
            </ul>

            <h4>Matches</h4>
            {court.matches.map((round, ri) => (
              <div key={ri} style={{ marginBottom: '10px' }}>
                <strong>Round {ri + 1}</strong>
                <ul>
                  {round.map((pair, pi) => (
                    <li key={pi}>
                      {pair[0]} & {pair[1]}
                      <div style={{ marginTop: '5px' }}>
  <input
    type="number"
    placeholder="Team 1"
    id={'t1-${ri}-${pi}'}
    style={{ width: '60px', marginRight: '5px' }}
  />
  <input
    type="number"
    placeholder="Team 2"
    id={'t2-${ri}-${pi}'}
    style={{ width: '60px', marginRight: '5px' }}
  />
  <button
    onClick={() => {
      const score1 = parseInt(document.getElementById('t1-${ri}-${pi}').value);
      const score2 = parseInt(document.getElementById('t2-${ri}-${pi}').value);

      if (isNaN(score1) || isNaN(score2)) return;

      if (score1 > score2) {
        recordResult(pair[0], 'win');
        recordResult(pair[1], 'loss');
      } else if (score2 > score1) {
        recordResult(pair[1], 'win');
        recordResult(pair[0], 'loss');
      } else {
        recordResult(pair[0], 'draw');
        recordResult(pair[1], 'draw');
      }
    }}
  >
    Save
  </button>
</div>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* Sitting Out */}
      {sittingOut.length > 0 && (
        <div style={{ marginTop: '20px' }}>
          <h3>Sitting Out</h3>
          <ul>{sittingOut.map(p => <li key={p.name}>{p.name}</li>)}</ul>
        </div>
      )}
    </main>
  );
}