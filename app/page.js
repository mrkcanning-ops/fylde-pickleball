"use client";

import { useState, useEffect, useLayoutEffect } from "react";
import { useRouter } from "next/navigation";
import HeaderStats from "../components/HeaderStats";
import { supabase } from "../lib/supabase";
import { getLSRaw, getLSJson, setLSRaw, setLSJson, removeLS, getViewMode } from "../lib/ls";

// Minimum games required to qualify for ranked positions. Configure via env var
// NEXT_PUBLIC_MIN_QUALIFY_GAMES (build-time). Defaults to 10.
const MIN_QUALIFY_GAMES = parseInt(process.env.NEXT_PUBLIC_MIN_QUALIFY_GAMES ?? "10", 10) || 10;

export default function HomePage() {
  const [activeTab, setActiveTab] = useState("Standings");
  const [standingsView, setStandingsView] = useState("Leaderboard");
  const [division, setDivision] = useState(1); // numeric id of current division
  // division list with display names; new divisions can be added at runtime
  const [divisions, setDivisions] = useState([
    { id: 1, name: "Division 1" },
    { id: 2, name: "Division 2" },
  ]);
  const [showAddDivisionModal, setShowAddDivisionModal] = useState(false);
  const [newDivisionName, setNewDivisionName] = useState("");
  const [showAddDivisionPasscodeModal, setShowAddDivisionPasscodeModal] = useState(false);
  const [addDivisionPasscode, setAddDivisionPasscode] = useState("");
  const [addDivisionPasscodeError, setAddDivisionPasscodeError] = useState("");
  const [showRemoveDivisionPasscodeModal, setShowRemoveDivisionPasscodeModal] = useState(false);
  const [removeDivisionPasscode, setRemoveDivisionPasscode] = useState("");
  const [removeDivisionPasscodeError, setRemoveDivisionPasscodeError] = useState("");
  const [showSelectDivisionModal, setShowSelectDivisionModal] = useState(false);
  const [selectedDivisionToRemove, setSelectedDivisionToRemove] = useState(null);
  const [showConfirmRemoveDivisionModal, setShowConfirmRemoveDivisionModal] = useState(false);
  const [players, setPlayers] = useState([]);
  const [numCourts, setNumCourts] = useState(2);

  const [court1Matches, setCourt1Matches] = useState([]);
  const [court2Matches, setCourt2Matches] = useState([]);
  const [court3Matches, setCourt3Matches] = useState([]);
  const [court4Matches, setCourt4Matches] = useState([]);

  const [court1Scores, setCourt1Scores] = useState([]);
  const [court2Scores, setCourt2Scores] = useState([]);
  const [court3Scores, setCourt3Scores] = useState([]);
  const [court4Scores, setCourt4Scores] = useState([]);

  const [court1Round, setCourt1Round] = useState(0);
  const [court2Round, setCourt2Round] = useState(0);
  const [court3Round, setCourt3Round] = useState(0);
  const [court4Round, setCourt4Round] = useState(0);

  const [currentRound, setCurrentRound] = useState(0);
  const [roundMatches, setRoundMatches] = useState([]); // flattened all matches by round

  // Mobile bottom-sheet modal control for NQ explanation
  const [showNqModalFor, setShowNqModalFor] = useState(null);
  // Editable minimum games to qualify (per-division, persisted to localStorage)
  const [minQualifyByDivision, setMinQualifyByDivision] = useState(() => {
    try {
      return getLSJson("min_qualify_by_division", {});
    } catch (e) {
      return {};
    }
  });
  // current division value (kept in sync)
  const [minQualifyGames, setMinQualifyGames] = useState(() => {
    try {
      const v = getLSRaw("min_qualify_games");
      return v ? parseInt(v, 10) || MIN_QUALIFY_GAMES : MIN_QUALIFY_GAMES;
    } catch (e) {
      return MIN_QUALIFY_GAMES;
    }
  });
  const [showEditMinModal, setShowEditMinModal] = useState(false);
  const [minQualifyInput, setMinQualifyInput] = useState(String(minQualifyGames));
  const [showVerifyMinPasscodeModal, setShowVerifyMinPasscodeModal] = useState(false);
  const [pendingMinSave, setPendingMinSave] = useState(null); // { division, value }
  const [verifyMinPasscode, setVerifyMinPasscode] = useState("");
  const [verifyMinError, setVerifyMinError] = useState("");

const [isAdmin, setIsAdmin] = useState(false);
const [showAdminModal, setShowAdminModal] = useState(false);
const [adminCode, setAdminCode] = useState("");
const [adminError, setAdminError] = useState("");

const [previousMatches, setPreviousMatches] = useState([]);
  const [seasonSummaries, setSeasonSummaries] = useState([]);
  const [selectedSeasonId, setSelectedSeasonId] = useState(null);
  const [selectedSeason, setSelectedSeason] = useState(null);
  const [currentSeason, setCurrentSeason] = useState(() => {
    try {
      return getLSJson("current_season", null);
    } catch (e) {
      return null;
    }
  });

  // Try to load running season from Supabase for this division (fallback to localStorage)
  const loadRunningSeasonFromDb = async (divisionNum = division) => {
    if (!supabase) return;
    try {
      const { data, error } = await db("running_seasons")
        .select("*")
        .eq("division", divisionNum)
        .limit(1)
        .single();

      if (!error && data) {
        try {
          setLSJson("current_season", data);
        } catch (e) {}
        setCurrentSeason(data);
        return;
      }
    } catch (e) {
      // table may not exist or network error — ignore and rely on localStorage
    }

    try {
      const raw = getLSJson("current_season", null);
      if (raw) setCurrentSeason(raw);
    } catch (e) {}
  };

  useEffect(() => {
    // load running season for current division on mount and when division changes
    loadRunningSeasonFromDb(division);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [division]);

  const filteredSeasonSummaries = (seasonSummaries || []).filter((s) => Number(s.division) === Number(division));

  const [leaderboard, setLeaderboard] = useState([]);
  const [openDates, setOpenDates] = useState([]); // dates that are expanded
  const [hydrated, setHydrated] = useState(false);
  const [serverError, setServerError] = useState(null);
  const [viewMode, setViewMode] = useState(() => {
    try { return getViewMode(); } catch (e) { return "league"; }
  });

  // Helper to pick table name depending on view mode (league or doubles)
  // Force literal suffix to avoid environment mismatch during development
  const DOUBLES_SUFFIX = "_doubles";
  const db = (table) => supabase.from(`${table}${viewMode === "doubles" ? DOUBLES_SUFFIX : ""}`);

  // Dev-only debug: log and expose divisions state to diagnose mobile/desktop mismatch
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!hydrated) return;
    console.debug("[debug] divisions (state):", divisions);
    console.debug("[debug] division (state):", division);
    try {
      console.debug("[debug] divisions (localStorage):", getLSJson(`divisions_${viewMode}`, null));
      console.debug("[debug] division (localStorage):", getLSRaw("division"));
    } catch (e) {
      console.debug("[debug] localStorage parse error", e);
    }
  }, [hydrated, divisions, division]);

  // Fetch players and matches for a division and compute leaderboard stats
  const fetchAllDivisionPlayers = async (divisionId = division) => {
    if (!supabase) return;
    try {
      const { data: playerData, error: playerError } = await db("players")
        .select("*")
        .eq("division", divisionId)
        .order("name", { ascending: true });

      if (playerError) {
        console.error("Error fetching players:", playerError);
        setPlayers([]);
        setAllDivisionPlayers([]);
      } else {
        setPlayers(playerData || []);
        setAllDivisionPlayers(playerData || []);
      }

      const { data: matchData, error: matchError } = await db("previous_matches")
        .select("*")
        .eq("division", divisionId)
        .order("created_at", { ascending: true });

      if (matchError) {
        console.error("Error fetching previous matches:", matchError);
        setPreviousMatches([]);
      } else {
        setPreviousMatches(matchData || []);
      }

      // Compute simple stats from matches and players
      const statsById = {};
      (playerData || []).forEach((p) => {
        statsById[p.id] = {
          id: p.id,
          name: p.name,
          wins: 0,
          losses: 0,
          draws: 0,
          points: 0,
          points_for: 0,
          points_against: 0,
          win_streak: 0,
        };
      });

      (matchData || []).forEach((m) => {
        const playersArr = Array.isArray(m.players)
          ? m.players
          : (() => {
              try {
                return JSON.parse(m.players || "[]");
              } catch (e) {
                return [];
              }
            })();

        const team1 = playersArr.slice(0, 2).map(String);
        const team2 = playersArr.slice(2, 4).map(String);
        const score1 = Number(m.scores?.team1 ?? m.scores?.[0] ?? 0);
        const score2 = Number(m.scores?.team2 ?? m.scores?.[1] ?? 0);

        let result1 = "draw";
        let result2 = "draw";
        if (score1 > score2) {
          result1 = "win";
          result2 = "loss";
        } else if (score1 < score2) {
          result1 = "loss";
          result2 = "win";
        }

        const update = (id, res, scored, conceded) => {
          const s = statsById[id];
          if (!s) return;
          if (res === "win") {
            s.wins += 1;
            s.points += 3;
            s.win_streak += 1;
          } else if (res === "loss") {
            s.losses += 1;
            s.win_streak = 0;
          } else {
            s.draws += 1;
            s.points += 1;
            s.win_streak = 0;
          }
          s.points_for += scored;
          s.points_against += conceded;
        };

        team1.forEach((id) => update(String(id), result1, score1, score2));
        team2.forEach((id) => update(String(id), result2, score2, score1));
      });

      const ranked = sortPlayersByStats(Object.values(statsById));
      setLeaderboard(ranked || []);
    } catch (e) {
      console.error("fetchAllDivisionPlayers error:", e);
      setPlayers([]);
      setAllDivisionPlayers([]);
      setPreviousMatches([]);
      setLeaderboard([]);
    }
  };

  const toggleDate = (date) => {
    setOpenDates((prev) =>
      prev.includes(date) ? prev.filter((d) => d !== date) : [...prev, date]
    );
  }; 

  const [showResetModal, setShowResetModal] = useState(false);
  const [showEndSeasonChoiceModal, setShowEndSeasonChoiceModal] = useState(false);
  const [endSummaryContext, setEndSummaryContext] = useState(null);
  const [newSeasonName, setNewSeasonName] = useState("");
const [resetPasswordInput, setResetPasswordInput] = useState("");
const [resetError, setResetError] = useState("");
  const router = useRouter();
const [showRecalculateModal, setShowRecalculateModal] = useState(false);
const [recalculatePasswordInput, setRecalculatePasswordInput] = useState("");
const [recalculateError, setRecalculateError] = useState("");

const [showAddMatchModal, setShowAddMatchModal] = useState(false);
const [showAddMatchPasscodeModal, setShowAddMatchPasscodeModal] = useState(false);
const [addMatchPasscode, setAddMatchPasscode] = useState("");
const [addMatchPasscodeError, setAddMatchPasscodeError] = useState("");
const [addMatchError, setAddMatchError] = useState("");
const [showEditMatchPasscodeModal, setShowEditMatchPasscodeModal] = useState(false);
const [editMatchPasscode, setEditMatchPasscode] = useState("");
const [editMatchPasscodeError, setEditMatchPasscodeError] = useState("");
const [pendingEditMatch, setPendingEditMatch] = useState(null);
const [showEditMatchModal, setShowEditMatchModal] = useState(false);
const [editMatchError, setEditMatchError] = useState("");
const [editingMatchId, setEditingMatchId] = useState(null);
const [allDivisionPlayers, setAllDivisionPlayers] = useState([]);
const [addMatchData, setAddMatchData] = useState({
  date: new Date().toISOString().split('T')[0],
  team1Players: [],
  team1Name: "",
  team2Players: [],
  team2Name: "",
  team1Score: "",
  team2Score: "",
  court: "court1",
});
const [editMatchData, setEditMatchData] = useState({
  date: new Date().toISOString().split('T')[0],
  team1Players: [],
  team2Players: [],
  team1Score: "",
  team2Score: "",
  court: "court1",
});
const [showRemovePlayerModal, setShowRemovePlayerModal] = useState(false);
const [removePlayerPasscode, setRemovePlayerPasscode] = useState("");
const [removePlayerPasscodeError, setRemovePlayerPasscodeError] = useState("");
const [selectedPlayerToRemove, setSelectedPlayerToRemove] = useState(null);
const [showSelectPlayerModal, setShowSelectPlayerModal] = useState(false);

  // Load leaderboard and persisted divisions from localStorage on startup
  useLayoutEffect(() => {
    try {
      const saved = getLSJson("leaderboard", []) || [];
      setLeaderboard(saved);

      const savedDivisions = getLSJson(`divisions_${viewMode}`, null);
      const savedDivisionId = Number(getLSRaw("division"));

      // Server-first: attempt to load canonical divisions from Supabase
      // so all clients (different origins) see the same data. If the
      // server fetch fails or returns no divisions, show a visible error
      // and do not silently fall back to localStorage.
      (async () => {
          try {
            let { data: dbDivs, error: dbErr } = await db("divisions")
              .select("id,name,min_qualify_games")
              .order("id", { ascending: true });

            // If the DB returns a missing-column error (e.g. older doubles table), retry without the column
            if (dbErr && String(dbErr?.code) === "42703") {
              const fallback = await db("divisions").select("id,name").order("id", { ascending: true });
              dbDivs = fallback.data;
              dbErr = fallback.error;
            }

            if (!dbErr && Array.isArray(dbDivs) && dbDivs.length > 0) {
              const mapped = dbDivs.map((d) => ({ id: d.id, name: d.name || `Division ${d.id}`, min_qualify_games: d.min_qualify_games }));
              setDivisions(mapped);
              try { setLSJson(`divisions_${viewMode}`, mapped); } catch (e) {}
              const byDiv = {};
              mapped.forEach((m) => { if (m.min_qualify_games != null) byDiv[String(m.id)] = m.min_qualify_games; });
              setMinQualifyByDivision((prev) => ({ ...(prev || {}), ...(byDiv || {}) }));
              const initialDivision = savedDivisionId || mapped[0].id;
              setDivision(initialDivision);
              await fetchAllDivisionPlayers(initialDivision);
              return;
            }
          

          // Server returned empty or invalid response — treat as failure.
          console.error("Failed to fetch divisions from server: empty or invalid response", { dbDivs, dbErr });
          const details = dbErr ? JSON.stringify(dbErr) : JSON.stringify(dbDivs);
          const vm = getViewMode();
          const table = vm === 'doubles' ? `divisions${DOUBLES_SUFFIX}` : 'divisions';
          setServerError(`Failed to load divisions from server. Details: ${details} Queried table: ${table} (view_mode=${vm})`);
          setDivisions([]);
          setHydrated(true);
          return;
        } catch (e) {
          console.error("Failed to fetch divisions from server:", e);
          setServerError(`Failed to load divisions from server. Error: ${e?.message || String(e)}`);
          setDivisions([]);
          setHydrated(true);
          return;
        }
      })();
      // mark hydration complete so UI renders consistently
      setHydrated(true);
    } catch (e) {
      // If localStorage has invalid JSON, fallback gracefully
      console.warn("Error reading saved divisions/leaderboard:", e);
      const saved = getLSJson("leaderboard", []) || [];
      setLeaderboard(saved);
      fetchAllDivisionPlayers();
      setHydrated(true);
    }
  }, []);

  // Persist divisions and selected division to localStorage
  useEffect(() => {
    try {
      // Keep only selected division in localStorage (divisions are canonical in Supabase)
      setLSRaw("division", String(division));
    } catch (e) {
      console.warn("Failed to persist divisions:", e);
    }
  }, [divisions, division]);

  const resetLeaderboard = async () => {
    const code = prompt("Enter admin passcode to end season:");
    if (!code) return;

    const envPasscode = process.env.NEXT_PUBLIC_ADMIN_PASSCODE;

    if (code.trim() !== envPasscode?.trim()) {
      alert("Incorrect passcode ❌");
      return;
    }

    const confirmed = confirm("Are you sure you want to end the season and reset the leaderboard?");
    if (!confirmed) return;

    try {
      // Build season summary payload from current leaderboard
      const summaryId = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
      const timestamp = new Date().toISOString();

      const finalStandings = (leaderboard || []).map((p, i) => ({
        position: i + 1,
        id: p.id,
        name: p.name,
        points: p.points ?? 0,
        wins: p.wins ?? 0,
        losses: p.losses ?? 0,
      }));

      // optional summary extras
      const topByPoints = [...finalStandings].sort((a, b) => (b.points || 0) - (a.points || 0)).slice(0, 5);
      const topByWins = [...finalStandings].sort((a, b) => (b.wins || 0) - (a.wins || 0)).slice(0, 5);

      // attempt to include full matches for this division (best-effort)
      let matchesForDivision = [];
      try {
        const { data: matches } = await db("previous_matches").select("*").eq("division", division).order("created_at", { ascending: true });
        if (Array.isArray(matches)) matchesForDivision = matches;
      } catch (e) {
        console.warn('Failed to load matches for summary:', e);
      }

      const payload = {
        id: summaryId,
        division,
        timestamp,
        final_standings: finalStandings,
        top_by_points: topByPoints,
        top_by_wins: topByWins,
        matches: matchesForDivision,
      };

      // persist to Supabase (table picked by viewMode automatically by `db` helper)
      try {
        const { data: inserted, error: insErr } = await db("season_summaries").insert(payload).select();
        if (insErr) throw insErr;
        console.info('Saved season summary to DB', inserted?.[0]?.id || summaryId);
      } catch (e) {
        console.warn('Failed to save season summary to DB, will save to localStorage index as fallback', e);
      }

      // update localStorage index and raw summary for offline fallback
      try {
        const idxKey = `season_summaries_index${viewMode === 'doubles' ? DOUBLES_SUFFIX : ''}`;
        const existing = getLSJson(idxKey, []);
        const next = [summaryId].concat(existing || []);
        setLSJson(idxKey, next);
        setLSJson(summaryId, payload);
      } catch (e) {
        console.warn('Failed to persist season summary to localStorage', e);
      }

      // clear leaderboard and notify
      setLeaderboard([]);
      removeLS("leaderboard");
      alert("Season ended and summary saved ✅");
    } catch (err) {
      console.error('End season error:', err);
      alert('Failed to end season. See console for details.');
    }
  };

  const recalculateStandings = async () => {
    if (!supabase) return;

    // 1) Get players for current division only.
    const { data: players } = await db("players")
      .select("*")
      .eq("division", division);

    if (!players || players.length === 0) return;

    // 2) Get matches in deterministic chronological order for this division.
      const { data: matches } = await db("previous_matches")
        .select("id,players,scores,created_at")
        .eq("division", division)
        .order("created_at", { ascending: true });

    // 3) Initialize in-memory stats.
    const playerStats = {};
    players.forEach((p) => {
      playerStats[p.id] = {
        wins: 0,
        losses: 0,
        draws: 0,
        points: 0,
        points_for: 0,
        points_against: 0,
        win_streak: 0,
      };
    });

    const updatePlayerStats = (playerId, result, scored, conceded) => {
      const stats = playerStats[playerId];
      if (!stats) return;

      if (result === "win") {
        stats.wins += 1;
        stats.points += 3;
        stats.win_streak += 1;
      } else if (result === "loss") {
        stats.losses += 1;
        stats.win_streak = 0;
      } else {
        stats.draws += 1;
        stats.points += 1;
        stats.win_streak = 0;
      }

      stats.points_for += scored;
      stats.points_against += conceded;
    };

    // 4) Rebuild stats from matches oldest -> newest.
    for (const match of matches || []) {
      const playersArray = Array.isArray(match.players)
        ? match.players
        : JSON.parse(match.players || "[]");

      if (!Array.isArray(playersArray) || playersArray.length < 4) continue;

      const score1 = Number(match?.scores?.team1);
      const score2 = Number(match?.scores?.team2);
      if (Number.isNaN(score1) || Number.isNaN(score2)) continue;

      const team1 = playersArray.slice(0, 2);
      const team2 = playersArray.slice(2, 4);

      let result1 = "draw";
      let result2 = "draw";
      if (score1 > score2) {
        result1 = "win";
        result2 = "loss";
      } else if (score1 < score2) {
        result1 = "loss";
        result2 = "win";
      }

      team1.forEach((p) => updatePlayerStats(p, result1, score1, score2));
      team2.forEach((p) => updatePlayerStats(p, result2, score2, score1));
    }

    // 5) Persist recalculated stats for each player.
    for (const playerId in playerStats) {
      const { error } = await db("players").update(playerStats[playerId]).eq("id", playerId);

      if (error) {
        console.error(`Failed to update player ${playerId}:`, error);
      }
    }
  };

const updatePlayerStatsFromMatches = async () => {
  const { data: matches } = await db("previous_matches").select("*").order("created_at", { ascending: true });

  for (const match of matches) {
    const playersArray = JSON.parse(match.players);

    const team1 = playersArray.slice(0, 2).map((id) => String(id));
    const team2 = playersArray.slice(2, 4).map((id) => String(id));

    const score1 = Number((match.scores && (match.scores.team1 ?? match.scores[0])) || 0);
    const score2 = Number((match.scores && (match.scores.team2 ?? match.scores[1])) || 0);

    // Determine result for each team
    let resultTeam1 = "draw";
    let resultTeam2 = "draw";
    if (score1 > score2) {
      resultTeam1 = "win";
      resultTeam2 = "loss";
    } else if (score1 < score2) {
      resultTeam1 = "loss";
      resultTeam2 = "win";
    }

    // Helper to update stats by player id
    const updateStats = async (playerId, result, scored, conceded) => {
      const { data: player, error } = await db("players").select("*").eq("id", playerId).single();

      console.log("Looking for player id:", playerId);
      console.log("Found player:", player, "error:", error);

      if (!player) return;

      const updated = {
        wins: player.wins || 0,
        losses: player.losses || 0,
        draws: player.draws || 0,
        points: player.points || 0,
        points_for: player.points_for || 0,
        points_against: player.points_against || 0,
        win_streak: player.win_streak || 0,
      };

      if (result === "win") {
        updated.wins += 1;
        updated.points += 3;
        updated.win_streak += 1;
      } else if (result === "loss") {
        updated.losses += 1;
        updated.win_streak = 0;
      } else {
        updated.draws += 1;
        updated.points += 1;
        updated.win_streak = 0;
      }

      updated.points_for += scored;
      updated.points_against += conceded;

      await db("players")
        .update(updated)
        .eq("id", player.id);
    };

    // Update team 1
    for (const p of team1) {
      await updateStats(p, resultTeam1, score1, score2);
    }
    // Update team 2
    for (const p of team2) {
      await updateStats(p, resultTeam2, score2, score1);
    }
  }
};
const handleAdminUnlock = () => {
  const code = prompt("Enter admin passcode:");

  if (!code) return;

  if (code === process.env.NEXT_PUBLIC_ADMIN_PASSCODE) {
    setIsAdmin(true);
    alert("Admin access granted ✅");
  } else {
    alert("Incorrect passcode ❌");
  }
};

