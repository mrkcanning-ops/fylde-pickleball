"use client";

import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabase";
import { getLSJson, setLSJson, removeLS, getViewMode } from "../../lib/ls";

const DOUBLES_SUFFIX = "_doubles";

export default function PreviousSeasonsClient({ division }) {
  const [seasonSummaries, setSeasonSummaries] = useState([]);
  const [seasonLoadInfo, setSeasonLoadInfo] = useState({ source: null, count: 0 });
  const [selectedSeasonId, setSelectedSeasonId] = useState(null);
  const [selectedSeason, setSelectedSeason] = useState(null);
  const viewMode = getViewMode();

  useEffect(() => {
    const load = async () => {
      const seasonsTable = viewMode === "doubles" ? `season_summaries${DOUBLES_SUFFIX}` : "season_summaries";
      const idxKey = `season_summaries_index${viewMode === "doubles" ? DOUBLES_SUFFIX : ""}`;

      try {
        console.debug('[PreviousSeasons] querying table:', seasonsTable, 'viewMode:', viewMode, 'idxKey:', idxKey);
        const { data, error } = await supabase.from(seasonsTable).select("*").order("timestamp", { ascending: false });
        console.debug('[PreviousSeasons] supabase returned:', Array.isArray(data) ? data.length : 'no-data', 'error:', error);
        if (!error && Array.isArray(data)) {
          setSeasonSummaries(data);
          setSeasonLoadInfo({ source: 'supabase', count: data.length });
          if (data.length > 0) {
            setSelectedSeasonId(data[0].id);
            setSelectedSeason(data[0]);
          }
          return;
        }
      } catch (e) {
        console.warn("Failed to load season summaries from Supabase", e);
      }

      // fallback to localStorage index
      try {
        const idx = getLSJson(idxKey, []);
        console.debug('[PreviousSeasons] local index key:', idxKey, 'idx:', idx);
        if (Array.isArray(idx) && idx.length > 0) {
          const items = idx.map((id) => getLSJson(id, null)).filter(Boolean);
          console.debug('[PreviousSeasons] loaded items from LS:', items.length);
          setSeasonSummaries(items);
          setSeasonLoadInfo({ source: 'local', count: items.length });
          if (items.length > 0) {
            setSelectedSeasonId(items[0].id);
            setSelectedSeason(items[0]);
          }
        }
      } catch (e) {
        console.warn("Failed to load season summaries from localStorage", e);
      }
    };

    load();
  }, [division, viewMode]);

  const handleAddSeason = () => {
    const name = window.prompt("New season name (optional):");
    if (name === null) return;
    const id = `season_summary_${division}_${Date.now()}`;
    const newSummary = {
      id,
      division,
      timestamp: new Date().toISOString(),
      name,
      players: [],
      matches: [],
      final_standings: [],
    };
    setSeasonSummaries((prev) => [newSummary, ...(prev || [])]);
    try {
      const idxKey = `season_summaries_index${viewMode === 'doubles' ? DOUBLES_SUFFIX : ''}`;
      const existingIndex = getLSJson(idxKey, []);
      existingIndex.unshift(newSummary.id);
      setLSJson(idxKey, existingIndex);
      setLSJson(newSummary.id, newSummary);
    } catch (e) {
      console.warn('Failed to persist new season to localStorage', e);
    }
  };

  const handleEditSeason = () => {
    if (!selectedSeasonId) {
      alert('Select a season first (click a season entry)');
      return;
    }
    const current = (seasonSummaries || []).find((s) => s.id === selectedSeasonId) || {};
    const newName = window.prompt('Edit season name:', current.name || current.title || '');
    if (newName === null) return;
    const updated = { ...current, name: newName };
    setSeasonSummaries((prev) => (prev || []).map((s) => (s.id === selectedSeasonId ? updated : s)));
    try { setLSJson(updated.id, updated); } catch (e) { console.warn('Failed to update season in localStorage', e); }
  };

  const handleRemoveSeason = () => {
    if (!selectedSeasonId) {
      alert('Select a season first (click a season entry)');
      return;
    }
    const confirmed = window.confirm('Permanently remove selected season?');
    if (!confirmed) return;
    setSeasonSummaries((prev) => (prev || []).filter((s) => s.id !== selectedSeasonId));
    try {
      const idxKey = `season_summaries_index${viewMode === 'doubles' ? DOUBLES_SUFFIX : ''}`;
      const existingIndex = getLSJson(idxKey, []);
      const next = (existingIndex || []).filter((id) => id !== selectedSeasonId);
      setLSJson(idxKey, next);
      removeLS(selectedSeasonId);
    } catch (e) {
      console.warn('Failed to remove season from localStorage', e);
    }
    setSelectedSeasonId(null);
    setSelectedSeason(null);
  };

  return (
    <div className="bg-white text-gray-700 rounded-2xl shadow-lg overflow-hidden p-4">
      <div className="px-2 py-2 border-b border-gray-200 bg-gray-50 mb-4">
        <div className="flex items-center justify-between">
          <div className="font-bold text-yellow-500 text-lg">📜 Previous Seasons</div>
          <div className="flex items-center gap-2">
            <button onClick={handleAddSeason} className="px-3 py-1 bg-green-600 hover:bg-green-500 text-white rounded text-sm">Add</button>
            <button onClick={handleEditSeason} className="px-3 py-1 bg-yellow-600 hover:bg-yellow-500 text-white rounded text-sm" disabled={!selectedSeasonId}>Edit</button>
            <button onClick={handleRemoveSeason} className="px-3 py-1 bg-red-600 hover:bg-red-500 text-white rounded text-sm" disabled={!selectedSeasonId}>Remove</button>
          </div>
        </div>
      </div>

      {seasonSummaries.length === 0 ? (
        <div className="text-gray-600">No archived seasons yet.</div>
      ) : (
        <div className="space-y-3">
          {seasonSummaries.map((s) => {
            const final = s.finalStandings || s.final_standings || [];
            const title = s.name || s.title || new Date(s.timestamp).toLocaleString();
            return (
              <div
                key={s.id}
                onClick={() => { setSelectedSeasonId(s.id); setSelectedSeason(s); }}
                className={`p-3 rounded border cursor-pointer ${selectedSeasonId === s.id ? 'ring-2 ring-yellow-400 bg-yellow-50' : 'bg-white border-gray-200'}`}
              >
                <div className="flex items-center justify-between">
                  <div className="font-semibold">{title}</div>
                  <div className="text-sm text-gray-500">Division {s.division}</div>
                </div>
                <div className="text-sm text-gray-600 mt-1">{final.length} players · {Array.isArray(s.matches) ? s.matches.length : 0} matches</div>
              </div>
            );
          })}
        </div>
      )}
      {seasonLoadInfo.source && (
        <div className="mt-2 text-xs text-gray-400">Loaded from: {seasonLoadInfo.source} ({seasonLoadInfo.count})</div>
      )}
    </div>
  );
}
