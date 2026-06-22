"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "../../lib/supabase";
import { getLSRaw, getLSJson } from "../../lib/ls";

export default function SeasonArchiveClient() {
  const [archives, setArchives] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase.from('season_summaries').select('*').order('timestamp', { ascending: false });
        if (!error && Array.isArray(data) && data.length) {
          setArchives(data);
          setSelected(data[0]);
          setLoading(false);
          return;
        }
      } catch (e) {
        // ignore and fallback to localStorage
      }

      const idx = getLSJson('season_summaries_index', []);
      const items = (idx || []).map((id) => {
        const raw = getLSRaw(id);
        return raw ? JSON.parse(raw) : null;
      }).filter(Boolean);
      setArchives(items);
      if (items.length) setSelected(items[0]);
      setLoading(false);
    };

    load();
  }, []);

  if (loading) return <div className="p-6 text-gray-300">Loading archives...</div>;
  if (!archives || archives.length === 0) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold text-yellow-400 mb-4">Season Archive</h1>
        <p className="text-gray-300">No archived seasons yet.</p>
        <div className="mt-6">
          <Link href="/" className="text-blue-400 underline">Back to dashboard</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-yellow-400 mb-4">Season Archive</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="col-span-1">
          <h2 className="text-lg font-semibold text-gray-200 mb-2">Archived Seasons</h2>
          <ul className="space-y-2">
            {archives.map((s) => (
              <li key={s.id}>
                <button
                  onClick={() => setSelected(s)}
                  className={`w-full text-left px-3 py-2 rounded ${selected?.id === s.id ? 'bg-yellow-500 text-black' : 'bg-gray-800 hover:bg-gray-700'}`}>
                  <div className="text-sm text-gray-300">Division {s?.division} • {new Date(s?.timestamp).toLocaleString()}</div>
                  <div className="text-xs text-gray-400">Top: {s?.top_by_points?.[0]?.name || s?.topByPoints?.[0]?.name || 'No data'}</div>
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
                  <h4 className="font-semibold text-gray-200">Summary</h4>
                  <div className="text-gray-300 mt-2">Avg points: {selected.avgPoints ?? selected.avg_points ?? '—'}</div>
                  <div className="text-gray-300 mt-1">Most active: {selected.mostActive ?? '—'}</div>
                </div>

                <div className="p-3 bg-gray-900 rounded">
                  <h4 className="font-semibold text-gray-200">Top Players</h4>
                  <ol className="text-gray-300 mt-2">
                    {(selected.topByPoints || selected.top_by_points || []).map((p) => (
                      <li key={p.id}>{p.name} — {p.points ?? p.points}</li>
                    ))}
                  </ol>
                </div>

                <div className="md:col-span-2 mt-4">
                  <h4 className="font-semibold text-gray-200">Matches</h4>
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
            <div className="text-gray-300">Select an archive to view details.</div>
          )}
        </div>
      </div>
    </div>
  );
}