const verifyAdminCode = () => {
  if (adminCode === process.env.NEXT_PUBLIC_ADMIN_PASSCODE) {
    setIsAdmin(true);
    setShowAdminModal(false);
    setAdminCode("");
    setAdminError("");
  } else {
    setAdminError("Incorrect passcode");
  }
};

const fetchPreviousMatches = async () => {
  const { data, error } = await db("previous_matches")
    .select("*")
    .eq("division", division)
    .order("created_at", { ascending: false }); // Most recent first

  if (error) {
    console.error("Error fetching previous matches:", error);
  } else {
    setPreviousMatches(data || []);
  }
};

// Fetch players for the current division (simple loader used across the UI)
const fetchPlayers = async (divisionId = division) => {
  if (!supabase) return [];
  try {
    const { data, error } = await db("players")
      .select("*")
      .eq("division", divisionId)
      .order("name", { ascending: true });

    if (error) {
      console.error("Error fetching players:", error);
      setPlayers([]);
      setAllDivisionPlayers([]);
      return [];
    }

    const playersData = data || [];
    setPlayers(playersData);
    setAllDivisionPlayers(playersData);
    return playersData;
  } catch (e) {
    console.error("fetchPlayers error:", e);
    setPlayers([]);
    setAllDivisionPlayers([]);
    return [];
  }
};

  useEffect(() => {
    const syncAndFetchData = async () => {
      const fetchedPlayers = await fetchPlayers();
      await fetchPreviousMatches();
      await fetchAllDivisionPlayers();
      await loadPendingFixtures(fetchedPlayers || []);
    };

    syncAndFetchData();
  }, [division]);

  // Load season summaries when user opens the Seasons tab
  useEffect(() => {
    if (activeTab !== "Previous Seasons") return;

    const load = async () => {
      const seasonsTable = viewMode === 'doubles' ? `season_summaries${DOUBLES_SUFFIX}` : "season_summaries";
      const idxKey = `season_summaries_index${viewMode === 'doubles' ? DOUBLES_SUFFIX : ""}`;
      try {
        const { data, error } = await supabase
          .from(seasonsTable)
          .select("*")
          .order("timestamp", { ascending: false });

        console.debug("[seasons] supabase response:", { data, error });

        if (!error && Array.isArray(data)) {
          setSeasonSummaries(data);
          setSeasonLoadInfo({ source: 'supabase', count: Array.isArray(data) ? data.length : 0 });
          if (data.length > 0) {
            setSelectedSeasonId(data[0].id);
            setSelectedSeason(data[0]);
          }
          return;
        }
      } catch (e) {
        console.warn("Failed to load season summaries:", e);
      }

      // fallback to localStorage index (namespaced per mode)
      try {
        const idx = getLSJson(idxKey, []);
        console.debug("[seasons] local index:", idx);
        const items = (idx || []).map((id) => {
          const raw = getLSRaw(id);
          console.debug("[seasons] local item", id, raw ? 'present' : 'missing');
          return raw ? JSON.parse(raw) : null;
        }).filter(Boolean);
        console.debug("[seasons] local items loaded:", items.length);
        setSeasonSummaries(items);
        setSeasonLoadInfo({ source: 'localStorage', count: items.length });
        if (items.length > 0) {
          setSelectedSeasonId(items[0].id);
          setSelectedSeason(items[0]);
        }
      } catch (e) {
        console.warn("No season summaries in localStorage", e);
      }
    };

    load();
  }, [activeTab]);

  const [seasonLoadInfo, setSeasonLoadInfo] = useState({ source: null, count: 0 });

  const createNewSeason = async () => {
    // Prevent creating a new season if one is already running
    const running = currentSeason || (() => {
      try { return getLSJson("current_season", null); } catch (e) { return null; }
    })();

    if (running) {
      alert(`A season is already running: ${running.name}. End it before creating a new one.`);
      return;
    }

    const name = prompt("Enter a name for the new season:");
    if (!name || !name.trim()) return;

    const confirmCreate = confirm(`Create new season named "${name.trim()}"?`);
    if (!confirmCreate) return;

    const newSeason = {
      id: `season_${Date.now()}`,
      name: name.trim(),
      started_at: new Date().toISOString(),
    };

    try {
      // try persist to Supabase table `running_seasons` (if available)
      let saved = false;
      try {
        const { data: insertData, error: insertError } = await db("running_seasons")
          .insert([
            {
              id: newSeason.id,
              name: newSeason.name,
              started_at: newSeason.started_at,
              division: newSeason.division || null,
            },
          ]);

        if (!insertError) {
          saved = true;
          // prefer DB record
          const dbRec = Array.isArray(insertData) ? insertData[0] : insertData;
          setLSJson("current_season", dbRec);
          setCurrentSeason(dbRec);
        }
      } catch (dbErr) {
        // ignore
      }

      if (!saved) {
        setLSJson("current_season", newSeason);
        setCurrentSeason(newSeason);
      }

      alert(`New season "${newSeason.name}" started.`);
    } catch (e) {
      console.error("Failed to create new season:", e);
      alert("Failed to create new season.");
    }
  };

  const handleStartNewSeasonFromSummary = async () => {
    if (!endSummaryContext) return;
    const divisionNum = endSummaryContext.division;
    const playersForSummary = endSummaryContext.players || [];
    const name = (newSeasonName && newSeasonName.trim()) || `Season ${new Date().toLocaleDateString()}`;

    try {
      // Reset player stats
      if (playersForSummary.length > 0) {
        for (const player of playersForSummary) {
          await db("players").update({ wins: 0, losses: 0, draws: 0, points: 0, points_for: 0, points_against: 0, win_streak: 0 }).eq("id", player.id);
        }
      }

      // remove previous matches and pending fixtures
      try { await db("previous_matches").delete().eq("division", divisionNum); } catch (e) {}
      try { await db("pending_fixtures").delete().eq("division", divisionNum); } catch (e) {}

      // Clear client-side match and leaderboard state
      setPreviousMatches([]);
      setCourt1Matches([]);
      setCourt2Matches([]);
      setCourt3Matches([]);
      setCourt4Matches([]);
      setCourt1Scores([]);
      setCourt2Scores([]);
      setCourt3Scores([]);
      setCourt4Scores([]);
      setCourt1Round(0);
      setCourt2Round(0);
      setCourt3Round(0);
      setCourt4Round(0);
      setRoundMatches([]);
      setCurrentRound(0);

      // Refresh players list
      await fetchPlayers();

      // Clear local leaderboard cache
      removeLS("leaderboard");
      setLeaderboard([]);

      // Persist running season to DB if possible
      const running = { id: `season_${Date.now()}`, name, started_at: new Date().toISOString(), division: divisionNum };
      try {
        const { data: ins, error: insErr } = await db("running_seasons").insert([running]);
        if (!insErr) {
          const dbRec = Array.isArray(ins) ? ins[0] : ins;
          setLSJson("current_season", dbRec);
          setCurrentSeason(dbRec);
        } else {
          setLSJson("current_season", running);
          setCurrentSeason(running);
        }
      } catch (e) {
        setLSJson("current_season", running);
        setCurrentSeason(running);
      }

      alert("New season started with players reset.");
      setShowEndSeasonChoiceModal(false);
      setEndSummaryContext(null);
      setNewSeasonName("");
    } catch (err) {
      console.error("Failed to start new season:", err);
      alert("Failed to start new season.");
    }
  };

  const handleClearPlayersFromSummary = async () => {
    if (!endSummaryContext) return;
    const divisionNum = endSummaryContext.division;
    try {
      // delete players for division
      try { await db("players").delete().eq("division", divisionNum); } catch (e) { console.warn(e); }

      // remove running season row if exists
      try { await db("running_seasons").delete().eq("division", divisionNum); } catch (e) {}

      // Clear client state
      setPlayers([]);
      setAllDivisionPlayers([]);
      setPreviousMatches([]);
      removeLS("leaderboard");
      setLeaderboard([]);

      try { removeLS("current_season"); } catch (e) {}
      setCurrentSeason(null);

      alert("Players cleared for division.");
      setShowEndSeasonChoiceModal(false);
      setEndSummaryContext(null);
    } catch (err) {
      console.error("Failed to clear players:", err);
      alert("Failed to clear players.");
    }
  };

  const sortPlayersByStats = (players) => {
    // Separate eligible (played >= minQualifyGames) from ineligible
    const eligible = [];
    const ineligible = [];
    for (const p of players) {
      const gp = (p.wins || 0) + (p.losses || 0) + (p.draws || 0);
      // use per-division runtime value; ignore min in doubles mode
      const runtimeMin = viewMode === 'doubles' ? 0 : (minQualifyByDivision[division] ?? minQualifyGames ?? MIN_QUALIFY_GAMES);
      if (gp >= runtimeMin) eligible.push(p);
      else ineligible.push(p);
    }

    const sortFn = (a, b) => {
      // Calculate stats for sorting
      const aGP = (a.wins || 0) + (a.losses || 0) + (a.draws || 0);
      const bGP = (b.wins || 0) + (b.losses || 0) + (b.draws || 0);
      const aHasPlayed = aGP > 0 ? 1 : 0;
      const bHasPlayed = bGP > 0 ? 1 : 0;
      const aWinPct = aGP > 0 ? (a.wins || 0) / aGP : 0;
      const bWinPct = bGP > 0 ? (b.wins || 0) / bGP : 0;
      const aDiff = (a.points_for || 0) - (a.points_against || 0);
      const bDiff = (b.points_for || 0) - (b.points_against || 0);
      // 0. Players with GP > 0 always rank above players with GP = 0
      if (bHasPlayed !== aHasPlayed) return bHasPlayed - aHasPlayed;
      // If in doubles mode, rank by point difference first
      if (viewMode === 'doubles') {
        if (bDiff !== aDiff) return bDiff - aDiff;
        if (bGP !== aGP) return bGP - aGP;
        return (a.name || "").localeCompare(b.name || "");
      }
      // 1. Win % (descending)
      if (bWinPct !== aWinPct) return bWinPct - aWinPct;
      // 2. Point Diff (descending)
      if (bDiff !== aDiff) return bDiff - aDiff;
      // 3. Games Played (descending)
      if (bGP !== aGP) return bGP - aGP;
      // 4. Alphabetically (ascending)
      return (a.name || "").localeCompare(b.name || "");
    };

    // Sort eligible by competitive criteria, ineligible by GP desc then name
    eligible.sort(sortFn);
    ineligible.sort((a, b) => {
      const aGP = (a.wins || 0) + (a.losses || 0) + (a.draws || 0);
      const bGP = (b.wins || 0) + (b.losses || 0) + (b.draws || 0);
      const aWinPct = aGP > 0 ? (a.wins || 0) / aGP : 0;
      const bWinPct = bGP > 0 ? (b.wins || 0) / bGP : 0;
      const aDiff = (a.points_for || 0) - (a.points_against || 0);
      const bDiff = (b.points_for || 0) - (b.points_against || 0);
      // If in doubles mode, rank by point diff first
      if (viewMode === 'doubles') {
        if (bDiff !== aDiff) return bDiff - aDiff;
        if (bGP !== aGP) return bGP - aGP;
        return (a.name || "").localeCompare(b.name || "");
      }
      // 1. Win % (descending)
      if (bWinPct !== aWinPct) return bWinPct - aWinPct;
      // 2. Point diff (descending)
      if (bDiff !== aDiff) return bDiff - aDiff;
    });

    return [...eligible, ...ineligible];
  };

  const handleAddPlayer = async () => {
    const name = prompt("Enter new player's name:");
    if (!name) return;

    const { data, error } = await db("players")
      .insert([{ name, wins: 0, draws: 0, losses: 0, points: 0, active: true, division }])
      .select();

    if (!error) setPlayers((prev) => [...prev, data[0]]);
  };

  const handleRemovePlayer = () => {
    setShowSelectPlayerModal(true);
  };

  const handleSelectPlayerForRemoval = (player) => {
    setSelectedPlayerToRemove(player);
    setShowSelectPlayerModal(false);
    setShowRemovePlayerModal(true);
  };

  const toggleAvailability = async (id) => {
    const player = players.find((p) => String(p.id) === String(id));
    const newActive = !player.active;

    await db("players").update({ active: newActive }).eq("id", id);

    setPlayers((prev) =>
      prev.map((p) => (String(p.id) === String(id) ? { ...p, active: newActive } : p))
    );
  };

  const prevDivision = () => {
    if (!divisions || divisions.length === 0) return;
    const idx = divisions.findIndex((d) => d.id === division);
    const prevIdx = idx > 0 ? idx - 1 : divisions.length - 1;
    setDivision(divisions[prevIdx].id);
  };

  const toggleDivision = () => {
    if (!divisions || divisions.length === 0) return;
    const idx = divisions.findIndex((d) => d.id === division);
    const nextIdx = (idx + 1) % divisions.length;
    setDivision(divisions[nextIdx].id);
  };

  const currentLeader = players[0]?.name || "—";
  // determine most improved solely by positive position change
  const maxPositionChange = players.length
    ? Math.max(0, ...players.map((p) => p.positionChange || 0))
    : 0;
  const mostImprovedPlayer =
    maxPositionChange > 0
      ? players.find((p) => (p.positionChange || 0) === maxPositionChange) || {}
      : {};
  const improvementValue = mostImprovedPlayer.positionChange || 0;
  const improvementLabel = "Ranking";
  // compute highest win streak and players sharing it
  const highestWinStreak = players.length
    ? Math.max(0, ...players.map((p) => p.win_streak || 0))
    : 0;
  const highestWinStreakPlayers =
    highestWinStreak > 0
      ? players.filter((p) => (p.win_streak || 0) === highestWinStreak)
      : [];

  const stats = [
    {
  label: "Division",
  value: division,
  highlight: "blue",
  onClick: toggleDivision,
  renderCustom: () => (
      <div className="w-full select-none">
        <div className="flex items-center justify-between px-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              prevDivision();
            }}
            className="w-10 h-10 flex items-center justify-center rounded-full bg-gray-700 text-white border border-gray-600 hover:bg-gray-600"
            title="Previous division"
          >
            ◀
          </button>

          <span className="mx-4 flex-1 text-center bg-yellow-500 text-gray-950 font-extrabold text-2xl px-5 py-2 rounded-full leading-none inline-block max-w-full overflow-hidden text-ellipsis">
            {divisions.find((d) => d.id === division)?.name || `Division ${division}`}
          </span>

          <button
            onClick={(e) => {
              e.stopPropagation();
              toggleDivision();
            }}
            className="w-10 h-10 flex items-center justify-center rounded-full bg-gray-700 text-white border border-gray-600 hover:bg-gray-600"
            title="Next division"
          >
            ▶
          </button>
        </div>

        <div className="flex items-center gap-3 mt-3 justify-center">
          <button
            onClick={() => setShowAddDivisionPasscodeModal(true)}
            className="bg-gray-800 text-white px-4 py-2 rounded text-sm border border-gray-600 hover:bg-gray-700"
          >
            ➕ Add
          </button>
          <button
            onClick={syncDivisions}
            className="bg-gray-700 text-white px-4 py-2 rounded text-sm border border-gray-600 hover:bg-gray-600"
          >
            🔄 Sync
          </button>
          <button
            onClick={() => setShowRemoveDivisionPasscodeModal(true)}
            className="bg-red-600 text-white px-4 py-2 rounded text-sm border border-red-700 hover:bg-red-700"
          >
            🗑 Remove
          </button>
        </div>
      </div>
  ),
},
    
    { label: "Current Leader", value: currentLeader, highlight: "gold" },
    {
      label: "Most Improved",
      value: mostImprovedPlayer.name || "—",
      highlight: "grayButton",
      improvementType: improvementLabel,
      improvementValue: improvementValue,
    },
    {
      label: "Highest Win Streak",
      value:
        highestWinStreakPlayers.length > 0
          ? highestWinStreakPlayers.map((p) => p.name).join(", ")
          : "—",
      highlight: "grayButton",
      streak: highestWinStreak,
    },
  ];

  const tabs = ["Standings", "Matches", "Players", "Previous Matches", "Previous Seasons"];

  // Group matches by saved date group and assign sequential Week numbers
  const groupDateGroupsSequentialWeeks = () => {
    const groupedByDate = {};

    previousMatches.forEach((match) => {
      const dateObj = match.created_at ? new Date(match.created_at) : new Date();
      const dateKey = dateObj.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });

      if (!groupedByDate[dateKey]) {
        groupedByDate[dateKey] = { dateObj, court1: [], court2: [] };
      }

      // Some tables (doubles) don't include a `court` column; default to court1
      const courtVal = match.court || 'court1';
      if (courtVal === 'court1' || courtVal === 'Court 1') {
        groupedByDate[dateKey].court1.push(match);
      } else if (courtVal === 'court2' || courtVal === 'Court 2') {
        groupedByDate[dateKey].court2.push(match);
      } else {
        // Unknown court value, push to court1 as a safe default
        groupedByDate[dateKey].court1.push(match);
      }
    });

    // Convert to sorted array by date (oldest first)
    const dateEntries = Object.entries(groupedByDate)
      .map(([dateKey, val]) => ({ dateKey, dateObj: new Date(val.dateObj), courtMatches: { court1: val.court1, court2: val.court2 } }))
      .sort((a, b) => a.dateObj - b.dateObj);

    // Assign sequential week numbers per saved date group (Week 1..N)
    return dateEntries.map((entry, idx) => ({ week: idx + 1, dateKey: entry.dateKey, courtMatches: entry.courtMatches }));
  };

  const matchesByWeek = groupDateGroupsSequentialWeeks();

  const getBumpChartData = () => {
    if (!matchesByWeek.length || !players.length) {
      if (viewMode === 'doubles') console.debug('BumpChart missing data:', { weeks: matchesByWeek.length, players: players.length });
      return { weeks: [], lines: [] };
    }

    if (viewMode === 'doubles') {
      console.debug('BumpChart debug (doubles):', { weeks: matchesByWeek.length, players: players.length, matchesByWeek });
    }

    const statsById = {};
    players.forEach((p) => {
      statsById[p.id] = {
        id: p.id,
        name: p.name,
        wins: 0,
        losses: 0,
        draws: 0,
        points: 0,
        points_for: 0,
        points_against: 0,
        win_streak: 0,
      };
    });

    const history = players.reduce((acc, p) => {
      acc[p.id] = { id: p.id, name: p.name, positions: [] };
      return acc;
    }, {});

    const weeks = matchesByWeek.map((week) => `Week ${week.week}`);

    const updateStats = (playerId, result, scored, conceded) => {
      const stats = statsById[playerId];
      if (!stats) return;
      if (result === "win") {
        stats.wins += 1;
        stats.points += 3;
        stats.win_streak += 1;
      } else if (result === "loss") {
        stats.losses += 1;
        stats.win_streak = 0;
      } else {
        stats.draws += 1;
        stats.points += 1;
        stats.win_streak = 0;
      }
      stats.points_for += scored;
      stats.points_against += conceded;
    };

    matchesByWeek.forEach((week, weekIndex) => {
      const matches = [...(week.courtMatches.court1 || []), ...(week.courtMatches.court2 || [])];
      matches.forEach((match) => {
        const playersArray = Array.isArray(match.players)
          ? match.players
          : (() => {
              try {
                return JSON.parse(match.players || "[]");
              } catch {
                return [];
              }
            })();

        const team1 = playersArray.slice(0, 2).map(String);
        const team2 = playersArray.slice(2, 4).map(String);
        const score1 = Number(match.scores?.team1 ?? match.scores?.[0] ?? 0);
        const score2 = Number(match.scores?.team2 ?? match.scores?.[1] ?? 0);

        let result1 = "draw";
        let result2 = "draw";
        if (score1 > score2) {
          result1 = "win";
          result2 = "loss";
        } else if (score1 < score2) {
          result1 = "loss";
          result2 = "win";
        }

        team1.forEach((playerId) => updateStats(playerId, result1, score1, score2));
        team2.forEach((playerId) => updateStats(playerId, result2, score2, score1));
      });

      const activePlayers = Object.values(statsById).filter((stats) => {
        const gp = (stats.wins || 0) + (stats.losses || 0) + (stats.draws || 0);
        return gp > 0;
      });

      if (!activePlayers.length) {
        return;
      }

      const ranked = sortPlayersByStats(activePlayers);
      ranked.forEach((p, index) => {
        if (history[p.id]) {
          history[p.id].positions.push({ weekIndex, rank: index + 1 });
        }
      });
    });

    const lines = Object.values(history)
      .filter((entry) => entry.positions.length > 0)
      .map((entry, index) => ({
        ...entry,
        color: [
          "#f59e0b",
          "#34d399",
          "#60a5fa",
          "#818cf8",
          "#fb7185",
          "#a855f7",
          "#f97316",
          "#22c55e",
          "#38bdf8",
          "#f43f5e",
        ][index % 10],
      }));

    return { weeks, lines };
  };

  const bumpChartData = getBumpChartData();

  // Build bump chart data from a saved season summary object
  const getBumpChartDataForSummary = (summary) => {
    const tracker = summary?.tracker || [];
    const final = summary?.finalStandings || summary?.final_standings || [];
    const weeks = tracker.map((snap, i) => `Match ${i + 1}`);

    // Players list from final standings (preserve order)
    const playersList = (final || []).map((p) => ({ id: String(p.id), name: p.name || p.id }));

    const history = {};
    playersList.forEach((p) => { history[p.id] = { id: p.id, name: p.name, positions: [] }; });

    tracker.forEach((snap, weekIndex) => {
      const positions = snap.positions || [];
      positions.forEach((pos) => {
        const pid = String(pos.id || pos.id);
        if (!history[pid]) {
          history[pid] = { id: pid, name: pos.name || String(pid), positions: [] };
        }
        history[pid].positions.push({ weekIndex, rank: pos.position || pos.position || pos.rank });
      });
    });

    const lines = Object.values(history)
      .filter((entry) => entry.positions && entry.positions.length > 0)
      .map((entry, index) => ({
        ...entry,
        color: ["#f59e0b", "#34d399", "#60a5fa", "#818cf8", "#fb7185", "#a855f7", "#f97316", "#22c55e", "#38bdf8", "#f43f5e"][index % 10],
      }));

    return { weeks, lines };
  };

  // Helper function to convert player IDs to names
  const getPlayerNameFromId = (playerId) => {
    const player = players.find((p) => String(p.id) === String(playerId));
    return player ? player.name : 'Unknown Player';
  };

  // Compute last N results for a player from `previousMatches` (most recent first)
  const computePlayerForm = (playerId, limit = 10) => {
    const results = [];
    console.log('computePlayerForm called for', playerId, 'previousMatches length', (previousMatches || []).length);
    if (!previousMatches || previousMatches.length === 0) return results;

    for (const match of previousMatches) {
      if (results.length >= limit) break;

      const playersArray = Array.isArray(match.players)
        ? match.players
        : (() => {
            try {
              return JSON.parse(match.players || "[]");
            } catch (e) {
              return [];
            }
          })();

      if (!playersArray || !playersArray.includes(playerId)) continue;

      const team1 = playersArray.slice(0, 2).map(String);
      const team2 = playersArray.slice(2, 4).map(String);

      const score1 = Number(match.scores?.team1 ?? match.scores?.[0] ?? 0);
      const score2 = Number(match.scores?.team2 ?? match.scores?.[1] ?? 0);

      let res = "D";
      if (score1 > score2) {
        res = team1.includes(String(playerId)) ? "W" : "L";
      } else if (score1 < score2) {
        res = team1.includes(String(playerId)) ? "L" : "W";
      }

      results.push(res);
    }

    console.log('computePlayerForm results (pre-reverse):', results.slice());
    return results.reverse();
  };

  const savePendingFixtures = async (nextCourt1Matches, nextCourt2Matches, nextCourt1Scores, nextCourt2Scores, nextRoundMatches) => {
    if (!supabase) {
      console.warn("Supabase client is not configured. Skipping live fixture sync.");
      return;
    }

    const payload = {
      division,
      court1_matches: (nextCourt1Matches || []).map((match) =>
        (match || []).map((team) => (team || []).map((p) => p.id))
      ),
      court2_matches: (nextCourt2Matches || []).map((match) =>
        (match || []).map((team) => (team || []).map((p) => p.id))
      ),
      court1_scores: nextCourt1Scores || [],
      court2_scores: nextCourt2Scores || [],
      court1_byes: (nextRoundMatches?.court1 || []).map((round) => (round || []).map((p) => p.id)),
      court2_byes: (nextRoundMatches?.court2 || []).map((round) => (round || []).map((p) => p.id)),
      status: "generated",
    };

    // Prefer upsert so hosted clients don't depend on delete permissions.
    console.debug("savePendingFixtures payload:", payload);
    const { error: upsertError } = await db("pending_fixtures").upsert(payload, { onConflict: "division" });

    if (!upsertError) return;

    // Fallback for tables without a unique constraint on division.
    if (String(upsertError.message || "").toLowerCase().includes("on conflict")) {
      const { error: deleteError } = await db("pending_fixtures").delete().eq("division", division);

      if (deleteError) {
        console.error("Error deleting previous pending fixtures:", deleteError);
        alert(`Fixtures generated locally, but could not be shared live: ${deleteError.message}`);
        return;
      }

      const { error: insertError } = await db("pending_fixtures").insert(payload);
      if (!insertError) return;

      console.error("Error inserting pending fixtures:", insertError);
      alert(`Fixtures generated locally, but could not be shared live: ${insertError.message}`);
      return;
    }

    console.error("Error saving pending fixtures:", upsertError);
    alert(`Fixtures generated locally, but could not be shared live: ${upsertError.message}`);
  };

  const clearPendingFixtures = async () => {
    if (!supabase) return;
    const { error } = await db("pending_fixtures").delete().eq("division", division);
    if (error) {
      console.error("Error clearing pending fixtures:", error);
    }
  };

  const loadPendingFixtures = async (playerPool = []) => {
    const { data, error } = await db("pending_fixtures")
      .select("*")
      .eq("division", division)
      .order("created_at", { ascending: false })
      .limit(1);

    // If there are no pending fixtures for the selected division, clear any
    // previously-generated matches from state so other-division fixtures
    // don't leak into the current view and show "Unknown Player" fallbacks.
    if (error || !data || data.length === 0) {
      setCourt1Matches([]);
      setCourt2Matches([]);
      setCourt3Matches([]);
      setCourt4Matches([]);
      setCourt1Scores([]);
      setCourt2Scores([]);
      setCourt3Scores([]);
      setCourt4Scores([]);
      setRoundMatches([]);
      setCourt1Round(0);
      setCourt2Round(0);
      setCourt3Round(0);
      setCourt4Round(0);
      return;
    }

    const pending = data[0];
    const availablePlayers = playerPool.length ? playerPool : players;
    const findPlayer = (id) => availablePlayers.find((p) => String(p.id) === String(id)) || { id, name: "Unknown Player" };

    // Support two shapes: legacy { payload: { court1_matches, court1_byes, ... } }
    // and newer flattened columns (court1_matches, court1_byes, ...)
    const pendingObj = pending.payload ? (typeof pending.payload === "string" ? JSON.parse(pending.payload) : pending.payload) : pending;

    const mappedCourt1Matches = (pendingObj.court1_matches || []).map((match) => [
      (match[0] || []).map(findPlayer),
      (match[1] || []).map(findPlayer),
    ]);

    const mappedCourt2Matches = (pendingObj.court2_matches || []).map((match) => [
      (match[0] || []).map(findPlayer),
      (match[1] || []).map(findPlayer),
    ]);

    const mappedCourt1Byes = (pendingObj.court1_byes || []).map((round) => (round || []).map(findPlayer));
    const mappedCourt2Byes = (pendingObj.court2_byes || []).map((round) => (round || []).map(findPlayer));

    setCourt1Matches(mappedCourt1Matches);
    setCourt2Matches(mappedCourt2Matches);
    setCourt1Scores(pending.court1_scores || mappedCourt1Matches.map(() => ({ team1: "", team2: "" })));
    setCourt2Scores(pending.court2_scores || mappedCourt2Matches.map(() => ({ team1: "", team2: "" })));
    setRoundMatches({ court1: mappedCourt1Byes, court2: mappedCourt2Byes });
    setCourt1Round(0);
    setCourt2Round(0);
  };

 const generateMatches = async () => {
  const available = sortPlayersByStats(
    players.filter((p) => p.active)
  );

  if (available.length < 4) {
    alert("At least 4 active players required.");
    return;
  }

  // Keep smaller sessions on a single court so 5-7 players can still generate.
  const shouldSplitAcrossCourts = available.length >= 8;
  const half = Math.ceil(available.length / 2);
  const court1Group = shouldSplitAcrossCourts ? available.slice(0, half) : available;
  const court2Group = shouldSplitAcrossCourts ? available.slice(half) : [];

  const buildCourt = (group) => {
    if (group.length < 4) {
      return { matches: [], byes: [] };
    }

    const matches = [];
    const byes = [];

    const partnerCounts = {};
    const restCounts = {};
    const gamesPlayed = {};
    const n = group.length;

    group.forEach((p) => {
      restCounts[p.id] = 0;
      gamesPlayed[p.id] = 0;
    });

    const pairKey = (a, b) => [a.id, b.id].sort().join("-");
    const getPartnerCount = (a, b) => partnerCounts[pairKey(a, b)] || 0;
    const calcSpread = (values) => Math.max(...values) - Math.min(...values);

    const getRoundConfig = (playerCount) => {
      // Club-night cap: prefer 6 or 7 rounds where possible.
      if (playerCount === 7) {
        return { rounds: 7, gamesPerPlayer: 4, byesPerPlayer: 3, warning: null };
      }
      if (playerCount === 6) {
        return { rounds: 6, gamesPerPlayer: 4, byesPerPlayer: 2, warning: null };
      }
      if (playerCount === 8) {
        return { rounds: 6, gamesPerPlayer: 3, byesPerPlayer: 3, warning: null };
      }
      if (playerCount === 4) {
        return { rounds: 3, gamesPerPlayer: 3, byesPerPlayer: 0, warning: null };
      }

      // 5 players cannot have equal games in exactly 6 or 7 rounds:
      // 6*4=24 and 7*4=28 are not divisible by 5.
      // Fall back to 5 rounds for equal games (4 each + 1 bye each).
      return {
        rounds: 5,
        gamesPerPlayer: 4,
        byesPerPlayer: 1,
        warning:
          "5 players per court cannot be equal in 6 or 7 rounds; using 5 rounds to keep games even.",
      };
    };

    const roundConfig = getRoundConfig(n);
    const targetRounds = roundConfig.rounds;
    const targetGamesPerPlayer = roundConfig.gamesPerPlayer;
    const targetByesPerPlayer = roundConfig.byesPerPlayer;

    if (roundConfig.warning) {
      console.warn(roundConfig.warning);
    }

    for (let round = 0; round < targetRounds; round++) {
      let bestPlan = null;

      for (let i = 0; i < n - 3; i++) {
        for (let j = i + 1; j < n - 2; j++) {
          for (let k = j + 1; k < n - 1; k++) {
            for (let l = k + 1; l < n; l++) {
              const quartet = [group[i], group[j], group[k], group[l]];
              const quartedIds = new Set(quartet.map((p) => p.id));
              const resting = group.filter((p) => !quartedIds.has(p.id));

              // Strict fairness constraints to ensure equal games/byes where possible
              const violatesGamesCap = quartet.some(
                (p) => gamesPlayed[p.id] >= targetGamesPerPlayer
              );
              const violatesByesCap = resting.some(
                (p) => restCounts[p.id] >= targetByesPerPlayer
              );

              if (violatesGamesCap || violatesByesCap) {
                continue;
              }

              const teamOptions = [
                [[quartet[0], quartet[1]], [quartet[2], quartet[3]]],
                [[quartet[0], quartet[2]], [quartet[1], quartet[3]]],
                [[quartet[0], quartet[3]], [quartet[1], quartet[2]]],
              ];

              for (const [team1, team2] of teamOptions) {
                const team1Count = getPartnerCount(team1[0], team1[1]);
                const team2Count = getPartnerCount(team2[0], team2[1]);
                const newPartners = (team1Count === 0 ? 1 : 0) + (team2Count === 0 ? 1 : 0);
                const repeatPartners = (team1Count > 0 ? team1Count : 0) + (team2Count > 0 ? team2Count : 0);

                const projectedRestCounts = { ...restCounts };
                resting.forEach((p) => {
                  projectedRestCounts[p.id] += 1;
                });

                const projectedGamesPlayed = { ...gamesPlayed };
                quartet.forEach((p) => {
                  projectedGamesPlayed[p.id] += 1;
                });

                const restSpread = calcSpread(Object.values(projectedRestCounts));
                const gamesSpread = calcSpread(Object.values(projectedGamesPlayed));

                // Priority order:
                // 1) maximize new partner combos
                // 2) minimize repeated partners
                // 3) keep rests even
                // 4) keep total games balanced
                const score =
                  newPartners * 100 -
                  repeatPartners * 40 -
                  restSpread * 8 -
                  gamesSpread * 4;

                if (!bestPlan || score > bestPlan.score) {
                  bestPlan = { quartet, team1, team2, resting, score };
                }
              }
            }
          }
        }
      }

      if (!bestPlan) break;

      matches.push([bestPlan.team1, bestPlan.team2]);
      byes.push(bestPlan.resting);

      bestPlan.quartet.forEach((p) => {
        gamesPlayed[p.id] += 1;
      });
      bestPlan.resting.forEach((p) => {
        restCounts[p.id] += 1;
      });

      const key1 = pairKey(bestPlan.team1[0], bestPlan.team1[1]);
      const key2 = pairKey(bestPlan.team2[0], bestPlan.team2[1]);
      partnerCounts[key1] = (partnerCounts[key1] || 0) + 1;
      partnerCounts[key2] = (partnerCounts[key2] || 0) + 1;
    }

    // Safety pass: if constraints stopped early, fill remaining rounds with best-effort balancing.
    while (matches.length < targetRounds) {
      let bestPlan = null;

      for (let i = 0; i < n - 3; i++) {
        for (let j = i + 1; j < n - 2; j++) {
          for (let k = j + 1; k < n - 1; k++) {
            for (let l = k + 1; l < n; l++) {
              const quartet = [group[i], group[j], group[k], group[l]];
              const quartedIds = new Set(quartet.map((p) => p.id));
              const resting = group.filter((p) => !quartedIds.has(p.id));

              const teamOptions = [
                [[quartet[0], quartet[1]], [quartet[2], quartet[3]]],
                [[quartet[0], quartet[2]], [quartet[1], quartet[3]]],
                [[quartet[0], quartet[3]], [quartet[1], quartet[2]]],
              ];

              for (const [team1, team2] of teamOptions) {
                const team1Count = getPartnerCount(team1[0], team1[1]);
                const team2Count = getPartnerCount(team2[0], team2[1]);
                const newPartners = (team1Count === 0 ? 1 : 0) + (team2Count === 0 ? 1 : 0);
                const repeatPartners = (team1Count > 0 ? team1Count : 0) + (team2Count > 0 ? team2Count : 0);

                const projectedRestCounts = { ...restCounts };
                resting.forEach((p) => {
                  projectedRestCounts[p.id] += 1;
                });

                const projectedGamesPlayed = { ...gamesPlayed };
                quartet.forEach((p) => {
                  projectedGamesPlayed[p.id] += 1;
                });

                const restSpread = calcSpread(Object.values(projectedRestCounts));
                const gamesSpread = calcSpread(Object.values(projectedGamesPlayed));

                const score =
                  newPartners * 100 -
                  repeatPartners * 40 -
                  restSpread * 8 -
                  gamesSpread * 4;

                if (!bestPlan || score > bestPlan.score) {
                  bestPlan = { quartet, team1, team2, resting, score };
                }
              }
            }
          }
        }
      }

      if (!bestPlan) break;

      matches.push([bestPlan.team1, bestPlan.team2]);
      byes.push(bestPlan.resting);

      bestPlan.quartet.forEach((p) => {
        gamesPlayed[p.id] += 1;
      });
      bestPlan.resting.forEach((p) => {
        restCounts[p.id] += 1;
      });

      const key1 = pairKey(bestPlan.team1[0], bestPlan.team1[1]);
      const key2 = pairKey(bestPlan.team2[0], bestPlan.team2[1]);
      partnerCounts[key1] = (partnerCounts[key1] || 0) + 1;
      partnerCounts[key2] = (partnerCounts[key2] || 0) + 1;
    }

    return { matches, byes };
  };

  const buildGroups = (players, courts) => {
    const groups = Array.from({ length: courts }, () => []);
    const baseSize = Math.floor(players.length / courts);
    const extra = players.length % courts;
    let index = 0;

    for (let i = 0; i < courts; i += 1) {
      const size = baseSize + (i < extra ? 1 : 0);
      groups[i] = players.slice(index, index + size);
      index += size;
    }

    return groups;
  };

  const effectiveNumCourts = shouldSplitAcrossCourts ? numCourts : 1;
  const courtGroups = buildGroups(available, effectiveNumCourts);
  const courts = courtGroups.map(buildCourt);

  setCourt1Matches(courts[0]?.matches || []);
  setCourt1Scores((courts[0]?.matches || []).map(() => ({ team1: "", team2: "" })));
  setCourt1Round(0);

  setCourt2Matches(courts[1]?.matches || []);
  setCourt2Scores((courts[1]?.matches || []).map(() => ({ team1: "", team2: "" })));
  setCourt2Round(0);

  setCourt3Matches(courts[2]?.matches || []);
  setCourt3Scores((courts[2]?.matches || []).map(() => ({ team1: "", team2: "" })));
  setCourt3Round(0);

  setCourt4Matches(courts[3]?.matches || []);
  setCourt4Scores((courts[3]?.matches || []).map(() => ({ team1: "", team2: "" })));
  setCourt4Round(0);

  setRoundMatches({
    court1: courts[0]?.byes || [],
    court2: courts[1]?.byes || [],
    court3: courts[2]?.byes || [],
    court4: courts[3]?.byes || [],
  });

  await savePendingFixtures(
    courts[0]?.matches || [],
    courts[1]?.matches || [],
    (courts[0]?.matches || []).map(() => ({ team1: "", team2: "" })),
    (courts[1]?.matches || []).map(() => ({ team1: "", team2: "" })),
    { court1: courts[0]?.byes || [], court2: courts[1]?.byes || [] }
  );
};

  const updateScore = (idx, team, value, court) => {
  if (court === "court1") {
    const newScores = [...court1Scores];
    if (!newScores[idx]) newScores[idx] = { team1: "", team2: "" };
    newScores[idx][team] = value; // keep as string
    setCourt1Scores(newScores);
  } else if (court === "court2") {
    const newScores = [...court2Scores];
    if (!newScores[idx]) newScores[idx] = { team1: "", team2: "" };
    newScores[idx][team] = value;
    setCourt2Scores(newScores);
  } else if (court === "court3") {
    const newScores = [...court3Scores];
    if (!newScores[idx]) newScores[idx] = { team1: "", team2: "" };
    newScores[idx][team] = value;
    setCourt3Scores(newScores);
  } else if (court === "court4") {
    const newScores = [...court4Scores];
    if (!newScores[idx]) newScores[idx] = { team1: "", team2: "" };
    newScores[idx][team] = value;
    setCourt4Scores(newScores);
  }
};

