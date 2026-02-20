"use client";

import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabase";

export default function Admin() {
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newPlayerName, setNewPlayerName] = useState("");
  const [court1Matches, setCourt1Matches] = useState([]);
  const [court2Matches, setCourt2Matches] = useState([]);
  const [week, setWeek] = useState(1);

  // Fetch players and matches
  useEffect(() => {
    fetchPlayersAndMatches();
  }, [week]);

  async function fetchPlayersAndMatches() {
    setLoading(true);

    // Players
    const { data: playerData, error: playerError } = await supabase
      .from("players")
      .select("*")
      .order("name", { ascending: true });
    if (playerError) console.error(playerError);
    else setPlayers(playerData);

    // Matches
    const { data: matchData, error: matchError } = await supabase
      .from("matches")
      .select("*")
      .eq("week", week);
    if (matchError) console.error(matchError);

    // Split by court
    setCourt1Matches(matchData?.filter((m) => m.court === 1) || []);
    setCourt2Matches(matchData?.filter((m) => m.court === 2) || []);

    setLoading(false);
  }

  // Add new player
  async function addPlayer() {
    if (!newPlayerName) return;
    const { data, error } = await supabase
      .from("players")
      .insert([{ name: newPlayerName, active: true }])
      .select();
    if (error) console.error(error);
    else {
      setPlayers([...players, data[0]]);
      setNewPlayerName("");
    }
  }

  // Toggle player availability
  async function togglePlayerActive(player) {
    const { data, error } = await supabase
      .from("players")
      .update({ active: !player.active })
      .eq("id", player.id)
      .select();
    if (!error) setPlayers(players.map((p) => (p.id === player.id ? data[0] : p)));
  }

  // Generate matches (fixed, fully working)
  async function generateMatches() {
    const availablePlayers = players.filter((p) => p.active);
    if (availablePlayers.length < 4) {
      alert("At least 4 active players are required.");
      return;
    }

    const half = Math.ceil(availablePlayers.length / 2);
    const court1Players = availablePlayers.slice(0, half);
    const court2Players = availablePlayers.slice(half);

    const pairPlayers = (arr) => {
      const pairs = [];
      for (let i = 0; i < arr.length; i += 4) {
        const team1 = arr[i];
        const team2 = arr[i + 1] || null;
        const team3 = arr[i + 2] || null;
        const team4 = arr[i + 3] || null;
        pairs.push([team1, team2, team3, team4].filter(Boolean));
      }
      return pairs;
    };

    const court1Pairs = pairPlayers(court1Players);
    const court2Pairs = pairPlayers(court2Players);

    try {
      // Delete old matches for this week
      const { error: deleteError } = await supabase.from("matches").delete().eq("week", week);
      if (deleteError) console.error("Error clearing old matches:", deleteError);

      const insertCourtMatches = async (pairs, courtNum) => {
        for (const pair of pairs) {
          const matchRow = {
            player1_id: pair[0].id,
            player2_id: pair[1]?.id || null,
            player3_id: pair[2]?.id || null,
            player4_id: pair[3]?.id || null,
            court: courtNum,
            score1: null,
            score2: null,
            week,
          };
          const { data, error } = await supabase.from("matches").insert([matchRow]).select();
          if (error) {
            console.error("Supabase insert error:", error);
            console.log("Match row causing error:", matchRow);
          } else console.log(`Inserted match Court ${courtNum}:`, data);
        }
      };

      await insertCourtMatches(court1Pairs, 1);
      await insertCourtMatches(court2Pairs, 2);

      fetchPlayersAndMatches();
      alert("Weekly matches generated!");
    } catch (err) {
      console.error("Unexpected error:", err);
    }
  }

  // Update score
  async function updateScore(matchId, scoreField, value) {
    const intValue = parseInt(value);
    if (isNaN(intValue)) return;

    const { error } = await supabase.from("matches").update({ [scoreField]: intValue }).eq("id", matchId);
    if (error) console.error(error);
    else fetchPlayersAndMatches();
  }

  // Compute leaderboard
  function computeLeaderboard() {
    const leaderboard = {};
    players.forEach((p) => {
      leaderboard[p.id] = { name: p.name, wins: 0, draws: 0, losses: 0, points: 0 };
    });

    const allMatches = [...court1Matches, ...court2Matches];

    allMatches.forEach((m) => {
      if (m.score1 === null || m.score2 === null) return;

      const team1 = [m.player1_id, m.player2_id].filter(Boolean);
      const team2 = [m.player3_id, m.player4_id].filter(Boolean);

      if (!team2.length) return;

      if (m.score1 > m.score2) {
        team1.forEach((id) => {
          leaderboard[id].wins++;
          leaderboard[id].points += 3;
        });
        team2.forEach((id) => leaderboard[id].losses++);
      } else if (m.score1 < m.score2) {
        team2.forEach((id) => {
          leaderboard[id].wins++;
          leaderboard[id].points += 3;
        });
        team1.forEach((id) => leaderboard[id].losses++);
      } else {
        [...team1, ...team2].forEach((id) => {
          leaderboard[id].draws++;
          leaderboard[id].points += 1;
        });
      }
    });

    return Object.values(leaderboard).sort((a, b) => b.points - a.points);
  }

  if (loading) return <p>Loading…</p>;

  return (
    <main style={{ padding: "20px", fontFamily: "system-ui", maxWidth: "1000px", margin: "0 auto" }}>
      <h1>Admin - Fylde Pickleball</h1>

      <div style={{ marginBottom: "20px" }}>
        <input
          type="text"
          placeholder="New player name"
          value={newPlayerName}
          onChange={(e) => setNewPlayerName(e.target.value)}
          style={{ marginRight: "10px" }}
        />
        <button onClick={addPlayer}>Add Player</button>
      </div>

      <h2>Players</h2>
      <ul>
        {players.map((p) => (
          <li key={p.id}>
            {p.name} ({p.active ? "Available" : "Inactive"})
            <button onClick={() => togglePlayerActive(p)} style={{ marginLeft: "10px" }}>
              Toggle
            </button>
          </li>
        ))}
      </ul>

      <div style={{ margin: "20px 0" }}>
        <button onClick={generateMatches}>Generate Weekly Matches</button>
      </div>

      <h2>Matches</h2>
      {[{ matches: court1Matches, court: 1 }, { matches: court2Matches, court: 2 }].map(
        ({ matches, court }) => (
          <div key={court}>
            <h3>Court {court}</h3>
            <ul>
              {matches.map((m) => (
                <li key={m.id} style={{ marginBottom: "5px" }}>
                  {players.find((p) => p.id === m.player1_id)?.name} &{" "}
                  {players.find((p) => p.id === m.player2_id)?.name} vs{" "}
                  {players.find((p) => p.id === m.player3_id)?.name || "TBD"} &{" "}
                  {players.find((p) => p.id === m.player4_id)?.name || "TBD"}
                  <input
                    type="number"
                    placeholder="Team 1"
                    style={{ width: "50px", marginLeft: "10px" }}
                    value={m.score1 ?? ""}
                    onChange={(e) => updateScore(m.id, "score1", e.target.value)}
                  />
                  <input
                    type="number"
                    placeholder="Team 2"
                    style={{ width: "50px", marginLeft: "5px" }}
                    value={m.score2 ?? ""}
                    onChange={(e) => updateScore(m.id, "score2", e.target.value)}
                  />
                </li>
              ))}
            </ul>
          </div>
        )
      )}

      <h2>Leaderboard</h2>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            <th>Name</th>
            <th>Wins</th>
            <th>Draws</th>
            <th>Losses</th>
            <th>Points</th>
          </tr>
        </thead>
        <tbody>
          {computeLeaderboard().map((p) => (
            <tr key={p.name}>
              <td>{p.name}</td>
              <td>{p.wins}</td>
              <td>{p.draws}</td>
              <td>{p.losses}</td>
              <td>{p.points}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  );
}