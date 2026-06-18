"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "../../lib/supabase";

// Backwards-compatibility fallback for builds that reference `summariesIndex`.
// Some older compiled code may still expect this variable; define it harmlessly.
/* eslint-disable no-unused-vars */
const summariesIndex = undefined;
/* eslint-enable no-unused-vars */

export default function SeasonSummariesPage() {
  const [summariesList, setSummariesList] = useState([]);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    const load = async () => {
      try {
        const { data, error } = await supabase
          .from("season_summaries")
          .select("*")
          .order("timestamp", { ascending: false });

        if (!error && data && data.length > 0) {
          setSummariesList(data);
          setSelected(data[0]);

          // Attempt to repair missing columns (`final_standings`, `tracker`) from localStorage backups
          (async () => {
            for (const row of data) {
              const hasFinal = row.final_standings || row.finalStandings;
              const hasTracker = row.tracker || row.tracker;
              if (hasFinal && hasTracker) continue;
              try {
                const raw = localStorage.getItem(row.id);
                if (!raw) continue;
                const local = JSON.parse(raw);
                const payload = {};
                if (!hasFinal && (local.finalStandings || local.final_standings)) payload.final_standings = local.finalStandings || local.final_standings;
                if (!hasTracker && (local.tracker)) payload.tracker = local.tracker;
                if (Object.keys(payload).length === 0) continue;
                const { error: updErr } = await supabase.from('season_summaries').update(payload).eq('id', row.id);
                if (updErr) console.warn('Failed to repair season_summaries row', row.id, updErr.message || updErr);
                else console.info('Repaired season_summaries row from localStorage', row.id);
              } catch (e) {
                console.warn('Repair check error for', row.id, e);
              }
            }
          })();
          return;
        }
      } catch (e) {
        console.warn("Supabase fetch error, falling back to localStorage:", e);
      }

      // fallback to localStorage
      const idx = JSON.parse(localStorage.getItem("season_summaries_index") || "[]");
      const items = idx.map((id) => {
        const raw = localStorage.getItem(id);
        return raw ? JSON.parse(raw) : null;
      }).filter(Boolean);
      setSummariesList(items);
      if (items.length > 0) setSelected(items[0]);
    };

    load();
  }, []);

  const openSummary = (id) => {
    const found = summariesList.find((s) => s.id === id);
    if (found) return setSelected(found);

    const raw = localStorage.getItem(id);
    if (!raw) return;
    setSelected(JSON.parse(raw));
  };

  if (!summariesList || summariesList.length === 0) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold text-yellow-400 mb-4">Season Summaries</h1>
        <p className="text-gray-300">No archived seasons yet. End a season from the admin panel to create a summary.</p>
        <div className="mt-6">
          <Link href="/" className="text-blue-400 underline">Back to dashboard</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-yellow-400 mb-4">Season Summaries</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="col-span-1">
          <h2 className="text-lg font-semibold text-gray-200 mb-2">Archived Seasons</h2>
          <ul className="space-y-2">
            {summariesList.map((s) => (
              <li key={s.id}>
                <button
                  onClick={() => openSummary(s.id)}
                  className="w-full text-left px-3 py-2 rounded bg-gray-800 hover:bg-gray-700"
                >
                  <div className="text-sm text-gray-300">Division {s?.division} • {new Date(s?.timestamp).toLocaleString()}</div>
                  <div className="text-xs text-gray-400">{s?.top_by_points?.[0]?.name || s?.topByPoints?.[0]?.name || "No data"}</div>
                </button>
              </li>
            ))}
          </ul>
        </div>

        <div className="md:col-span-2">
          {selected ? (
            <div className="bg-gray-800 p-4 rounded">
              <h3 className="text-xl font-bold text-yellow-400 mb-2">Division {selected.division} — {new Date(selected.timestamp).toLocaleString()}</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-3 bg-gray-900 rounded">
                  <h4 className="font-semibold text-gray-200">Top By Points</h4>
                  <ol className="text-gray-300 mt-2">
                    {(selected.topByPoints || selected.top_by_points || []).map((p) => (
                      <li key={p.id}>{p.name} — {p.points ?? p.points}</li>
                    ))}
                  </ol>
                </div>

                <div className="p-3 bg-gray-900 rounded">
                  <h4 className="font-semibold text-gray-200">Top By Wins</h4>
                  <ol className="text-gray-300 mt-2">
                    {(selected.topByWins || selected.top_by_wins || []).map((p) => (
                      <li key={p.id}>{p.name} — {p.wins ?? p.wins}</li>
                    ))}
                  </ol>
                </div>

                <div className="p-3 bg-gray-900 rounded md:col-span-2">
                  <h4 className="font-semibold text-gray-200">Highest Scoring Match</h4>
                  {selected.highestScoringMatch ? (
                    <div className="text-gray-300 mt-2">
                      <div>{(selected.highestScoringMatch.players || []).join(' vs ')}</div>
                      <div className="text-sm text-gray-400">Score: {selected.highestScoringMatch.scores?.team1 ?? '-'} — {selected.highestScoringMatch.scores?.team2 ?? '-'}</div>
                      <div className="text-sm text-gray-400">Total: {selected.highestScoringMatch.total}</div>
                    </div>
                  ) : (
                    <div className="text-gray-400">No matches recorded.</div>
                  )}
                </div>

                <div className="p-3 bg-gray-900 rounded">
                  <h4 className="font-semibold text-gray-200">Average Points / Match</h4>
                  <div className="text-gray-300 mt-2">{selected.avgPoints}</div>
                </div>

                <div className="p-3 bg-gray-900 rounded">
                  <h4 className="font-semibold text-gray-200">Most Active Player</h4>
                  <div className="text-gray-300 mt-2">{selected.mostActive || '—'}</div>
                </div>

                <div className="md:col-span-2 mt-4">
                  <h4 className="font-semibold text-gray-200">Full Match List</h4>
                  <div className="overflow-x-auto mt-2 bg-gray-800 p-2 rounded">
                    <table className="w-full text-left text-gray-200 text-sm">
                      <thead className="text-gray-400 text-xs uppercase border-b border-gray-700">
                        <tr>
                          <th className="p-2">#</th>
                          <th className="p-2">Players</th>
                          <th className="p-2">Score</th>
                          <th className="p-2">Date</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(selected.matches || []).map((m, i) => (
                          <tr key={i} className="border-b border-gray-700">
                            <td className="p-2 align-top">{i + 1}</td>
                            <td className="p-2">{(m.players || []).join(' vs ')}</td>
                            <td className="p-2">{m.scores?.team1 ?? '-'} — {m.scores?.team2 ?? '-'}</td>
                            <td className="p-2">{m.created_at ? new Date(m.created_at).toLocaleString() : '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-gray-300">Select a summary to view details.</div>
          )}
        </div>
      </div>

      <div className="mt-6">
        <Link href="/" className="text-blue-400 underline">Back to dashboard</Link>
      </div>
    </div>
  );
}
