"use client";

import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";

export default function PreviousMatchesClient() {
  const [previousMatches, setPreviousMatches] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPreviousMatches();
  }, []);

  const fetchPreviousMatches = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("previous_matches")
      .select("*")
      .order("created_at", { ascending: true }); // oldest first

    if (error) {
      console.error("Error fetching previous matches:", error);
      setLoading(false);
      return;
    }

    // Group matches by day (date string)
    const sessions = [];
    let currentWeek = [];
    let lastDate = null;

    data.forEach((match) => {
      const matchDate = new Date(match.created_at).toDateString();
      if (matchDate !== lastDate) {
        if (currentWeek.length > 0) {
          sessions.push({ date: lastDate, matches: currentWeek });
        }
        currentWeek = [match];
        lastDate = matchDate;
      } else {
        currentWeek.push(match);
      }
    });

    if (currentWeek.length > 0) {
      sessions.push({ date: lastDate, matches: currentWeek });
    }

    setPreviousMatches(sessions);
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="text-gray-300 italic text-center p-4">
        Loading previous matches...
      </div>
    );
  }

  if (previousMatches.length === 0) {
    return (
      <p className="text-gray-300 italic text-sm p-4">
        No previous matches yet.
      </p>
    );
  }

  return (
    <div className="space-y-6 p-4">
      {previousMatches.map((week, idx) => (
        <div key={idx} className="bg-gray-700 rounded shadow p-4">
          {/* Week Header */}
          <h3 className="text-yellow-400 font-bold mb-4 text-lg sm:text-xl">
            Week {idx + 1} – {week.date}
          </h3>

          {/* Matches for this week */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
            {week.matches.map((match, mIdx) => (
              <div
                key={mIdx}
                className="mb-2 bg-white rounded-2xl shadow-xl p-4 text-gray-900"
              >
                <div className="font-bold mb-2 text-gray-700">
                  {match.court.toUpperCase()}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
                  {/* Team 1 */}
                  <div className="text-center">
                    <div className="font-bold text-lg mb-1">
                      {match.players.slice(0, 2).join(" & ")}
                    </div>
                    <div className="text-2xl font-extrabold">
                      {match.scores.team1}
                    </div>
                  </div>

                  {/* Team 2 */}
                  <div className="text-center">
                    <div className="font-bold text-lg mb-1">
                      {match.players.slice(2, 4).join(" & ")}
                    </div>
                    <div className="text-2xl font-extrabold">
                      {match.scores.team2}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}