const saveMatches = async () => {
  try {
    // Helper to format matches for saving
    const formatMatches = (matches, scores, court) => {
      return matches.map((m, idx) => {
        const row = {
          division,
          // Use player IDs instead of names
          players: m.flat().map((p) => p.id),
          scores: scores[idx],
        };

        // Only include `court` for the non-doubles table —
        // `previous_matches_doubles` schema does not have a `court` column.
        if (viewMode !== "doubles") {
          row.court = court;
        }

        // `previous_matches_doubles` requires a text `id` primary key.
        // Generate one when in doubles mode so inserts do not fail.
        if (viewMode === "doubles") {
          try {
            row.id = typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
          } catch (e) {
            row.id = `${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
          }
        }

        return row;
      });
    };

    const court1Data = formatMatches(court1Matches, court1Scores, "court1");
    const court2Data = formatMatches(court2Matches, court2Scores, "court2");
    const court3Data = formatMatches(court3Matches, court3Scores, "court3");
    const court4Data = formatMatches(court4Matches, court4Scores, "court4");

    const allMatches = [...court1Data, ...court2Data, ...court3Data, ...court4Data];

    // DEBUG: confirm IDs are being saved
    console.log("Saving matches with player IDs:", allMatches);

    // Insert into Supabase
      console.debug("Saving matches to table:", viewMode === 'doubles' ? 'previous_matches_doubles' : 'previous_matches');
      const { data, error } = await db("previous_matches")
        .insert(allMatches)
        .select();

      if (error) {
        console.error("Error saving matches:", error);
        const msg = (error && (error.message || error.error || JSON.stringify(error))) || "Unknown DB error";
        alert(`Failed to save matches: ${msg}`);
      } else {
      alert("Matches saved successfully!");

      // Reset current matches for next round
      setCourt1Matches([]);
      setCourt2Matches([]);
      setCourt3Matches([]);
      setCourt4Matches([]);
      setCourt1Scores([]);
      setCourt2Scores([]);
      setCourt3Scores([]);
      setCourt4Scores([]);
      setRoundMatches([]);
      setCourt1Round(0);
      setCourt2Round(0);
      setCourt3Round(0);
      setCourt4Round(0);

      await clearPendingFixtures();

      await recalculateStandings();
      await fetchPlayers();
      
      // Fetch updated previous matches
      await fetchPreviousMatches();
    }
  } catch (err) {
    console.error("Unexpected error saving matches:", err);
    alert("Something went wrong while saving matches.");
  }
};

const clearGeneratedMatches = async () => {
  const hasGeneratedMatches =
    court1Matches.length > 0 ||
    court2Matches.length > 0 ||
    court3Matches.length > 0 ||
    court4Matches.length > 0;
  if (!hasGeneratedMatches) {
    alert("No generated matches to clear.");
    return;
  }

  const confirmed = confirm("Clear all generated matches? This will remove unsaved fixtures.");
  if (!confirmed) return;

  setCourt1Matches([]);
  setCourt2Matches([]);
  setCourt3Matches([]);
  setCourt4Matches([]);
  setCourt1Scores([]);
  setCourt2Scores([]);
  setCourt3Scores([]);
  setCourt4Scores([]);
  setRoundMatches([]);
  setCourt1Round(0);
  setCourt2Round(0);
  setCourt3Round(0);
  setCourt4Round(0);

  await clearPendingFixtures();
  alert("Generated matches cleared ✅");
};

const verifyAddMatchPasscode = async () => {
  const correctPasscode = process.env.NEXT_PUBLIC_ADMIN_PASSCODE;
  if (addMatchPasscode.trim() !== correctPasscode?.trim()) {
    setAddMatchPasscodeError("Incorrect passcode");
    return;
  }
  setAddMatchPasscodeError("");
  setShowAddMatchPasscodeModal(false);
  await fetchAllDivisionPlayers();
  setShowAddMatchModal(true);
};

const verifyAddDivisionPasscode = async () => {
  const correctPasscode = process.env.NEXT_PUBLIC_ADMIN_PASSCODE;
  if (addDivisionPasscode.trim() !== correctPasscode?.trim()) {
    setAddDivisionPasscodeError("Incorrect passcode");
    return;
  }
  setAddDivisionPasscodeError("");
  setShowAddDivisionPasscodeModal(false);
  setAddDivisionPasscode("");
  setShowAddDivisionModal(true);
};

const verifyRemoveDivisionPasscode = async () => {
  const correctPasscode = process.env.NEXT_PUBLIC_ADMIN_PASSCODE;
  if (removeDivisionPasscode.trim() !== correctPasscode?.trim()) {
    setRemoveDivisionPasscodeError("Incorrect passcode");
    return;
  }
  setRemoveDivisionPasscodeError("");
  setShowRemoveDivisionPasscodeModal(false);
  setRemoveDivisionPasscode("");
  // Open selection modal to choose which division to remove
  setShowSelectDivisionModal(true);
};

const syncDivisions = async (vmOverride) => {
  try {
    console.debug("syncDivisions: env url", process.env.NEXT_PUBLIC_SUPABASE_URL);
    console.debug("syncDivisions: anon key present", !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

    const vm = vmOverride || getViewMode();
    const tableName = `divisions${vm === 'doubles' ? DOUBLES_SUFFIX : ''}`;
      const { data: dbDivs, error } = await supabase.from(tableName)
        .select("id,name,min_qualify_games")
        .order("id", { ascending: true });

      console.debug("syncDivisions: supabase response", { dbDivs, error });

      // If missing column error, retry without column to recover older tables
      let finalDbDivs = dbDivs;
      let finalError = error;
      if (error && String(error?.code) === "42703") {
        const fallback = await supabase.from(tableName).select("id,name").order("id", { ascending: true });
        finalDbDivs = fallback.data;
        finalError = fallback.error;
      }

      if (finalError) {
        console.error("Failed to fetch divisions via supabase client:", finalError);
      // Try a direct REST fetch to help debug CORS/permission issues
      try {
        const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL.replace(/\/+$/,'')}/rest/v1/divisions`;
        const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
        console.debug("syncDivisions: attempting direct REST fetch", { url });
        const resp = await fetch(url, {
          headers: {
            apikey: key,
            Authorization: `Bearer ${key}`,
            Accept: "application/json",
          },
        });
        const text = await resp.text();
        console.debug("syncDivisions: rest fetch raw response", { status: resp.status, text });
        if (!resp.ok) {
          setServerError(`REST fetch failed with status ${resp.status}: ${text}`);
          return;
        }
      } catch (restErr) {
        console.error("syncDivisions: REST fetch failed:", restErr);
        setServerError(`REST fetch failed: ${restErr?.message || String(restErr)}`);
      }
        setServerError(`Failed to sync divisions: ${finalError.message || JSON.stringify(finalError)}`);
        return;
      }

      if (!Array.isArray(finalDbDivs) || finalDbDivs.length === 0) {
        console.warn("syncDivisions: server returned empty divisions array", finalDbDivs);
        setServerError("No divisions found on server.");
        return;
      }

      const mapped = finalDbDivs.map((d) => ({ id: d.id, name: d.name || `Division ${d.id}`, min_qualify_games: d.min_qualify_games }));
    console.debug("syncDivisions: setting divisions for vm=", vm, mapped);
                setDivisions(mapped);
                try { setLSJson(`divisions_${vm}`, mapped); } catch (e) {}
    // populate per-division min map from DB values
    const byDiv = {};
    mapped.forEach((m) => {
      if (m.min_qualify_games != null) byDiv[String(m.id)] = m.min_qualify_games;
    });
    setMinQualifyByDivision((prev) => ({ ...(prev || {}), ...(byDiv || {}) }));
    const sel = mapped.find((d) => d.id === division) ? division : mapped[0].id;
    setDivision(sel);
    await fetchAllDivisionPlayers(sel);
    console.debug("Divisions synced (silent)");
  } catch (e) {
    console.error("Unexpected error syncing divisions:", e);
    alert("Failed to sync divisions. See console for details.");
  }
};

const handleConfirmRemoveDivision = () => {
  (async () => {
    if (!selectedDivisionToRemove) return;
    if (divisions.length <= 1) {
      alert("Cannot remove the last division.");
      setShowSelectDivisionModal(false);
      setSelectedDivisionToRemove(null);
      return;
    }

    const idToRemove = selectedDivisionToRemove;

    try {
      // Mode-aware deletion: for `league` use the server RPC; for `doubles` delete against doubles tables.
      const vm = getViewMode();
      if (vm === 'league') {
        const { data, error } = await supabase.rpc("delete_division_and_children", { old_id: idToRemove });
        if (error) {
          console.error("Failed to delete division server-side:", error);
          const msg = error.message || JSON.stringify(error);
          alert(`Failed to remove division on server: ${msg}`);
          return;
        }
      } else {
        // Doubles mode: delete related rows from doubles tables only
        try {
          await db('previous_matches').delete().eq('division', idToRemove);
        } catch (e) { console.warn('Failed to delete doubles previous_matches', e); }
        try {
          await db('players').delete().eq('division', idToRemove);
        } catch (e) { console.warn('Failed to delete doubles players', e); }
        try {
          await db('pending_fixtures').delete().eq('division', idToRemove);
        } catch (e) { console.warn('Failed to delete doubles pending_fixtures', e); }
        try {
          await db('running_seasons').delete().eq('division', idToRemove);
        } catch (e) { console.warn('Failed to delete doubles running_seasons', e); }
        try {
          await db('divisions').delete().eq('id', idToRemove);
        } catch (e) { console.warn('Failed to delete doubles division row', e); }
      }

      // Update local UI state after successful server deletion
      // Re-fetch canonical divisions from server to ensure consistency
      try {
        const { data: dbDivs, error: dbErr } = await db("divisions")
          .select("id,name")
          .order("id", { ascending: true });

        if (!dbErr && Array.isArray(dbDivs)) {
          const mapped = dbDivs.map((d) => ({ id: d.id, name: d.name || `Division ${d.id}` }));
          setDivisions(mapped);
          const first = mapped.find((d) => d.id !== idToRemove) || mapped[0];
          const newSel = division === idToRemove ? (first ? first.id : (mapped[0]?.id || 1)) : division;
          setDivision(newSel);
          if (newSel) fetchAllDivisionPlayers(newSel);
        } else {
          const nextDivisions = divisions.filter((d) => d.id !== idToRemove);
          setDivisions(nextDivisions);
          try { setLSJson(`divisions_${viewMode}`, nextDivisions); } catch (e) {}
          if (division === idToRemove) {
            const first = nextDivisions[0];
            setDivision(first ? first.id : 1);
            if (first) fetchAllDivisionPlayers(first.id);
          }
        }
      } catch (e) {
        console.error("Failed to re-fetch divisions after delete:", e);
      }

      setShowSelectDivisionModal(false);
      setSelectedDivisionToRemove(null);
      alert("Division removed ✅");
    } catch (err) {
      console.error("Unexpected error removing division:", err);
      alert("Error removing division. See console.");
    }
  })();
};

const verifyRemovePlayerPasscode = async () => {
  const correctPasscode = process.env.NEXT_PUBLIC_ADMIN_PASSCODE;
  if (removePlayerPasscode.trim() !== correctPasscode?.trim()) {
    setRemovePlayerPasscodeError("Incorrect passcode");
    return;
  }
  setRemovePlayerPasscodeError("");
  setShowRemovePlayerModal(false);
  
  if (selectedPlayerToRemove) {
    const { error } = await db("players")
      .delete()
      .eq("id", selectedPlayerToRemove.id);
    
    if (!error) {
      setPlayers((prev) => prev.filter((p) => p.id !== selectedPlayerToRemove.id));
      setAllDivisionPlayers((prev) => prev.filter((p) => p.id !== selectedPlayerToRemove.id));
      alert(`${selectedPlayerToRemove.name} has been removed ✅`);
    } else {
      alert("Error removing player");
    }
  }
  
  setRemovePlayerPasscode("");
  setSelectedPlayerToRemove(null);
};

const addDivision = async (name) => {
  const trimmed = (name || "").trim();
  if (!trimmed) return;

  try {
    // Persist on server first (mode-aware table)
    const { data, error } = await db("divisions")
      .insert([{ name: trimmed }])
      .select();

    if (error) {
      console.error("Failed to create division on server:", error);
      alert(`Failed to create division: ${error.message || JSON.stringify(error)}`);
      return;
    }

    const created = Array.isArray(data) && data[0] ? data[0] : null;
    const newDiv = created ? { id: created.id, name: created.name || trimmed } : null;

    if (newDiv) {
      setDivisions((prev) => [...prev, newDiv]);
      try { setLSJson(`divisions_${viewMode}`, [...divisions, newDiv]); } catch (e) {}
      setDivision(newDiv.id);
      await fetchAllDivisionPlayers(newDiv.id);
    } else {
      // Fallback to local-only addition if server didn't return an id
      const maxId = divisions.length ? Math.max(...divisions.map((d) => d.id)) : 0;
      const newId = maxId + 1;
      const localDiv = { id: newId, name: trimmed };
      setDivisions((prev) => [...prev, localDiv]);
      try { setLSJson(`divisions_${viewMode}`, [...divisions, localDiv]); } catch (e) {}
      setDivision(newId);
      fetchAllDivisionPlayers(newId);
    }

    setShowAddDivisionModal(false);
    setNewDivisionName("");
  } catch (e) {
    console.error("Unexpected error creating division:", e);
    alert("Error creating division. See console.");
  }
};

const buildSelectedPlayers = (ids) => {
  return (ids || []).map((id) => {
    const player = allDivisionPlayers.find((p) => String(p.id) === String(id)) || players.find((p) => String(p.id) === String(id));
    return player || { id, name: getPlayerNameFromId(id) };
  });
};

const setEditTeamPlayer = (teamKey, playerIndex, playerId) => {
  const selected = allDivisionPlayers.find((p) => String(p.id) === String(playerId));
  setEditMatchData((prev) => {
    const nextTeam = [...(prev[teamKey] || [])];
    nextTeam[playerIndex] = selected || { id: playerId, name: getPlayerNameFromId(playerId) };
    return { ...prev, [teamKey]: nextTeam };
  });
};

const openEditMatchModal = async (match) => {
  await fetchAllDivisionPlayers();

  const playersArray = Array.isArray(match.players)
    ? match.players
    : JSON.parse(match.players || "[]");

  setEditingMatchId(match.id);
  setEditMatchError("");
  setEditMatchData({
    date: match.created_at ? String(match.created_at).split("T")[0] : new Date().toISOString().split("T")[0],
    team1Players: buildSelectedPlayers(playersArray.slice(0, 2)),
    team2Players: buildSelectedPlayers(playersArray.slice(2, 4)),
    team1Score: String(match?.scores?.team1 ?? ""),
    team2Score: String(match?.scores?.team2 ?? ""),
    court: match.court === "court2" || match.court === "Court 2" ? "court2" : "court1",
  });
  setShowEditMatchModal(true);
};

const requestEditMatch = async (match) => {
  if (isAdmin) {
    await openEditMatchModal(match);
    return;
  }

  setPendingEditMatch(match);
  setEditMatchPasscode("");
  setEditMatchPasscodeError("");
  setShowEditMatchPasscodeModal(true);
};

const verifyEditMatchPasscode = async () => {
  const correctPasscode = process.env.NEXT_PUBLIC_ADMIN_PASSCODE;
  if (editMatchPasscode.trim() !== correctPasscode?.trim()) {
    setEditMatchPasscodeError("Incorrect passcode");
    return;
  }

  setIsAdmin(true);
  setShowEditMatchPasscodeModal(false);
  setEditMatchPasscode("");
  setEditMatchPasscodeError("");

  if (pendingEditMatch) {
    const selectedMatch = pendingEditMatch;
    setPendingEditMatch(null);
    await openEditMatchModal(selectedMatch);
  }
};

const saveEditedMatch = async () => {
  if (!editingMatchId) return;

  const team1Ids = editMatchData.team1Players.map((p) => p.id);
  const team2Ids = editMatchData.team2Players.map((p) => p.id);
  const allIds = [...team1Ids, ...team2Ids];

  if (team1Ids.length !== 2 || team2Ids.length !== 2) {
    setEditMatchError("Each team must have exactly 2 players");
    return;
  }

  if (new Set(allIds).size !== 4) {
    setEditMatchError("A player can only appear once in a match");
    return;
  }

  if (editMatchData.team1Score === "" || editMatchData.team2Score === "") {
    setEditMatchError("Please enter both scores");
    return;
  }

  // Use current view mode from localStorage to avoid stale state
  const effectiveViewModeForEdit = getViewMode();
  const { error } = await db("previous_matches")
    .update(
      (() => {
        const payload = {
          created_at: `${editMatchData.date}T00:00:00Z`,
          players: allIds,
          scores: {
            team1: parseInt(editMatchData.team1Score, 10),
            team2: parseInt(editMatchData.team2Score, 10),
          },
        };
        if (effectiveViewModeForEdit !== "doubles") payload.court = editMatchData.court;
        return payload;
      })()
    )
    .eq("id", editingMatchId);

  if (error) {
    console.error("Error updating match:", error);
    setEditMatchError("Failed to update match. Check console.");
    return;
  }

  setShowEditMatchModal(false);
  setEditingMatchId(null);
  setEditMatchError("");
  setPendingEditMatch(null);

  await recalculateStandings();
  await fetchPlayers();
  await fetchPreviousMatches();
};

const addMatch = async () => {
  try {
    setAddMatchError("");

    // Validate form data
    if (!addMatchData.date) {
      setAddMatchError("Please select a date");
      return;
    }
    if (addMatchData.team1Players.length < 2 || addMatchData.team2Players.length < 2) {
      setAddMatchError("Each team must have 2 players");
      return;
    }
    if (addMatchData.team1Score === "" || addMatchData.team2Score === "") {
      setAddMatchError("Please enter scores for both teams");
      return;
    }

    // Format player IDs for the match
    const allPlayers = [
      ...addMatchData.team1Players.map(p => p.id),
      ...addMatchData.team2Players.map(p => p.id),
    ];

    // Insert match into Supabase
    const payload = {
      created_at: addMatchData.date + "T00:00:00Z",
      division,
      players: allPlayers,
      scores: {
        team1: parseInt(addMatchData.team1Score),
        team2: parseInt(addMatchData.team2Score),
      },
    };

    // Use current view mode from localStorage to avoid stale state
    const effectiveViewMode = getViewMode();

    // `previous_matches_doubles` requires a text `id` primary key and has no `court` column.
    if (effectiveViewMode === "doubles") {
      payload.id = `${Date.now()}-${Math.random().toString(36).slice(2,9)}`;
    } else {
      payload.court = addMatchData.court;
    }

    const { data, error } = await db("previous_matches")
      .insert(payload)
      .select();

    if (error) {
      console.error("Error adding match:", error);
      setAddMatchError("Failed to save match. Check console.");
      return;
    }

    alert("Match added successfully!");

    // Reset form
    setAddMatchData({
      date: new Date().toISOString().split('T')[0],
      team1Players: [],
      team1Name: "",
      team2Players: [],
      team2Name: "",
      team1Score: "",
      team2Score: "",
      court: "court1",
    });
    setShowAddMatchModal(false);
    setAddMatchPasscode("");

    await recalculateStandings();
    await fetchPlayers();
    await fetchPreviousMatches();
  } catch (err) {
    console.error("Unexpected error adding match:", err);
    setAddMatchError("Something went wrong");
  }
};

const handleRecalculateStandings = async () => {
  try {
    const adminPasscode = process.env.NEXT_PUBLIC_ADMIN_PASSCODE;
    if (recalculatePasswordInput.trim() !== adminPasscode?.trim()) {
      setRecalculateError("Incorrect passcode");
      return;
    }

    await recalculateStandings();
    await fetchPlayers();
    await fetchPreviousMatches();
    setShowRecalculateModal(false);
    setRecalculatePasswordInput("");
    setRecalculateError("");
    alert("Standings recalculated ✅");
  } catch (err) {
    console.error("Error recalculating standings:", err);
    alert("Failed to recalculate standings.");
  }
};

useEffect(() => {
  const syncPendingScores = async () => {
    const hasPendingFixtures =
      court1Matches.length > 0 ||
      court2Matches.length > 0 ||
      court3Matches.length > 0 ||
      court4Matches.length > 0;
    if (!hasPendingFixtures) return;

    await savePendingFixtures(
      court1Matches,
      court2Matches,
      court1Scores,
      court2Scores,
      roundMatches
    );
  };

  syncPendingScores();
}, [court1Scores, court2Scores, court3Scores, court4Scores, court1Matches, court2Matches, court3Matches, court4Matches, roundMatches, division]);

const hasGeneratedFixtures =
  court1Matches.length > 0 ||
  court2Matches.length > 0 ||
  court3Matches.length > 0 ||
  court4Matches.length > 0;
const activePlayerCount = players.filter((p) => p.active).length;

  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-800 px-4 py-6 sm:p-8 text-gray-300 font-sans">
      {!hydrated && (
        <div className="p-6 text-center text-gray-300">Loading…</div>
      )}
      {hydrated && (
        <>
      {/* Header (click title to toggle mode) */}
      <header className="mb-8 sm:mb-10 relative">
        <button
          onClick={async () => {
            const next = viewMode === "league" ? "doubles" : "league";
            try { setLSRaw("view_mode", next); } catch (e) {}
            setViewMode(next);
            console.debug("Header toggle: switched viewMode ->", next);
            try {
              const cachedDivs = getLSJson(`divisions_${next}`, null);
              if (Array.isArray(cachedDivs) && cachedDivs.length > 0) {
                console.debug("Header toggle: applying cached divisions for", next, cachedDivs);
                setDivisions(cachedDivs);
                const sel = cachedDivs.find((d) => d.id === division) ? division : cachedDivs[0].id;
                setDivision(sel);
              }
            } catch (e) {
              console.debug("Header toggle: no cached divisions or error", e);
            }
            try {
              // After switching the app state to the new mode, sync divisions from the corresponding table
              await syncDivisions(next);
              console.debug("Header toggle: syncDivisions completed for", next);
            } catch (e) {
              console.warn('Failed to sync divisions after mode change', e);
            }
          }}
          className="flex items-center text-left"
          aria-label="Toggle league / doubles view"
        >
          <h1 className="flex items-center text-2xl sm:text-4xl font-extrabold text-white tracking-tight">
            <span className="mr-3 text-yellow-400 text-3xl sm:text-4xl drop-shadow-md">
              {viewMode === "league" ? "🔥" : "🎯"}
            </span>
            {viewMode === "league" ? "Fylde Pickleball League" : "Doubles - Points Difference"}
          </h1>
        </button>
        <p className="text-gray-400 mt-2 text-xs sm:text-sm tracking-wide">
          {viewMode === "league" ? "Weekly Matches • Live Updates • Prize for Winner!🏆" : "Casual doubles format • Points-difference scoring"}
        </p>
        <div className={`absolute -bottom-3 left-0 w-20 sm:w-24 h-1 rounded-full ${viewMode === "league" ? "bg-yellow-400" : "bg-green-400"}`} />
      </header>
      {serverError && (
        <div className="mb-6 p-3 rounded bg-red-600 text-white flex items-start justify-between">
          <div className="mr-4 text-sm">{serverError}</div>
          <div className="flex-shrink-0">
            <div className="space-x-2">
              <button
                onClick={async () => {
                  // retry fetching divisions for current mode
                  setServerError(null);
                  try {
                    await syncDivisions();
                  } catch (e) {
                    setServerError(`Retry failed: ${e?.message || String(e)}`);
                  }
                }}
                className="px-3 py-1 bg-yellow-500 hover:bg-yellow-600 rounded text-sm"
              >Retry</button>
              <button
                onClick={async () => {
                  // copy league divisions into doubles table
                  try {
                    const { data: leagueDivs, error: leagueErr } = await supabase.from('divisions').select('id,name');
                    if (leagueErr) throw leagueErr;
                    if (!Array.isArray(leagueDivs) || leagueDivs.length === 0) {
                      setServerError('No divisions found in league to copy.');
                      return;
                    }
                    // insert names into doubles table (suffix configurable)
                    const payload = leagueDivs.map((d) => ({ name: d.name }));
                    const doublesTable = `divisions${DOUBLES_SUFFIX}`;
                    const { error: insErr } = await supabase.from(doublesTable).insert(payload);
                    if (insErr) throw insErr;
                    setServerError(`Copied league divisions into ${doublesTable}.`);
                    // refresh client view
                    try { await syncDivisions(); } catch (e) {}
                  } catch (e) {
                    setServerError(`Copy failed: ${e?.message || String(e)}`);
                  }
                }}
                className="px-3 py-1 bg-green-600 hover:bg-green-500 rounded text-sm"
              >Copy League → Doubles</button>
              <button
                onClick={() => setServerError(null)}
                className="px-3 py-1 bg-red-800 hover:bg-red-700 rounded text-sm"
                aria-label="Dismiss server error"
              >Dismiss</button>
            </div>
          </div>
        </div>
      )}

      <HeaderStats stats={stats} />

      {process.env.NODE_ENV === "development" && hydrated && (
        <div className="fixed bottom-4 right-4 z-50 p-2 text-xs bg-black bg-opacity-60 text-gray-200 rounded">
          <div className="font-semibold">Debug</div>
          <div>division: {String(division)}</div>
          <div className="truncate">divisions: {JSON.stringify(divisions)}</div>
        </div>
      )}

      {/* Tabs */}
      <section className="bg-gray-900 rounded-t-lg shadow px-4 py-4 mb-4">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {tabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex items-center justify-center gap-2 px-4 py-3 rounded-lg text-sm sm:text-base font-medium transition ${
                activeTab === tab
                  ? "bg-white text-gray-900 shadow"
                  : "bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700"
              }`}
            >
              {tab === "Standings" && "🏆"}
              {tab === "Matches" && "⚔"}
              {tab === "Players" && "👥"}
              {tab === "Previous Matches" && "🕒"}
              {tab === "Previous Seasons" && "📜"}
              <span>{tab}</span>
            </button>
          ))}
        </div>

        {activeTab === "Players" && (
          <div className="mt-4 flex justify-end gap-2">
            <button
              onClick={handleAddPlayer}
              className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2 rounded"
            >
              👤 Add Player
            </button>
            <button
              onClick={handleRemovePlayer}
              className="bg-red-600 hover:bg-red-500 text-white px-6 py-2 rounded"
            >
              🗑️ Remove Player
            </button>
          </div>
        )}

        {activeTab === "Matches" && (
          <div className="mt-4 flex flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <label htmlFor="numCourts" className="text-xs text-gray-300 uppercase tracking-wide">
                Courts
              </label>
              <select
                id="numCourts"
                value={numCourts}
                onChange={(e) => setNumCourts(Number(e.target.value))}
                className="bg-gray-800 text-white border border-gray-600 rounded px-4 py-2 outline-none focus:border-yellow-400"
              >
                <option value={1}>1</option>
                <option value={2}>2</option>
                <option value={3}>3</option>
                <option value={4}>4</option>
              </select>
            </div>

            <div className="flex flex-row items-center gap-2">
              {!isAdmin ? (
                <button
                  onClick={() => setShowAdminModal(true)}
                  disabled={hasGeneratedFixtures}
                  className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  🔒 Generate Fixtures
                </button>
              ) : (
                <button
                  onClick={generateMatches}
                  disabled={hasGeneratedFixtures}
                  className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  🔄 Generate Fixtures
                </button>
              )}
              {activePlayerCount >= 4 && activePlayerCount < 8 && (
                <p className="text-xs text-gray-400 w-full sm:w-auto">
                  Fewer than 8 active players: fixtures will be generated on Court 1 only.
                </p>
              )}
            </div>
          </div>
        )}
      </section>

      {/* Content */}
      <section className="bg-gray-900 rounded-b-lg shadow overflow-hidden p-4 sm:p-6 text-gray-300">

        {/* Standings */}
{activeTab === "Standings" && (
  <div className="bg-white text-gray-700 rounded-2xl shadow-lg overflow-hidden">
    <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="font-bold text-yellow-500 text-lg sm:text-xl">🏆 Standings</div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setStandingsView("Leaderboard")}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition ${
              standingsView === "Leaderboard"
                ? "bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700"
                : "bg-white text-gray-900 shadow"
            }`}
          >
            Leaderboard
          </button>
          <button
            onClick={() => setStandingsView("Tracker")}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition ${
              standingsView === "Tracker"
                ? "bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700"
                : "bg-white text-gray-900 shadow"
            }`}
          >
            Tracker
          </button>
          {viewMode !== 'doubles' && (
          <button
            onClick={() => {
                const current = minQualifyByDivision[division] ?? minQualifyGames ?? MIN_QUALIFY_GAMES;
                setMinQualifyInput(String(current));
                setShowEditMinModal(true);
              }}
            className="px-3 py-2 rounded-lg text-sm font-semibold bg-white text-gray-900 border border-gray-200 shadow"
            title="Edit minimum games to qualify"
          >
            Min games: {minQualifyGames}
          </button>
          )}
        </div>
      </div>
    </div>

    {standingsView === "Leaderboard" ? (
      <>
        {/* Mobile Cards */}
<div className="sm:hidden p-4 space-y-2 bg-gray-50">
  {/* Header Row */}
  <div className="grid grid-cols-6 text-xs font-bold text-gray-400 text-center mb-1">
    <span>GP</span>
    <span className="text-green-600">W</span>
    <span className="text-red-400">L</span>
    <span className="text-yellow-500">D</span>
    {viewMode === 'doubles' ? (
      <>
        <span className="text-cyan-600 font-normal text-xs">Win %</span>
        <span className="text-cyan-600 font-black text-xs">Diff</span>
      </>
    ) : (
      <>
        <span>Diff</span>
        <span className="text-cyan-600 font-black text-xs">Win %</span>
      </>
    )}
  </div>

  {(() => {
          const runtimeMin = viewMode === 'doubles' ? 0 : (minQualifyByDivision[division] ?? minQualifyGames ?? MIN_QUALIFY_GAMES);
          const eligiblePlayers = players.filter((pp) => ((pp.wins||0) + (pp.losses||0) + (pp.draws||0)) >= runtimeMin);
    return players.map((p, i) => {
      const gp = p.wins + p.losses + p.draws;
      const winPct = gp > 0 ? ((p.wins / gp) * 100).toFixed(0) + "%" : "0%";
      const diff = (p.points_for || 0) - (p.points_against || 0);

      const form = computePlayerForm(p.id);
      const eligibleIndex = eligiblePlayers.findIndex((ep) => String(ep.id) === String(p.id));
      const positionDisplay = eligibleIndex >= 0 ? String(eligibleIndex + 1) : "NQ";

      return (
        <div
          key={p.id}
          className={`rounded-lg shadow border p-4 transition
            ${
              i === 0
                ? "bg-yellow-50 border-yellow-300 shadow-[0_0_20px_rgba(255,215,0,0.5)]"
                : i === 1
                ? "bg-gray-100 border-gray-300 shadow-[0_0_18px_rgba(192,192,192,0.5)]"
                : i === 2
                ? "bg-orange-50 border-orange-300 shadow-[0_0_18px_rgba(205,127,50,0.5)]"
                : "bg-white border-gray-200"
            }`}
        >
          {/* Player Name and Rank */}
          <div className="flex justify-between items-center mb-2">
            <span className="font-bold text-gray-900 flex items-center gap-2">
              {i === 0 && "🥇"}
              {i === 1 && "🥈"}
              {i === 2 && "🥉"}
              #{i + 1} {p.name} {positionDisplay === "NQ" && (
                <span className="ml-2 inline-block relative">
                  <span
                    role="button"
                    tabIndex={0}
                    onClick={(e) => { e.stopPropagation(); setShowNqModalFor(p.id); }}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); setShowNqModalFor(p.id); } }}
                      title={`Requires ${runtimeMin} games to qualify`}
                      aria-label={`Requires ${runtimeMin} games to qualify`}
                    className="inline-flex items-center gap-1 px-3 py-1 text-sm font-semibold text-red-700 bg-red-100 border border-red-200 rounded cursor-pointer select-none hover:bg-red-50 active:scale-95 transition-transform shadow-sm hover:shadow-md focus:outline-none focus:ring-2 focus:ring-red-200"
                  >
                    <span>NQ</span>
                    <svg aria-hidden="true" className="w-3 h-3 text-red-700" viewBox="0 0 20 20" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                      <path fillRule="evenodd" d="M18 10A8 8 0 11.999 10 8 8 0 0118 10zm-9-1a1 1 0 112 0v5a1 1 0 11-2 0V9zm1-4a1.25 1.25 0 100 2.5A1.25 1.25 0 0010 5z" clipRule="evenodd" />
                    </svg>
                  </span>
                </span>
              )}
            </span>
            <span className="font-bold text-gray-900">{p.points} pts</span>
          </div>

          {/* Stats Row */}
          <div className="grid grid-cols-6 text-sm font-semibold gap-1 text-center">
            <div className="flex flex-col items-center gap-1">
              <span className="text-gray-700">{gp}</span>
            </div>
            <span className="text-green-600">{p.wins}</span>
            <span className="text-red-400">{p.losses}</span>
            <span className="text-yellow-500">{p.draws}</span>
            {viewMode === 'doubles' ? (
              <>
                <span className="text-cyan-600">{winPct}</span>
                <span className="text-cyan-600 font-black text-base">{diff}</span>
              </>
            ) : (
              <>
                <span className="text-gray-700">{diff}</span>
                <span className="text-cyan-600 font-black text-base">{winPct}</span>
              </>
            )}
          </div>
          {/* Bottom row: change + recent form */}
          <div className="flex justify-end mt-3 items-end gap-4">
            <div className="flex flex-col items-center gap-1">
              <span className="text-xs uppercase tracking-widest text-gray-400">Change</span>
              <div>
                {(() => {
                  const change = p.positionChange || 0;
                  const baseClass = "inline-flex items-center justify-center min-w-[36px] h-5 px-1 rounded text-sm font-semibold";
                  if (change > 0) {
                    return (
                      <span className={baseClass + " text-green-700 bg-green-50 border border-green-100"}>
                        <span aria-hidden className="mr-1">▲</span>
                        <span>{change}</span>
                      </span>
                    );
                  }
                  if (change < 0) {
                    return (
                      <span className={baseClass + " text-red-700 bg-red-50 border border-red-100"}>
                        <span aria-hidden className="mr-1">▼</span>
                        <span>{Math.abs(change)}</span>
                      </span>
                    );
                  }
                  return (
                    <span className={baseClass + " text-gray-500 bg-gray-100 border border-gray-200"}>
                      —
                    </span>
                  );
                })()}
              </div>
            </div>

            <div className="flex flex-col items-end gap-1">
              <span className="text-xs uppercase tracking-widest text-gray-400">Form</span>
              <div className="flex items-center gap-1 overflow-x-auto px-1">
                {[Array(Math.max(0, 10 - (form.length || 0))).fill(null).concat(form.length ? form : []).slice(0, 10)].flat().map((r, idx) => (
                  <span
                    key={idx}
                    className={`w-3 h-3 rounded-sm inline-block border ${
                      r === 'W' ? 'bg-green-500 border-green-600' : r === 'L' ? 'bg-red-500 border-red-600' : r === 'D' ? 'bg-yellow-400 border-yellow-500' : 'bg-gray-200 border-gray-300'
                    }`}
                    title={r === 'W' ? 'Win' : r === 'L' ? 'Loss' : r === 'D' ? 'Draw' : 'No match'}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      );
    });
  })()}
</div>

    {/* Desktop Table */}
    <table className="hidden sm:table w-full text-left">
      <thead className="text-gray-400 text-sm uppercase border-b border-gray-200">
        <tr>
          <th className="p-2">#</th>
          <th className="p-2">Player</th>
          <th className="p-2 text-center text-gray-700">GP</th>
          <th className="p-2 text-green-600">W</th>
          <th className="p-2 text-red-400">L</th>
          <th className="p-2 text-yellow-500">D</th>
          {viewMode === 'doubles' ? (
            <>
              <th className="p-2 text-center text-cyan-600">Win %</th>
              <th className="p-2 text-center text-cyan-600 font-black">Diff</th>
            </>
          ) : (
            <>
              <th className="p-2 text-center text-gray-700">Diff</th>
              <th className="p-2 text-center text-cyan-600 font-black">Win %</th>
            </>
          )}
          <th className="p-2 text-center">Change</th>
          <th className="p-2">Form</th>
          <th className="p-2 text-right">Points</th>
        </tr>
      </thead>
      <tbody>
        {(() => {
          const runtimeMin = viewMode === 'doubles' ? 0 : (minQualifyByDivision[division] ?? minQualifyGames ?? MIN_QUALIFY_GAMES);
          const eligiblePlayers = players.filter((pp) => ((pp.wins||0) + (pp.losses||0) + (pp.draws||0)) >= runtimeMin);
          return players.map((p, i) => {
          const gp = p.wins + p.losses + p.draws;
          const winPct = gp > 0 ? ((p.wins / gp) * 100).toFixed(0) + "%" : "0%";
          const diff = (p.points_for || 0) - (p.points_against || 0);
          const eligibleIndex = eligiblePlayers.findIndex((ep) => String(ep.id) === String(p.id));
          const positionDisplay = eligibleIndex >= 0 ? String(eligibleIndex + 1) : "NQ";

          return (
            <tr
              key={p.id}
              className={`border-b hover:bg-gray-100 transition
                ${
                  i === 0
                    ? "bg-yellow-50 shadow-[0_0_15px_rgba(255,215,0,0.35)]"
                    : i === 1
                    ? "bg-gray-100 shadow-[0_0_12px_rgba(192,192,192,0.35)]"
                    : i === 2
                    ? "bg-orange-50 shadow-[0_0_12px_rgba(205,127,50,0.35)]"
                    : "even:bg-yellow-50"
                }`}
            >
              <td className="p-2">{i + 1}</td>
              <td className="p-2 font-semibold flex items-center gap-2">
                {i === 0 && <span>🥇</span>}
                {i === 1 && <span>🥈</span>}
                {i === 2 && <span>🥉</span>}
                {p.name} {positionDisplay === "NQ" && (
                  <span className="ml-2 inline-block relative">
                    <span
                      role="button"
                      tabIndex={0}
                      onClick={(e) => { e.stopPropagation(); setShowNqModalFor(p.id); }}
                      onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); setShowNqModalFor(p.id); } }}
                      title={`Requires ${runtimeMin} games to qualify`}
                      aria-label={`Requires ${runtimeMin} games to qualify`}
                      className="inline-flex items-center gap-1 px-3 py-1 text-sm font-semibold text-red-700 bg-red-100 border border-red-200 rounded cursor-pointer select-none hover:bg-red-50 active:scale-95 transition-transform shadow-sm hover:shadow-md focus:outline-none focus:ring-2 focus:ring-red-200"
                    >
                      <span>NQ</span>
                      <svg aria-hidden="true" className="w-3 h-3 text-red-700" viewBox="0 0 20 20" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                        <path fillRule="evenodd" d="M18 10A8 8 0 11.999 10 8 8 0 0118 10zm-9-1a1 1 0 112 0v5a1 1 0 11-2 0V9zm1-4a1.25 1.25 0 100 2.5A1.25 1.25 0 0010 5z" clipRule="evenodd" />
                      </svg>
                    </span>
                  </span>
                )}
              </td>
              <td className="p-2 text-center text-gray-700">{gp}</td>
              <td className="p-2 text-green-600 text-center">{p.wins}</td>
              <td className="p-2 text-red-400 text-center">{p.losses}</td>
              <td className="p-2 text-yellow-500 text-center">{p.draws}</td>
              {viewMode === 'doubles' ? (
                <>
                  <td className="p-2 text-center text-cyan-600">{winPct}</td>
                  <td className="p-2 text-center text-cyan-600 font-black text-base">{diff}</td>
                </>
              ) : (
                <>
                  <td className="p-2 text-center text-gray-700">{diff}</td>
                  <td className="p-2 text-center text-cyan-600 font-black text-base">{winPct}</td>
                </>
              )}
              <td className="p-2 text-center">
                {(() => {
                  const change = p.positionChange || 0;
                  if (change > 0) {
                    return (
                      <span className="text-green-600 font-semibold flex items-center justify-center gap-1">
                        <span aria-hidden>▲</span>
                        <span className="text-sm">{change}</span>
                      </span>
                    );
                  }
                  if (change < 0) {
                    return (
                      <span className="text-red-600 font-semibold flex items-center justify-center gap-1">
                        <span aria-hidden>▼</span>
                        <span className="text-sm">{Math.abs(change)}</span>
                      </span>
                    );
                  }
                  return <span className="text-gray-400">—</span>;
                })()}
              </td>

              <td className="p-2">
                <div className="flex gap-1 justify-start">
                  {(() => {
                    const form = computePlayerForm(p.id);
                    const padded = Array(Math.max(0,10 - (form.length||0))).fill(null).concat(form.length ? form : []).slice(0,10);
                    return padded.map((r, idx) => (
                      <span
                        key={idx}
                        className={`w-3 h-3 rounded-sm inline-block border ${
                          r === 'W' ? 'bg-green-500 border-green-600' : r === 'L' ? 'bg-red-500 border-red-600' : r === 'D' ? 'bg-yellow-400 border-yellow-500' : 'bg-gray-200 border-gray-300'
                        }`}
                        title={r === 'W' ? 'Win' : r === 'L' ? 'Loss' : r === 'D' ? 'Draw' : 'No match'}
                      />
                    ));
                  })()}
                </div>
              </td>

              <td className="p-2 text-right font-semibold">{p.points}</td>
            </tr>
          );
        });
        })()}
      </tbody>
    </table>

    {/* NQ bottom-sheet modal (mobile-friendly). Renders at end of Leaderboard view */}
    {showNqModalFor && viewMode !== 'doubles' && (
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
        <div className="absolute inset-0 bg-black/40" onClick={() => setShowNqModalFor(null)} />
        <div className="relative w-full sm:max-w-md bg-white rounded-t-xl sm:rounded-xl p-4 sm:p-6 shadow-xl">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-lg font-semibold">Not Qualified</h3>
              <p className="text-sm text-gray-600 mt-1">{`Requires ${minQualifyGames} games to qualify for ranked positions.`}</p>
            </div>
            <button onClick={() => setShowNqModalFor(null)} className="text-gray-600 ml-4">Close</button>
          </div>
          <div className="mt-3 text-sm text-gray-700">
            Players who have not reached the minimum games are still shown, but are not counted in the ranked positions until they reach the required number of games.
          </div>
        </div>
      </div>
    )}

    {/* Edit Min Qualify Games modal */}
    {showEditMinModal && (
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        <div className="absolute inset-0 bg-black/40" onClick={() => setShowEditMinModal(false)} />
        <div className="relative w-full max-w-md bg-white rounded-xl p-6 shadow-xl">
          <h3 className="text-lg font-semibold">Minimum Games to Qualify</h3>
          <p className="text-sm text-gray-600 mt-1">Set how many games a player must play before they qualify for ranked positions.</p>
          <div className="mt-4">
            <input
              type="number"
              min={0}
              value={minQualifyInput}
              onChange={(e) => setMinQualifyInput(e.target.value)}
              className="w-full border border-gray-300 rounded px-3 py-2"
            />
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <button onClick={() => setShowEditMinModal(false)} className="px-4 py-2 rounded bg-gray-100">Cancel</button>
            <button
              onClick={() => {
                const v = parseInt(minQualifyInput || "0", 10) || 0;
                // require admin passcode to actually save per-division
                setPendingMinSave({ division, value: v });
                setVerifyMinPasscode("");
                setVerifyMinError("");
                setShowEditMinModal(false);
                setShowVerifyMinPasscodeModal(true);
              }}
              className="px-4 py-2 rounded bg-blue-600 text-white"
            >Save</button>
          </div>
        </div>
      </div>
    )}
    {showVerifyMinPasscodeModal && (
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        <div className="absolute inset-0 bg-black/40" onClick={() => setShowVerifyMinPasscodeModal(false)} />
        <div className="relative w-full max-w-sm bg-white rounded-xl p-6 shadow-xl">
          <h3 className="text-lg font-semibold">Admin passcode required</h3>
          <p className="text-sm text-gray-600 mt-1">Enter admin passcode to save the minimum games for this division.</p>
          <div className="mt-4">
            <input type="password" value={verifyMinPasscode} onChange={(e) => setVerifyMinPasscode(e.target.value)} className="w-full border border-gray-300 rounded px-3 py-2" />
            {verifyMinError && <p className="text-red-600 text-sm mt-2">{verifyMinError}</p>}
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <button onClick={() => { setShowVerifyMinPasscodeModal(false); setPendingMinSave(null); }} className="px-4 py-2 rounded bg-gray-100">Cancel</button>
            <button
              onClick={async () => {
                const correct = process.env.NEXT_PUBLIC_ADMIN_PASSCODE || "";
                if (verifyMinPasscode.trim() !== correct.trim()) {
                  setVerifyMinError("Incorrect passcode.");
                  return;
                }
                // save pending value
                if (pendingMinSave) {
                  const next = { ...(minQualifyByDivision || {}) };
                  next[String(pendingMinSave.division)] = pendingMinSave.value;
                  setMinQualifyByDivision(next);
                  try { setLSJson("min_qualify_by_division", next); } catch (e) {}
                  // update current displayed value
                  setMinQualifyGames(pendingMinSave.value);

                  // Persist per-division min to DB for canonical storage
                  try {
                    await db('divisions').update({ min_qualify_games: pendingMinSave.value }).eq('id', pendingMinSave.division);
                  } catch (e) {
                    console.warn('Failed to persist min_qualify_games to DB:', e);
                    // not fatal — keep local value
                  }
                }
                setPendingMinSave(null);
                setShowVerifyMinPasscodeModal(false);
              }}
              className="px-4 py-2 rounded bg-blue-600 text-white"
            >Verify & Save</button>
          </div>
        </div>
      </div>
    )}
  </>
) : (
  <div className="p-6 bg-gray-50">
    <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Tracker</h2>
          <p className="text-sm text-gray-500">A bump chart showing player ranking position each week.</p>
        </div>
      </div>

      {bumpChartData.weeks.length === 0 ? (
        <p className="text-gray-500">No tracker data yet. Save a week of matches to build the chart.</p>
      ) : (
        <div className="overflow-x-auto">
          <svg
            viewBox={`0 0 ${Math.max(700, 100 + Math.max(0, bumpChartData.weeks.length - 1) * 90 + 180)} 420`}
            className="w-full"
            style={{ minWidth: `${Math.max(700, 100 + Math.max(0, bumpChartData.weeks.length - 1) * 90 + 180)}px` }}
            role="img"
            aria-label="Ranking bump chart"
          >
            <defs>
              <linearGradient id="chartGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#facc15" />
                <stop offset="100%" stopColor="#38bdf8" />
              </linearGradient>
            </defs>
            <rect x="0" y="0" width={Math.max(700, 100 + Math.max(0, bumpChartData.weeks.length - 1) * 90 + 180)} height="420" fill="#111827" rx="24" />
            {(() => {
              const stepX = bumpChartData.weeks.length > 1 ? Math.min(120, Math.max(70, 640 / (bumpChartData.weeks.length - 1))) : 0;
              const chartWidth = Math.max(700, 100 + Math.max(0, bumpChartData.weeks.length - 1) * stepX + 180);
              return bumpChartData.weeks.map((week, index) => {
                const x = 100 + index * stepX;
                return (
                  <g key={week}>
                    <line x1={x} y1={60} x2={x} y2={380} stroke="#334155" strokeDasharray="4 4" />
                    <text x={x} y={395} fill="#cbd5e1" fontSize="12" textAnchor="middle">{index + 1}</text>
                  </g>
                );
              });
            })()}
            <text x={Math.max(700, 100 + Math.max(0, bumpChartData.weeks.length - 1) * 90 + 180) / 2} y={415} fill="#cbd5e1" fontSize="14" fontWeight="700" textAnchor="middle">
              Week
            </text>
            {(() => {
              const maxRank = Math.max(
                1,
                ...bumpChartData.lines.flatMap((line) => line.positions.map((pos) => pos.rank))
              );
              const height = 320;
              const top = 60;
              const left = 100;
              const stepX = bumpChartData.weeks.length > 1 ? Math.min(120, Math.max(70, 640 / (bumpChartData.weeks.length - 1))) : 0;
              const chartWidth = Math.max(700, 100 + Math.max(0, bumpChartData.weeks.length - 1) * stepX + 180);
              const yForRank = (rank) => top + ((rank - 1) / (maxRank - 1 || 1)) * height;
              return bumpChartData.lines.map((line) => {
                const pathD = line.positions
                  .map((pos, index) => {
                    const x = left + pos.weekIndex * stepX;
                    const y = yForRank(pos.rank);
                    return `${index === 0 ? 'M' : 'L'} ${x} ${y}`;
                  })
                  .join(' ');

                return (
                  <g key={line.id}>
                    <path d={pathD} fill="none" stroke={line.color} strokeWidth="2.5" />
                    {line.positions.map((pos, index) => {
                      const x = left + pos.weekIndex * stepX;
                      const y = yForRank(pos.rank);
                      const isLast = index === line.positions.length - 1;
                      const labelX = Math.min(x + 10, chartWidth - 60);
                      return (
                        <g key={`${line.id}-${index}`}>
                          <circle cx={x} cy={y} r="10" fill={line.color} />
                          <text x={x} y={y + 4} fill="#111827" fontSize="9" fontWeight="700" textAnchor="middle">
                            {pos.rank}
                          </text>
                          {isLast && (
                            <text x={labelX} y={y + 4} fill="#f8fafc" fontSize="11" fontWeight="700" textAnchor="start">
                              {line.name}
                            </text>
                          )}
                        </g>
                      );
                    })}
                  </g>
                );
              });
            })()}
          </svg>
        </div>
      )}
    </div>
  </div>
)}

        {/* Previous Seasons: simplified rendering of final standings */}
        {activeTab === "Previous Seasons" && (
          <div className="bg-white text-gray-700 rounded-2xl shadow-lg overflow-hidden p-4">
            <div className="px-2 py-2 border-b border-gray-200 bg-gray-50 mb-4">
              <div className="font-bold text-yellow-500 text-lg">📜 Previous Seasons</div>
            </div>

            {seasonSummaries.length === 0 ? (
              <div className="text-gray-600">No archived seasons yet.</div>
            ) : (
              <div className="space-y-3">
                {seasonSummaries.map((s) => {
                  const final = s.finalStandings || s.final_standings || [];
                  const playersForSummary = (final || []).map((p) => ({
                    id: p.id || p.name,
                    name: p.name || p.id,
                    wins: p.wins || 0,
                    losses: p.losses || 0,
                    draws: p.draws || 0,
                    points: p.points || 0,
                    points_for: p.points_for || 0,
                    points_against: p.points_against || 0,
                    positionChange: p.positionChange || 0,
                  }));

                  // lightweight form computation using matches stored on the summary (if any)
                  const computePlayerFormLocal = (playerId, limit = 10) => {
                    const results = [];
                    const matchesArr = Array.isArray(s.matches) ? s.matches : [];
                    if (!matchesArr || matchesArr.length === 0) return results;
                    for (const match of matchesArr) {
                      if (results.length >= limit) break;
                      const playersArray = Array.isArray(match.players) ? match.players : (() => { try { return JSON.parse(match.players || "[]"); } catch (e) { return []; } })();
                      if (!playersArray || !playersArray.includes(playerId)) continue;
                      const team1 = playersArray.slice(0,2).map(String);
                      const score1 = Number(match.scores?.team1 ?? match.scores?.[0] ?? 0);
                      const score2 = Number(match.scores?.team2 ?? match.scores?.[1] ?? 0);
                      let res = 'D';
                      if (score1 > score2) res = team1.includes(String(playerId)) ? 'W' : 'L';
                      else if (score1 < score2) res = team1.includes(String(playerId)) ? 'L' : 'W';
                      results.push(res);
                    }
                    return results.reverse();
                  };

                  return (
                    <details key={s.id} className="bg-gray-100 p-3 rounded">
                      <summary className="font-semibold text-yellow-600">Division {s.division} — {new Date(s.timestamp).toLocaleString()}</summary>
                      <div className="mt-3">
                        {/* Leaderboard layout (mirrors Standings -> Leaderboard) */}
                        <div className="mb-4">
                          <div className="sm:hidden p-4 space-y-2 bg-gray-50">
                            <div className="grid grid-cols-6 text-xs font-bold text-gray-400 text-center mb-1">
                              <span>GP</span>
                              <span className="text-green-600">W</span>
                              <span className="text-red-400">L</span>
                              <span className="text-yellow-500">D</span>
                              <span>Diff</span>
                              <span className="text-cyan-600 font-black text-xs">Win %</span>
                            </div>

                            {playersForSummary.map((p, i) => {
                              const gp = (p.wins || 0) + (p.losses || 0) + (p.draws || 0);
                              const winPct = gp > 0 ? ((p.wins / gp) * 100).toFixed(0) + '%' : '0%';
                              const diff = (p.points_for || 0) - (p.points_against || 0);
                              const form = computePlayerFormLocal(p.id);
                              return (
                                <div key={p.id} className={`rounded-lg shadow border p-4 ${i===0? 'bg-yellow-50 border-yellow-300': i===1? 'bg-gray-100 border-gray-300' : 'bg-white border-gray-200'}`}>
                                  <div className="flex justify-between items-center mb-2">
                                    <span className="font-bold text-gray-900">{i===0 && '🥇'}{i===1 && '🥈'}{i===2 && '🥉'} #{i+1} {p.name}</span>
                                    <span className="font-bold text-gray-900">{p.points} pts</span>
                                  </div>
                                  <div className="grid grid-cols-6 text-sm font-semibold gap-1 text-center">
                                    <div className="flex flex-col items-center gap-1"><span className="text-gray-700">{gp}</span></div>
                                    <span className="text-green-600">{p.wins}</span>
                                    <span className="text-red-400">{p.losses}</span>
                                    <span className="text-yellow-500">{p.draws}</span>
                                    <span className="text-gray-700">{diff}</span>
                                    <span className="text-cyan-600 font-black text-base">{winPct}</span>
                                  </div>
                                  <div className="flex justify-end mt-3 items-end gap-4">
                                    <div className="flex flex-col items-center gap-1"><span className="text-xs uppercase tracking-widest text-gray-400">Change</span><div><span className="inline-flex items-center justify-center min-w-[36px] h-5 px-1 rounded text-sm font-semibold text-gray-500 bg-gray-100 border border-gray-200">—</span></div></div>
                                    <div className="flex flex-col items-end gap-1"><span className="text-xs uppercase tracking-widest text-gray-400">Form</span><div className="flex items-center gap-1 overflow-x-auto px-1">{[Array(Math.max(0,10 - (form.length || 0))).fill(null).concat(form.length ? form : []).slice(0,10)].flat().map((r, idx) => (<span key={idx} className={`w-3 h-3 rounded-sm inline-block border ${r==='W' ? 'bg-green-500 border-green-600' : r==='L' ? 'bg-red-500 border-red-600' : r==='D' ? 'bg-yellow-400 border-yellow-500' : 'bg-gray-200 border-gray-300'}`} title={r==='W' ? 'Win' : r==='L' ? 'Loss' : r==='D' ? 'Draw' : 'No match'} />))}</div></div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>

                          {/* Desktop Table */}
                          <table className="hidden sm:table w-full text-left">
                            <thead className="text-gray-400 text-sm uppercase border-b border-gray-200">
                              <tr>
                                <th className="p-2">#</th>
                                <th className="p-2">Player</th>
                                <th className="p-2 text-center text-gray-700">GP</th>
                                <th className="p-2 text-green-600">W</th>
                                <th className="p-2 text-red-400">L</th>
                                <th className="p-2 text-yellow-500">D</th>
                                <th className="p-2 text-center text-gray-700">Diff</th>
                                <th className="p-2 text-center text-cyan-600 font-black">Win %</th>
                                <th className="p-2 text-center">Change</th>
                                <th className="p-2">Form</th>
                                <th className="p-2 text-right">Points</th>
                              </tr>
                            </thead>
                            <tbody>
                              {playersForSummary.map((p, i) => {
                                const gp = (p.wins || 0) + (p.losses || 0) + (p.draws || 0);
                                const winPct = gp > 0 ? ((p.wins / gp) * 100).toFixed(0) + '%' : '0%';
                                const diff = (p.points_for || 0) - (p.points_against || 0);
                                const form = computePlayerFormLocal(p.id);
                                return (
                                  <tr key={p.id} className={`border-b hover:bg-gray-100 transition ${i===0? 'bg-yellow-50' : i===1 ? 'bg-gray-100' : i===2 ? 'bg-orange-50' : 'even:bg-yellow-50'}`}>
                                    <td className="p-2">{i+1}</td>
                                    <td className="p-2 font-semibold flex items-center gap-2">{i===0 && <span>🥇</span>}{i===1 && <span>🥈</span>}{i===2 && <span>🥉</span>}{p.name}</td>
                                    <td className="p-2 text-center text-gray-700">{gp}</td>
                                    <td className="p-2 text-green-600 text-center">{p.wins}</td>
                                    <td className="p-2 text-red-400 text-center">{p.losses}</td>
                                    <td className="p-2 text-yellow-500 text-center">{p.draws}</td>
                                    <td className="p-2 text-center text-gray-700">{diff}</td>
                                    <td className="p-2 text-center text-cyan-600 font-black text-base">{winPct}</td>
                                    <td className="p-2 text-center">—</td>
                                    <td className="p-2"><div className="flex gap-1 justify-start">{[Array(Math.max(0,10 - (form.length||0))).fill(null).concat(form.length ? form : []).slice(0,10)].flat().map((r, idx) => (<span key={idx} className={`w-3 h-3 rounded-sm inline-block border ${r==='W' ? 'bg-green-500 border-green-600' : r==='L' ? 'bg-red-500 border-red-600' : r==='D' ? 'bg-yellow-400 border-yellow-500' : 'bg-gray-200 border-gray-300'}`} title={r==='W' ? 'Win' : r==='L' ? 'Loss' : r==='D' ? 'Draw' : 'No match'} />))}</div></td>
                                    <td className="p-2 text-right font-semibold">{p.points}</td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </details>
                  );
                })}
              </div>
            )}
          </div>
        )}

    <div className="mt-8 px-6 py-6 flex justify-center gap-4 border-t border-gray-200 bg-red-50">
      <button
        onClick={() => setShowRecalculateModal(true)}
        className="bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white px-8 py-3 rounded font-semibold transition"
      >
        ♻ Recalculate Standings
      </button>
      <button
        onClick={() => setShowResetModal(true)}
        className="bg-red-600 hover:bg-red-700 active:bg-red-800 text-white px-8 py-3 rounded font-semibold transition"
      >
        🏁 End Season
      </button>
    </div>
  </div>
)}

        {/* Players Tab */}
{activeTab === "Players" && (
  <div className="bg-white text-gray-700 rounded-2xl shadow-lg overflow-hidden">
    <div className="px-6 py-4 border-b border-gray-200 font-bold bg-gray-50 text-yellow-500">
      👥 Players
    </div>

    {/* Mobile Players */}
    <div className="sm:hidden p-4 space-y-3 bg-gray-50">
      {players.map((p) => (
        <div
          key={p.id}
          className="rounded-lg shadow border p-4 transition bg-white border-gray-200 flex justify-between items-center"
        >
          <span className="font-semibold">{p.name}</span>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={p.active}
              onChange={() => toggleAvailability(p.id)}
              className="sr-only"
            />
            {/* Track */}
            <div
              className={`w-16 h-7 rounded-full transition-colors duration-300 ease-in-out ${
                p.active ? "bg-green-500" : "bg-red-500"
              }`}
            />
            {/* Thumb with text */}
            <span
              className={`absolute left-0 top-0 w-8 h-7 flex items-center justify-center text-xs font-bold text-white rounded-full shadow-md transform transition-transform duration-300 ease-in-out ${
                p.active ? "translate-x-8 scale-105" : "translate-x-0 scale-100"
              }`}
            >
              {p.active ? "Yes" : "No"}
            </span>
          </label>
        </div>
      ))}
    </div>

    {/* Desktop Players Table */}
    <table className="hidden sm:table w-full text-left">
      <thead className="text-gray-400 text-sm uppercase border-b border-gray-200">
        <tr>
          <th className="p-2">#</th>
          <th className="p-2">Player</th>
          <th className="p-2 text-center">Available</th>
        </tr>
      </thead>
      <tbody>
        {players.map((p, i) => (
          <tr
            key={p.id}
            className={`border-b hover:bg-gray-100 transition`}
          >
            <td className="p-2">{i + 1}</td>
            <td className="p-2 font-semibold">{p.name}</td>
            <td className="p-2 text-center">
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={p.active}
                  onChange={() => toggleAvailability(p.id)}
                  className="sr-only"
                />
                <div
                  className={`w-16 h-7 rounded-full transition-colors duration-300 ease-in-out ${
                    p.active ? "bg-green-500" : "bg-red-500"
                  }`}
                />
                <span
                  className={`absolute left-0 top-0 w-8 h-7 flex items-center justify-center text-xs font-bold text-white rounded-full shadow-md transform transition-transform duration-300 ease-in-out ${
                    p.active ? "translate-x-8 scale-105" : "translate-x-0 scale-100"
                  }`}
                >
                  {p.active ? "Yes" : "No"}
                </span>
              </label>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
)}

        {/* Matches */}
{activeTab === "Matches" && (
  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
    {/* Court 1 */}
<div className="bg-gray-700 rounded shadow p-4">
  <h2 className="text-yellow-400 font-bold mb-4 text-lg sm:text-xl">Court 1</h2>
  {court1Matches[court1Round] ? (
    <>
      <div className="mb-2 bg-white rounded-2xl shadow-xl p-6 text-gray-900">
         {/* ROUND INDICATOR */}
  <div className="text-center text-xs uppercase tracking-widest text-yellow-500 font-bold mb-4">
  Round {court1Round + 1} of {court1Matches.length}
</div>
<div className="grid grid-cols-1 sm:grid-cols-2 gap-6 items-center">
          {/* Team 1 */}
          <div className="text-center">
            <div className="font-bold text-lg mb-3 text-gray-700">
              {court1Matches[court1Round][0].map(p => p.name).join(" & ")}
            </div>
            <input
              type="number"
              min={0}
              value={court1Scores[court1Round]?.team1 ?? ""}
              onChange={(e) =>
                updateScore(court1Round, "team1", e.target.value, "court1")
              }
              className="w-24 h-20 text-4xl font-extrabold text-center rounded-xl border-2 border-gray-300 focus:border-yellow-400 focus:ring-4 focus:ring-yellow-200 outline-none transition"
            />
          </div>

          {/* Team 2 */}
          <div className="text-center">
            <div className="font-bold text-lg mb-3 text-gray-700">
              {court1Matches[court1Round][1].map(p => p.name).join(" & ")}
            </div>
            <input
              type="number"
              min={0}
              value={court1Scores[court1Round]?.team2 ?? ""}
              onChange={(e) =>
                updateScore(court1Round, "team2", e.target.value, "court1")
              }
              className="w-24 h-20 text-4xl font-extrabold text-center rounded-xl border-2 border-gray-300 focus:border-yellow-400 focus:ring-4 focus:ring-yellow-200 outline-none transition"
            />
          </div>
        </div>

        <div className="text-center text-gray-400 font-bold mt-6 text-lg tracking-widest">
          VS
        </div>

        {/* Bye players */}
        {roundMatches?.court1?.[court1Round]?.length > 0 && (
          <div className="mt-2 text-gray-400 text-sm italic text-center">
            Resting: {roundMatches.court1[court1Round].map(p => p.name).join(", ")}
          </div>
        )}
      </div>
    </>
  ) : (
    <p className="text-gray-300 italic">No matches scheduled for this court.</p>
  )}

  <div className="flex justify-between mt-4">
    <button
      onClick={() => setCourt1Round(prev => Math.max(prev - 1, 0))}
      disabled={court1Round === 0}
      className="bg-gray-600 hover:bg-gray-500 text-white px-4 py-2 rounded disabled:opacity-50"
    >
      ◀ Previous Round
    </button>
    <button
      onClick={() => setCourt1Round(prev => Math.min(prev + 1, court1Matches.length - 1))}
      disabled={court1Round >= court1Matches.length - 1}
      className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded"
    >
      Next Round ▶
    </button>
  </div>
</div>

{/* Court 2 */}
<div className="bg-gray-700 rounded shadow p-4">
  <h2 className="text-yellow-400 font-bold mb-4 text-lg sm:text-xl">Court 2</h2>
  {court2Matches[court2Round] ? (
    <>
      <div className="mb-2 bg-white rounded-2xl shadow-xl p-6 text-gray-900">
         {/* ROUND INDICATOR */}
  <div className="text-center text-xs uppercase tracking-widest text-yellow-500 font-bold mb-4">
  Round {court2Round + 1} of {court2Matches.length}
</div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 items-center">
          {/* Team 1 */}
          <div className="text-center">
            <div className="font-bold text-lg mb-3 text-gray-700">
              {court2Matches[court2Round][0].map(p => p.name).join(" & ")}
            </div>
            <input
              type="number"
              min={0}
              value={court2Scores[court2Round]?.team1 ?? ""}
              onChange={(e) =>
                updateScore(court2Round, "team1", e.target.value, "court2")
              }
              className="w-24 h-20 text-4xl font-extrabold text-center rounded-xl border-2 border-gray-300 focus:border-yellow-400 focus:ring-4 focus:ring-yellow-200 outline-none transition"
            />
          </div>

          {/* Team 2 */}
          <div className="text-center">
            <div className="font-bold text-lg mb-3 text-gray-700">
              {court2Matches[court2Round][1].map(p => p.name).join(" & ")}
            </div>
            <input
              type="number"
              min={0}
              value={court2Scores[court2Round]?.team2 ?? ""}
              onChange={(e) =>
                updateScore(court2Round, "team2", e.target.value, "court2")
              }
              className="w-24 h-20 text-4xl font-extrabold text-center rounded-xl border-2 border-gray-300 focus:border-yellow-400 focus:ring-4 focus:ring-yellow-200 outline-none transition"
            />
          </div>
        </div>

        <div className="text-center text-gray-400 font-bold mt-6 text-lg tracking-widest">
          VS
        </div>

        {/* Bye players */}
        {roundMatches?.court2?.[court2Round]?.length > 0 && (
          <div className="mt-2 text-gray-400 text-sm italic text-center">
            Resting: {roundMatches.court2[court2Round].map(p => p.name).join(", ")}
          </div>
        )}
      </div>
    </>
  ) : (
    <p className="text-gray-300 italic">No matches scheduled for this court.</p>
  )}

  <div className="flex justify-between mt-4">
    <button
      onClick={() => setCourt2Round(prev => Math.max(prev - 1, 0))}
      disabled={court2Round === 0}
      className="bg-gray-600 hover:bg-gray-500 text-white px-4 py-2 rounded disabled:opacity-50"
    >
      ◀ Previous Round
    </button>
    <button
      onClick={() => setCourt2Round(prev => Math.min(prev + 1, court2Matches.length - 1))}
      disabled={court2Round >= court2Matches.length - 1}
      className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded"
    >
      Next Round ▶
    </button>
  </div>
</div>

{numCourts >= 3 && (
  <div className="bg-gray-700 rounded shadow p-4">
    <h2 className="text-yellow-400 font-bold mb-4 text-lg sm:text-xl">Court 3</h2>
    {court3Matches[court3Round] ? (
      <>
        <div className="mb-2 bg-white rounded-2xl shadow-xl p-6 text-gray-900">
          <div className="text-center text-xs uppercase tracking-widest text-yellow-500 font-bold mb-4">
            Round {court3Round + 1} of {court3Matches.length}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 items-center">
            <div className="text-center">
              <div className="font-bold text-lg mb-3 text-gray-700">
                {court3Matches[court3Round][0].map((p) => p.name).join(" & ")}
              </div>
              <input
                type="number"
                min={0}
                value={court3Scores[court3Round]?.team1 ?? ""}
                onChange={(e) =>
                  updateScore(court3Round, "team1", e.target.value, "court3")
                }
                className="w-24 h-20 text-4xl font-extrabold text-center rounded-xl border-2 border-gray-300 focus:border-yellow-400 focus:ring-4 focus:ring-yellow-200 outline-none transition"
              />
            </div>
            <div className="text-center">
              <div className="font-bold text-lg mb-3 text-gray-700">
                {court3Matches[court3Round][1].map((p) => p.name).join(" & ")}
              </div>
              <input
                type="number"
                min={0}
                value={court3Scores[court3Round]?.team2 ?? ""}
                onChange={(e) =>
                  updateScore(court3Round, "team2", e.target.value, "court3")
                }
                className="w-24 h-20 text-4xl font-extrabold text-center rounded-xl border-2 border-gray-300 focus:border-yellow-400 focus:ring-4 focus:ring-yellow-200 outline-none transition"
              />
            </div>
          </div>
          <div className="text-center text-gray-400 font-bold mt-6 text-lg tracking-widest">VS</div>
          {roundMatches?.court3?.[court3Round]?.length > 0 && (
            <div className="mt-2 text-gray-400 text-sm italic text-center">
              Resting: {roundMatches.court3[court3Round].map((p) => p.name).join(", ")}
            </div>
          )}
        </div>
        <div className="flex justify-between mt-4">
          <button
            onClick={() => setCourt3Round((prev) => Math.max(prev - 1, 0))}
            disabled={court3Round === 0}
            className="bg-gray-600 hover:bg-gray-500 text-white px-4 py-2 rounded disabled:opacity-50"
          >
            ◀ Previous Round
          </button>
          <button
            onClick={() => setCourt3Round((prev) => Math.min(prev + 1, court3Matches.length - 1))}
            disabled={court3Round >= court3Matches.length - 1}
            className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded"
          >
            Next Round ▶
          </button>
        </div>
      </>
    ) : (
      <p className="text-gray-300 italic">No matches scheduled for this court.</p>
    )}
  </div>
)}

{numCourts >= 4 && (
  <div className="bg-gray-700 rounded shadow p-4">
    <h2 className="text-yellow-400 font-bold mb-4 text-lg sm:text-xl">Court 4</h2>
    {court4Matches[court4Round] ? (
      <>
        <div className="mb-2 bg-white rounded-2xl shadow-xl p-6 text-gray-900">
          <div className="text-center text-xs uppercase tracking-widest text-yellow-500 font-bold mb-4">
            Round {court4Round + 1} of {court4Matches.length}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 items-center">
            <div className="text-center">
              <div className="font-bold text-lg mb-3 text-gray-700">
                {court4Matches[court4Round][0].map((p) => p.name).join(" & ")}
              </div>
              <input
                type="number"
                min={0}
                value={court4Scores[court4Round]?.team1 ?? ""}
                onChange={(e) =>
                  updateScore(court4Round, "team1", e.target.value, "court4")
                }
                className="w-24 h-20 text-4xl font-extrabold text-center rounded-xl border-2 border-gray-300 focus:border-yellow-400 focus:ring-4 focus:ring-yellow-200 outline-none transition"
              />
            </div>
            <div className="text-center">
              <div className="font-bold text-lg mb-3 text-gray-700">
                {court4Matches[court4Round][1].map((p) => p.name).join(" & ")}
              </div>
              <input
                type="number"
                min={0}
                value={court4Scores[court4Round]?.team2 ?? ""}
                onChange={(e) =>
                  updateScore(court4Round, "team2", e.target.value, "court4")
                }
                className="w-24 h-20 text-4xl font-extrabold text-center rounded-xl border-2 border-gray-300 focus:border-yellow-400 focus:ring-4 focus:ring-yellow-200 outline-none transition"
              />
            </div>
          </div>
          <div className="text-center text-gray-400 font-bold mt-6 text-lg tracking-widest">VS</div>
          {roundMatches?.court4?.[court4Round]?.length > 0 && (
            <div className="mt-2 text-gray-400 text-sm italic text-center">
              Resting: {roundMatches.court4[court4Round].map((p) => p.name).join(", ")}
            </div>
          )}
        </div>
        <div className="flex justify-between mt-4">
          <button
            onClick={() => setCourt4Round((prev) => Math.max(prev - 1, 0))}
            disabled={court4Round === 0}
            className="bg-gray-600 hover:bg-gray-500 text-white px-4 py-2 rounded disabled:opacity-50"
          >
            ◀ Previous Round
          </button>
          <button
            onClick={() => setCourt4Round((prev) => Math.min(prev + 1, court4Matches.length - 1))}
            disabled={court4Round >= court4Matches.length - 1}
            className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded"
          >
            Next Round ▶
          </button>
        </div>
      </>
    ) : (
      <p className="text-gray-300 italic">No matches scheduled for this court.</p>
    )}
  </div>
)}

    {/* Save All Matches */}
    <div className="col-span-1 md:col-span-2 flex justify-center gap-3 mt-4">
      <button onClick={saveMatches} className="bg-green-600 hover:bg-green-500 text-white px-6 py-2 rounded">
        💾 Save Matches
      </button>
      <button
        onClick={clearGeneratedMatches}
        disabled={!hasGeneratedFixtures}
        className="bg-red-600 hover:bg-red-500 text-white px-6 py-2 rounded disabled:opacity-50 disabled:cursor-not-allowed"
      >
        🗑 Clear Matches
      </button>
    </div>
  </div>
)}

        {activeTab === "Previous Matches" && (
          <div className="bg-gray-700 rounded shadow p-4">
            {/* Add Match Button */}
            <div className="flex justify-center mb-4">
              <button
                onClick={() => setShowAddMatchPasscodeModal(true)}
                className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2 rounded"
              >
                ➕ Add Match
              </button>
            </div>

            {previousMatches.length === 0 ? (
              <p className="text-gray-300 italic text-sm">No previous matches yet...</p>
            ) : (
              <div className="space-y-8">
                {matchesByWeek.map(({ week, dateKey, courtMatches }) => {
                  const date = dateKey;
                  const isOpen = openDates.includes(date);
                  const totalMatches = (courtMatches.court1?.length || 0) + (courtMatches.court2?.length || 0);

                  return (
                    <div key={`week-${week}`} className="space-y-4">
                      <div className="text-sm font-bold text-yellow-400">Week {week}</div>
                      <details
                        key={date}
                        open={isOpen}
                        onToggle={(e) => {
                          if (e.currentTarget.open) {
                            setOpenDates((prev) => (prev.includes(date) ? prev : [...prev, date]));
                          } else {
                            setOpenDates((prev) => prev.filter((d) => d !== date));
                          }
                        }}
                        className="mb-3 rounded-xl border border-gray-600 bg-gray-800 overflow-hidden"
                      >
                        <summary className="list-none cursor-pointer select-none px-4 py-4 flex flex-col items-start gap-3 hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-yellow-400 sm:flex-row sm:items-center sm:justify-between">
                          <div className="flex items-center gap-3 min-w-0 w-full sm:w-auto">
                            <span className="text-xl">📅</span>
                            <div className="min-w-0">
                              <div className="font-extrabold text-yellow-300 truncate">{date}</div>
                            </div>
                          </div>

                          <div className="w-full flex items-center justify-between sm:w-auto sm:justify-end sm:gap-2">
                            <span className="shrink-0 text-xs font-bold bg-gray-900 text-gray-200 px-2 py-1 rounded-full border border-gray-600">
                              {totalMatches} match{totalMatches === 1 ? "" : "es"}
                            </span>

                            <span className="shrink-0 flex items-center gap-2">
                              <span className="text-sm font-bold text-white bg-yellow-600 px-3 py-1 rounded-lg">
                                {isOpen ? "Hide" : "Show"}
                              </span>
                              <span
                                className={`text-yellow-300 text-2xl transition-transform duration-200 ${
                                  isOpen ? "rotate-180" : "rotate-0"
                                }`}
                                aria-hidden="true"
                              >
                                ▾
                              </span>
                            </span>
                          </div>
                        </summary>

                        <div className="p-4 bg-gray-700">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Court 1 */}
                            <div>
                              <div className="bg-blue-100 text-blue-900 font-bold px-3 py-2 rounded mb-2 text-center">
                                🎾 Court 1
                              </div>
                              <div className="space-y-2">
                                {courtMatches.court1.length === 0 ? (
                                  <p className="text-gray-300 text-sm italic">No matches</p>
                                ) : (
                                  courtMatches.court1.map((m, idx) => (
                                    <div
                                      key={idx}
                                      className="bg-white p-3 rounded text-gray-700 text-sm border border-gray-300"
                                    >
                                      <div className="flex items-center justify-between mb-1">
                                        <div className="text-blue-600 font-semibold">Division {m.division}</div>
                                        <button
                                          onClick={() => requestEditMatch(m)}
                                          className="text-xs bg-gray-800 hover:bg-gray-700 text-white px-2 py-1 rounded border border-gray-500"
                                        >
                                          Edit
                                        </button>
                                      </div>
                                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 items-center">
                                        <div className="text-center">
                                          <div className="font-bold text-base text-gray-700">
                                            {m.players
                                              .slice(0, 2)
                                              .map((id) => getPlayerNameFromId(id))
                                              .join(" & ")}
                                          </div>
                                          <div className="text-3xl font-extrabold text-yellow-600 mt-1">
                                            {m.scores?.team1 ?? "—"}
                                          </div>
                                        </div>
                                        <div className="text-center">
                                          <div className="font-bold text-base text-gray-700">
                                            {m.players
                                              .slice(2, 4)
                                              .map((id) => getPlayerNameFromId(id))
                                              .join(" & ")}
                                          </div>
                                          <div className="text-3xl font-extrabold text-yellow-600 mt-1">
                                            {m.scores?.team2 ?? "—"}
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  ))
                                )}
                              </div>
                            </div>

                            {/* Court 2 */}
                            <div>
                              <div className="bg-purple-100 text-purple-900 font-bold px-3 py-2 rounded mb-2 text-center">
                                🎾 Court 2
                              </div>
                              <div className="space-y-2">
                                {courtMatches.court2.length === 0 ? (
                                  <p className="text-gray-300 text-sm italic">No matches</p>
                                ) : (
                                  courtMatches.court2.map((m, idx) => (
                                    <div
                                      key={idx}
                                      className="bg-white p-3 rounded text-gray-700 text-sm border border-gray-300"
                                    >
                                      <div className="flex items-center justify-between mb-1">
                                        <div className="text-purple-600 font-semibold">Division {m.division}</div>
                                        <button
                                          onClick={() => requestEditMatch(m)}
                                          className="text-xs bg-gray-800 hover:bg-gray-700 text-white px-2 py-1 rounded border border-gray-500"
                                        >
                                          Edit
                                        </button>
                                      </div>
                                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 items-center">
                                        <div className="text-center">
                                          <div className="font-bold text-base text-gray-700">
                                            {m.players
                                              .slice(0, 2)
                                              .map((id) => getPlayerNameFromId(id))
                                              .join(" & ")}
                                          </div>
                                          <div className="text-3xl font-extrabold text-yellow-600 mt-1">
                                            {m.scores?.team1 ?? "—"}
                                          </div>
                                        </div>
                                        <div className="text-center">
                                          <div className="font-bold text-base text-gray-700">
                                            {m.players
                                              .slice(2, 4)
                                              .map((id) => getPlayerNameFromId(id))
                                              .join(" & ")}
                                          </div>
                                          <div className="text-3xl font-extrabold text-yellow-600 mt-1">
                                            {m.scores?.team2 ?? "—"}
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  ))
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </details>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </section>
      {showAdminModal && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50">
          <div className="bg-gray-900 rounded-xl shadow-xl p-6 w-80 border border-gray-700">
            <h2 className="text-lg font-bold text-yellow-400 mb-4 text-center">
              Admin Access
            </h2>

            <input
              type="password"
              value={adminCode}
              onChange={(e) => {
                setAdminCode(e.target.value);
                setAdminError("");
              }}
              placeholder="Enter passcode"
              className="w-full px-3 py-2 rounded bg-gray-800 text-white border border-gray-600 focus:outline-none focus:border-yellow-400"
            />

            {adminError && (
              <p className="text-red-400 text-sm mt-2 text-center">
                {adminError}
              </p>
            )}

            <div className="flex justify-between mt-5">
              <button
                onClick={() => {
                  setShowAdminModal(false);
                  setAdminCode("");
                  setAdminError("");
                }}
                className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded text-sm"
              >
                Cancel
              </button>

              <button
                onClick={verifyAdminCode}
                className="bg-yellow-600 hover:bg-yellow-500 text-white px-4 py-2 rounded text-sm"
              >
                Unlock
              </button>
            </div>
          </div>
        </div>
      )}

      {showRecalculateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50">
          <div className="bg-gray-900 rounded-xl shadow-xl p-6 w-80 border border-gray-700">
            <h2 className="text-lg font-bold text-blue-400 mb-4 text-center">
              Recalculate Standings
            </h2>
            <p className="text-gray-300 mb-4 text-center text-sm">
              Enter the admin passcode to recalculate standings.
            </p>

            <input
              type="password"
              value={recalculatePasswordInput}
              onChange={(e) => {
                setRecalculatePasswordInput(e.target.value);
                setRecalculateError("");
              }}
              placeholder="Enter passcode"
              className="w-full px-3 py-2 rounded bg-gray-800 text-white border border-gray-600 focus:outline-none focus:border-blue-400"
            />

            {recalculateError && (
              <p className="text-red-400 text-sm mt-2 text-center">
                {recalculateError}
              </p>
            )}

            <div className="flex justify-between mt-5">
              <button
                onClick={() => {
                  setShowRecalculateModal(false);
                  setRecalculatePasswordInput("");
                  setRecalculateError("");
                }}
                className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded text-sm"
              >
                Cancel
              </button>

              <button
                onClick={handleRecalculateStandings}
                className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded text-sm"
              >
                Recalculate
              </button>
            </div>
          </div>
        </div>
      )}

      {showResetModal && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50">
          <div className="bg-gray-900 rounded-xl shadow-xl p-6 w-80 border border-gray-700">
            <h2 className="text-lg font-bold text-yellow-400 mb-4 text-center">
              End Season
            </h2>
            <p className="text-gray-300 mb-4 text-center text-sm">
              Enter the passcode to end this season and archive a summary.
            </p>

            <input
              type="password"
              value={resetPasswordInput}
              onChange={(e) => {
                setResetPasswordInput(e.target.value);
                setResetError("");
              }}
              placeholder="Enter passcode"
              className="w-full px-3 py-2 rounded bg-gray-800 text-white border border-gray-600 focus:outline-none focus:border-red-400"
            />

            {resetError && (
              <p className="text-red-400 text-sm mt-2 text-center">
                {resetError}
              </p>
            )}

            <div className="flex justify-between mt-5">
              <button
                onClick={() => {
                  setShowResetModal(false);
                  setResetPasswordInput("");
                  setResetError("");
                }}
                className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded text-sm"
              >
                Cancel
              </button>

              <button
                onClick={async () => {
                  const resetPasscode = process.env.NEXT_PUBLIC_RESET_PASSCODE;
                  if (resetPasswordInput === resetPasscode) {
                    const confirmed = confirm("Are you sure you want to end the season? This will archive a summary and reset the leaderboard for the division.");
                    if (confirmed) {
                      try {
                        // 1) Fetch players and matches for the current division
                        const { data: divisionPlayers } = await db("players")
                          .select("*")
                          .eq("division", division);

                        const { data: divisionMatches } = await db("previous_matches")
                          .select("*")
                          .eq("division", division)
                          .order("created_at", { ascending: true });

                        const playersForSummary = divisionPlayers || [];
                        const matchesForSummary = divisionMatches || [];

                        // 2) Compute highlights
                        const topByPoints = [...playersForSummary]
                          .sort((a, b) => (b.points || 0) - (a.points || 0))
                          .slice(0, 5)
                          .map((p) => ({ id: p.id, name: p.name, points: p.points }));

                        const topByWins = [...playersForSummary]
                          .sort((a, b) => (b.wins || 0) - (a.wins || 0))
                          .slice(0, 5)
                          .map((p) => ({ id: p.id, name: p.name, wins: p.wins }));

                        const matchSummaries = matchesForSummary.map((m) => {
                          const t1 = Number(m.scores?.team1 || 0);
                          const t2 = Number(m.scores?.team2 || 0);
                          return { ...m, total: t1 + t2 };
                        });

                        const highestScoringMatch = matchSummaries.slice().sort((a, b) => b.total - a.total)[0] || null;

                        const avgPoints = matchSummaries.length
                          ? Math.round(matchSummaries.reduce((s, m) => s + (m.total || 0), 0) / matchSummaries.length)
                          : 0;

                        // Build final standings and a tracker (positions after each match)
                        const playersById = {};
                        (playersForSummary || []).forEach((p) => {
                          playersById[p.id] = { ...p };
                        });

                        // Initialize running stats per player
                        const running = {};
                        (playersForSummary || []).forEach((p) => {
                          running[p.id] = {
                            id: p.id,
                            name: p.name,
                            wins: 0,
                            losses: 0,
                            draws: 0,
                            points: 0,
                            points_for: 0,
                            points_against: 0,
                            win_streak: 0,
                          };
                        });

                        // Ensure matches are chronological
                        const chronMatches = (matchesForSummary || []).slice().sort((a, b) => new Date(a.created_at) - new Date(b.created_at));

                        const tracker = [];

                        const snapshotPositions = () => {
                          const arr = Object.values(running).map((s) => ({ ...s }));
                          const ranked = sortPlayersByStats(arr);
                          return ranked.map((p, idx) => ({ id: p.id, name: p.name, position: idx + 1, points: p.points, wins: p.wins }));
                        };

                        // Process matches one-by-one updating running stats and recording snapshots
                        for (let i = 0; i < chronMatches.length; i++) {
                          const m = chronMatches[i];
                          const playersArray = Array.isArray(m.players) ? m.players : JSON.parse(m.players || '[]');
                          if (!Array.isArray(playersArray) || playersArray.length < 4) {
                            tracker.push({ matchIndex: i, timestamp: m.created_at || null, positions: snapshotPositions() });
                            continue;
                          }

                          const team1 = playersArray.slice(0, 2).map(String);
                          const team2 = playersArray.slice(2, 4).map(String);
                          const score1 = Number(m.scores?.team1 || 0);
                          const score2 = Number(m.scores?.team2 || 0);

                          let res1 = 'draw', res2 = 'draw';
                          if (score1 > score2) { res1 = 'win'; res2 = 'loss'; }
                          else if (score1 < score2) { res1 = 'loss'; res2 = 'win'; }

                          const apply = (pid, result, scored, conceded) => {
                            if (!running[pid]) {
                              // if player not in list, create minimal entry
                              running[pid] = { id: pid, name: playersById[pid]?.name || String(pid), wins:0, losses:0, draws:0, points:0, points_for:0, points_against:0, win_streak:0 };
                            }
                            const s = running[pid];
                            if (result === 'win') { s.wins += 1; s.points += 3; s.win_streak += 1; }
                            else if (result === 'loss') { s.losses += 1; s.win_streak = 0; }
                            else { s.draws += 1; s.points += 1; s.win_streak = 0; }
                            s.points_for += scored; s.points_against += conceded;
                          };

                          team1.forEach((p) => apply(p, res1, score1, score2));
                          team2.forEach((p) => apply(p, res2, score2, score1));

                          tracker.push({ matchIndex: i, timestamp: m.created_at || null, positions: snapshotPositions() });
                        }

                        // Final standings: ranked using sortPlayersByStats
                        const finalArr = Object.values(running).map((s) => ({ ...s }));
                        const finalRanked = sortPlayersByStats(finalArr).map((p, idx) => ({ position: idx + 1, id: p.id, name: p.name, wins: p.wins, losses: p.losses, draws: p.draws, points: p.points, points_for: p.points_for, points_against: p.points_against, win_streak: p.win_streak }));

                        // most active player (count occurrences in matches)
                        const appearances = {};
                        for (const m of matchesForSummary) {
                          (m.players || []).forEach((pl) => {
                            appearances[pl] = (appearances[pl] || 0) + 1;
                          });
                        }
                        const mostActive = Object.entries(appearances)
                          .sort((a, b) => b[1] - a[1])[0]?.[0] || null;

                        const summary = {
                          id: `season_summary_${division}_${Date.now()}`,
                          division,
                          timestamp: new Date().toISOString(),
                          topByPoints,
                          topByWins,
                          highestScoringMatch,
                          avgPoints,
                          mostActive,
                          players: playersForSummary,
                          matches: matchesForSummary,
                          finalStandings: finalRanked,
                          tracker,
                        };

                        // 3) Persist summary to Supabase (fall back to localStorage on error)
                        try {
                          const seasonsTable = viewMode === 'doubles' ? `season_summaries${DOUBLES_SUFFIX}` : "season_summaries";
                          const idxKey = `season_summaries_index${viewMode === 'doubles' ? DOUBLES_SUFFIX : ""}`;
                          const { data: insertData, error: insertError } = await supabase
                            .from(seasonsTable)
                            .insert([
                              {
                                id: summary.id,
                                division: summary.division,
                                timestamp: summary.timestamp,
                                top_by_points: summary.topByPoints,
                                top_by_wins: summary.topByWins,
                                highest_scoring_match: summary.highestScoringMatch,
                                avg_points: summary.avgPoints,
                                most_active: summary.mostActive,
                                players: summary.players,
                                matches: summary.matches,
                                final_standings: summary.finalStandings,
                                tracker: summary.tracker,
                              },
                            ]);

                          if (insertError) throw insertError;
                        } catch (dbErr) {
                          console.error("Failed to persist season summary to Supabase, falling back to localStorage:", dbErr);
                          const idxKey = `season_summaries_index${viewMode === 'doubles' ? DOUBLES_SUFFIX : ""}`;
                          const existingIndex = getLSJson(idxKey, []);
                          existingIndex.unshift(summary.id);
                          setLSJson(idxKey, existingIndex);
                          setLSJson(summary.id, summary);
                        }

                        // Persisted summary; open confirmation modal to choose next action (start new season or clear players)
                        try {
                          setEndSummaryContext(summary);
                          setShowResetModal(false);
                          setShowEndSeasonChoiceModal(true);
                          setResetPasswordInput("");
                        } catch (e) {
                          console.error("Error opening post-end modal:", e);
                          // If the modal can't open, keep user on the current page and log the error.
                        }
                      } catch (err) {
                        console.error("Error ending season:", err);
                        setResetError("Error ending season");
                      }
                    }
                  } else {
                    setResetError("Incorrect passcode");
                  }
                }}
                className="bg-red-600 hover:bg-red-500 text-white px-4 py-2 rounded text-sm"
              >
                End Season
              </button>
            </div>
          </div>
        </div>
      )}

      {showEndSeasonChoiceModal && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50">
          <div className="bg-gray-900 rounded-xl shadow-xl p-6 w-96 border border-gray-700">
            <h2 className="text-lg font-bold text-yellow-400 mb-4 text-center">Season Finished</h2>
            <p className="text-gray-300 mb-4">A season summary has been archived. What would you like to do next for Division {endSummaryContext?.division}?</p>

            <div className="mb-3">
              <label className="text-sm text-gray-300">New season name (if starting new)</label>
              <input value={newSeasonName} onChange={(e) => setNewSeasonName(e.target.value)} placeholder={`Season ${new Date().toLocaleDateString()}`} className="w-full mt-2 px-3 py-2 rounded bg-gray-800 text-white border border-gray-600" />
            </div>

            <div className="flex justify-between gap-2">
              <button onClick={handleStartNewSeasonFromSummary} className="flex-1 bg-green-600 hover:bg-green-500 text-white px-4 py-2 rounded">Start New Season (reset stats)</button>
              <button onClick={handleClearPlayersFromSummary} className="flex-1 bg-red-600 hover:bg-red-500 text-white px-4 py-2 rounded">Clear Players</button>
            </div>

            <div className="flex justify-end mt-4">
              <button onClick={() => { setShowEndSeasonChoiceModal(false); setEndSummaryContext(null); }} className="text-sm text-gray-400 underline">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Match Passcode Modal */}
      {showEditMatchPasscodeModal && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50">
          <div className="bg-gray-900 rounded-xl shadow-xl p-6 w-80 border border-gray-700">
            <h2 className="text-lg font-bold text-yellow-400 mb-4 text-center">Edit Match</h2>
            <p className="text-gray-300 mb-4 text-center text-sm">
              Enter the admin passcode to edit this match.
            </p>

            <input
              type="password"
              value={editMatchPasscode}
              onChange={(e) => {
                setEditMatchPasscode(e.target.value);
                setEditMatchPasscodeError("");
              }}
              placeholder="Enter passcode"
              className="w-full px-3 py-2 rounded bg-gray-800 text-white border border-gray-600 focus:outline-none focus:border-yellow-400"
            />

            {editMatchPasscodeError && (
              <p className="text-red-400 text-sm mt-2 text-center">{editMatchPasscodeError}</p>
            )}

            <div className="flex justify-between mt-5">
              <button
                onClick={() => {
                  setShowEditMatchPasscodeModal(false);
                  setEditMatchPasscode("");
                  setEditMatchPasscodeError("");
                  setPendingEditMatch(null);
                }}
                className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded text-sm"
              >
                Cancel
              </button>

              <button
                onClick={verifyEditMatchPasscode}
                className="bg-yellow-600 hover:bg-yellow-500 text-white px-4 py-2 rounded text-sm"
              >
                Continue
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Match Modal */}
      {showEditMatchModal && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 rounded-xl shadow-xl p-6 w-full max-w-2xl border border-gray-700 max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold text-yellow-400 mb-4">✏ Edit Match</h2>

            <div className="mb-4">
              <label className="text-gray-300 text-sm block mb-1">Match Date</label>
              <input
                type="date"
                value={editMatchData.date}
                onChange={(e) => setEditMatchData({ ...editMatchData, date: e.target.value })}
                className="w-full px-3 py-2 rounded bg-gray-800 text-white border border-gray-600 focus:outline-none focus:border-yellow-400"
              />
            </div>

            <div className="mb-4">
              <label className="text-gray-300 text-sm block mb-1">Court</label>
              <select
                value={editMatchData.court}
                onChange={(e) => setEditMatchData({ ...editMatchData, court: e.target.value })}
                className="w-full px-3 py-2 rounded bg-gray-800 text-white border border-gray-600 focus:outline-none focus:border-yellow-400"
              >
                <option value="court1">Court 1</option>
                <option value="court2">Court 2</option>
              </select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="text-gray-300 text-sm block mb-1">Team 1 Player 1</label>
                <select
                  value={editMatchData.team1Players[0]?.id || ""}
                  onChange={(e) => setEditTeamPlayer("team1Players", 0, e.target.value)}
                  className="w-full px-3 py-2 rounded bg-gray-800 text-white border border-gray-600 focus:outline-none focus:border-yellow-400"
                >
                  <option value="">Select Player</option>
                  {allDivisionPlayers.map((p) => (
                    <option key={`edit-t1a-${p.id}`} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-gray-300 text-sm block mb-1">Team 1 Player 2</label>
                <select
                  value={editMatchData.team1Players[1]?.id || ""}
                  onChange={(e) => setEditTeamPlayer("team1Players", 1, e.target.value)}
                  className="w-full px-3 py-2 rounded bg-gray-800 text-white border border-gray-600 focus:outline-none focus:border-yellow-400"
                >
                  <option value="">Select Player</option>
                  {allDivisionPlayers.map((p) => (
                    <option key={`edit-t1b-${p.id}`} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-gray-300 text-sm block mb-1">Team 2 Player 1</label>
                <select
                  value={editMatchData.team2Players[0]?.id || ""}
                  onChange={(e) => setEditTeamPlayer("team2Players", 0, e.target.value)}
                  className="w-full px-3 py-2 rounded bg-gray-800 text-white border border-gray-600 focus:outline-none focus:border-yellow-400"
                >
                  <option value="">Select Player</option>
                  {allDivisionPlayers.map((p) => (
                    <option key={`edit-t2a-${p.id}`} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-gray-300 text-sm block mb-1">Team 2 Player 2</label>
                <select
                  value={editMatchData.team2Players[1]?.id || ""}
                  onChange={(e) => setEditTeamPlayer("team2Players", 1, e.target.value)}
                  className="w-full px-3 py-2 rounded bg-gray-800 text-white border border-gray-600 focus:outline-none focus:border-yellow-400"
                >
                  <option value="">Select Player</option>
                  {allDivisionPlayers.map((p) => (
                    <option key={`edit-t2b-${p.id}`} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="text-gray-300 text-sm block mb-1">Team 1 Score</label>
                <input
                  type="number"
                  min="0"
                  value={editMatchData.team1Score}
                  onChange={(e) => setEditMatchData({ ...editMatchData, team1Score: e.target.value })}
                  className="w-full px-3 py-2 rounded bg-gray-800 text-white border border-gray-600 focus:outline-none focus:border-yellow-400"
                />
              </div>
              <div>
                <label className="text-gray-300 text-sm block mb-1">Team 2 Score</label>
                <input
                  type="number"
                  min="0"
                  value={editMatchData.team2Score}
                  onChange={(e) => setEditMatchData({ ...editMatchData, team2Score: e.target.value })}
                  className="w-full px-3 py-2 rounded bg-gray-800 text-white border border-gray-600 focus:outline-none focus:border-yellow-400"
                />
              </div>
            </div>

            {editMatchError && (
              <p className="text-red-400 text-sm mb-4 text-center">{editMatchError}</p>
            )}

            <div className="flex justify-between gap-2">
              <button
                onClick={() => {
                  setShowEditMatchModal(false);
                  setEditingMatchId(null);
                  setEditMatchError("");
                }}
                className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded text-sm flex-1"
              >
                Cancel
              </button>

              <button
                onClick={saveEditedMatch}
                className="bg-yellow-600 hover:bg-yellow-500 text-white px-4 py-2 rounded text-sm flex-1"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Select Player Modal */}
      {showSelectPlayerModal && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50">
          <div className="bg-gray-900 rounded-xl shadow-xl p-6 w-96 border border-gray-700 max-h-96 overflow-auto">
            <h2 className="text-lg font-bold text-red-400 mb-4 text-center">
              Select Player to Remove
            </h2>
            <div className="space-y-2 mb-5">
              {players.length === 0 ? (
                <p className="text-gray-400 text-center text-sm">No players to remove</p>
              ) : (
                players.map((player) => (
                  <button
                    key={player.id}
                    onClick={() => handleSelectPlayerForRemoval(player)}
                    className="w-full text-left px-4 py-3 rounded bg-gray-800 hover:bg-gray-700 text-white transition border border-gray-600"
                  >
                    {player.name}
                  </button>
                ))
              )}
            </div>
            <button
              onClick={() => setShowSelectPlayerModal(false)}
              className="w-full bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded text-sm"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Add Division Modal */}
      {/* Add Division Passcode Modal */}
      {showAddDivisionPasscodeModal && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50">
          <div className="bg-gray-900 rounded-xl shadow-xl p-6 w-80 border border-gray-700">
            <h2 className="text-lg font-bold text-blue-400 mb-4 text-center">Add Division</h2>
            <p className="text-gray-300 mb-4 text-center text-sm">Enter the admin passcode to add a division.</p>

            <input
              type="password"
              value={addDivisionPasscode}
              onChange={(e) => {
                setAddDivisionPasscode(e.target.value);
                setAddDivisionPasscodeError("");
              }}
              placeholder="Enter passcode"
              className="w-full px-3 py-2 rounded bg-gray-800 text-white border border-gray-600 focus:outline-none focus:border-blue-400"
            />

            {addDivisionPasscodeError && (
              <p className="text-red-400 text-sm mt-2 text-center">{addDivisionPasscodeError}</p>
            )}

            <div className="flex justify-between mt-5">
              <button
                onClick={() => {
                  setShowAddDivisionPasscodeModal(false);
                  setAddDivisionPasscode("");
                  setAddDivisionPasscodeError("");
                }}
                className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded text-sm"
              >
                Cancel
              </button>

              <button
                onClick={verifyAddDivisionPasscode}
                className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded text-sm"
              >
                Continue
              </button>
            </div>
          </div>
        </div>
      )}
      {showAddDivisionModal && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50">
          <div className="bg-gray-900 rounded-xl shadow-xl p-6 w-80 border border-gray-700">
            <h2 className="text-lg font-bold text-blue-400 mb-4 text-center">Add Division</h2>
            <p className="text-gray-300 mb-4 text-center text-sm">Enter a name for the new division.</p>

            <input
              type="text"
              value={newDivisionName}
              onChange={(e) => setNewDivisionName(e.target.value)}
              placeholder="Division name"
              className="w-full px-3 py-2 rounded bg-gray-800 text-white border border-gray-600 focus:outline-none focus:border-blue-400"
            />

            <div className="flex justify-between mt-5">
              <button
                onClick={() => {
                  setShowAddDivisionModal(false);
                  setNewDivisionName("");
                }}
                className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded text-sm"
              >
                Cancel
              </button>

              <button
                onClick={() => addDivision(newDivisionName)}
                className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded text-sm"
              >
                Add
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Remove Division Passcode Modal */}
      {showRemoveDivisionPasscodeModal && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50">
          <div className="bg-gray-900 rounded-xl shadow-xl p-6 w-80 border border-gray-700">
            <h2 className="text-lg font-bold text-red-400 mb-4 text-center">Remove Division</h2>
            <p className="text-gray-300 mb-4 text-center text-sm">Enter the admin passcode to remove a division.</p>

            <input
              type="password"
              value={removeDivisionPasscode}
              onChange={(e) => {
                setRemoveDivisionPasscode(e.target.value);
                setRemoveDivisionPasscodeError("");
              }}
              placeholder="Enter passcode"
              className="w-full px-3 py-2 rounded bg-gray-800 text-white border border-gray-600 focus:outline-none focus:border-red-400"
            />

            {removeDivisionPasscodeError && (
              <p className="text-red-400 text-sm mt-2 text-center">{removeDivisionPasscodeError}</p>
            )}

            <div className="flex justify-between mt-5">
              <button
                onClick={() => {
                  setShowRemoveDivisionPasscodeModal(false);
                  setRemoveDivisionPasscode("");
                  setRemoveDivisionPasscodeError("");
                }}
                className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded text-sm"
              >
                Cancel
              </button>

              <button
                onClick={verifyRemoveDivisionPasscode}
                className="bg-red-600 hover:bg-red-500 text-white px-4 py-2 rounded text-sm"
              >
                Continue
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Select Division To Remove Modal */}
      {showSelectDivisionModal && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50">
          <div className="bg-gray-900 rounded-xl shadow-xl p-6 w-96 border border-gray-700">
            <h2 className="text-lg font-bold text-red-400 mb-4 text-center">Select Division to Remove</h2>
            <p className="text-gray-300 mb-4 text-center text-sm">Choose which division to delete. This will remove the division from the local UI.</p>

            <div className="mb-4 max-h-48 overflow-auto">
              {divisions.map((d) => (
                <label key={d.id} className="flex items-center gap-2 mb-2">
                  <input
                    type="radio"
                    name="removeDivision"
                    value={d.id}
                    checked={selectedDivisionToRemove === d.id}
                    onChange={() => setSelectedDivisionToRemove(d.id)}
                    className="accent-red-500"
                  />
                  <span className="text-gray-200">{d.name}</span>
                </label>
              ))}
            </div>

            <div className="flex justify-between mt-5">
              <button
                onClick={() => {
                  setShowSelectDivisionModal(false);
                  setSelectedDivisionToRemove(null);
                }}
                className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded text-sm"
              >
                Cancel
              </button>

              <button
                onClick={() => {
                  setShowSelectDivisionModal(false);
                  setShowConfirmRemoveDivisionModal(true);
                }}
                className="bg-red-600 hover:bg-red-500 text-white px-4 py-2 rounded text-sm"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Deletion Modal */}
      {showConfirmRemoveDivisionModal && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50">
          <div className="bg-gray-900 rounded-xl shadow-xl p-6 w-96 border border-gray-700">
            <h2 className="text-lg font-bold text-red-400 mb-4 text-center">Confirm Deletion</h2>
            <p className="text-gray-300 mb-4 text-center">Are you sure you want to permanently delete the selected division and all its players and matches? This action cannot be undone.</p>

            <div className="flex justify-between mt-5">
              <button
                onClick={() => {
                  setShowConfirmRemoveDivisionModal(false);
                  setShowSelectDivisionModal(true);
                }}
                className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded text-sm"
              >
                Cancel
              </button>

              <button
                onClick={() => {
                  setShowConfirmRemoveDivisionModal(false);
                  handleConfirmRemoveDivision();
                }}
                className="bg-red-700 hover:bg-red-600 text-white px-4 py-2 rounded text-sm"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Remove Player Passcode Modal */}
      {showRemovePlayerModal && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50">
          <div className="bg-gray-900 rounded-xl shadow-xl p-6 w-80 border border-gray-700">
            <h2 className="text-lg font-bold text-red-400 mb-4 text-center">
              Remove Player
            </h2>
            <p className="text-gray-300 mb-2 text-center text-sm">
              Remove <span className="font-semibold">{selectedPlayerToRemove?.name}</span>?
            </p>
            <p className="text-gray-400 mb-4 text-center text-xs">
              Enter the admin passcode to confirm.
            </p>

            <input
              type="password"
              value={removePlayerPasscode}
              onChange={(e) => {
                setRemovePlayerPasscode(e.target.value);
                setRemovePlayerPasscodeError("");
              }}
              placeholder="Enter passcode"
              className="w-full px-3 py-2 rounded bg-gray-800 text-white border border-gray-600 focus:outline-none focus:border-red-400"
            />

            {removePlayerPasscodeError && (
              <p className="text-red-400 text-sm mt-2 text-center">
                {removePlayerPasscodeError}
              </p>
            )}

            <div className="flex justify-between mt-5">
              <button
                onClick={() => {
                  setShowRemovePlayerModal(false);
                  setRemovePlayerPasscode("");
                  setRemovePlayerPasscodeError("");
                  setSelectedPlayerToRemove(null);
                }}
                className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded text-sm"
              >
                Cancel
              </button>

              <button
                onClick={verifyRemovePlayerPasscode}
                className="bg-red-600 hover:bg-red-500 text-white px-4 py-2 rounded text-sm"
              >
                Remove
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Match Passcode Modal */}
      {showAddMatchPasscodeModal && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50">
          <div className="bg-gray-900 rounded-xl shadow-xl p-6 w-80 border border-gray-700">
            <h2 className="text-lg font-bold text-blue-400 mb-4 text-center">
              Add Match
            </h2>
            <p className="text-gray-300 mb-4 text-center text-sm">
              Enter the admin passcode to add a match.
            </p>

            <input
              type="password"
              value={addMatchPasscode}
              onChange={(e) => {
                setAddMatchPasscode(e.target.value);
                setAddMatchPasscodeError("");
              }}
              placeholder="Enter passcode"
              className="w-full px-3 py-2 rounded bg-gray-800 text-white border border-gray-600 focus:outline-none focus:border-blue-400"
            />

            {addMatchPasscodeError && (
              <p className="text-red-400 text-sm mt-2 text-center">
                {addMatchPasscodeError}
              </p>
            )}

            <div className="flex justify-between mt-5">
              <button
                onClick={() => {
                  setShowAddMatchPasscodeModal(false);
                  setAddMatchPasscode("");
                  setAddMatchPasscodeError("");
                }}
                className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded text-sm"
              >
                Cancel
              </button>

              <button
                onClick={verifyAddMatchPasscode}
                className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded text-sm"
              >
                Continue
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Match Modal */}
      {showAddMatchModal && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 rounded-xl shadow-xl p-6 w-full max-w-2xl border border-gray-700 max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold text-blue-400 mb-4">➕ Add Match</h2>

            {/* Date */}
            <div className="mb-4">
              <label className="text-gray-300 text-sm block mb-1">Match Date</label>
              <input
                type="date"
                value={addMatchData.date}
                onChange={(e) => setAddMatchData({ ...addMatchData, date: e.target.value })}
                className="w-full px-3 py-2 rounded bg-gray-800 text-white border border-gray-600 focus:outline-none focus:border-blue-400"
              />
            </div>

            {/* Court Selection */}
            <div className="mb-4">
              <label className="text-gray-300 text-sm block mb-1">Court</label>
              <select
                value={addMatchData.court}
                onChange={(e) => setAddMatchData({ ...addMatchData, court: e.target.value })}
                className="w-full px-3 py-2 rounded bg-gray-800 text-white border border-gray-600 focus:outline-none focus:border-blue-400"
              >
                <option value="court1">Court 1</option>
                <option value="court2">Court 2</option>
              </select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              {/* Team 1 */}
              <div>
                <label className="text-gray-300 text-sm block mb-1">Team 1 Players</label>
                <div className="bg-gray-800 p-2 rounded border border-gray-600 max-h-48 overflow-y-auto">
                  {allDivisionPlayers.map((p) => (
                    <label key={p.id} className="flex items-center text-gray-300 mb-2">
                      <input
                        type="checkbox"
                        checked={addMatchData.team1Players.some(tp => String(tp.id) === String(p.id))}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setAddMatchData({
                              ...addMatchData,
                              team1Players: [...addMatchData.team1Players, p],
                            });
                          } else {
                            setAddMatchData({
                              ...addMatchData,
                              team1Players: addMatchData.team1Players.filter(tp => tp.id !== p.id),
                            });
                          }
                        }}
                        className="mr-2"
                      />
                      {p.name}
                    </label>
                  ))}
                </div>
                <p className="text-xs text-gray-400 mt-1">
                  Selected: {addMatchData.team1Players.length === 2 ? "✓" : `${addMatchData.team1Players.length}/2`}
                </p>
              </div>

              {/* Team 2 */}
              <div>
                <label className="text-gray-300 text-sm block mb-1">Team 2 Players</label>
                <div className="bg-gray-800 p-2 rounded border border-gray-600 max-h-48 overflow-y-auto">
                  {allDivisionPlayers.map((p) => (
                    <label key={p.id} className="flex items-center text-gray-300 mb-2">
                      <input
                        type="checkbox"
                        checked={addMatchData.team2Players.some(tp => String(tp.id) === String(p.id))}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setAddMatchData({
                              ...addMatchData,
                              team2Players: [...addMatchData.team2Players, p],
                            });
                          } else {
                            setAddMatchData({
                              ...addMatchData,
                              team2Players: addMatchData.team2Players.filter(tp => tp.id !== p.id),
                            });
                          }
                        }}
                        className="mr-2"
                      />
                      {p.name}
                    </label>
                  ))}
                </div>
                <p className="text-xs text-gray-400 mt-1">
                  Selected: {addMatchData.team2Players.length === 2 ? "✓" : `${addMatchData.team2Players.length}/2`}
                </p>
              </div>
            </div>

            {/* Scores */}
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="text-gray-300 text-sm block mb-1">Team 1 Score</label>
                <input
                  type="number"
                  min="0"
                  value={addMatchData.team1Score}
                  onChange={(e) => setAddMatchData({ ...addMatchData, team1Score: e.target.value })}
                  placeholder="0"
                  className="w-full px-3 py-2 rounded bg-gray-800 text-white border border-gray-600 focus:outline-none focus:border-blue-400"
                />
              </div>
              <div>
                <label className="text-gray-300 text-sm block mb-1">Team 2 Score</label>
                <input
                  type="number"
                  min="0"
                  value={addMatchData.team2Score}
                  onChange={(e) => setAddMatchData({ ...addMatchData, team2Score: e.target.value })}
                  placeholder="0"
                  className="w-full px-3 py-2 rounded bg-gray-800 text-white border border-gray-600 focus:outline-none focus:border-blue-400"
                />
              </div>
            </div>

            {addMatchError && (
              <p className="text-red-400 text-sm mb-4 text-center">
                {addMatchError}
              </p>
            )}

            <div className="flex justify-between gap-2">
              <button
                onClick={() => {
                  setShowAddMatchModal(false);
                  setAddMatchPasscode("");
                  setAddMatchError("");
                }}
                className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded text-sm flex-1"
              >
                Cancel
              </button>

              <button
                onClick={addMatch}
                className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded text-sm flex-1"
              >
                Add Match
              </button>
            </div>
          </div>
        </div>
      )}

      </>)}

    </main>
  );
}