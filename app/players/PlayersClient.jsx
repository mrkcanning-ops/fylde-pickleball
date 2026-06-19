"use client";

import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabase";
import { getViewMode, getLSJson, setLSJson, getLSRaw } from "../../lib/ls";

export default function PlayersClient() {
  const [players, setPlayers] = useState(() => {
    if (typeof window !== "undefined") {
      return getLSJson("players", [
        { name: "Maddie" },
        { name: "Nathan" },
        { name: "Helen" },
      ]);
    }
    return [];
  });

  useEffect(() => {
    // Attempt to load players from Supabase; fall back to localStorage cache
    const load = async () => {
      if (!supabase) return;
      try {
        const DOUBLES_SUFFIX = "_doubles";
        const vm = getViewMode();
        const table = `players${vm === "doubles" ? DOUBLES_SUFFIX : ""}`;
        const { data, error } = await supabase.from(table).select("*").order("name", { ascending: true });
        if (!error && Array.isArray(data)) {
          setPlayers(data.map((d) => ({ ...d, active: typeof d.active === 'boolean' ? d.active : true })));
          try { setLSJson("players", data); } catch (e) {}
          return;
        }
      } catch (e) {
        console.warn('Failed to load players from DB, using cache', e);
      }
    };
    load();
  }, []);

  useEffect(() => {
    setLSJson("players", players);
  }, [players]);

  const addPlayer = async () => {
    const name = prompt("Enter new player name:");
    if (!name) return;
    if (!supabase) {
      setPlayers([...players, { name }]);
      return;
    }
    try {
      const DOUBLES_SUFFIX = "_doubles";
      const vm = getViewMode();
      const table = `players${vm === "doubles" ? DOUBLES_SUFFIX : ""}`;
      const payload = { name, active: true };
      if (vm === "doubles") {
        // include division and generate text id for players_doubles
        payload.division = Number(getLSRaw("division")) || 1;
        try {
          payload.id = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
        } catch (e) {
          payload.id = `${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
        }
      }

      const { data, error } = await supabase.from(table).insert([payload]).select();
      console.debug('PlayersClient:addPlayer insert response', { table, payload, data, error });
      if (!error && Array.isArray(data)) {
        setPlayers((prev) => [...prev, data[0]]);
      } else {
        console.warn('Insert returned error or no data', error, data);
        alert(`Failed to persist player to DB: ${error?.message || JSON.stringify(error)}`);
        setPlayers((prev) => [...prev, payload]);
      }
    } catch (e) {
      console.warn('Failed to insert player:', e);
      setPlayers((prev) => [...prev, { name, active: true }]);
    }
  };

  const deletePlayer = async (index) => {
    if (!confirm(`Delete ${players[index].name}?`)) return;
    const player = players[index];
    if (!supabase || !player.id) {
      setPlayers(players.filter((_, i) => i !== index));
      return;
    }
    try {
      const DOUBLES_SUFFIX = "_doubles";
      const vm = getViewMode();
      const table = `players${vm === "doubles" ? DOUBLES_SUFFIX : ""}`;
      const { error } = await supabase.from(table).delete().eq('id', player.id);
      if (error) throw error;
      setPlayers(players.filter((_, i) => i !== index));
    } catch (e) {
      console.warn('Failed to delete player from DB:', e);
      setPlayers(players.filter((_, i) => i !== index));
    }
  };

  const editPlayer = async (index) => {
    const name = prompt("Edit player name:", players[index].name);
    if (!name) return;
    const player = players[index];
    if (!supabase || !player.id) {
      const updated = [...players];
      updated[index].name = name;
      setPlayers(updated);
      return;
    }
    try {
      const DOUBLES_SUFFIX = "_doubles";
      const vm = getViewMode();
      const table = `players${vm === "doubles" ? DOUBLES_SUFFIX : ""}`;
      const { data, error } = await supabase.from(table).update({ name }).eq('id', player.id).select();
      if (!error && Array.isArray(data)) {
        const updated = [...players];
        updated[index] = data[0];
        setPlayers(updated);
      } else {
        const updated = [...players];
        updated[index].name = name;
        setPlayers(updated);
      }
    } catch (e) {
      console.warn('Failed to update player:', e);
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
                key={player.id || index}
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