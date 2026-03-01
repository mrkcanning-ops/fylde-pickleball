"use client";

import { useState, useEffect } from "react";
import { getPlayers, savePlayers } from "../../lib/players";

export default function Leaderboard() {
  const [players, setPlayers] = useState([]);
  const [isAdmin, setIsAdmin] = useState(false);

  // Load players from localStorage on mount
  useEffect(() => {
    setPlayers(getPlayers());
  }, []);

  // Sort players: Win % → Point Diff → Games Played → Alphabetically
  const sortedPlayers = [...players].sort((a, b) => {
    const aGP = (a.wins || 0) + (a.losses || 0) + (a.draws || 0);
    const bGP = (b.wins || 0) + (b.losses || 0) + (b.draws || 0);
    const aWinPct = aGP > 0 ? (a.wins || 0) / aGP : 0;
    const bWinPct = bGP > 0 ? (b.wins || 0) / bGP : 0;
    const aDiff = (a.points_for || 0) - (a.points_against || 0);
    const bDiff = (b.points_for || 0) - (b.points_against || 0);

    // 1. Win % (descending)
    if (bWinPct !== aWinPct) return bWinPct - aWinPct;
    // 2. Point Diff (descending)
    if (bDiff !== aDiff) return bDiff - aDiff;
    // 3. Games Played (descending)
    if (bGP !== aGP) return bGP - aGP;
    // 4. Alphabetically (ascending)
    return (a.name || "").localeCompare(b.name || "");
  });

  // Passcode-protected leaderboard reset
  const resetLeaderboard = () => {
    const code = prompt("Enter admin passcode to reset leaderboard:");
    if (!code) return;

    const envPasscode = process.env.NEXT_PUBLIC_ADMIN_PASSCODE;

    if (code.trim() === envPasscode?.trim()) {
      const confirmed = confirm("Are you sure you want to reset the leaderboard?");
      if (!confirmed) return;

      // Reset all player stats
      const resetPlayers = players.map(p => ({
        ...p,
        wins: 0,
        losses: 0,
        draws: 0
      }));

      setPlayers(resetPlayers);
      savePlayers(resetPlayers); // save to localStorage
      alert("Leaderboard reset ✅");
    } else {
      alert("Incorrect passcode ❌");
    }
  };

  const handleResetLeaderboard = () => {
  const envPasscode = process.env.NEXT_PUBLIC_ADMIN_PASSCODE;

  if (resetPasswordInput.trim() === envPasscode?.trim()) {
    const confirmed = confirm("Are you sure you want to reset the leaderboard?");
    if (!confirmed) return;

    const resetPlayers = players.map(p => ({
      ...p,
      wins: 0,
      losses: 0,
      draws: 0,
    }));

    setPlayers(resetPlayers);
    savePlayers(resetPlayers);

    setShowResetModal(false);
    setResetPasswordInput("");
    setResetError("");
    alert("Leaderboard reset ✅");
  } else {
    setResetError("Incorrect passcode ❌");
  }
};

  return (
    <main style={{ padding: "20px", fontFamily: "Arial", maxWidth: "600px", margin: "0 auto" }}>
      <h1>🏆 Fylde Pickleball Leaderboard</h1>

      {sortedPlayers.length === 0 ? (
        <p>No players yet. Add players on the Admin page.</p>
      ) : (
        <table style={{ width: "100%", borderCollapse: "collapse", marginTop: "20px" }}>
          <thead>
            <tr>
              <th style={{ borderBottom: "2px solid #000", textAlign: "left", padding: "8px" }}>Player</th>
              <th style={{ borderBottom: "2px solid #000", padding: "8px", textAlign: "center" }}>GP</th>
              <th style={{ borderBottom: "2px solid #000", padding: "8px", textAlign: "center", color: "#06b6d4" }}>Wins</th>
              <th style={{ borderBottom: "2px solid #000", padding: "8px", textAlign: "center" }}>Losses</th>
              <th style={{ borderBottom: "2px solid #000", padding: "8px", textAlign: "center" }}>Draws</th>
              <th style={{ borderBottom: "3px solid #06b6d4", padding: "8px", textAlign: "center", fontWeight: "900", color: "#06b6d4", fontSize: "16px" }}>Win %</th>
            </tr>
          </thead>
          <tbody>
            {sortedPlayers.map((p, i) => {
              const gp = (p.wins || 0) + (p.losses || 0) + (p.draws || 0);
              const winPct = gp > 0 ? ((p.wins || 0) / gp * 100).toFixed(0) + "%" : "0%";
              return (
                <tr key={i}>
                  <td style={{ padding: "8px 0" }}>{p.name}</td>
                  <td style={{ textAlign: "center" }}>{gp}</td>
                  <td style={{ textAlign: "center", color: "#06b6d4" }}>{p.wins}</td>
                  <td style={{ textAlign: "center" }}>{p.losses}</td>
                  <td style={{ textAlign: "center" }}>{p.draws}</td>
                  <td style={{ textAlign: "center", fontWeight: "900", color: "#06b6d4", fontSize: "16px" }}>{winPct}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      {/* Admin Reset Button */}
      <div style={{ marginTop: "20px" }}>
        <button onClick={resetLeaderboard}>Reset Leaderboard</button>
      </div>
    </main>
  );
}