"use client";

import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabase";

export default function PreviousMatchesClient() {
  const [previousMatches, setPreviousMatches] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPreviousMatches = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("previous_matches")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching previous matches:", error);
      } else {
        setPreviousMatches(data);
      }
      setLoading(false);
    };

    fetchPreviousMatches();
  }, []);

  return (
    <div className="bg-gray-700 rounded shadow p-4">
      <h2 className="text-yellow-400 font-bold mb-4 text-lg sm:text-xl">
        🕒 Previous Matches
      </h2>

      {loading ? (
        <p className="text-gray-300 italic">Loading...</p>
      ) : previousMatches.length === 0 ? (
        <p className="text-gray-300 italic">No previous matches yet.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-gray-200">
            <thead className="text-gray-400 text-sm uppercase border-b border-gray-500">
              <tr>
                <th className="p-2">#</th>
                <th className="p-2">Court</th>
                <th className="p-2">Division</th>
                <th className="p-2">Players</th>
                <th className="p-2">Scores</th>
              </tr>
            </thead>
            <tbody>
              {previousMatches.map((m, idx) => (
                <tr
                  key={idx}
                  className="border-b border-gray-600 hover:bg-gray-600 transition"
                >
                  <td className="p-2">{idx + 1}</td>
                  <td className="p-2">{m.court}</td>
                  <td className="p-2">{m.division}</td>
                  <td className="p-2">{m.players.join(" vs ")}</td>
                  <td className="p-2">
                    {m.scores?.team1 ?? "-"} – {m.scores?.team2 ?? "-"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}