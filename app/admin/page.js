"use client";

import { useState, useEffect } from "react";
import { useAuth } from "../../lib/AuthContext";
import { supabase } from "../../lib/supabase";
import { getViewMode, getLSRaw } from "../../lib/ls";
import { generateLeagueSchedules } from "../../lib/matchGenerator";

export default function Admin() {
  const { user } = useAuth();
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

  // Force literal doubles suffix to avoid env mismatch
  const DOUBLES_SUFFIX = "_doubles";

  const getTablesForMode = (vm) => ({
    playersTable: vm === "doubles" ? `players${DOUBLES_SUFFIX}` : "players",
    matchesTable: vm === "doubles" ? `matches${DOUBLES_SUFFIX}` : "matches",
    pendingTable: vm === "doubles" ? `pending_fixtures${DOUBLES_SUFFIX}` : "pending_fixtures",
  });

  async function fetchPlayersAndMatches() {
    setLoading(true);

    const vm = getViewMode();
    const { playersTable, matchesTable } = getTablesForMode(vm);

    // Players
    const { data: playerData, error: playerError } = await supabase.from(playersTable).select("*").order("name", { ascending: true });
    if (playerError) console.error(playerError);
    else setPlayers(playerData);

    // Matches
    const { data: matchData, error: matchError } = await supabase.from(matchesTable).select("*").eq("week", week);
    if (matchError) console.error(matchError);

    const division = Number(getLSRaw("division")) || 1;
    const filteredMatches = (matchData || []).filter((m) => Number(m.division || 1) === division);

    // Split by court
    setCourt1Matches(filteredMatches.filter((m) => m.court === 1) || []);
    setCourt2Matches(filteredMatches.filter((m) => m.court === 2) || []);

    setLoading(false);
  }

  // Add new player
  async function addPlayer() {
    if (!newPlayerName) return;
    // include division for doubles mode (players_doubles requires division)
    const division = Number(getLSRaw("division")) || 1;
    const payload = { name: newPlayerName, active: true, division, owner_id: user?.id };
    // players_doubles uses text `id` primary key — generate one when in doubles mode
    if (getViewMode() === "doubles") {
      try {
        payload.id = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
      } catch (e) {
        payload.id = `${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
      }
    }
    try {
      const tableName = getViewMode() === "doubles" ? `players${DOUBLES_SUFFIX}` : "players";
      console.debug("Admin:addPlayer -> inserting", payload, "into", tableName);
      const { data, error } = await db("players").insert([payload]).select();
      if (error) {
        console.error("Supabase insert error:", error);
        alert(`Failed to add player: ${error.message || JSON.stringify(error)}`);
        return;
      }
      if (!data || !data[0]) {
        console.warn("Insert returned no data", data);
        // refresh from server to be safe
        await fetchPlayersAndMatches();
      } else {
        setPlayers((prev) => [...prev, data[0]]);
      }
      setNewPlayerName("");
    } catch (err) {
      console.error("Unexpected error adding player:", err);
      alert(`Unexpected error adding player: ${err?.message || String(err)}`);
    }
  }

  // Toggle player availability
  async function togglePlayerActive(player) {
    const { data, error } = await db("players").update({ active: !player.active }).eq("id", player.id).select();
    if (!error) setPlayers(players.map((p) => (p.id === player.id ? data[0] : p)));
  }

  // Generate matches (use league-style schedule generator for parity with League page)
  async function generateMatches() {
    const availablePlayers = players.filter((p) => p.active);
    if (availablePlayers.length < 4) {
      alert("At least 4 active players are required.");
      return;
    }

    const division = Number(getLSRaw("division")) || 1;

    // Scope players to the selected division for both League and Doubles
    const scopedPlayers = availablePlayers.filter((p) => Number(p.division) === division);

    // Ensure we only generate matches when the selected division has enough active players
    if (scopedPlayers.length < 4) {
      alert(`At least 4 active players are required in division ${division}.`);
      return;
    }

    const numCourts = 2;
    const courts = generateLeagueSchedules(scopedPlayers, numCourts);

    try {
      const vm = getViewMode();
      console.debug("Admin: generateMatches -> viewMode", vm, "division", division, "playersInDivision", scopedPlayers.length);
      const { matchesTable, pendingTable } = getTablesForMode(vm);

      // Delete old matches for this week scoped to the selected division
      const { error: deleteError } = await supabase.from(matchesTable).delete().eq("week", week).eq("division", division);
      if (deleteError) console.error("Error clearing old matches:", deleteError);

      // Insert matches for each court and round
      for (let c = 0; c < courts.length; c++) {
        const court = courts[c];
        const courtNum = c + 1;
        for (const round of court.matches) {
          const team1 = round[0] || [];
          const team2 = round[1] || [];
          const matchRow = {
            player1_id: team1[0]?.id || null,
            player2_id: team1[1]?.id || null,
            player3_id: team2[0]?.id || null,
            player4_id: team2[1]?.id || null,
            court: courtNum,
            score1: null,
            score2: null,
            week,
          };
          // Always set division on inserted matches so generation is scoped
          matchRow.division = division;
          const { data, error } = await supabase.from(matchesTable).insert([matchRow]).select();
          if (error) {
            console.error("Supabase insert error:", error);
            console.log("Match row causing error:", matchRow);
          } else {
            console.log(`Inserted match Court ${courtNum}:`, data);
          }
        }
      }

      // Persist pending fixtures (matches + byes) so the main UI shows resting players/rounds
      try {
        const division = Number(getLSRaw("division")) || 1;
        const payload = {
          division,
          court1_matches: (courts[0]?.matches || []).map((match) => (match || []).map((team) => (team || []).map((p) => p.id))),
          court2_matches: (courts[1]?.matches || []).map((match) => (match || []).map((team) => (team || []).map((p) => p.id))),
          court1_scores: (courts[0]?.matches || []).map(() => ({ team1: "", team2: "" })),
          court2_scores: (courts[1]?.matches || []).map(() => ({ team1: "", team2: "" })),
          court1_byes: (courts[0]?.byes || []).map((round) => (round || []).map((p) => p.id)),
          court2_byes: (courts[1]?.byes || []).map((round) => (round || []).map((p) => p.id)),
          status: "generated",
        };

        console.debug("Admin: pending_fixtures payload", payload);
        const { error: upsertError } = await supabase.from(pendingTable).upsert(payload, { onConflict: "division" });
        if (upsertError) {
          console.error("Error upserting pending_fixtures:", upsertError);
          // Fallback for tables without unique constraint on division
          if (String(upsertError.message || "").toLowerCase().includes("on conflict")) {
            const { error: deleteError } = await supabase.from(pendingTable).delete().eq("division", division);
            if (deleteError) {
              console.error("Admin: failed to delete previous pending_fixtures for fallback:", deleteError);
            } else {
              const { error: insertError } = await supabase.from(pendingTable).insert([payload]);
              if (insertError) console.error("Admin: failed to insert pending_fixtures fallback:", insertError);
              else console.log("Admin: inserted pending_fixtures fallback for division", division);
            }
          }
        } else {
          console.log("Upserted pending_fixtures for division", division);
        }
      } catch (e) {
        console.error("Failed to persist pending fixtures:", e);
      }

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

    const { error } = await db("matches").update({ [scoreField]: intValue }).eq("id", matchId);
    if (error) console.error(error);
    else fetchPlayersAndMatches();
  }

  // Compute leaderboard
  function computeLeaderboard() {
    const leaderboard = {};
    players.forEach((p) => {
      leaderboard[String(p.id)] = { name: p.name, wins: 0, draws: 0, losses: 0, points: 0 };
    });

    const allMatches = [...court1Matches, ...court2Matches];

    allMatches.forEach((m) => {
      if (m.score1 === null || m.score2 === null) return;

      const team1 = [m.player1_id, m.player2_id].filter(Boolean).map((id) => String(id));
      const team2 = [m.player3_id, m.player4_id].filter(Boolean).map((id) => String(id));

      if (!team2.length) return;

      if (m.score1 > m.score2) {
        team1.forEach((id) => {
          leaderboard[String(id)].wins++;
          leaderboard[String(id)].points += 3;
        });
        team2.forEach((id) => (leaderboard[String(id)].losses++));
      } else if (m.score1 < m.score2) {
        team2.forEach((id) => {
          leaderboard[String(id)].wins++;
          leaderboard[String(id)].points += 3;
        });
        team1.forEach((id) => (leaderboard[String(id)].losses++));
      } else {
        [...team1, ...team2].forEach((id) => {
          leaderboard[String(id)].draws++;
          leaderboard[String(id)].points += 1;
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
                  {players.find((p) => String(p.id) === String(m.player1_id))?.name} &{" "}
                  {players.find((p) => String(p.id) === String(m.player2_id))?.name} vs{" "}
                  {players.find((p) => String(p.id) === String(m.player3_id))?.name || "TBD"} &{" "}
                  {players.find((p) => String(p.id) === String(m.player4_id))?.name || "TBD"}
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