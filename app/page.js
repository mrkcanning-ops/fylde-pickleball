"use client";

import { useState, useEffect, useLayoutEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/AuthContext";
import { HybridStorage } from "@/lib/HybridStorage";
import HeaderStats from "@/components/HeaderStats";
import { supabase } from "@/lib/supabase";
import PreviousMatchesClient from "./previous-matches/PreviousMatchesClient";
import { getLSRaw, getLSJson, setLSRaw, setLSJson, removeLS, getViewMode, setUserType } from "@/lib/ls";
import { generate5PlayerChampMatches, generateRoundRobinMatches, generatePartnerPracticeMatches } from "../lib/matchGenerator";
import { generatePartnerPracticeRandom, generatePartnerPracticeGenderDoubles, generatePartnerPracticeGenderMixed } from "../lib/matchGeneratorPartnerPractice";
// PreviousSeasonsClient intentionally not imported — Previous Seasons tab shows a simple message

// Minimum games required to qualify for ranked positions. Configure via env var
// NEXT_PUBLIC_MIN_QUALIFY_GAMES (build-time). Defaults to 10.
const MIN_QUALIFY_GAMES = parseInt(process.env.NEXT_PUBLIC_MIN_QUALIFY_GAMES ?? "10", 10) || 10;

export default function HomePage() {
  const router = useRouter();
  const { user, userType, isLoading, logout } = useAuth();

  // ===== ALL STATE DECLARATIONS MUST COME FIRST (BEFORE ANY useEffect, BEFORE ANY CONDITIONAL RETURNS) =====
  const [activeTab, setActiveTab] = useState("Standings");
  const [standingsView, setStandingsView] = useState("Leaderboard");
  const [division, setDivision] = useState(1);
  const [divisions, setDivisions] = useState([]);
  const [showAddDivisionModal, setShowAddDivisionModal] = useState(false);
  const [newDivisionName, setNewDivisionName] = useState("");
  const [showSelectDivisionModal, setShowSelectDivisionModal] = useState(false);
  const [selectedDivisionToRemove, setSelectedDivisionToRemove] = useState(null);
  const [showConfirmRemoveDivisionModal, setShowConfirmRemoveDivisionModal] = useState(false);
  const [players, setPlayers] = useState([]);
  const [numCourts, setNumCourts] = useState(2);
  const [court1Matches, setCourt1Matches] = useState([]);
  const [court2Matches, setCourt2Matches] = useState([]);
  const [court3Matches, setCourt3Matches] = useState([]);
  const [court4Matches, setCourt4Matches] = useState([]);
  const [court5Matches, setCourt5Matches] = useState([]);
  const [court6Matches, setCourt6Matches] = useState([]);
  const [court1Scores, setCourt1Scores] = useState([]);
  const [court2Scores, setCourt2Scores] = useState([]);
  const [court3Scores, setCourt3Scores] = useState([]);
  const [court4Scores, setCourt4Scores] = useState([]);
  const [court5Scores, setCourt5Scores] = useState([]);
  const [court6Scores, setCourt6Scores] = useState([]);
  const [court1Round, setCourt1Round] = useState(0);
  const [court2Round, setCourt2Round] = useState(0);
  const [court3Round, setCourt3Round] = useState(0);
  const [court4Round, setCourt4Round] = useState(0);
  const [court5Round, setCourt5Round] = useState(0);
  const [court6Round, setCourt6Round] = useState(0);
  const [currentRound, setCurrentRound] = useState(0);
  const [roundMatches, setRoundMatches] = useState([]);
  const [showNqModalFor, setShowNqModalFor] = useState(null);
  const [minQualifyByDivision, setMinQualifyByDivision] = useState({});
  const [minQualifyGames, setMinQualifyGames] = useState(MIN_QUALIFY_GAMES);
  const [showEditMinModal, setShowEditMinModal] = useState(false);
  const [minQualifyInput, setMinQualifyInput] = useState(String(MIN_QUALIFY_GAMES));
  const [pendingMinSave, setPendingMinSave] = useState(null);
  const [previousMatches, setPreviousMatches] = useState([]);
  const [currentSeason, setCurrentSeason] = useState(null);
  const [seasonSummariesList, setSeasonSummariesList] = useState([]);
  const [selectedSeasonSummaryId, setSelectedSeasonSummaryId] = useState(null);
  const [viewMode, setViewMode] = useState('league');
  const [hydrated, setHydrated] = useState(false);
  const [serverError, setServerError] = useState(null);
  const [leaderboard, setLeaderboard] = useState([]);
  const [allDivisionPlayers, setAllDivisionPlayers] = useState([]);
  const [openDates, setOpenDates] = useState([]);
  const [showRecalculateModal, setShowRecalculateModal] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [showEndSeasonChoiceModal, setShowEndSeasonChoiceModal] = useState(false);
  const [endSummaryContext, setEndSummaryContext] = useState(null);
  const [newSeasonName, setNewSeasonName] = useState("");
  const [showSelectPlayerModal, setShowSelectPlayerModal] = useState(false);
  const [selectedPlayerToRemove, setSelectedPlayerToRemove] = useState(null);
  const [showRemovePlayerModal, setShowRemovePlayerModal] = useState(false);
  const [showAddPlayerModal, setShowAddPlayerModal] = useState(false);
  const [newPlayerName, setNewPlayerName] = useState("");
  const [newPlayerGender, setNewPlayerGender] = useState(null);
  const [showAddMatchModal, setShowAddMatchModal] = useState(false);
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
  const [addMatchError, setAddMatchError] = useState("");

  const [pendingEditMatch, setPendingEditMatch] = useState(null);
  const [showEditMatchModal, setShowEditMatchModal] = useState(false);
  const [editMatchData, setEditMatchData] = useState({
    date: new Date().toISOString().split('T')[0],
    team1Players: [],
    team2Players: [],
    team1Score: "",
    team2Score: "",
    court: "court1",
  });
  const [editingMatchId, setEditingMatchId] = useState(null);
  const [editMatchError, setEditMatchError] = useState("");
  const [genderFilterMode, setGenderFilterMode] = useState('random'); // 'random', 'gender-doubles', or 'gender-mixed'
  const [showEnterScore, setShowEnterScore] = useState(false); // Toggle score input visibility in Partner Practice

  // ===== NOW useEffect hooks and conditional logic CAN come after all state declarations =====

  // Redirect to welcome if not authenticated
  useEffect(() => {
    if (!isLoading && (!user || !userType)) {
      router.push('/welcome');
    }
  }, [user, userType, isLoading, router]);

  // Set user type in localStorage utilities for data isolation
  useEffect(() => {
    if (userType) {
      setUserType(userType);
    }
  }, [userType]);

  // Initialize hybrid storage for club members (database + localStorage) or guests (localStorage only)
  const storage = typeof window !== 'undefined' && user && userType 
    ? new HybridStorage(userType, user.id)
    : null;

  // Load data based on user type (guests stay blank, club members load from database)
  useEffect(() => {
    if (!userType) return;

    if (userType === 'guest') {
      // Guests: Keep everything blank, no data loading
      setCurrentSeason(null);
      setDivisions([]);
      setPlayers([]);
      setDivision(1);
      setPreviousMatches([]);
      setLeaderboard([]);
      setAllDivisionPlayers([]);
      setMinQualifyByDivision({});
      setMinQualifyGames(MIN_QUALIFY_GAMES);
      setViewMode('league');
    } else if (userType === 'club-member' && storage) {
      // Club members: Load only from their database profile via HybridStorage
      const loadedSeason = storage.loadData('current_season', null);
      if (loadedSeason) setCurrentSeason(loadedSeason);

      const viewModeKey = 'view_mode';
      if (typeof window !== 'undefined') {
        const savedViewMode = localStorage.getItem(viewModeKey) || 'league';
        setViewMode(savedViewMode);
      }

      const loadedMinQualify = storage.loadData('min_qualify_by_division', {});
      if (loadedMinQualify) setMinQualifyByDivision(loadedMinQualify);

      const savedMinQualifyGames = typeof window !== 'undefined' ? localStorage.getItem('min_qualify_games') : null;
      if (savedMinQualifyGames) {
        setMinQualifyGames(parseInt(savedMinQualifyGames, 10) || MIN_QUALIFY_GAMES);
      }
    }
  }, [userType]);

  /**
   * Save data with hybrid storage for club members
   * For critical data (current_season, divisions), also syncs to database for club members
   */
  const saveData = (key, data) => {
    setLSJson(key, data);
    
    // Sync to database for club members if this is critical data
    const isCriticalKey = key === 'current_season' || key.startsWith('divisions_');
    if (storage && isCriticalKey) {
      storage.saveData(key, data);
    }
  };

  /**
   * Load data with hybrid storage preference for club members
   */
  const loadData = (key, fallback = null) => {
    if (storage) {
      return storage.loadData(key, fallback);
    }
    return getLSJson(key, fallback);
  };

  // Quick hydration marker: allow client UI to render after mount
  useEffect(() => {
    setHydrated(true);
  }, []);

  // Load divisions and players on mount for club members
  useEffect(() => {
    if (userType === 'club-member' && !isLoading) {
      syncDivisions();
    }
  }, [userType, isLoading]);

  // Sync allDivisionPlayers to players display state when allDivisionPlayers changes
  useEffect(() => {
    if (allDivisionPlayers && allDivisionPlayers.length > 0) {
      setPlayers(allDivisionPlayers);
    }
  }, [allDivisionPlayers]);

  // Clear players when divisions is empty (no divisions created for this game mode yet)
  useEffect(() => {
    if (divisions && divisions.length === 0) {
      setPlayers([]);
      setAllDivisionPlayers([]);
    }
  }, [divisions]);

  // Force literal suffix constants and a local `db` helper so
  // client code can pick the correct table based on `viewMode`.
  const DOUBLES_SUFFIX = "_doubles";
  const FIVE_CHAMP_SUFFIX = "_5champ";
  const ROUND_ROBIN_SUFFIX = "_roundrobin";
  const PARTNER_PRACTICE_SUFFIX = "_partner_practice";
  const getTableSuffix = (mode) => {
    if (mode === "doubles") return DOUBLES_SUFFIX;
    if (mode === "5-player-champ") return FIVE_CHAMP_SUFFIX;
    if (mode === "round-robin") return ROUND_ROBIN_SUFFIX;
    if (mode === "partner-practice") return PARTNER_PRACTICE_SUFFIX;
    return "";
  };
  const db = (table) => supabase.from(`${table}${getTableSuffix(viewMode)}`);

  // Try to load running season from Supabase for this division (fallback to localStorage)
  const loadRunningSeasonFromDb = async (divisionNum = division) => {
    if (!supabase) return;
    try {
      const { data, error } = await db("running_seasons")
        .select("*")
        .eq("division", divisionNum)
        .limit(1)
        .maybeSingle();

      if (!error && data) {
        try {
          saveData("current_season", data);
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
    // Load season summaries when Testing tab is active
    const fetchSummariesFromDb = async (vm = null) => {
      try {
        const viewParam = (vm || (() => { try { return getViewMode(); } catch (e) { return 'singles'; } })()) === 'doubles' ? 'doubles' : 'singles';
        const res = await fetch(`/api/season-summaries?division=${division}&view=${viewParam}`, { cache: 'no-store' });
        const payload = await res.json().catch(() => ({}));

        if (!res.ok || payload.error) {
          console.error('Season summaries API error:', payload?.error || 'unknown');
          setSeasonSummariesList([]);
          setSelectedSeasonSummaryId(null);
          setServerError('Failed to load season summaries from server.');
          return;
        }

        const data = Array.isArray(payload.data) ? payload.data : [];
        setSeasonSummariesList(data);
        setSelectedSeasonSummaryId(data[0]?.id || null);
        setServerError(null);
      } catch (e) {
        console.error('Failed to fetch season summaries from API:', e);
        setSeasonSummariesList([]);
        setSelectedSeasonSummaryId(null);
        setServerError('Failed to load season summaries.');
      }
    };

    if (activeTab === 'Seasons') {
      const vm = (() => { try { return getViewMode(); } catch (e) { return 'singles'; } })();
      fetchSummariesFromDb(vm);
    }

    // load running season for current division on mount and when division changes
    loadRunningSeasonFromDb(division);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [division, activeTab]);

  // Persist divisions and selected division to localStorage
  useEffect(() => {
    try {
      // Keep only selected division in localStorage (divisions are canonical in Supabase)
      setLSRaw("division", String(division));
    } catch (e) {
      console.warn("Failed to persist divisions:", e);
    }
  }, [divisions, division]);

  // Load previous matches when division changes
  useEffect(() => {
    if (userType === 'club-member' && divisions.length > 0) {
      fetchPreviousMatches();
      fetchPlayers(); // Also recalculate players with position changes
    }
  }, [division, userType, divisions.length]);

  // Show loading state while checking auth
  if (isLoading || !user || !userType) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900">
        <div className="text-xl text-gray-300">Loading...</div>
      </div>
    );
  }

  const resetLeaderboard = async () => {
    const confirmed = window.confirm("Are you sure you want to end the season and reset the leaderboard?");
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
        const idxKey = `season_summaries_index${getTableSuffix(viewMode)}`;
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

    // Guests can't recalculate standings
    if (userType === 'guest') return;

    // 1) Get players for current division only.
    let query = db("players")
      .select("*")
      .eq("division", division);
    
    // For club members, only fetch their own players
    if (userType === 'club-member' && user) {
      query = query.eq("owner_id", user.id);
    }
    
    const { data: players } = await query;

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
  // Guests don't update player stats
  if (userType === 'guest') return;

  let query = db("previous_matches").select("*");
  
  // For club members, only fetch their own matches
  if (userType === 'club-member' && user) {
    query = query.eq("owner_id", user.id);
  }
  
  const { data: matches } = await query.order("created_at", { ascending: true });

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
      const { data: player, error } = await db("players").select("*").eq("id", playerId).maybeSingle();

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
const fetchPreviousMatches = async () => {
  console.debug('[PreviousSeasons:page] fetchPreviousMatches start', { division, viewMode, supabase: !!supabase });
  // Try Supabase client first; if unavailable or returns error, fallback to server API
  if (supabase) {
    try {
      const { data, error } = await db("previous_matches")
        .select("*")
        .eq("division", division)
        .order("created_at", { ascending: false }); // Most recent first

      if (error) {
        console.error("Error fetching previous matches from supabase:", error);
      } else {
        console.debug('[PreviousSeasons:page] supabase previous_matches count:', Array.isArray(data) ? data.length : 'no-data', data && data[0]);
        setPreviousMatches(data || []);
        return;
      }
    } catch (e) {
      console.error('Supabase previous_matches fetch failed:', e);
    }
  }

  // Fallback to server-side API route (uses service key on server)
  try {
    const viewParam = viewMode === 'doubles' ? '&view=doubles' : '';
    console.debug('[PreviousSeasons:page] falling back to /api/previous-matches?division=' + division + viewParam);
    const res = await fetch(`/api/previous-matches?division=${division}${viewParam}`, { cache: 'no-store' });
    const payload = await res.json().catch(() => ({}));
    console.debug('[PreviousSeasons:page] /api/previous-matches response ok:', res.ok, 'payload keys:', Object.keys(payload || {}));
    if (res.ok && payload && Array.isArray(payload.data)) {
      console.debug('[PreviousSeasons:page] server returned previous_matches count:', payload.data.length, payload.data && payload.data[0]);
      setPreviousMatches(payload.data || []);
      return;
    }
    console.error('Previous matches API error:', payload?.error || 'unknown');
  } catch (e) {
    console.error('Failed to fetch previous matches from API:', e);
  }
};

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
          saveData("current_season", dbRec);
          setCurrentSeason(dbRec);
        }
      } catch (dbErr) {
        // ignore
      }

      if (!saved) {
        saveData("current_season", newSeason);
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
          saveData("current_season", dbRec);
          setCurrentSeason(dbRec);
        } else {
          saveData("current_season", running);
          setCurrentSeason(running);
        }
      } catch (e) {
        saveData("current_season", running);
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
      const aPoints = (a.points || 0);
      const bPoints = (b.points || 0);
      
      // 0. Players with GP > 0 always rank above players with GP = 0
      if (bHasPlayed !== aHasPlayed) return bHasPlayed - aHasPlayed;
      
      // Format-specific tie-breaker logic
      
      // Doubles/Points Difference mode
      if (viewMode === 'doubles') {
        if (bDiff !== aDiff) return bDiff - aDiff;
        if (bGP !== aGP) return bGP - aGP;
        return (a.name || "").localeCompare(b.name || "");
      }
      
      // 5 Player Champ or Round Robin mode
      if (viewMode === '5-player-champ' || viewMode === 'round-robin') {
        if (bPoints !== aPoints) return bPoints - aPoints;  // 1. Points (3 for win, 1 for draw)
        if (bGP !== aGP) return bGP - aGP;                   // 2. Games Played
        if (bDiff !== aDiff) return bDiff - aDiff;           // 3. Point Difference
        return (a.name || "").localeCompare(b.name || "");   // 4. Name
      }
      
      // League mode (default)
      if (bWinPct !== aWinPct) return bWinPct - aWinPct;      // 1. Win %
      if (bDiff !== aDiff) return bDiff - aDiff;             // 2. Point Difference
      if (bGP !== aGP) return bGP - aGP;                      // 3. Games Played
      return (a.name || "").localeCompare(b.name || "");     // 4. Name
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
      const aPoints = (a.points || 0);
      const bPoints = (b.points || 0);
      
      // Doubles/Points Difference mode
      if (viewMode === 'doubles') {
        if (bDiff !== aDiff) return bDiff - aDiff;
        if (bGP !== aGP) return bGP - aGP;
        return (a.name || "").localeCompare(b.name || "");
      }
      
      // 5 Player Champ or Round Robin mode
      if (viewMode === '5-player-champ' || viewMode === 'round-robin') {
        if (bPoints !== aPoints) return bPoints - aPoints;    // 1. Points
        if (bGP !== aGP) return bGP - aGP;                    // 2. Games Played
        if (bDiff !== aDiff) return bDiff - aDiff;            // 3. Point Difference
        return (a.name || "").localeCompare(b.name || "");    // 4. Name
      }
      
      // League mode (default)
      if (bWinPct !== aWinPct) return bWinPct - aWinPct;       // 1. Win %
      if (bDiff !== aDiff) return bDiff - aDiff;              // 2. Point Difference
      if (bGP !== aGP) return bGP - aGP;                       // 3. Games Played
      return (a.name || "").localeCompare(b.name || "");      // 4. Name
    });

    return [...eligible, ...ineligible];
  };

  const fetchPlayers = async () => {
    // Guests don't load players
    if (userType === 'guest') {
      setPlayers([]);
      return;
    }

    let query = db("players")
      .select("*")
      .eq("division", division); // filter by current division
    
    // For club members, only fetch their own players
    if (userType === 'club-member' && user) {
      query = query.eq("owner_id", user.id);
    }

    const { data, error } = await query;

    if (!error) {
      const processed = (data || []).map((p) => ({
        ...p,
        win_streak: p.win_streak || 0,
        improved: 0,
      }));

      // Build rank maps based on matches so we can compute position changes.
      let matchQuery = db("previous_matches")
        .select("players,scores,created_at,owner_id")
        .eq("division", division);
      
      // For club members, only fetch their own matches  
      if (userType === 'club-member' && user?.id) {
        matchQuery = matchQuery.eq("owner_id", user.id);
      }
      
      const { data: divisionMatches, error: matchesError } = await matchQuery.order("created_at", { ascending: true });

      const computeRankMapFromMatches = (matchesList) => {
        const running = {};
        processed.forEach((p) => {
          running[p.id] = { wins: 0, losses: 0, draws: 0, points: 0, points_for: 0, points_against: 0 };
        });

        for (const match of matchesList) {
          const playersArray = Array.isArray(match.players) ? match.players : JSON.parse(match.players || "[]");
          const team1 = playersArray.slice(0, 2);
          const team2 = playersArray.slice(2, 4);
          const score1 = Number(match.scores?.team1 || 0);
          const score2 = Number(match.scores?.team2 || 0);

          const apply = (playerId, scored, conceded, result) => {
            if (!running[playerId]) return;
            running[playerId].points_for += scored;
            running[playerId].points_against += conceded;
            if (result === "win") {
              running[playerId].wins += 1;
              running[playerId].points += 3;
            } else if (result === "loss") {
              running[playerId].losses += 1;
            } else {
              running[playerId].draws += 1;
              running[playerId].points += 1;
            }
          };

          if (score1 > score2) {
            team1.forEach((id) => apply(id, score1, score2, "win"));
            team2.forEach((id) => apply(id, score2, score1, "loss"));
          } else if (score1 < score2) {
            team1.forEach((id) => apply(id, score1, score2, "loss"));
            team2.forEach((id) => apply(id, score2, score1, "win"));
          } else {
            team1.forEach((id) => apply(id, score1, score2, "draw"));
            team2.forEach((id) => apply(id, score2, score1, "draw"));
          }
        }

        const ranked = sortPlayersByStats(
          processed.map((p) => ({ ...p, ...running[p.id] }))
        );
        const map = {};
        ranked.forEach((p, idx) => (map[p.id] = idx + 1));
        return map;
      };

      let prevPositions = {};

      if (!matchesError && Array.isArray(divisionMatches) && divisionMatches.length > 0) {
        const allMatches = divisionMatches.slice().sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
        
        // Get unique dates in order (most recent last)
        const uniqueDates = [...new Set(allMatches.map((m) => new Date(m.created_at).toISOString().split("T")[0]))];
        
        if (uniqueDates.length > 1) {
          // Compare current week (latest date) to previous week (second-latest date)
          const latestDate = uniqueDates[uniqueDates.length - 1];
          const previousDate = uniqueDates[uniqueDates.length - 2];
          
          // Get all matches up to but NOT including the latest date
          const matchesUpToPreviousWeek = allMatches.filter((m) => {
            const d = new Date(m.created_at).toISOString().split("T")[0];
            return d <= previousDate;
          });
          
          if (matchesUpToPreviousWeek.length > 0) {
            prevPositions = computeRankMapFromMatches(matchesUpToPreviousWeek);
          }
        } else if (uniqueDates.length === 1 && allMatches.length > 1) {
          // All matches on same date - use first half vs second half as "weeks"
          const midpoint = Math.floor(allMatches.length / 2);
          const matchesFirstHalf = allMatches.slice(0, midpoint);
          if (matchesFirstHalf.length > 0) {
            prevPositions = computeRankMapFromMatches(matchesFirstHalf);
          }
        }
        // If only one match or one date, prevPositions stays empty so change shows as "—"
      }

      // Sort using new criteria and calculate positionChange based on new positions (current = all matches)
      const sorted = sortPlayersByStats(processed);
      const withPositionChange = sorted.map((p, index) => ({
        ...p,
        positionChange: prevPositions[p.id] !== undefined ? prevPositions[p.id] - (index + 1) : 0,
      }));

      setPlayers(withPositionChange);
      return withPositionChange;
    }

    return [];
  };

  const toggleDivision = () => {
    if (!divisions || divisions.length === 0) return;
    // Cycle through available divisions defined in `divisions`
    const idx = divisions.findIndex((d) => d.id === division);
    const nextIdx = (idx + 1) % divisions.length;
    const newDivision = divisions[nextIdx].id;
    setDivision(newDivision);
    fetchAllDivisionPlayers(newDivision);
  };

  const prevDivision = () => {
    if (!divisions || divisions.length === 0) return;
    const idx = divisions.findIndex((d) => d.id === division);
    const prevIdx = (idx - 1 + divisions.length) % divisions.length;
    const newDivision = divisions[prevIdx].id;
    setDivision(newDivision);
    fetchAllDivisionPlayers(newDivision);
  };

  const fetchAllDivisionPlayers = async (divisionNum = division) => {
    // Guests don't load players
    if (userType === 'guest') {
      console.debug("fetchAllDivisionPlayers: guest user, returning empty");
      setAllDivisionPlayers([]);
      return;
    }

    let query = db("players")
      .select("*")
      .eq("division", divisionNum);
    
    // For club members, only load players owned by this user
    if (userType === 'club-member' && user) {
      query = query.eq("owner_id", user.id);
    }
    
    const { data, error } = await query.order("name", { ascending: true });

    if (!error) {
      setAllDivisionPlayers(data || []);
    }
  };

  const handleAddPlayer = () => {
    setNewPlayerName("");
    setNewPlayerGender(null);
    setShowAddPlayerModal(true);
  };

  const handleConfirmAddPlayer = async () => {
    if (!newPlayerName.trim()) {
      alert("Please enter a player name");
      return;
    }

    // Generate a unique ID for the player
    const playerId = typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;

    // For guests, skip database and use local-only storage
    if (userType === 'guest') {
      const newPlayer = { id: playerId, name: newPlayerName, wins: 0, draws: 0, losses: 0, points: 0, active: true, division, gender: newPlayerGender };
      setPlayers((prev) => [...prev, newPlayer]);
      try { saveData(`players_${viewMode}`, [...players, newPlayer]); } catch (e) {}
      setShowAddPlayerModal(false);
      return;
    }

    // Insert to database for club members
    const { data, error } = await db("players")
      .insert([{ id: playerId, name: newPlayerName, wins: 0, draws: 0, losses: 0, points: 0, active: true, division, owner_id: user?.id, gender: newPlayerGender }])
      .select();

    if (!error) {
      setPlayers((prev) => [...prev, data[0]]);
      setShowAddPlayerModal(false);
    } else {
      alert("Error adding player: " + (error?.message || "Unknown error"));
    }
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

  const updatePlayerPartner = async (playerId, partnerId) => {
    // Get the current player's existing partner (if any) before updating
    const currentPlayer = players.find((p) => String(p.id) === String(playerId));
    const previousPartnerId = currentPlayer?.partner_id;

    // Update the player's partner_id
    await db("players")
      .update({ partner_id: partnerId })
      .eq("id", playerId);

    // If we're removing a partnership, clear the previous partner's reference too
    if (!partnerId && previousPartnerId) {
      await db("players")
        .update({ partner_id: null })
        .eq("id", previousPartnerId);
    }

    // If we're setting a new partnership, update the partner's partner_id bidirectionally
    if (partnerId) {
      await db("players")
        .update({ partner_id: playerId })
        .eq("id", partnerId);
    }

    // Update local state
    setPlayers((prev) =>
      prev.map((p) => {
        if (String(p.id) === String(playerId)) {
          return { ...p, partner_id: partnerId };
        }
        if (previousPartnerId && String(p.id) === String(previousPartnerId)) {
          return { ...p, partner_id: null };
        }
        if (partnerId && String(p.id) === String(partnerId)) {
          return { ...p, partner_id: playerId };
        }
        return p;
      })
    );
  };

  const clearAllPartnerships = async () => {
    const confirmed = window.confirm("Are you sure you want to remove all partnerships? This will reset all partner assignments.");
    if (!confirmed) return;

    try {
      // Clear all partnerships in database
      await db("players")
        .update({ partner_id: null })
        .neq("partner_id", null);

      // Update local state
      setPlayers((prev) =>
        prev.map((p) => ({ ...p, partner_id: null }))
      );
    } catch (e) {
      console.error("Error clearing partnerships:", e);
      alert("Error clearing partnerships. See console.");
    }
  };

  const updatePlayerGender = async (playerId, gender) => {
    // Update the player's gender
    await db("players")
      .update({ gender })
      .eq("id", playerId);

    // Update local state
    setPlayers((prev) =>
      prev.map((p) =>
        String(p.id) === String(playerId) ? { ...p, gender } : p
      )
    );
  };

  const advanceAllRounds = () => {
    setCourt1Round(prev => Math.min(prev + 1, court1Matches.length - 1));
    setCourt2Round(prev => Math.min(prev + 1, court2Matches.length - 1));
    if (numCourts >= 3) setCourt3Round(prev => Math.min(prev + 1, court3Matches.length - 1));
    if (numCourts >= 4) setCourt4Round(prev => Math.min(prev + 1, court4Matches.length - 1));
    if (numCourts >= 5) setCourt5Round(prev => Math.min(prev + 1, court5Matches.length - 1));
    if (numCourts >= 6) setCourt6Round(prev => Math.min(prev + 1, court6Matches.length - 1));
  };

  const rewindAllRounds = () => {
    setCourt1Round(prev => Math.max(prev - 1, 0));
    setCourt2Round(prev => Math.max(prev - 1, 0));
    if (numCourts >= 3) setCourt3Round(prev => Math.max(prev - 1, 0));
    if (numCourts >= 4) setCourt4Round(prev => Math.max(prev - 1, 0));
    if (numCourts >= 5) setCourt5Round(prev => Math.max(prev - 1, 0));
    if (numCourts >= 6) setCourt6Round(prev => Math.max(prev - 1, 0));
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
  renderCustom: () => {
    if (divisions.length === 0) {
      return (
        <div className="w-full select-none">
          <div className="flex items-center justify-center px-2">
            <span className="text-center text-gray-300 text-sm">
              No divisions yet. Create one to get started!
            </span>
          </div>
          <div className="flex items-center gap-3 mt-3 justify-center">
            <button
              onClick={() => confirmAddDivision()}
              className="bg-blue-600 text-white px-4 py-2 rounded text-sm border border-blue-700 hover:bg-blue-700"
            >
              ➕ Add Division
            </button>
          </div>
        </div>
      );
    }
    return (
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
            onClick={() => confirmAddDivision()}
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
            onClick={() => confirmRemoveDivision()}
            className="bg-red-600 text-white px-4 py-2 rounded text-sm border border-red-700 hover:bg-red-700"
          >
            🗑 Remove
          </button>
        </div>
      </div>
    );
  },
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

  const tabs = ["Standings", "Matches", "Players", "Previous Matches", "Seasons"];

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

  const savePendingFixtures = async (nextCourt1Matches, nextCourt2Matches, nextCourt1Scores, nextCourt2Scores, nextRoundMatches, nextCourt3Matches = [], nextCourt4Matches = [], nextCourt3Scores = [], nextCourt4Scores = []) => {
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
      court3_matches: (nextCourt3Matches || []).map((match) =>
        (match || []).map((team) => (team || []).map((p) => p.id))
      ),
      court4_matches: (nextCourt4Matches || []).map((match) =>
        (match || []).map((team) => (team || []).map((p) => p.id))
      ),
      court1_scores: nextCourt1Scores || [],
      court2_scores: nextCourt2Scores || [],
      court3_scores: nextCourt3Scores || [],
      court4_scores: nextCourt4Scores || [],
      court1_byes: (nextRoundMatches?.court1 || []).map((round) => (round || []).map((p) => p.id)),
      court2_byes: (nextRoundMatches?.court2 || []).map((round) => (round || []).map((p) => p.id)),
      court3_byes: (nextRoundMatches?.court3 || []).map((round) => (round || []).map((p) => p.id)),
      court4_byes: (nextRoundMatches?.court4 || []).map((round) => (round || []).map((p) => p.id)),
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

    const mappedCourt3Matches = (pendingObj.court3_matches || []).map((match) => [
      (match[0] || []).map(findPlayer),
      (match[1] || []).map(findPlayer),
    ]);

    const mappedCourt4Matches = (pendingObj.court4_matches || []).map((match) => [
      (match[0] || []).map(findPlayer),
      (match[1] || []).map(findPlayer),
    ]);

    const mappedCourt1Byes = (pendingObj.court1_byes || []).map((round) => (round || []).map(findPlayer));
    const mappedCourt2Byes = (pendingObj.court2_byes || []).map((round) => (round || []).map(findPlayer));
    const mappedCourt3Byes = (pendingObj.court3_byes || []).map((round) => (round || []).map(findPlayer));
    const mappedCourt4Byes = (pendingObj.court4_byes || []).map((round) => (round || []).map(findPlayer));

    setCourt1Matches(mappedCourt1Matches);
    setCourt2Matches(mappedCourt2Matches);
    setCourt3Matches(mappedCourt3Matches);
    setCourt4Matches(mappedCourt4Matches);
    setCourt1Scores(pending.court1_scores || mappedCourt1Matches.map(() => ({ team1: "", team2: "" })));
    setCourt2Scores(pending.court2_scores || mappedCourt2Matches.map(() => ({ team1: "", team2: "" })));
    setCourt3Scores(pending.court3_scores || mappedCourt3Matches.map(() => ({ team1: "", team2: "" })));
    setCourt4Scores(pending.court4_scores || mappedCourt4Matches.map(() => ({ team1: "", team2: "" })));
    setRoundMatches({ court1: mappedCourt1Byes, court2: mappedCourt2Byes, court3: mappedCourt3Byes, court4: mappedCourt4Byes });
    setCourt1Round(0);
    setCourt2Round(0);
    setCourt3Round(0);
    setCourt4Round(0);
  };

 const generateMatches = async () => {
  let available = sortPlayersByStats(
    players.filter((p) => p.active)
  );

  if (available.length < 4) {
    alert("At least 4 active players required.");
    return;
  }

  // If gender-filtered mode, use appropriate game generator based on genderFilterMode
  if (genderFilterMode === 'gender-doubles' || genderFilterMode === 'gender-mixed') {
    const males = available.filter(p => p.gender === 'male');
    const females = available.filter(p => p.gender === 'female');
    
    // Gender Doubles: need at least 4 of one gender OR 4 total with fallback
    if (genderFilterMode === 'gender-doubles') {
      if (available.length < 4) {
        alert("At least 4 active players required.");
        return;
      }
    }
    
    // Gender Mixed: need at least 2 males and 2 females
    if (genderFilterMode === 'gender-mixed') {
      if (males.length < 2 || females.length < 2) {
        alert(`❌ Gender Mixed Error: Requires at least 2 males and 2 females.\n\nCurrent:\n♂ Males: ${males.length}\n♀ Females: ${females.length}`);
        return;
      }
    }
  }

  // Standard mixed-gender matching continues below...
  // Special handling for 5-player championship format: 15 games with all partnerships
  if (viewMode === "5-player-champ") {
    if (available.length !== 5) {
      alert(`❌ 5 Player Champ Error: Requires exactly 5 active players.\n\nYou currently have ${available.length} active player${available.length !== 1 ? 's' : ''}.\n\nPlease adjust the number of active players to exactly 5 before generating matches.`);
      return;
    }
    
    const { matches, error } = generate5PlayerChampMatches(available);
    
    if (error) {
      alert(error);
      return;
    }

    // Convert to court format (all 15 games on court 1)
    const court1Matches = matches.map((game) => [game.teamA, game.teamB]);
    const court1Scores = matches.map(() => ({ team1: "", team2: "" }));
    
    setCourt1Matches(court1Matches);
    setCourt1Scores(court1Scores);
    setCourt1Round(0);
    
    setCourt2Matches([]);
    setCourt2Scores([]);
    setCourt2Round(0);
    
    setCourt3Matches([]);
    setCourt3Scores([]);
    setCourt3Round(0);
    
    setCourt4Matches([]);
    setCourt4Scores([]);
    setCourt4Round(0);
    
    // Save to pending fixtures
    const payload = {
      division,
      court1_matches: court1Matches.map((match) => [
        match[0].map((p) => p.id),
        match[1].map((p) => p.id),
      ]),
      court1_scores: court1Scores,
      court1_byes: [],
      court2_matches: [],
      court2_scores: [],
      court2_byes: [],
      status: "generated",
    };

    const { error: saveError } = await db("pending_fixtures").upsert(payload, { onConflict: "division" });
    
    if (saveError) {
      console.warn("Could not save 5-player fixtures to database:", saveError);
      // Still allow local play even if save fails
    }
    
    return;
  }

  // Special handling for round-robin format: all partnerships with fair distribution
  if (viewMode === "round-robin") {
    if (available.length < 4) {
      alert(`❌ Round Robin Error: Requires at least 4 active players.\n\nYou currently have ${available.length} active player${available.length !== 1 ? 's' : ''}.\n\nPlease add more active players before generating matches.`);
      return;
    }

    const { courtMatches, error } = generateRoundRobinMatches(available, numCourts);

    if (error) {
      alert(error);
      return;
    }

    // Set court 1 matches
    if (courtMatches[0]) {
      setCourt1Matches(courtMatches[0]);
      setCourt1Scores(courtMatches[0].map(() => ({ team1: "", team2: "" })));
      setCourt1Round(0);
    }

    // Set court 2 matches
    if (courtMatches[1]) {
      setCourt2Matches(courtMatches[1]);
      setCourt2Scores(courtMatches[1].map(() => ({ team1: "", team2: "" })));
      setCourt2Round(0);
    }

    // Set court 3 matches
    if (courtMatches[2]) {
      setCourt3Matches(courtMatches[2]);
      setCourt3Scores(courtMatches[2].map(() => ({ team1: "", team2: "" })));
      setCourt3Round(0);
    }

    // Set court 4 matches
    if (courtMatches[3]) {
      setCourt4Matches(courtMatches[3]);
      setCourt4Scores(courtMatches[3].map(() => ({ team1: "", team2: "" })));
      setCourt4Round(0);
    }

    // Save to pending fixtures
    const payload = {
      division,
      court1_matches: (courtMatches[0] || []).map((match) => [
        match[0].map((p) => p.id),
        match[1].map((p) => p.id),
      ]),
      court1_scores: (courtMatches[0] || []).map(() => ({ team1: "", team2: "" })),
      court1_byes: [],
      court2_matches: (courtMatches[1] || []).map((match) => [
        match[0].map((p) => p.id),
        match[1].map((p) => p.id),
      ]),
      court2_scores: (courtMatches[1] || []).map(() => ({ team1: "", team2: "" })),
      court2_byes: [],
      court3_matches: (courtMatches[2] || []).map((match) => [
        match[0].map((p) => p.id),
        match[1].map((p) => p.id),
      ]),
      court3_scores: (courtMatches[2] || []).map(() => ({ team1: "", team2: "" })),
      court3_byes: [],
      court4_matches: (courtMatches[3] || []).map((match) => [
        match[0].map((p) => p.id),
        match[1].map((p) => p.id),
      ]),
      court4_scores: (courtMatches[3] || []).map(() => ({ team1: "", team2: "" })),
      court4_byes: [],
      status: "generated",
    };

    const { error: saveError } = await db("pending_fixtures").upsert(payload, { onConflict: "division" });

    if (saveError) {
      console.warn("Could not save round-robin fixtures to database:", saveError);
      // Still allow local play even if save fails
    }

    return;
  }

  // Special handling for partner-practice format: designated partners play together
  if (viewMode === "partner-practice") {
    if (available.length < 4) {
      alert(`❌ Partner Practice Error: Requires at least 4 active players.\n\nYou currently have ${available.length} active player${available.length !== 1 ? 's' : ''}.\n\nPlease add more active players before generating matches.`);
      return;
    }

    try {
      // Select the appropriate match generator based on gameplay mode
      let result;
      
      if (genderFilterMode === 'random') {
        result = generatePartnerPracticeRandom(available, numCourts);
      } else if (genderFilterMode === 'gender-doubles') {
        result = generatePartnerPracticeGenderDoubles(available, numCourts);
      } else if (genderFilterMode === 'gender-mixed') {
        result = generatePartnerPracticeGenderMixed(available, numCourts);
      } else {
        // Fallback to random
        result = generatePartnerPracticeRandom(available, numCourts);
      }

      const { courtMatches, error } = result || {};

      if (error) {
        alert(error);
        return;
      }

      if (!courtMatches || !Array.isArray(courtMatches)) {
        console.error("Partner Practice: Invalid courtMatches return", result);
        alert("❌ Error generating matches. Please check the console for details.");
        return;
      }

      // Set court 1 matches
      if (courtMatches[0] && courtMatches[0].length > 0) {
        setCourt1Matches(courtMatches[0]);
        setCourt1Scores(courtMatches[0].map(() => ({ team1: "", team2: "" })));
        setCourt1Round(0);
      } else {
        setCourt1Matches([]);
        setCourt1Scores([]);
      }

      // Set court 2 matches
      if (courtMatches[1] && courtMatches[1].length > 0) {
        setCourt2Matches(courtMatches[1]);
        setCourt2Scores(courtMatches[1].map(() => ({ team1: "", team2: "" })));
        setCourt2Round(0);
      } else {
        setCourt2Matches([]);
        setCourt2Scores([]);
      }

      // Set court 3 matches
      if (courtMatches[2] && courtMatches[2].length > 0) {
        setCourt3Matches(courtMatches[2]);
        setCourt3Scores(courtMatches[2].map(() => ({ team1: "", team2: "" })));
        setCourt3Round(0);
      } else {
        setCourt3Matches([]);
        setCourt3Scores([]);
      }

      // Set court 4 matches
      if (courtMatches[3] && courtMatches[3].length > 0) {
        setCourt4Matches(courtMatches[3]);
        setCourt4Scores(courtMatches[3].map(() => ({ team1: "", team2: "" })));
        setCourt4Round(0);
      } else {
        setCourt4Matches([]);
        setCourt4Scores([]);
      }

      // Set court 5 matches
      if (courtMatches[4] && courtMatches[4].length > 0) {
        setCourt5Matches(courtMatches[4]);
        setCourt5Scores(courtMatches[4].map(() => ({ team1: "", team2: "" })));
        setCourt5Round(0);
      } else {
        setCourt5Matches([]);
        setCourt5Scores([]);
      }

      // Set court 6 matches
      if (courtMatches[5] && courtMatches[5].length > 0) {
        setCourt6Matches(courtMatches[5]);
        setCourt6Scores(courtMatches[5].map(() => ({ team1: "", team2: "" })));
        setCourt6Round(0);
      } else {
        setCourt6Matches([]);
        setCourt6Scores([]);
      }

      // Calculate total matches generated
      const totalMatches = courtMatches.reduce((sum, court) => sum + (court ? court.length : 0), 0);
      if (totalMatches === 0) {
        alert("⚠️ Warning: No matches were generated. Please check your player configuration and try again.");
        return;
      }

      // Save to pending fixtures
      const payload = {
        division,
        court1_matches: (courtMatches[0] || []).map((match) => [
          match[0].map((p) => p.id),
          match[1].map((p) => p.id),
        ]),
        court1_scores: (courtMatches[0] || []).map(() => ({ team1: "", team2: "" })),
        court1_byes: [],
        court2_matches: (courtMatches[1] || []).map((match) => [
          match[0].map((p) => p.id),
          match[1].map((p) => p.id),
        ]),
        court2_scores: (courtMatches[1] || []).map(() => ({ team1: "", team2: "" })),
        court2_byes: [],
        court3_matches: (courtMatches[2] || []).map((match) => [
          match[0].map((p) => p.id),
          match[1].map((p) => p.id),
        ]),
        court3_scores: (courtMatches[2] || []).map(() => ({ team1: "", team2: "" })),
        court3_byes: [],
        court4_matches: (courtMatches[3] || []).map((match) => [
          match[0].map((p) => p.id),
          match[1].map((p) => p.id),
        ]),
        court4_scores: (courtMatches[3] || []).map(() => ({ team1: "", team2: "" })),
        court4_byes: [],
        court5_matches: (courtMatches[4] || []).map((match) => [
          match[0].map((p) => p.id),
          match[1].map((p) => p.id),
        ]),
        court5_scores: (courtMatches[4] || []).map(() => ({ team1: "", team2: "" })),
        court5_byes: [],
        court6_matches: (courtMatches[5] || []).map((match) => [
          match[0].map((p) => p.id),
          match[1].map((p) => p.id),
        ]),
        court6_scores: (courtMatches[5] || []).map(() => ({ team1: "", team2: "" })),
        court6_byes: [],
        status: "generated",
      };

      const { error: saveError } = await db("pending_fixtures").upsert(payload, { onConflict: "division" });

      if (saveError) {
        console.warn("Could not save partner practice fixtures to database:", saveError);
        alert("✅ Matches generated locally! (Note: Could not sync to database)");
      } else {
        console.log(`✅ Generated ${totalMatches} Partner Practice matches`);
      }

      return;
    } catch (err) {
      console.error("Partner Practice generation error:", err);
      alert(`❌ Error: ${err?.message || String(err)}`);
      return;
    }
  }

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
    { court1: courts[0]?.byes || [], court2: courts[1]?.byes || [], court3: courts[2]?.byes || [], court4: courts[3]?.byes || [] },
    courts[2]?.matches || [],
    courts[3]?.matches || [],
    (courts[2]?.matches || []).map(() => ({ team1: "", team2: "" })),
    (courts[3]?.matches || []).map(() => ({ team1: "", team2: "" }))
  );
};

  // Helper function to get players who are resting (not playing) in the current round
  const getRestingPlayers = () => {
    const playersInMatches = new Set();
    
    // Get all match arrays for the current round
    const matchArrays = [
      { matches: court1Matches, round: court1Round },
      { matches: court2Matches, round: court2Round },
      { matches: court3Matches, round: court3Round },
      { matches: court4Matches, round: court4Round },
      { matches: court5Matches, round: court5Round },
      { matches: court6Matches, round: court6Round },
    ];
    
    // Collect all players currently in matches
    matchArrays.forEach(({ matches, round }) => {
      if (matches[round]) {
        const [team1, team2] = matches[round];
        if (team1) team1.forEach(p => playersInMatches.add(p.id));
        if (team2) team2.forEach(p => playersInMatches.add(p.id));
      }
    });
    
    // Return players who are not in any match
    return players.filter(p => !playersInMatches.has(p.id));
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
  } else if (court === "court5") {
    const newScores = [...court5Scores];
    if (!newScores[idx]) newScores[idx] = { team1: "", team2: "" };
    newScores[idx][team] = value;
    setCourt5Scores(newScores);
  } else if (court === "court6") {
    const newScores = [...court6Scores];
    if (!newScores[idx]) newScores[idx] = { team1: "", team2: "" };
    newScores[idx][team] = value;
    setCourt6Scores(newScores);
  }
};

const saveMatches = async () => {
  try {
    // Helper to format matches for saving
    const formatMatches = (matches, scores, court, roundNum) => {
      return matches.map((m, idx) => {
        const row = {
          division,
          // Use player IDs instead of names
          players: m.flat().map((p) => p.id),
          scores: scores[idx],
          round: roundNum, // Save the round number
        };

        // Only include `court` for league mode —
        // `previous_matches_doubles` and `previous_matches_5champ` schemas do not have a `court` column.
        if (viewMode === "league") {
          row.court = court;
        }

        // `previous_matches_doubles` and `previous_matches_5champ` require a text `id` primary key.
        // Generate one when not in league mode so inserts do not fail.
        if (viewMode !== "league") {
          try {
            row.id = typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
          } catch (e) {
            row.id = `${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
          }
        }

        return row;
      });
    };

    const court1Data = formatMatches(court1Matches, court1Scores, "court1", court1Round);
    const court2Data = formatMatches(court2Matches, court2Scores, "court2", court2Round);
    const court3Data = formatMatches(court3Matches, court3Scores, "court3", court3Round);
    const court4Data = formatMatches(court4Matches, court4Scores, "court4", court4Round);

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

const confirmAddMatch = async () => {
  if (window.confirm("Are you sure you want to add a match?")) {
    await fetchAllDivisionPlayers();
    setShowAddMatchModal(true);
  }
};

const confirmAddDivision = () => {
  if (window.confirm("Are you sure you want to add a division?")) {
    setShowAddDivisionModal(true);
  }
};

const confirmRemoveDivision = () => {
  if (window.confirm("Are you sure you want to remove a division?")) {
    setShowSelectDivisionModal(true);
  }
};

const syncDivisions = async (vmOverride) => {
  try {
    // Guests don't load any divisions
    if (userType === 'guest') {
      console.debug("syncDivisions: guest user, skipping divisions load");
      return;
    }

    console.debug("syncDivisions: env url", process.env.NEXT_PUBLIC_SUPABASE_URL);
    console.debug("syncDivisions: anon key present", !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

    const vm = vmOverride || getViewMode();
    const tableName = `divisions${getTableSuffix(vm)}`;
      // If client-side Supabase is not configured, fall back to a REST fetch
      if (!supabase) {
        console.debug('syncDivisions: supabase client not configured on client, using REST fallback');
        try {
          const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
          if (!base) {
            setServerError('Missing Supabase URL (NEXT_PUBLIC_SUPABASE_URL)');
            return;
          }
          // For club members, only load divisions owned by this user
          const userIdFilter = user && userType === 'club-member' ? `&owner_id=eq.${user.id}` : '';
          const url = `${base.replace(/\/+$/,'')}/rest/v1/${tableName}?select=id,name,min_qualify_games,owner_id&order=id${userIdFilter}`;
          const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
          const resp = await fetch(url, {
            headers: {
              apikey: key,
              Authorization: `Bearer ${key}`,
              Accept: 'application/json'
            }
          });
          const json = await resp.json().catch(() => null);
          const dbDivs = Array.isArray(json) ? json : [];
          const error = resp.ok ? null : { message: `REST fetch failed ${resp.status}` };
          console.debug('syncDivisions: rest response', { dbDivs, error });
          var finalDbDivs = dbDivs;
          var finalError = error;
        } catch (restErr) {
          console.error('syncDivisions: REST fetch failed', restErr);
          setServerError(`Failed to fetch divisions: ${restErr?.message || restErr}`);
          return;
        }
      } else {
        let query = supabase.from(tableName)
          .select("id,name,min_qualify_games");
        
        // For club members, only load divisions owned by this user
        if (user && userType === 'club-member') {
          query = query.eq('owner_id', user.id);
        }
        
        const { data: dbDivs, error } = await query.order("id", { ascending: true });

        console.debug("syncDivisions: supabase response", { dbDivs, error });

        var finalDbDivs = dbDivs;
        var finalError = error;
      }

      // If missing column error, retry without column to recover older tables
      if (finalError && String(finalError?.code) === "42703") {
        let query = supabase.from(tableName).select("id,name");
        if (user && userType === 'club-member') {
          query = query.eq('owner_id', user.id);
        }
        const fallback = await query.order("id", { ascending: true });
        finalDbDivs = fallback.data;
        finalError = fallback.error;
      }

      if (finalError) {
        console.error("Failed to fetch divisions via supabase client:", finalError);
      // Try a direct REST fetch to help debug CORS/permission issues
      try {
        const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
        if (!base) {
          setServerError('Missing Supabase URL (NEXT_PUBLIC_SUPABASE_URL)');
          return;
        }
        const url = `${base.replace(/\/+$/,'')}/rest/v1/divisions`;
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

      // Guests or club members with no divisions - just return without error
      if (!Array.isArray(finalDbDivs) || finalDbDivs.length === 0) {
        if (userType === 'guest') {
          console.debug("syncDivisions: guest user has no divisions (expected)");
          setDivisions([
            { id: 1, name: "Division 1" },
            { id: 2, name: "Division 2" },
          ]);
          return;
        }
        console.debug("syncDivisions: no divisions yet (normal for new league)");
        setDivisions([]);
        return;
      }

      const mapped = finalDbDivs.map((d) => ({ id: d.id, name: d.name || `Division ${d.id}`, min_qualify_games: d.min_qualify_games }));
    console.debug("syncDivisions: setting divisions for vm=", vm, mapped);
                setDivisions(mapped);
                try { saveData(`divisions_${vm}`, mapped); } catch (e) {}
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
          try { saveData(`divisions_${viewMode}`, nextDivisions); } catch (e) {}
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

const confirmRemovePlayer = async () => {
  if (selectedPlayerToRemove) {
    const { error } = await db("players")
      .delete()
      .eq("id", selectedPlayerToRemove.id);
    
    if (!error) {
      setPlayers((prev) => prev.filter((p) => p.id !== selectedPlayerToRemove.id));
      setAllDivisionPlayers((prev) => prev.filter((p) => p.id !== selectedPlayerToRemove.id));
      alert(`${selectedPlayerToRemove.name} has been removed ✅`);
      setShowRemovePlayerModal(false);
      setSelectedPlayerToRemove(null);
    } else {
      alert("Error removing player");
    }
  }
};

const addDivision = async (name) => {
  const trimmed = (name || "").trim();
  if (!trimmed) return;

  try {
    // For guests, skip database and use local-only storage
    if (userType === 'guest') {
      const maxId = divisions.length ? Math.max(...divisions.map((d) => d.id)) : 0;
      const newId = maxId + 1;
      const localDiv = { id: newId, name: trimmed };
      setDivisions((prev) => [...prev, localDiv]);
      try { saveData(`divisions_${viewMode}`, [...divisions, localDiv]); } catch (e) {}
      setDivision(newId);
      await fetchAllDivisionPlayers(newId);
      setShowAddDivisionModal(false);
      setNewDivisionName("");
      return;
    }

    // Persist on server first (mode-aware table) for club members
    const { data, error } = await db("divisions")
      .insert([{ 
        name: trimmed,
        owner_id: user?.id 
      }])
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
      try { saveData(`divisions_${viewMode}`, [...divisions, newDiv]); } catch (e) {}
      setDivision(newDiv.id);
      await fetchAllDivisionPlayers(newDiv.id);
    } else {
      // Fallback to local-only addition if server didn't return an id
      const maxId = divisions.length ? Math.max(...divisions.map((d) => d.id)) : 0;
      const newId = maxId + 1;
      const localDiv = { id: newId, name: trimmed };
      setDivisions((prev) => [...prev, localDiv]);
      try { saveData(`divisions_${viewMode}`, [...divisions, localDiv]); } catch (e) {}
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
  await confirmEditMatch(match);
};

const confirmEditMatch = async (match) => {
  if (!window.confirm("Are you sure you want to edit this match?")) {
    return;
  }

  if (match) {
    await openEditMatchModal(match);
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

    await recalculateStandings();
    await fetchPlayers();
    await fetchPreviousMatches();
  } catch (err) {
    console.error("Unexpected error adding match:", err);
    setAddMatchError("Something went wrong");
  }
};

const handleRecalculateStandings = async () => {
  if (!window.confirm("Are you sure you want to recalculate standings? This may take a moment.")) {
    return;
  }

  try {
    await recalculateStandings();
    await fetchPlayers();
    await fetchPreviousMatches();
    setShowRecalculateModal(false);
    alert("Standings recalculated ✅");
  } catch (err) {
    console.error("Error recalculating standings:", err);
    alert("Failed to recalculate standings.");
  }
};

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
      
      {/* Header (click title to cycle through modes) */}
      <header className="mb-8 sm:mb-10 relative">
        <button
          onClick={async () => {
            let next;
            if (viewMode === "league") {
              next = "doubles";
            } else if (viewMode === "doubles") {
              next = "5-player-champ";
            } else if (viewMode === "5-player-champ") {
              next = "round-robin";
            } else if (viewMode === "round-robin") {
              next = "partner-practice";
            } else {
              next = "league";
            }
            try { setLSRaw("view_mode", next); } catch (e) {}
            setViewMode(next);
            console.debug("Header toggle: switched viewMode ->", next);
            
            // Guests don't load cached divisions - they stay blank
            if (userType !== 'guest') {
              try {
                // For club members, try to load from their storage
                const cachedDivs = storage ? storage.loadData(`divisions_${next}`, null) : getLSJson(`divisions_${next}`, null);
                if (Array.isArray(cachedDivs) && cachedDivs.length > 0) {
                  console.debug("Header toggle: applying cached divisions for", next, cachedDivs);
                  setDivisions(cachedDivs);
                  const sel = cachedDivs.find((d) => d.id === division) ? division : cachedDivs[0].id;
                  setDivision(sel);
                }
              } catch (e) {
                console.debug("Header toggle: no cached divisions or error", e);
              }
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
          aria-label="Cycle through game modes"
        >
          <h1 className="flex items-center text-2xl sm:text-4xl font-extrabold text-white tracking-tight">
            <span className="mr-3 text-yellow-400 text-3xl sm:text-4xl drop-shadow-md">
              {viewMode === "league" ? "🔥" : viewMode === "doubles" ? "🎯" : viewMode === "5-player-champ" ? "👑" : viewMode === "round-robin" ? "🔁" : "🤝"}
            </span>
            {viewMode === "league" ? "Fylde Pickleball League" : viewMode === "doubles" ? "Doubles - Points Difference" : viewMode === "5-player-champ" ? "5 Player Champ" : viewMode === "round-robin" ? "Round Robin" : "Partner Practice"}
            <span className="ml-3 text-gray-400 text-2xl sm:text-4xl">›</span>
          </h1>
        </button>
        <p className="text-gray-400 mt-2 text-xs sm:text-sm tracking-wide">
          {viewMode === "league" ? "Weekly Matches • Live Updates • Prize for Winner!🏆" : viewMode === "doubles" ? "Casual doubles format • Points-difference scoring" : viewMode === "5-player-champ" ? "Championship format • 5-player rotation" : viewMode === "round-robin" ? "Fair partnerships • All players with all players" : "Practice with your partner • Designated partnerships"}
        </p>
        <div className={`absolute -bottom-3 left-0 w-20 sm:w-24 h-1 rounded-full ${viewMode === "league" ? "bg-yellow-400" : viewMode === "doubles" ? "bg-green-400" : viewMode === "5-player-champ" ? "bg-purple-400" : viewMode === "round-robin" ? "bg-blue-400" : "bg-pink-400"}`} />
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

      {/* User Info Header */}
      <div className="mb-6 p-4 bg-gray-800 rounded-lg flex items-center justify-between">
        <div className="text-gray-300">
          {userType === 'guest' ? (
            <span>👤 Guest Session - Data not saved</span>
          ) : (
            <span>👤 {user?.username}</span>
          )}
        </div>
        <div className="flex gap-3">
          {userType === 'guest' && (
            <button
              onClick={() => {
                logout();
                router.push('/welcome');
              }}
              className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded text-sm transition-colors"
            >
              Create Account
            </button>
          )}
          <button
            onClick={() => {
              logout();
              router.push('/welcome');
            }}
            className="bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded text-sm transition-colors"
          >
            Logout
          </button>
        </div>
      </div>

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
          <div className="mt-4">
            {viewMode === "5-player-champ" && (
              <div className={`mb-4 p-3 rounded ${activePlayerCount === 5 ? "bg-green-900 border border-green-600" : "bg-red-900 border border-red-600"}`}>
                <p className={`text-sm font-semibold ${activePlayerCount === 5 ? "text-green-200" : "text-red-200"}`}>
                  {activePlayerCount === 5 
                    ? "✓ Exactly 5 active players - ready to generate matches!" 
                    : `⚠️ 5 Player Champ requires exactly 5 active players (currently ${activePlayerCount})`}
                </p>
              </div>
            )}
            {viewMode === "round-robin" && (
              <div className={`mb-4 p-3 rounded ${activePlayerCount >= 4 ? "bg-green-900 border border-green-600" : "bg-red-900 border border-red-600"}`}>
                <p className={`text-sm font-semibold ${activePlayerCount >= 4 ? "text-green-200" : "text-red-200"}`}>
                  {activePlayerCount >= 4 
                    ? `✓ ${activePlayerCount} active players - ready to generate matches!` 
                    : `⚠️ Round Robin requires at least 4 active players (currently ${activePlayerCount})`}
                </p>
              </div>
            )}
            {viewMode === "partner-practice" && (
              <div className={`mb-4 p-3 rounded ${activePlayerCount >= 4 ? "bg-green-900 border border-green-600" : "bg-red-900 border border-red-600"}`}>
                <p className={`text-sm font-semibold ${activePlayerCount >= 4 ? "text-green-200" : "text-red-200"}`}>
                  {activePlayerCount >= 4 
                    ? `✓ ${activePlayerCount} active players - ready to generate matches!` 
                    : `⚠️ Partner Practice requires at least 4 active players (currently ${activePlayerCount})`}
                </p>
                <p className="text-xs text-gray-300 mt-2">💡 Select partners from the Partner column to practice with designated teammates.</p>
              </div>
            )}
            <div className="flex justify-end gap-2">
              <button
                onClick={handleAddPlayer}
                disabled={viewMode === "5-player-champ" && activePlayerCount >= 5}
                className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2 rounded disabled:opacity-50 disabled:cursor-not-allowed"
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
          </div>
        )}

        {activeTab === "Season Archive" && (
          <div className="mt-4">
            <div className="flex items-center gap-3">
              <label className="text-sm text-gray-300">Saved Summaries for Division</label>
              <select
                value={selectedSeasonSummaryId || ''}
                onChange={(e) => setSelectedSeasonSummaryId(e.target.value || null)}
                className="bg-gray-800 text-white border border-gray-600 rounded px-3 py-2 outline-none"
              >
                <option value="">-- Select saved summary --</option>
                {seasonSummariesList.map((s) => (
                  <option key={s.id} value={s.id}>
                    {new Date(s.timestamp).toLocaleString()} — Division {s.division}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        {/* Previous Seasons tab removed */}

        {activeTab === "Matches" && (
          <div className="mt-4 flex flex-row items-center justify-between gap-4 flex-wrap">
            {viewMode !== "5-player-champ" && (
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
                  <option value={5}>5</option>
                  <option value={6}>6</option>
                </select>
              </div>
            )}

            {/* Gender Filter Toggle - Partner Practice Only */}
            {viewMode === "partner-practice" && (
              <div className="flex items-center gap-2">
                <label htmlFor="genderFilter" className="text-xs text-gray-300 uppercase tracking-wide">
                  Gameplay
                </label>
                <select
                  id="genderFilter"
                  value={genderFilterMode}
                  onChange={(e) => setGenderFilterMode(e.target.value)}
                  className="bg-gray-800 text-white border border-gray-600 rounded px-4 py-2 outline-none focus:border-yellow-400"
                >
                  <option value="random">Random</option>
                  <option value="gender-doubles">Gender Doubles</option>
                  <option value="gender-mixed">Gender Mixed</option>
                </select>
              </div>
            )}

            <div className={`flex flex-row items-center gap-2 ${viewMode === "5-player-champ" || viewMode === "round-robin" ? "ml-auto" : ""}`}>
              <button
                onClick={() => {
                  if (window.confirm("Are you sure you want to generate fixtures?")) {
                    generateMatches();
                  }
                }}
                disabled={hasGeneratedFixtures || (viewMode === "5-player-champ" && activePlayerCount !== 5) || (viewMode === "round-robin" && activePlayerCount < 4)}
                className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2 rounded disabled:opacity-50 disabled:cursor-not-allowed"
              >
                🔒 Generate Fixtures
              </button>
              {viewMode === "5-player-champ" && activePlayerCount !== 5 && (
                <p className="text-xs text-red-400 font-semibold w-full sm:w-auto">
                  ⚠️ Requires exactly 5 active players ({activePlayerCount} currently)
                </p>
              )}
              {viewMode === "round-robin" && activePlayerCount < 4 && (
                <p className="text-xs text-red-400 font-semibold w-full sm:w-auto">
                  ⚠️ Requires at least 4 active players ({activePlayerCount} currently)
                </p>
              )}
              {viewMode !== "5-player-champ" && viewMode !== "round-robin" && activePlayerCount >= 4 && activePlayerCount < 8 && (
                <p className="text-xs text-gray-400 w-full sm:w-auto">
                  Fewer than 8 active players: fixtures will be generated on Court 1 only.
                </p>
              )}
            </div>
          </div>
        )}

        {activeTab === "Matches" ? (
          <>
        {/* Match Display - Partner Practice vs Others */}
        {viewMode === "partner-practice" ? (
          /* Partner Practice: Compact 4-Court Display */
          <div className="mt-6">
            {/* Global Controls */}
            <div className="flex flex-col sm:flex-row gap-2 mb-4 justify-center sm:justify-between items-center px-4 py-3 bg-gray-800 rounded-lg">
              <button
                onClick={() => setShowEnterScore(!showEnterScore)}
                className={`px-4 py-2 rounded font-semibold transition ${
                  showEnterScore
                    ? "bg-green-600 hover:bg-green-500 text-white"
                    : "bg-gray-600 hover:bg-gray-500 text-white"
                }`}
              >
                {showEnterScore ? "✓ Enter Score" : "Enter Score"}
              </button>
              <div className="flex gap-2">
                <button
                  onClick={rewindAllRounds}
                  className="bg-gray-600 hover:bg-gray-500 text-white px-4 py-2 rounded font-semibold"
                >
                  ◀ Previous Round
                </button>
                <button
                  onClick={advanceAllRounds}
                  className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded font-semibold"
                >
                  Next Round ▶
                </button>
              </div>
            </div>

            {/* Compact 4-Court Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Court 1 */}
              <div className="bg-gray-700 rounded shadow p-3">
                <h3 className="text-yellow-400 font-bold mb-2 text-sm">🏐 Court 1</h3>
                {court1Matches[court1Round] ? (
                  <>
                    <div className="bg-gray-600 rounded p-3 space-y-2">
                      <div className="text-center text-xs text-gray-300 mb-2">
                        Round {court1Round + 1} of {court1Matches.length}
                      </div>
                      <div className="text-center">
                        <div className="text-xs font-semibold text-gray-100 mb-1">
                          {court1Matches[court1Round][0].map(p => p.name).join(" & ")}
                        </div>
                        {showEnterScore && (
                          <input type="number" min={0} value={court1Scores[court1Round]?.team1 ?? ""} onChange={(e) => updateScore(court1Round, "team1", e.target.value, "court1")} className="w-16 h-12 text-2xl font-bold text-center rounded border-2 border-gray-500 bg-gray-800 text-white outline-none" placeholder="0" />
                        )}
                      </div>
                      <div className="text-center text-xs text-gray-400 font-bold">VS</div>
                      <div className="text-center">
                        <div className="text-xs font-semibold text-gray-100 mb-1">
                          {court1Matches[court1Round][1].map(p => p.name).join(" & ")}
                        </div>
                        {showEnterScore && (
                          <input type="number" min={0} value={court1Scores[court1Round]?.team2 ?? ""} onChange={(e) => updateScore(court1Round, "team2", e.target.value, "court1")} className="w-16 h-12 text-2xl font-bold text-center rounded border-2 border-gray-500 bg-gray-800 text-white outline-none" placeholder="0" />
                        )}
                      </div>
                    </div>
                  </>
                ) : (
                  <p className="text-gray-400 text-xs italic">No match</p>
                )}
              </div>

              {/* Court 2 */}
              <div className="bg-gray-700 rounded shadow p-3">
                <h3 className="text-yellow-400 font-bold mb-2 text-sm">🏐 Court 2</h3>
                {court2Matches[court2Round] ? (
                  <>
                    <div className="bg-gray-600 rounded p-3 space-y-2">
                      <div className="text-center text-xs text-gray-300 mb-2">
                        Round {court2Round + 1} of {court2Matches.length}
                      </div>
                      <div className="text-center">
                        <div className="text-xs font-semibold text-gray-100 mb-1">
                          {court2Matches[court2Round][0].map(p => p.name).join(" & ")}
                        </div>
                        {showEnterScore && (
                          <input type="number" min={0} value={court2Scores[court2Round]?.team1 ?? ""} onChange={(e) => updateScore(court2Round, "team1", e.target.value, "court2")} className="w-16 h-12 text-2xl font-bold text-center rounded border-2 border-gray-500 bg-gray-800 text-white outline-none" placeholder="0" />
                        )}
                      </div>
                      <div className="text-center text-xs text-gray-400 font-bold">VS</div>
                      <div className="text-center">
                        <div className="text-xs font-semibold text-gray-100 mb-1">
                          {court2Matches[court2Round][1].map(p => p.name).join(" & ")}
                        </div>
                        {showEnterScore && (
                          <input type="number" min={0} value={court2Scores[court2Round]?.team2 ?? ""} onChange={(e) => updateScore(court2Round, "team2", e.target.value, "court2")} className="w-16 h-12 text-2xl font-bold text-center rounded border-2 border-gray-500 bg-gray-800 text-white outline-none" placeholder="0" />
                        )}
                      </div>
                    </div>
                  </>
                ) : (
                  <p className="text-gray-400 text-xs italic">No match</p>
                )}
              </div>

              {/* Court 3 */}
              {numCourts >= 3 && (
                <div className="bg-gray-700 rounded shadow p-3">
                  <h3 className="text-yellow-400 font-bold mb-2 text-sm">🏐 Court 3</h3>
                  {court3Matches[court3Round] ? (
                    <>
                      <div className="bg-gray-600 rounded p-3 space-y-2">
                        <div className="text-center text-xs text-gray-300 mb-2">
                          Round {court3Round + 1} of {court3Matches.length}
                        </div>
                        <div className="text-center">
                          <div className="text-xs font-semibold text-gray-100 mb-1">
                            {court3Matches[court3Round][0].map(p => p.name).join(" & ")}
                          </div>
                          {showEnterScore && (
                            <input type="number" min={0} value={court3Scores[court3Round]?.team1 ?? ""} onChange={(e) => updateScore(court3Round, "team1", e.target.value, "court3")} className="w-16 h-12 text-2xl font-bold text-center rounded border-2 border-gray-500 bg-gray-800 text-white outline-none" placeholder="0" />
                          )}
                        </div>
                        <div className="text-center text-xs text-gray-400 font-bold">VS</div>
                        <div className="text-center">
                          <div className="text-xs font-semibold text-gray-100 mb-1">
                            {court3Matches[court3Round][1].map(p => p.name).join(" & ")}
                          </div>
                          {showEnterScore && (
                            <input type="number" min={0} value={court3Scores[court3Round]?.team2 ?? ""} onChange={(e) => updateScore(court3Round, "team2", e.target.value, "court3")} className="w-16 h-12 text-2xl font-bold text-center rounded border-2 border-gray-500 bg-gray-800 text-white outline-none" placeholder="0" />
                          )}
                        </div>
                      </div>
                    </>
                  ) : (
                    <p className="text-gray-400 text-xs italic">No match</p>
                  )}
                </div>
              )}

              {/* Court 4 */}
              {numCourts >= 4 && (
                <div className="bg-gray-700 rounded shadow p-3">
                  <h3 className="text-yellow-400 font-bold mb-2 text-sm">🏐 Court 4</h3>
                  {court4Matches[court4Round] ? (
                    <>
                      <div className="bg-gray-600 rounded p-3 space-y-2">
                        <div className="text-center text-xs text-gray-300 mb-2">
                          Round {court4Round + 1} of {court4Matches.length}
                        </div>
                        <div className="text-center">
                          <div className="text-xs font-semibold text-gray-100 mb-1">
                            {court4Matches[court4Round][0].map(p => p.name).join(" & ")}
                          </div>
                          {showEnterScore && (
                            <input type="number" min={0} value={court4Scores[court4Round]?.team1 ?? ""} onChange={(e) => updateScore(court4Round, "team1", e.target.value, "court4")} className="w-16 h-12 text-2xl font-bold text-center rounded border-2 border-gray-500 bg-gray-800 text-white outline-none" placeholder="0" />
                          )}
                        </div>
                        <div className="text-center text-xs text-gray-400 font-bold">VS</div>
                        <div className="text-center">
                          <div className="text-xs font-semibold text-gray-100 mb-1">
                            {court4Matches[court4Round][1].map(p => p.name).join(" & ")}
                          </div>
                          {showEnterScore && (
                            <input type="number" min={0} value={court4Scores[court4Round]?.team2 ?? ""} onChange={(e) => updateScore(court4Round, "team2", e.target.value, "court4")} className="w-16 h-12 text-2xl font-bold text-center rounded border-2 border-gray-500 bg-gray-800 text-white outline-none" placeholder="0" />
                          )}
                        </div>
                      </div>
                    </>
                  ) : (
                    <p className="text-gray-400 text-xs italic">No match</p>
                  )}
                </div>
              )}

              {/* Court 5 */}
              {numCourts >= 5 && (
                <div className="bg-gray-700 rounded shadow p-3">
                  <h3 className="text-yellow-400 font-bold mb-2 text-sm">🏐 Court 5</h3>
                  {court5Matches[court5Round] ? (
                    <>
                      <div className="bg-gray-600 rounded p-3 space-y-2">
                        <div className="text-center text-xs text-gray-300 mb-2">
                          Round {court5Round + 1} of {court5Matches.length}
                        </div>
                        <div className="text-center">
                          <div className="text-xs font-semibold text-gray-100 mb-1">
                            {court5Matches[court5Round][0].map(p => p.name).join(" & ")}
                          </div>
                          {showEnterScore && (
                            <input type="number" min={0} value={court5Scores[court5Round]?.team1 ?? ""} onChange={(e) => updateScore(court5Round, "team1", e.target.value, "court5")} className="w-16 h-12 text-2xl font-bold text-center rounded border-2 border-gray-500 bg-gray-800 text-white outline-none" placeholder="0" />
                          )}
                        </div>
                        <div className="text-center text-xs text-gray-400 font-bold">VS</div>
                        <div className="text-center">
                          <div className="text-xs font-semibold text-gray-100 mb-1">
                            {court5Matches[court5Round][1].map(p => p.name).join(" & ")}
                          </div>
                          {showEnterScore && (
                            <input type="number" min={0} value={court5Scores[court5Round]?.team2 ?? ""} onChange={(e) => updateScore(court5Round, "team2", e.target.value, "court5")} className="w-16 h-12 text-2xl font-bold text-center rounded border-2 border-gray-500 bg-gray-800 text-white outline-none" placeholder="0" />
                          )}
                        </div>
                      </div>
                    </>
                  ) : (
                    <p className="text-gray-400 text-xs italic">No match</p>
                  )}
                </div>
              )}

              {/* Court 6 */}
              {numCourts >= 6 && (
                <div className="bg-gray-700 rounded shadow p-3">
                  <h3 className="text-yellow-400 font-bold mb-2 text-sm">🏐 Court 6</h3>
                  {court6Matches[court6Round] ? (
                    <>
                      <div className="bg-gray-600 rounded p-3 space-y-2">
                        <div className="text-center text-xs text-gray-300 mb-2">
                          Round {court6Round + 1} of {court6Matches.length}
                        </div>
                        <div className="text-center">
                          <div className="text-xs font-semibold text-gray-100 mb-1">
                            {court6Matches[court6Round][0].map(p => p.name).join(" & ")}
                          </div>
                          {showEnterScore && (
                            <input type="number" min={0} value={court6Scores[court6Round]?.team1 ?? ""} onChange={(e) => updateScore(court6Round, "team1", e.target.value, "court6")} className="w-16 h-12 text-2xl font-bold text-center rounded border-2 border-gray-500 bg-gray-800 text-white outline-none" placeholder="0" />
                          )}
                        </div>
                        <div className="text-center text-xs text-gray-400 font-bold">VS</div>
                        <div className="text-center">
                          <div className="text-xs font-semibold text-gray-100 mb-1">
                            {court6Matches[court6Round][1].map(p => p.name).join(" & ")}
                          </div>
                          {showEnterScore && (
                            <input type="number" min={0} value={court6Scores[court6Round]?.team2 ?? ""} onChange={(e) => updateScore(court6Round, "team2", e.target.value, "court6")} className="w-16 h-12 text-2xl font-bold text-center rounded border-2 border-gray-500 bg-gray-800 text-white outline-none" placeholder="0" />
                          )}
                        </div>
                      </div>
                    </>
                  ) : (
                    <p className="text-gray-400 text-xs italic">No match</p>
                  )}
                </div>
              )}
            </div>

            {/* Resting Players */}
            {getRestingPlayers().length > 0 && (
              <div className="mt-4 p-3 bg-gray-800 rounded-lg border border-yellow-600">
                <h4 className="text-yellow-400 font-semibold mb-2">⏸️ Resting this round:</h4>
                <div className="flex flex-wrap gap-2">
                  {getRestingPlayers().map(p => (
                    <span key={p.id} className="bg-yellow-600 text-white px-3 py-1 rounded-full text-sm font-medium">
                      {p.name}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Save/Clear Buttons */}
            <div className="flex gap-3 justify-center mt-4">
              <button onClick={saveMatches} className="bg-green-600 hover:bg-green-500 text-white px-6 py-2 rounded font-semibold">
                💾 Save
              </button>
              <button
                onClick={clearGeneratedMatches}
                disabled={!hasGeneratedFixtures}
                className="bg-red-600 hover:bg-red-500 text-white px-6 py-2 rounded disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
              >
                🗑 Clear
              </button>
            </div>
          </div>
        ) : (
          /* Other modes: League, Doubles, 5-Player Champ, Round Robin */
          <div className="mt-6">
            {/* Global Controls */}
            <div className="flex flex-col sm:flex-row gap-2 mb-4 justify-center sm:justify-between items-center px-4 py-3 bg-gray-800 rounded-lg">
              <button
                onClick={() => setShowEnterScore(!showEnterScore)}
                className={`px-4 py-2 rounded font-semibold transition ${
                  showEnterScore
                    ? "bg-green-600 hover:bg-green-500 text-white"
                    : "bg-gray-600 hover:bg-gray-500 text-white"
                }`}
              >
                {showEnterScore ? "✓ Enter Score" : "Enter Score"}
              </button>
              <div className="flex gap-2">
                <button
                  onClick={rewindAllRounds}
                  className="bg-gray-600 hover:bg-gray-500 text-white px-4 py-2 rounded font-semibold"
                >
                  ◀ Previous Round
                </button>
                <button
                  onClick={advanceAllRounds}
                  className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded font-semibold"
                >
                  Next Round ▶
                </button>
              </div>
            </div>

            {/* 4-Court Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Court 1 */}
              <div className="bg-gray-700 rounded shadow p-3">
                <h3 className="text-yellow-400 font-bold mb-2 text-sm">🏐 Court 1</h3>
                {court1Matches[court1Round] ? (
                  <>
                    <div className="bg-gray-600 rounded p-3 space-y-2">
                      <div className="text-center text-xs text-gray-300 mb-2">
                        Round {court1Round + 1} of {court1Matches.length}
                      </div>
                      <div className="text-center">
                        <div className="text-xs font-semibold text-gray-100 mb-1">
                          {court1Matches[court1Round][0].map(p => p.name).join(" & ")}
                        </div>
                        {showEnterScore && (
                          <input type="number" min={0} value={court1Scores[court1Round]?.team1 ?? ""} onChange={(e) => updateScore(court1Round, "team1", e.target.value, "court1")} className="w-16 h-12 text-2xl font-bold text-center rounded border-2 border-gray-500 bg-gray-800 text-white outline-none" placeholder="0" />
                        )}
                      </div>
                      <div className="text-center text-xs text-gray-400 font-bold">VS</div>
                      <div className="text-center">
                        <div className="text-xs font-semibold text-gray-100 mb-1">
                          {court1Matches[court1Round][1].map(p => p.name).join(" & ")}
                        </div>
                        {showEnterScore && (
                          <input type="number" min={0} value={court1Scores[court1Round]?.team2 ?? ""} onChange={(e) => updateScore(court1Round, "team2", e.target.value, "court1")} className="w-16 h-12 text-2xl font-bold text-center rounded border-2 border-gray-500 bg-gray-800 text-white outline-none" placeholder="0" />
                        )}
                      </div>
                    </div>
                  </>
                ) : (
                  <p className="text-gray-400 text-xs italic">No match</p>
                )}
              </div>

              {/* Court 2 */}
              <div className="bg-gray-700 rounded shadow p-3">
                <h3 className="text-yellow-400 font-bold mb-2 text-sm">🏐 Court 2</h3>
                {court2Matches[court2Round] ? (
                  <>
                    <div className="bg-gray-600 rounded p-3 space-y-2">
                      <div className="text-center text-xs text-gray-300 mb-2">
                        Round {court2Round + 1} of {court2Matches.length}
                      </div>
                      <div className="text-center">
                        <div className="text-xs font-semibold text-gray-100 mb-1">
                          {court2Matches[court2Round][0].map(p => p.name).join(" & ")}
                        </div>
                        {showEnterScore && (
                          <input type="number" min={0} value={court2Scores[court2Round]?.team1 ?? ""} onChange={(e) => updateScore(court2Round, "team1", e.target.value, "court2")} className="w-16 h-12 text-2xl font-bold text-center rounded border-2 border-gray-500 bg-gray-800 text-white outline-none" placeholder="0" />
                        )}
                      </div>
                      <div className="text-center text-xs text-gray-400 font-bold">VS</div>
                      <div className="text-center">
                        <div className="text-xs font-semibold text-gray-100 mb-1">
                          {court2Matches[court2Round][1].map(p => p.name).join(" & ")}
                        </div>
                        {showEnterScore && (
                          <input type="number" min={0} value={court2Scores[court2Round]?.team2 ?? ""} onChange={(e) => updateScore(court2Round, "team2", e.target.value, "court2")} className="w-16 h-12 text-2xl font-bold text-center rounded border-2 border-gray-500 bg-gray-800 text-white outline-none" placeholder="0" />
                        )}
                      </div>
                    </div>
                  </>
                ) : (
                  <p className="text-gray-400 text-xs italic">No match</p>
                )}
              </div>

              {/* Court 3 */}
              {numCourts >= 3 && (
                <div className="bg-gray-700 rounded shadow p-3">
                  <h3 className="text-yellow-400 font-bold mb-2 text-sm">🏐 Court 3</h3>
                  {court3Matches[court3Round] ? (
                    <>
                      <div className="bg-gray-600 rounded p-3 space-y-2">
                        <div className="text-center text-xs text-gray-300 mb-2">
                          Round {court3Round + 1} of {court3Matches.length}
                        </div>
                        <div className="text-center">
                          <div className="text-xs font-semibold text-gray-100 mb-1">
                            {court3Matches[court3Round][0].map(p => p.name).join(" & ")}
                          </div>
                          {showEnterScore && (
                            <input type="number" min={0} value={court3Scores[court3Round]?.team1 ?? ""} onChange={(e) => updateScore(court3Round, "team1", e.target.value, "court3")} className="w-16 h-12 text-2xl font-bold text-center rounded border-2 border-gray-500 bg-gray-800 text-white outline-none" placeholder="0" />
                          )}
                        </div>
                        <div className="text-center text-xs text-gray-400 font-bold">VS</div>
                        <div className="text-center">
                          <div className="text-xs font-semibold text-gray-100 mb-1">
                            {court3Matches[court3Round][1].map(p => p.name).join(" & ")}
                          </div>
                          {showEnterScore && (
                            <input type="number" min={0} value={court3Scores[court3Round]?.team2 ?? ""} onChange={(e) => updateScore(court3Round, "team2", e.target.value, "court3")} className="w-16 h-12 text-2xl font-bold text-center rounded border-2 border-gray-500 bg-gray-800 text-white outline-none" placeholder="0" />
                          )}
                        </div>
                      </div>
                    </>
                  ) : (
                    <p className="text-gray-400 text-xs italic">No match</p>
                  )}
                </div>
              )}

              {/* Court 4 */}
              {numCourts >= 4 && (
                <div className="bg-gray-700 rounded shadow p-3">
                  <h3 className="text-yellow-400 font-bold mb-2 text-sm">🏐 Court 4</h3>
                  {court4Matches[court4Round] ? (
                    <>
                      <div className="bg-gray-600 rounded p-3 space-y-2">
                        <div className="text-center text-xs text-gray-300 mb-2">
                          Round {court4Round + 1} of {court4Matches.length}
                        </div>
                        <div className="text-center">
                          <div className="text-xs font-semibold text-gray-100 mb-1">
                            {court4Matches[court4Round][0].map(p => p.name).join(" & ")}
                          </div>
                          {showEnterScore && (
                            <input type="number" min={0} value={court4Scores[court4Round]?.team1 ?? ""} onChange={(e) => updateScore(court4Round, "team1", e.target.value, "court4")} className="w-16 h-12 text-2xl font-bold text-center rounded border-2 border-gray-500 bg-gray-800 text-white outline-none" placeholder="0" />
                          )}
                        </div>
                        <div className="text-center text-xs text-gray-400 font-bold">VS</div>
                        <div className="text-center">
                          <div className="text-xs font-semibold text-gray-100 mb-1">
                            {court4Matches[court4Round][1].map(p => p.name).join(" & ")}
                          </div>
                          {showEnterScore && (
                            <input type="number" min={0} value={court4Scores[court4Round]?.team2 ?? ""} onChange={(e) => updateScore(court4Round, "team2", e.target.value, "court4")} className="w-16 h-12 text-2xl font-bold text-center rounded border-2 border-gray-500 bg-gray-800 text-white outline-none" placeholder="0" />
                          )}
                        </div>
                      </div>
                    </>
                  ) : (
                    <p className="text-gray-400 text-xs italic">No match</p>
                  )}
                </div>
              )}

              {/* Court 5 */}
              {numCourts >= 5 && (
                <div className="bg-gray-700 rounded shadow p-3">
                  <h3 className="text-yellow-400 font-bold mb-2 text-sm">🏐 Court 5</h3>
                  {court5Matches[court5Round] ? (
                    <>
                      <div className="bg-gray-600 rounded p-3 space-y-2">
                        <div className="text-center text-xs text-gray-300 mb-2">
                          Round {court5Round + 1} of {court5Matches.length}
                        </div>
                        <div className="text-center">
                          <div className="text-xs font-semibold text-gray-100 mb-1">
                            {court5Matches[court5Round][0].map(p => p.name).join(" & ")}
                          </div>
                          {showEnterScore && (
                            <input type="number" min={0} value={court5Scores[court5Round]?.team1 ?? ""} onChange={(e) => updateScore(court5Round, "team1", e.target.value, "court5")} className="w-16 h-12 text-2xl font-bold text-center rounded border-2 border-gray-500 bg-gray-800 text-white outline-none" placeholder="0" />
                          )}
                        </div>
                        <div className="text-center text-xs text-gray-400 font-bold">VS</div>
                        <div className="text-center">
                          <div className="text-xs font-semibold text-gray-100 mb-1">
                            {court5Matches[court5Round][1].map(p => p.name).join(" & ")}
                          </div>
                          {showEnterScore && (
                            <input type="number" min={0} value={court5Scores[court5Round]?.team2 ?? ""} onChange={(e) => updateScore(court5Round, "team2", e.target.value, "court5")} className="w-16 h-12 text-2xl font-bold text-center rounded border-2 border-gray-500 bg-gray-800 text-white outline-none" placeholder="0" />
                          )}
                        </div>
                      </div>
                    </>
                  ) : (
                    <p className="text-gray-400 text-xs italic">No match</p>
                  )}
                </div>
              )}

              {/* Court 6 */}
              {numCourts >= 6 && (
                <div className="bg-gray-700 rounded shadow p-3">
                  <h3 className="text-yellow-400 font-bold mb-2 text-sm">🏐 Court 6</h3>
                  {court6Matches[court6Round] ? (
                    <>
                      <div className="bg-gray-600 rounded p-3 space-y-2">
                        <div className="text-center text-xs text-gray-300 mb-2">
                          Round {court6Round + 1} of {court6Matches.length}
                        </div>
                        <div className="text-center">
                          <div className="text-xs font-semibold text-gray-100 mb-1">
                            {court6Matches[court6Round][0].map(p => p.name).join(" & ")}
                          </div>
                          {showEnterScore && (
                            <input type="number" min={0} value={court6Scores[court6Round]?.team1 ?? ""} onChange={(e) => updateScore(court6Round, "team1", e.target.value, "court6")} className="w-16 h-12 text-2xl font-bold text-center rounded border-2 border-gray-500 bg-gray-800 text-white outline-none" placeholder="0" />
                          )}
                        </div>
                        <div className="text-center text-xs text-gray-400 font-bold">VS</div>
                        <div className="text-center">
                          <div className="text-xs font-semibold text-gray-100 mb-1">
                            {court6Matches[court6Round][1].map(p => p.name).join(" & ")}
                          </div>
                          {showEnterScore && (
                            <input type="number" min={0} value={court6Scores[court6Round]?.team2 ?? ""} onChange={(e) => updateScore(court6Round, "team2", e.target.value, "court6")} className="w-16 h-12 text-2xl font-bold text-center rounded border-2 border-gray-500 bg-gray-800 text-white outline-none" placeholder="0" />
                          )}
                        </div>
                      </div>
                    </>
                  ) : (
                    <p className="text-gray-400 text-xs italic">No match</p>
                  )}
                </div>
              )}
            </div>

            {/* Resting Players */}
            {getRestingPlayers().length > 0 && (
              <div className="mt-4 p-3 bg-gray-800 rounded-lg border border-yellow-600">
                <h4 className="text-yellow-400 font-semibold mb-2">⏸️ Resting this round:</h4>
                <div className="flex flex-wrap gap-2">
                  {getRestingPlayers().map(p => (
                    <span key={p.id} className="bg-yellow-600 text-white px-3 py-1 rounded-full text-sm font-medium">
                      {p.name}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Save/Clear Buttons */}
            <div className="flex gap-3 justify-center mt-4">
              <button onClick={saveMatches} className="bg-green-600 hover:bg-green-500 text-white px-6 py-2 rounded font-semibold">
                💾 Save
              </button>
              <button
                onClick={clearGeneratedMatches}
                disabled={!hasGeneratedFixtures}
                className="bg-red-600 hover:bg-red-500 text-white px-6 py-2 rounded disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
              >
                🗑 Clear
              </button>
            </div>
          </div>
        )}
          </>
        ) : null}
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

      {/* Previous Seasons debug overlay removed — showing blank content instead */}
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
                const confirmed = window.confirm("Are you sure you want to save this minimum games requirement?");
                if (confirmed) {
                  // save the value
                  const next = { ...(minQualifyByDivision || {}) };
                  next[String(division)] = v;
                  setMinQualifyByDivision(next);
                  try { setLSJson("min_qualify_by_division", next); } catch (e) {}
                  // update current displayed value
                  setMinQualifyGames(v);

                  // Persist per-division min to DB for canonical storage
                  try {
                    db('divisions').update({ min_qualify_games: v }).eq('id', division).then(() => {
                      setShowEditMinModal(false);
                    });
                  } catch (e) {
                    console.warn('Failed to persist min_qualify_games to DB:', e);
                    // not fatal — keep local value
                  }
                }
              }}
              className="px-4 py-2 rounded bg-blue-600 text-white"
            >Save</button>
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
        <div className="bg-gray-800 rounded-lg p-6 overflow-x-auto">
          {(() => {
            // Calculate maximum rank from all players
            const maxRank = Math.max(
              ...bumpChartData.lines.flatMap(line => line.positions.map(p => p.rank)),
              5
            );
            const rowHeight = 28;
            const topPadding = 25;
            const bottomPadding = 25;
            const chartHeight = topPadding + maxRank * rowHeight + bottomPadding;
            const viewBoxWidth = Math.max(800, bumpChartData.weeks.length * 80);

            return (
              <svg width="100%" height={Math.max(400, chartHeight)} className="min-w-full" viewBox={`0 0 ${viewBoxWidth} ${chartHeight}`}>
                {/* Background grid */}
                {bumpChartData.weeks.map((_, weekIdx) => (
                  <line
                    key={`grid-v-${weekIdx}`}
                    x1={80 + weekIdx * 80}
                    y1={topPadding}
                    x2={80 + weekIdx * 80}
                    y2={topPadding + maxRank * rowHeight}
                    stroke="#374151"
                    strokeWidth="0.5"
                    strokeDasharray="2,2"
                  />
                ))}
                {Array.from({ length: maxRank }).map((_, i) => (
                  <line
                    key={`grid-h-${i}`}
                    x1="50"
                    y1={topPadding + i * rowHeight}
                    x2={viewBoxWidth - 20}
                    y2={topPadding + i * rowHeight}
                    stroke="#374151"
                    strokeWidth="0.5"
                    strokeDasharray="2,2"
                  />
                ))}

                {/* Y-axis (rankings) */}
                {Array.from({ length: maxRank }).map((_, i) => (
                  <text key={`y-label-${i}`} x="40" y={topPadding + 10 + i * rowHeight} fontSize="10" fontWeight="600" textAnchor="end" fill="#9CA3AF">
                    {i + 1}
                  </text>
                ))}

                {/* X-axis (weeks) */}
                {bumpChartData.weeks.map((week, weekIdx) => (
                  <text key={`x-label-${weekIdx}`} x={80 + weekIdx * 80} y={topPadding + maxRank * rowHeight + 18} fontSize="9" textAnchor="middle" fill="#9CA3AF">
                    {week}
                  </text>
                ))}

                {/* Y-axis and X-axis lines */}
                <line x1="50" y1={topPadding} x2="50" y2={topPadding + maxRank * rowHeight} stroke="#6B7280" strokeWidth="2" />
                <line x1="50" y1={topPadding + maxRank * rowHeight} x2={viewBoxWidth - 20} y2={topPadding + maxRank * rowHeight} stroke="#6B7280" strokeWidth="2" />

                {/* Player lines and dots with position numbers */}
                {bumpChartData.lines.map((line, lineIdx) => {
                  const points = line.positions
                    .map((pos) => {
                      const x = 80 + pos.weekIndex * 80;
                      const y = topPadding + (pos.rank - 1) * rowHeight;
                      return `${x},${y}`;
                    })
                    .join(' ');

                  return (
                    <g key={lineIdx}>
                      {/* Line */}
                      <polyline
                        points={points}
                        fill="none"
                        stroke={line.color}
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        opacity="0.85"
                      />
                      {/* Dots with position numbers */}
                      {line.positions.map((pos, posIdx) => {
                        const cx = 80 + pos.weekIndex * 80;
                        const cy = topPadding + (pos.rank - 1) * rowHeight;
                        return (
                          <g key={`dot-${posIdx}`}>
                            {/* Colored dot */}
                            <circle
                              cx={cx}
                              cy={cy}
                              r="4"
                              fill={line.color}
                              opacity="0.95"
                            />
                            {/* Position number text */}
                            <text
                              x={cx}
                              y={cy}
                              textAnchor="middle"
                              dominantBaseline="middle"
                              fontSize="7.5"
                              fontWeight="700"
                              fill="white"
                              pointerEvents="none"
                            >
                              {pos.rank}
                            </text>
                          </g>
                        );
                      })}
                      {/* End label with player name */}
                      {line.positions.length > 0 && (
                        <text
                          x={80 + (line.positions[line.positions.length - 1].weekIndex + 1) * 80 + 12}
                          y={topPadding + (line.positions[line.positions.length - 1].rank - 1) * rowHeight + 4}
                          fontSize="11"
                          fontWeight="600"
                          fill={line.color}
                        >
                          {line.name}
                        </text>
                      )}
                    </g>
                  );
                })}
              </svg>
            );
          })()}
        </div>
      )}
    </div>
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
          className="rounded-lg shadow border p-4 transition bg-white border-gray-200"
        >
          <div className="flex justify-between items-start gap-2">
            <div className="flex-1">
              <div className="font-semibold flex items-center gap-2">
                {p.name}
                {p.gender === 'male' && <span className="text-blue-600 text-sm">♂</span>}
                {p.gender === 'female' && <span className="text-pink-600 text-sm">♀</span>}
              </div>
              {viewMode === "partner-practice" && (
                <div className="mt-2">
                  <select
                    value={p.partner_id || ""}
                    onChange={(e) => updatePlayerPartner(p.id, e.target.value || null)}
                    className="w-full bg-gray-100 text-gray-700 border border-gray-300 rounded px-2 py-1 text-xs outline-none"
                  >
                    <option value="">— No Partner —</option>
                    {players
                      .filter((other) => other.id !== p.id && !other.partner_id)
                      .map((other) => (
                        <option key={other.id} value={other.id}>
                          {other.name}
                        </option>
                      ))}
                    {p.partner_id && (
                      <option value={p.partner_id}>
                        {players.find((x) => x.id === p.partner_id)?.name || "Unknown"}
                      </option>
                    )}
                  </select>
                </div>
              )}
            </div>
            <label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
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
          {viewMode === "partner-practice" && <th className="p-2 text-center">Partner</th>}
        </tr>
      </thead>
      <tbody>
        {players.map((p, i) => (
          <tr
            key={p.id}
            className={`border-b hover:bg-gray-100 transition`}
          >
            <td className="p-2">{i + 1}</td>
            <td className="p-2 font-semibold flex items-center gap-2">
              {p.name}
              {p.gender === 'male' && <span className="text-blue-600 text-lg">♂</span>}
              {p.gender === 'female' && <span className="text-pink-600 text-lg">♀</span>}
            </td>
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
            {viewMode === "partner-practice" && (
              <td className="p-2 text-center">
                <select
                  value={p.partner_id || ""}
                  onChange={(e) => updatePlayerPartner(p.id, e.target.value || null)}
                  className="bg-gray-100 text-gray-700 border border-gray-300 rounded px-2 py-1 text-sm outline-none"
                >
                  <option value="">— No Partner —</option>
                  {players
                    .filter((other) => other.id !== p.id && !other.partner_id)
                    .map((other) => (
                      <option key={other.id} value={other.id}>
                        {other.name}
                      </option>
                    ))}
                  {p.partner_id && (
                    <option value={p.partner_id}>
                      {players.find((x) => x.id === p.partner_id)?.name || "Unknown"}
                    </option>
                  )}
                </select>
              </td>
            )}
          </tr>
        ))}
      </tbody>
    </table>

    {/* Refresh Partners Button */}
    {viewMode === "partner-practice" && (
      <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex justify-end">
        <button
          onClick={clearAllPartnerships}
          className="bg-orange-500 hover:bg-orange-600 active:bg-orange-700 text-white px-4 py-2 rounded font-semibold transition"
        >
          🔄 Refresh Partners
        </button>
      </div>
    )}
  </div>
)}

        {activeTab === "Previous Matches" && (
          <div className="bg-gray-700 rounded shadow p-4">
            {/* Add Match Button */}
            <div className="flex justify-center mb-4">
              <button
                onClick={() => confirmAddMatch()}
                className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2 rounded"
              >
                ➕ Add Match
              </button>
            </div>

            {previousMatches.length === 0 ? (
              <p className="text-gray-300 italic text-sm">No previous matches yet...</p>
            ) : (
              <div className="space-y-6">
                {matchesByWeek.map(({ week, dateKey, courtMatches }) => {
                  const date = dateKey;
                  const isOpen = openDates.includes(date);
                  const allMatches = [...(courtMatches.court1 || []), ...(courtMatches.court2 || [])];

                  // Group matches by round
                  const matchesByRound = {};
                  allMatches.forEach(match => {
                    const roundNum = match.round || 1;
                    if (!matchesByRound[roundNum]) {
                      matchesByRound[roundNum] = { court1: [], court2: [] };
                    }
                    const courtNum = (match.court === "court2" || match.court === "Court 2") ? "court2" : "court1";
                    matchesByRound[roundNum][courtNum].push(match);
                  });

                  const sortedRounds = Object.keys(matchesByRound)
                    .map(Number)
                    .sort((a, b) => a - b);

                  return (
                    <div key={`date-${week}`} className="border border-yellow-600 rounded-lg overflow-hidden bg-gray-800">
                      {/* Date Header */}
                      <button
                        onClick={() => {
                          if (isOpen) {
                            setOpenDates((prev) => prev.filter((d) => d !== date));
                          } else {
                            setOpenDates((prev) => (prev.includes(date) ? prev : [...prev, date]));
                          }
                        }}
                        className="w-full px-4 py-3 bg-gray-900 hover:bg-gray-800 flex items-center justify-between cursor-pointer text-left"
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">📅</span>
                          <div className="font-bold text-yellow-300 text-lg">{date}</div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold bg-yellow-600 text-white px-2 py-1 rounded">
                            {allMatches.length} match{allMatches.length === 1 ? "" : "es"}
                          </span>
                          <span className={`text-yellow-300 text-xl transition-transform ${isOpen ? "rotate-180" : ""}`}>
                            ▾
                          </span>
                        </div>
                      </button>

                      {/* Rounds and Courts */}
                      {isOpen && (
                        <div className="p-4 space-y-4 bg-gray-700">
                          {allMatches.length === 0 ? (
                            <p className="text-gray-400 text-sm italic">No matches recorded</p>
                          ) : (
                            sortedRounds.map((roundNum) => (
                              <div key={`round-${roundNum}`} className="border border-gray-600 rounded-lg p-3 bg-gray-800">
                                {/* Round Number */}
                                <div className="text-sm font-bold text-yellow-400 mb-3 pb-2 border-b border-gray-600">
                                  🔁 Round {roundNum}
                                </div>

                                {/* Court Matches */}
                                <div className="space-y-3">
                                  {/* Court 1 */}
                                  {matchesByRound[roundNum].court1.length > 0 && (
                                    <div className="bg-gray-900 border border-gray-600 rounded-lg p-3">
                                      <div className="text-sm font-bold text-yellow-400 mb-2">🎾 Court 1</div>
                                      <div className="space-y-2">
                                        {matchesByRound[roundNum].court1.map((m, idx) => (
                                          <div key={idx} className="bg-gray-800 rounded p-2">
                                            <div className="flex items-center justify-between mb-2">
                                              <div className="flex-1"></div>
                                              <button
                                                onClick={() => requestEditMatch(m)}
                                                className="text-xs bg-blue-600 hover:bg-blue-500 text-white px-2 py-1 rounded"
                                              >
                                                Edit
                                              </button>
                                            </div>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                              {/* Team 1 */}
                                              <div className="text-center">
                                                <div className="text-xs font-semibold text-gray-300 mb-1">
                                                  {m.players
                                                    .slice(0, 2)
                                                    .map((id) => getPlayerNameFromId(id))
                                                    .join(" & ")}
                                                </div>
                                                <div className="text-2xl font-bold text-yellow-400">
                                                  {m.scores?.team1 ?? "—"}
                                                </div>
                                              </div>
                                              {/* Team 2 */}
                                              <div className="text-center">
                                                <div className="text-xs font-semibold text-gray-300 mb-1">
                                                  {m.players
                                                    .slice(2, 4)
                                                    .map((id) => getPlayerNameFromId(id))
                                                    .join(" & ")}
                                                </div>
                                                <div className="text-2xl font-bold text-yellow-400">
                                                  {m.scores?.team2 ?? "—"}
                                                </div>
                                              </div>
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  )}

                                  {/* Court 2 */}
                                  {matchesByRound[roundNum].court2.length > 0 && (
                                    <div className="bg-gray-900 border border-gray-600 rounded-lg p-3">
                                      <div className="text-sm font-bold text-yellow-400 mb-2">🎾 Court 2</div>
                                      <div className="space-y-2">
                                        {matchesByRound[roundNum].court2.map((m, idx) => (
                                          <div key={idx} className="bg-gray-800 rounded p-2">
                                            <div className="flex items-center justify-between mb-2">
                                              <div className="flex-1"></div>
                                              <button
                                                onClick={() => requestEditMatch(m)}
                                                className="text-xs bg-blue-600 hover:bg-blue-500 text-white px-2 py-1 rounded"
                                              >
                                                Edit
                                              </button>
                                            </div>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                              {/* Team 1 */}
                                              <div className="text-center">
                                                <div className="text-xs font-semibold text-gray-300 mb-1">
                                                  {m.players
                                                    .slice(0, 2)
                                                    .map((id) => getPlayerNameFromId(id))
                                                    .join(" & ")}
                                                </div>
                                                <div className="text-2xl font-bold text-yellow-400">
                                                  {m.scores?.team1 ?? "—"}
                                                </div>
                                              </div>
                                              {/* Team 2 */}
                                              <div className="text-center">
                                                <div className="text-xs font-semibold text-gray-300 mb-1">
                                                  {m.players
                                                    .slice(2, 4)
                                                    .map((id) => getPlayerNameFromId(id))
                                                    .join(" & ")}
                                                </div>
                                                <div className="text-2xl font-bold text-yellow-400">
                                                  {m.scores?.team2 ?? "—"}
                                                </div>
                                              </div>
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {activeTab === "Seasons" && (
          <div className="bg-white text-gray-700 rounded shadow p-4">
            {/* Testing view with Season Summaries stats only */}
            {seasonSummariesList.length === 0 ? (
              <p className="text-gray-500 italic text-sm">No season summaries yet...</p>
            ) : (
              <div className="space-y-4">
                {seasonSummariesList.map((summary) => {
                  const sKey = `testing-season-${summary.id}`;
                  const sOpen = openDates.includes(sKey);

                  // Calculate summary stats
                  const allMatches = summary.matches || [];
                  const highestScoringMatch = allMatches.length > 0 ? allMatches.reduce((max, m) => {
                    const score1 = Number(m.scores?.team1 || 0);
                    const score2 = Number(m.scores?.team2 || 0);
                    const total = score1 + score2;
                    return total > (Number(max.scores?.team1 || 0) + Number(max.scores?.team2 || 0)) ? m : max;
                  }) : null;
                  const avgPoints = allMatches.length > 0 ? (allMatches.reduce((sum, m) => sum + Number(m.scores?.team1 || 0) + Number(m.scores?.team2 || 0), 0) / allMatches.length).toFixed(1) : 0;
                  
                  // Most Active Player (appeared in most matches)
                  const playerMatchCount = {};
                  allMatches.forEach((m) => {
                    if (Array.isArray(m.players)) {
                      m.players.forEach((p) => {
                        playerMatchCount[p] = (playerMatchCount[p] || 0) + 1;
                      });
                    }
                  });
                  const mostActivePlayerId = Object.keys(playerMatchCount).length > 0 ? Object.entries(playerMatchCount).sort((a, b) => b[1] - a[1])[0][0] : null;
                  const mostActivePlayer = mostActivePlayerId ? (summary.final_standings || []).find((p) => p.id === mostActivePlayerId) : null;

                  return (
                    <details
                      key={sKey}
                      open={sOpen}
                      onToggle={(e) => {
                        if (e.currentTarget.open) {
                          setOpenDates((prev) => (prev.includes(sKey) ? prev : [...prev, sKey]));
                        } else {
                          setOpenDates((prev) => prev.filter((d) => d !== sKey));
                        }
                      }}
                      className="rounded-lg border border-gray-300 bg-gray-50 overflow-hidden"
                    >
                      <summary className="list-none cursor-pointer select-none px-3 py-2 flex items-center justify-between hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-yellow-400">
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <span className="text-lg shrink-0">📦</span>
                          <div className="min-w-0">
                            <div className="font-semibold text-yellow-600 text-sm truncate">
                              {summary.name || (summary.timestamp ? new Date(summary.timestamp).toLocaleDateString() : 'Unknown')}
                            </div>
                            <div className="text-xs text-gray-500">{divisions.find((d) => d.id === summary.division)?.name || `Division ${summary.division}`}</div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0 ml-2">
                          <span
                            className={`text-yellow-600 text-lg transition-transform duration-200 ${
                              sOpen ? "rotate-180" : "rotate-0"
                            }`}
                            aria-hidden="true"
                          >
                            ▾
                          </span>
                        </div>
                      </summary>

                      <div className="p-3 bg-gray-50 space-y-3">
                        {/* Final Standings */}
                        {(summary.final_standings || []).length > 0 && (
                          <div>
                            <div className="text-xs font-bold text-yellow-600 mb-2">🥇 Final Standings</div>
                            <div className="bg-white rounded border border-gray-300 overflow-hidden text-xs">
                              <div className="grid grid-cols-14 gap-0.5 p-2 bg-gray-100 font-bold text-gray-600 border-b border-gray-300">
                                <div className="col-span-1 text-center">#</div>
                                <div className="col-span-4">Name</div>
                                <div className="col-span-1 text-center">GP</div>
                                <div className="col-span-1 text-center text-green-600">W</div>
                                <div className="col-span-1 text-center text-red-500">L</div>
                                <div className="col-span-1 text-center text-yellow-600">D</div>
                                <div className="col-span-1 text-center text-blue-600">W%</div>
                                <div className="col-span-1 text-center text-blue-600">Diff</div>
                                <div className="col-span-2 text-right">Pts</div>
                              </div>
                              {(summary.final_standings || []).slice(0, 8).map((p, idx) => {
                                const gp = (p.wins || 0) + (p.losses || 0) + (p.draws || 0);
                                const winPct = gp > 0 ? ((p.wins || 0) / gp * 100).toFixed(0) : '0';
                                const diff = (p.points_for || 0) - (p.points_against || 0);
                                return (
                                  <div key={idx} className="grid grid-cols-14 gap-0.5 p-2 hover:bg-gray-100 border-b border-gray-300 last:border-b-0">
                                    <div className="col-span-1 text-center font-bold text-yellow-600">{p.position}</div>
                                    <div className="col-span-4 text-gray-700 truncate">{p.name}</div>
                                    <div className="col-span-1 text-center text-gray-600">{gp}</div>
                                    <div className="col-span-1 text-center text-green-600 font-semibold">{p.wins || 0}</div>
                                    <div className="col-span-1 text-center text-red-600 font-semibold">{p.losses || 0}</div>
                                    <div className="col-span-1 text-center text-yellow-600 font-semibold">{p.draws || 0}</div>
                                    <div className="col-span-1 text-center text-blue-600 font-bold">{winPct}%</div>
                                    <div className="col-span-1 text-center font-bold" style={{color: diff >= 0 ? '#16a34a' : '#dc2626'}}>{diff >= 0 ? '+' : ''}{diff}</div>
                                    <div className="col-span-2 text-right font-bold text-blue-600">{p.points || 0}</div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {/* Bump Chart - Position Progression */}
                        {(summary.tracker || []).length > 1 && (
                          <div>
                            <div className="text-xs font-bold text-yellow-600 mb-3">📊 Position Over Time</div>
                            <div className="bg-gray-800 rounded-lg overflow-hidden p-6">
                              {(() => {
                                // Extract all unique players and their position data
                                const playerPositions = {};
                                (summary.tracker || []).forEach((entry, matchIdx) => {
                                  (entry.positions || []).forEach((p) => {
                                    if (!playerPositions[p.id]) {
                                      playerPositions[p.id] = { name: p.name, positions: [] };
                                    }
                                    playerPositions[p.id].positions[matchIdx] = p.position;
                                  });
                                });

                                const playerList = Object.entries(playerPositions);
                                const numMatches = summary.tracker.length;
                                
                                // Calculate maximum rank from all players
                                const maxRank = Math.max(
                                  ...playerList.flatMap(([_, data]) => data.positions.filter(p => p !== undefined)),
                                  5
                                );

                                const rowHeight = 28;
                                const topPadding = 25;
                                const bottomPadding = 25;
                                const chartHeight = topPadding + maxRank * rowHeight + bottomPadding;
                                const viewBoxWidth = Math.max(800, numMatches * 80);

                                // Color palette for lines
                                const colors = ['#f59e0b', '#34d399', '#60a5fa', '#818cf8', '#fb7185', '#a855f7', '#f97316', '#22c55e', '#38bdf8', '#f43f5e'];

                                return (
                                  <svg width="100%" height={Math.max(400, chartHeight)} className="min-w-full" viewBox={`0 0 ${viewBoxWidth} ${chartHeight}`}>
                                    {/* Background grid */}
                                    {summary.tracker.map((_, weekIdx) => (
                                      <line
                                        key={`grid-v-${weekIdx}`}
                                        x1={80 + weekIdx * 80}
                                        y1={topPadding}
                                        x2={80 + weekIdx * 80}
                                        y2={topPadding + maxRank * rowHeight}
                                        stroke="#374151"
                                        strokeWidth="0.5"
                                        strokeDasharray="2,2"
                                      />
                                    ))}
                                    {Array.from({ length: maxRank }).map((_, i) => (
                                      <line
                                        key={`grid-h-${i}`}
                                        x1="50"
                                        y1={topPadding + i * rowHeight}
                                        x2={viewBoxWidth - 20}
                                        y2={topPadding + i * rowHeight}
                                        stroke="#374151"
                                        strokeWidth="0.5"
                                        strokeDasharray="2,2"
                                      />
                                    ))}

                                    {/* Y-axis (rankings) */}
                                    {Array.from({ length: maxRank }).map((_, i) => (
                                      <text key={`y-label-${i}`} x="40" y={topPadding + 10 + i * rowHeight} fontSize="10" fontWeight="600" textAnchor="end" fill="#9CA3AF">
                                        {i + 1}
                                      </text>
                                    ))}

                                    {/* X-axis (matches) */}
                                    {summary.tracker.map((_, weekIdx) => (
                                      <text key={`x-label-${weekIdx}`} x={80 + weekIdx * 80} y={topPadding + maxRank * rowHeight + 18} fontSize="9" textAnchor="middle" fill="#9CA3AF">
                                        Match {weekIdx + 1}
                                      </text>
                                    ))}

                                    {/* Y-axis and X-axis lines */}
                                    <line x1="50" y1={topPadding} x2="50" y2={topPadding + maxRank * rowHeight} stroke="#6B7280" strokeWidth="2" />
                                    <line x1="50" y1={topPadding + maxRank * rowHeight} x2={viewBoxWidth - 20} y2={topPadding + maxRank * rowHeight} stroke="#6B7280" strokeWidth="2" />

                                    {/* Player lines and dots with position numbers */}
                                    {playerList.map(([playerId, playerData], playerIdx) => {
                                      const points = playerData.positions
                                        .map((pos, matchIdx) => {
                                          if (pos === undefined) return null;
                                          const x = 80 + matchIdx * 80;
                                          const y = topPadding + (pos - 1) * rowHeight;
                                          return `${x},${y}`;
                                        })
                                        .filter(Boolean)
                                        .join(' ');

                                      const color = colors[playerIdx % colors.length];

                                      return (
                                        <g key={playerId}>
                                          {/* Line */}
                                          <polyline
                                            points={points}
                                            fill="none"
                                            stroke={color}
                                            strokeWidth="2.5"
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            opacity="0.85"
                                          />
                                          {/* Dots with position numbers */}
                                          {playerData.positions.map((pos, matchIdx) => {
                                            if (pos === undefined) return null;
                                            const cx = 80 + matchIdx * 80;
                                            const cy = topPadding + (pos - 1) * rowHeight;
                                            return (
                                              <g key={`dot-${matchIdx}`}>
                                                {/* Colored dot */}
                                                <circle
                                                  cx={cx}
                                                  cy={cy}
                                                  r="4"
                                                  fill={color}
                                                  opacity="0.95"
                                                />
                                                {/* Position number text */}
                                                <text
                                                  x={cx}
                                                  y={cy}
                                                  textAnchor="middle"
                                                  dominantBaseline="middle"
                                                  fontSize="7.5"
                                                  fontWeight="700"
                                                  fill="white"
                                                  pointerEvents="none"
                                                >
                                                  {pos}
                                                </text>
                                              </g>
                                            );
                                          })}
                                          {/* End label with player name */}
                                          {playerData.positions.length > 0 && playerData.positions[playerData.positions.length - 1] !== undefined && (
                                            <text
                                              x={80 + (playerData.positions.length - 1) * 80 + 12}
                                              y={topPadding + (playerData.positions[playerData.positions.length - 1] - 1) * rowHeight + 4}
                                              fontSize="11"
                                              fontWeight="600"
                                              fill={color}
                                            >
                                              {playerData.name}
                                            </text>
                                          )}
                                        </g>
                                      );
                                    })}
                                  </svg>
                                );
                              })()}
                            </div>
                          </div>
                        )}

                        {/* Top By Points */}
                        <div>
                          <div className="text-xs font-bold text-yellow-600 mb-2">⭐ Top By Points</div>
                          <div className="space-y-1">
                            {(summary.topByPoints || summary.top_by_points || []).length === 0 ? (
                              <p className="text-gray-500 text-xs italic">No data</p>
                            ) : (
                              (summary.topByPoints || summary.top_by_points || []).slice(0, 3).map((p, idx) => (
                                <div key={idx} className="bg-white p-2 rounded text-xs flex items-center justify-between border border-gray-300">
                                  <span className="font-semibold text-gray-700">{p.name}</span>
                                  <span className="text-blue-600 font-bold">{p.points ?? 0}</span>
                                </div>
                              ))
                            )}
                          </div>
                        </div>

                        {/* Top By Wins */}
                        <div>
                          <div className="text-xs font-bold text-yellow-600 mb-2">🏆 Top By Wins</div>
                          <div className="space-y-1">
                            {(summary.topByWins || summary.top_by_wins || []).length === 0 ? (
                              <p className="text-gray-500 text-xs italic">No data</p>
                            ) : (
                              (summary.topByWins || summary.top_by_wins || []).slice(0, 3).map((p, idx) => (
                                <div key={idx} className="bg-white p-2 rounded text-xs flex items-center justify-between border border-gray-300">
                                  <span className="font-semibold text-gray-700">{p.name}</span>
                                  <span className="text-purple-600 font-bold">{p.wins ?? 0}</span>
                                </div>
                              ))
                            )}
                          </div>
                        </div>

                        {/* Highest Scoring Match */}
                        {highestScoringMatch && (
                          <div>
                            <div className="text-xs font-bold text-yellow-600 mb-2">🔥 Highest Scoring Match</div>
                            <div className="bg-white p-2 rounded text-xs border border-gray-300">
                              <div className="flex items-center justify-between">
                                <span className="font-semibold text-gray-700 truncate flex-1">
                                  {Array.isArray(highestScoringMatch.players) ? highestScoringMatch.players.slice(0,2).map((id) => (typeof id === 'object' ? id.name : getPlayerNameFromId(id))).join(' & ') : 'Match'}
                                </span>
                                <span className="text-yellow-600 font-bold ml-1">{highestScoringMatch.scores?.team1 ?? "—"}</span>
                              </div>
                              <div className="flex items-center justify-between">
                                <span className="font-semibold text-gray-700 truncate flex-1">
                                  {Array.isArray(highestScoringMatch.players) ? highestScoringMatch.players.slice(2,4).map((id) => (typeof id === 'object' ? id.name : getPlayerNameFromId(id))).join(' & ') : 'Match'}
                                </span>
                                <span className="text-yellow-600 font-bold ml-1">{highestScoringMatch.scores?.team2 ?? "—"}</span>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Average Points Per Match */}
                        <div>
                          <div className="text-xs font-bold text-yellow-600 mb-2">📊 Average Points Per Match</div>
                          <div className="bg-white p-2 rounded text-xs border border-gray-300 flex items-center justify-between">
                            <span className="text-gray-700">Avg Score</span>
                            <span className="text-green-600 font-bold">{avgPoints}</span>
                          </div>
                        </div>

                        {/* Most Active Player */}
                        {mostActivePlayer && (
                          <div>
                            <div className="text-xs font-bold text-yellow-600 mb-2">👤 Most Active Player</div>
                            <div className="bg-white p-2 rounded text-xs border border-gray-300 flex items-center justify-between">
                              <span className="font-semibold text-gray-700">{mostActivePlayer.name}</span>
                              <span className="text-orange-600 font-bold">{playerMatchCount[mostActivePlayerId]} matches</span>
                            </div>
                          </div>
                        )}

                        {/* Total Matches */}
                        <div>
                          <div className="text-xs font-bold text-yellow-600 mb-2">📈 Total Matches</div>
                          <div className="bg-white p-2 rounded text-xs border border-gray-300 flex items-center justify-between">
                            <span className="text-gray-700">Matches Played</span>
                            <span className="text-blue-600 font-bold">{allMatches.length}</span>
                          </div>
                        </div>
                      </div>
                    </details>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </section>

      {showRecalculateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50">
          <div className="bg-gray-900 rounded-xl shadow-xl p-6 w-80 border border-gray-700">
            <h2 className="text-lg font-bold text-blue-400 mb-4 text-center">
              Recalculate Standings
            </h2>
            <p className="text-gray-300 mb-4 text-center text-sm">
              Are you sure you want to recalculate standings? This may take a moment.
            </p>

            <div className="flex justify-between mt-5">
              <button
                onClick={() => {
                  setShowRecalculateModal(false);
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
              Are you sure you want to end this season? This will archive a summary and reset the leaderboard.
            </p>

            <div className="flex justify-between mt-5">
              <button
                onClick={() => {
                  setShowResetModal(false);
                }}
                className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded text-sm"
              >
                Cancel
              </button>

              <button
                onClick={async () => {
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

                        // Fetch current season name from running_seasons table
                        let seasonName = null;
                        try {
                          const { data: runningSeason } = await db('running_seasons').select('name').eq('division', division).maybeSingle();
                          if (runningSeason?.name) {
                            seasonName = runningSeason.name;
                          }
                        } catch (e) {
                          console.warn('Failed to fetch running season name:', e);
                        }

                        const summary = {
                          id: `season_summary_${division}_${Date.now()}`,
                          division,
                          name: seasonName,
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
                          const insertPayload = {
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
                          };
                          if (summary.name) {
                            insertPayload.name = summary.name;
                          }
                          const { data: insertData, error: insertError } = await supabase
                            .from(seasonsTable)
                            .insert([insertPayload]);

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
                        } catch (e) {
                          console.error("Error opening post-end modal:", e);
                          // If the modal can't open, keep user on the current page and log the error.
                        }
                      } catch (err) {
                        console.error("Error ending season:", err);
                      }
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

      {/* Add Player Modal */}
      {showAddPlayerModal && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50">
          <div className="bg-gray-900 rounded-xl shadow-xl p-6 w-96 border border-gray-700">
            <h2 className="text-xl font-bold text-blue-400 mb-4">👤 Add Player</h2>

            {/* Player Name Input */}
            <div className="mb-4">
              <label className="text-gray-300 text-sm block mb-2">Player Name</label>
              <input
                type="text"
                value={newPlayerName}
                onChange={(e) => setNewPlayerName(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleConfirmAddPlayer()}
                placeholder="Enter player name"
                className="w-full px-4 py-2 rounded bg-gray-800 text-white border border-gray-600 focus:outline-none focus:border-blue-400"
                autoFocus
              />
            </div>

            {/* Gender Selection */}
            <div className="mb-6">
              <label className="text-gray-300 text-sm block mb-2">Gender (Optional)</label>
              <div className="flex gap-3">
                <button
                  onClick={() => setNewPlayerGender(newPlayerGender === 'male' ? null : 'male')}
                  className={`flex-1 py-2 px-4 rounded font-semibold transition ${
                    newPlayerGender === 'male' 
                      ? 'bg-blue-500 text-white shadow-md' 
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  ♂ Male
                </button>
                <button
                  onClick={() => setNewPlayerGender(newPlayerGender === 'female' ? null : 'female')}
                  className={`flex-1 py-2 px-4 rounded font-semibold transition ${
                    newPlayerGender === 'female' 
                      ? 'bg-pink-500 text-white shadow-md' 
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  ♀ Female
                </button>
              </div>
            </div>

            {/* Buttons */}
            <div className="flex gap-3">
              <button
                onClick={() => setShowAddPlayerModal(false)}
                className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-2 rounded"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmAddPlayer}
                className="flex-1 bg-blue-600 hover:bg-blue-500 text-white py-2 rounded font-semibold"
              >
                Add Player
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Remove Player Confirmation Modal */}
      {showRemovePlayerModal && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50">
          <div className="bg-gray-900 rounded-xl shadow-xl p-6 w-80 border border-gray-700">
            <h2 className="text-lg font-bold text-red-400 mb-4 text-center">
              Remove Player
            </h2>
            <p className="text-gray-300 mb-4 text-center text-sm">
              Are you sure you want to remove <span className="font-semibold">{selectedPlayerToRemove?.name}</span>?
            </p>

            <div className="flex justify-between mt-5">
              <button
                onClick={() => {
                  setShowRemovePlayerModal(false);
                  setSelectedPlayerToRemove(null);
                }}
                className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded text-sm"
              >
                Cancel
              </button>

              <button
                onClick={confirmRemovePlayer}
                className="bg-red-600 hover:bg-red-500 text-white px-4 py-2 rounded text-sm"
              >
                Remove
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