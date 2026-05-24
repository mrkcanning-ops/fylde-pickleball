"use client";

import { useState, useEffect } from "react";
import HeaderStats from "../components/HeaderStats";
import { supabase } from "../lib/supabase";

export default function HomePage() {
  const [activeTab, setActiveTab] = useState("Standings");
  const [division, setDivision] = useState(1); // 1 or 2
  const [players, setPlayers] = useState([]);

  const [court1Matches, setCourt1Matches] = useState([]);
  const [court2Matches, setCourt2Matches] = useState([]);

  const [court1Scores, setCourt1Scores] = useState([]);
  const [court2Scores, setCourt2Scores] = useState([]);

  const [court1Round, setCourt1Round] = useState(0);
const [court2Round, setCourt2Round] = useState(0);

  const [currentRound, setCurrentRound] = useState(0);
const [roundMatches, setRoundMatches] = useState([]); // flattened all matches by round

const [isAdmin, setIsAdmin] = useState(false);
const [showAdminModal, setShowAdminModal] = useState(false);
const [adminCode, setAdminCode] = useState("");
const [adminError, setAdminError] = useState("");

const [previousMatches, setPreviousMatches] = useState([]);

  const [leaderboard, setLeaderboard] = useState([]);
  const [openDates, setOpenDates] = useState([]); // dates that are expanded

  const toggleDate = (date) => {
    setOpenDates((prev) =>
      prev.includes(date) ? prev.filter((d) => d !== date) : [...prev, date]
    );
  }; 

  const [showResetModal, setShowResetModal] = useState(false);
const [resetPasswordInput, setResetPasswordInput] = useState("");
const [resetError, setResetError] = useState("");
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

  // Load leaderboard from localStorage if needed
  useEffect(() => {
    const saved = JSON.parse(localStorage.getItem("leaderboard")) || [];
    setLeaderboard(saved);
    fetchAllDivisionPlayers();
  }, []);

  const resetLeaderboard = () => {
    const code = prompt("Enter admin passcode to reset leaderboard:");
    if (!code) return;

    const envPasscode = process.env.NEXT_PUBLIC_ADMIN_PASSCODE;

    if (code.trim() === envPasscode?.trim()) {
      const confirmed = confirm("Are you sure you want to reset the leaderboard?");
      if (!confirmed) return;

      setLeaderboard([]);
      localStorage.removeItem("leaderboard");
      alert("Leaderboard reset ✅");
    } else {
      alert("Incorrect passcode ❌");
    }
  };

  const recalculateStandings = async () => {
    if (!supabase) return;

    // 1) Get players for current division only.
    const { data: players } = await supabase
      .from("players")
      .select("*")
      .eq("division", division);

    if (!players || players.length === 0) return;

    // 2) Get matches in deterministic chronological order for this division.
      const { data: matches } = await supabase
        .from("previous_matches")
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
      const { error } = await supabase
        .from("players")
        .update(playerStats[playerId])
        .eq("id", playerId);

      if (error) {
        console.error(`Failed to update player ${playerId}:`, error);
      }
    }
  };

const updatePlayerStatsFromMatches = async () => {
  const { data: matches } = await supabase
    .from("previous_matches")
    .select("*")
    .order("created_at", { ascending: true });

  for (const match of matches) {
    const playersArray = JSON.parse(match.players);

const team1 = playersArray.slice(0, 2);
const team2 = playersArray.slice(2, 4);
    const score1 = Number(match.scores.team1);
    const score2 = Number(match.scores.team2);

    // Determine result
    let resultTeam1, resultTeam2;
    if (score1 > score2) {
      resultTeam1 = "win";
      resultTeam2 = "loss";
    } else if (score1 < score2) {
      resultTeam1 = "loss";
      resultTeam2 = "win";
    } else {
      resultTeam1 = "draw";
      resultTeam2 = "draw";
    }

    // Helper to update stats
    const updateStats = async (playerName, result, scored, conceded) => {
      const { data: player } = await supabase
        .from("players")
        .select("*")
        .eq("id", playerId)
        .single();

        console.log("Looking for:", name);
  console.log("Found:", player);

      if (!player) return;

      const updated = {
        wins: player.wins,
        losses: player.losses,
        draws: player.draws,
        points: player.points,
        points_for: player.points_for || 0,
        points_against: player.points_against || 0,
        win_streak: player.win_streak || 0,
      };

      // Increment result
      if (result === "win") {
        updated.wins += 1;
        updated.points += 3; // 3 points per win
        updated.win_streak += 1;
      } else if (result === "loss") {
        updated.losses += 1;
        updated.win_streak = 0;
      } else {
        updated.draws += 1;
        updated.points += 1; // 1 point per draw
        updated.win_streak = 0;
      }

      updated.points_for += scored;
      updated.points_against += conceded;

      await supabase
        .from("players")
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
  const { data, error } = await supabase
    .from("previous_matches")
    .select("*")
    .eq("division", division)
    .order("created_at", { ascending: false }); // Most recent first

  if (error) {
    console.error("Error fetching previous matches:", error);
  } else {
    setPreviousMatches(data || []);
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

  const sortPlayersByStats = (players) => {
    return [...players].sort((a, b) => {
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
      // 1. Win % (descending)
      if (bWinPct !== aWinPct) return bWinPct - aWinPct;
      // 2. Point Diff (descending)
      if (bDiff !== aDiff) return bDiff - aDiff;
      // 3. Games Played (descending)
      if (bGP !== aGP) return bGP - aGP;
      // 4. Alphabetically (ascending)
      return (a.name || "").localeCompare(b.name || "");
    });
  };

  const fetchPlayers = async () => {
    const { data, error } = await supabase
      .from("players")
      .select("*")
      .eq("division", division); // filter by current division

    if (!error) {
      const processed = (data || []).map((p) => ({
        ...p,
        win_streak: p.win_streak || 0,
        improved: 0,
      }));

      const prevPositions = {};
      const { data: divisionMatches, error: matchesError } = await supabase
        .from("previous_matches")
        .select("players,scores,created_at")
        .eq("division", division)
        .order("created_at", { ascending: true });

      if (!matchesError && Array.isArray(divisionMatches) && divisionMatches.length > 0) {
        const matchesByDate = {};
        for (const match of divisionMatches) {
          const dateKey = match.created_at ? String(match.created_at).split("T")[0] : "unknown";
          if (!matchesByDate[dateKey]) matchesByDate[dateKey] = [];
          matchesByDate[dateKey].push(match);
        }

        const orderedDates = Object.keys(matchesByDate).sort();
        const runningStats = {};
        processed.forEach((p) => {
          runningStats[p.id] = {
            wins: 0,
            losses: 0,
            draws: 0,
            points: 0,
            points_for: 0,
            points_against: 0,
          };
        });

        const rankSnapshots = [];
        for (const dateKey of orderedDates) {
          const dayMatches = matchesByDate[dateKey];

          for (const match of dayMatches) {
            const playersArray = Array.isArray(match.players)
              ? match.players
              : JSON.parse(match.players || "[]");

            const team1 = playersArray.slice(0, 2);
            const team2 = playersArray.slice(2, 4);
            const score1 = Number(match.scores?.team1 || 0);
            const score2 = Number(match.scores?.team2 || 0);

            const applyResult = (playerId, scored, conceded, result) => {
              if (!runningStats[playerId]) return;
              runningStats[playerId].points_for += scored;
              runningStats[playerId].points_against += conceded;

              if (result === "win") {
                runningStats[playerId].wins += 1;
                runningStats[playerId].points += 3;
              } else if (result === "loss") {
                runningStats[playerId].losses += 1;
              } else {
                runningStats[playerId].draws += 1;
                runningStats[playerId].points += 1;
              }
            };

            if (score1 > score2) {
              team1.forEach((id) => applyResult(id, score1, score2, "win"));
              team2.forEach((id) => applyResult(id, score2, score1, "loss"));
            } else if (score1 < score2) {
              team1.forEach((id) => applyResult(id, score1, score2, "loss"));
              team2.forEach((id) => applyResult(id, score2, score1, "win"));
            } else {
              team1.forEach((id) => applyResult(id, score1, score2, "draw"));
              team2.forEach((id) => applyResult(id, score2, score1, "draw"));
            }
          }

          const rankedAtDate = sortPlayersByStats(
            processed.map((p) => ({
              ...p,
              ...runningStats[p.id],
            }))
          );

          const rankMap = {};
          rankedAtDate.forEach((p, index) => {
            rankMap[p.id] = index + 1;
          });
          rankSnapshots.push(rankMap);
        }

        if (rankSnapshots.length >= 2) {
          const previousSnapshot = rankSnapshots[rankSnapshots.length - 2];
          Object.assign(prevPositions, previousSnapshot);
        }
      }

      // Sort using new criteria and calculate positionChange based on new positions
      const sorted = sortPlayersByStats(processed);

      const withPositionChange = sorted.map((p, index) => ({
        ...p,
        positionChange:
          prevPositions[p.id] !== undefined
            ? prevPositions[p.id] - (index + 1)
            : 0,
      }));

      setPlayers(withPositionChange);
      return withPositionChange;
    }

    return [];
  };

  const toggleDivision = () => {
    const newDivision = division === 1 ? 2 : 1;
    setDivision(newDivision);
    fetchAllDivisionPlayers(newDivision);
  };

  const fetchAllDivisionPlayers = async (divisionNum = division) => {
    const { data, error } = await supabase
      .from("players")
      .select("*")
      .eq("division", divisionNum)
      .order("name", { ascending: true });

    if (!error) {
      setAllDivisionPlayers(data || []);
    }
  };

  const handleAddPlayer = async () => {
    const name = prompt("Enter new player's name:");
    if (!name) return;

    const { data, error } = await supabase
      .from("players")
      .insert([{ name, wins: 0, draws: 0, losses: 0, points: 0, active: true, division }])
      .select();

    if (!error) setPlayers((prev) => [...prev, data[0]]);
  };

  const toggleAvailability = async (id) => {
    const player = players.find((p) => p.id === id);
    const newActive = !player.active;

    await supabase.from("players").update({ active: newActive }).eq("id", id);

    setPlayers((prev) =>
      prev.map((p) => (p.id === id ? { ...p, active: newActive } : p))
    );
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
    <div className="flex flex-col items-center gap-2 select-none">
      <span className="bg-yellow-500 text-gray-950 font-extrabold text-2xl px-5 py-2 rounded-full leading-none">
        Division {division}
      </span>
      <span className="bg-gray-700 text-gray-300 font-semibold text-xs px-3 py-1 rounded-full border border-gray-500">
        Division {division === 1 ? 2 : 1}
      </span>
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

  const tabs = ["Standings", "Matches", "Players", "Previous Matches"];

  // Group matches by date
  const groupMatchesByDate = () => {
    const grouped = {};
    
    previousMatches.forEach((match) => {
      const date = match.created_at ? new Date(match.created_at).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      }) : 'Unknown Date';
      
      if (!grouped[date]) {
        grouped[date] = { court1: [], court2: [] };
      }
      
      // Separate by court
      if (match.court === 'court1' || match.court === 'Court 1') {
        grouped[date].court1.push(match);
      } else if (match.court === 'court2' || match.court === 'Court 2') {
        grouped[date].court2.push(match);
      }
    });
    
    // Return as array sorted by date (already in chronological order from most recent)
    return Object.entries(grouped);
  };

  const matchesByDate = groupMatchesByDate();

  // Helper function to convert player IDs to names
  const getPlayerNameFromId = (playerId) => {
    const player = players.find(p => p.id === playerId);
    return player ? player.name : 'Unknown Player';
  };

  // Compute last N results for a player from `previousMatches` (most recent first)
  const computePlayerForm = (playerId, limit = 10) => {
    const results = [];
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
    const { error: upsertError } = await supabase
      .from("pending_fixtures")
      .upsert(payload, { onConflict: "division" });

    if (!upsertError) return;

    // Fallback for tables without a unique constraint on division.
    if (String(upsertError.message || "").toLowerCase().includes("on conflict")) {
      const { error: deleteError } = await supabase
        .from("pending_fixtures")
        .delete()
        .eq("division", division);

      if (deleteError) {
        console.error("Error deleting previous pending fixtures:", deleteError);
        alert(`Fixtures generated locally, but could not be shared live: ${deleteError.message}`);
        return;
      }

      const { error: insertError } = await supabase.from("pending_fixtures").insert(payload);
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
    const { error } = await supabase.from("pending_fixtures").delete().eq("division", division);
    if (error) {
      console.error("Error clearing pending fixtures:", error);
    }
  };

  const loadPendingFixtures = async (playerPool = []) => {
    const { data, error } = await supabase
      .from("pending_fixtures")
      .select("*")
      .eq("division", division)
      .order("created_at", { ascending: false })
      .limit(1);

    if (error || !data || data.length === 0) return;

    const pending = data[0];
    const availablePlayers = playerPool.length ? playerPool : players;
    const findPlayer = (id) => availablePlayers.find((p) => p.id === id) || { id, name: "Unknown Player" };

    const mappedCourt1Matches = (pending.court1_matches || []).map((match) => [
      (match[0] || []).map(findPlayer),
      (match[1] || []).map(findPlayer),
    ]);

    const mappedCourt2Matches = (pending.court2_matches || []).map((match) => [
      (match[0] || []).map(findPlayer),
      (match[1] || []).map(findPlayer),
    ]);

    const mappedCourt1Byes = (pending.court1_byes || []).map((round) => (round || []).map(findPlayer));
    const mappedCourt2Byes = (pending.court2_byes || []).map((round) => (round || []).map(findPlayer));

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

  const court1 = buildCourt(court1Group);
  const court2 = buildCourt(court2Group);

  console.log("Court1 matches preview:", court1.matches);
console.log("Court2 matches preview:", court2.matches);

  setCourt1Matches(court1.matches);
  setCourt1Scores(court1.matches.map(() => ({ team1: "", team2: "" })));
  setCourt1Round(0);

  setCourt2Matches(court2.matches);
  setCourt2Scores(court2.matches.map(() => ({ team1: "", team2: "" })));
  setCourt2Round(0);

  setRoundMatches({
    court1: court1.byes,
    court2: court2.byes,
  });

  await savePendingFixtures(
    court1.matches,
    court2.matches,
    court1.matches.map(() => ({ team1: "", team2: "" })),
    court2.matches.map(() => ({ team1: "", team2: "" })),
    { court1: court1.byes, court2: court2.byes }
  );
};

  const updateScore = (idx, team, value, court) => {
  if (court === "court1") {
    const newScores = [...court1Scores];
    if (!newScores[idx]) newScores[idx] = { team1: "", team2: "" };
    newScores[idx][team] = value; // keep as string
    setCourt1Scores(newScores);
  } else {
    const newScores = [...court2Scores];
    if (!newScores[idx]) newScores[idx] = { team1: "", team2: "" };
    newScores[idx][team] = value; // keep as string
    setCourt2Scores(newScores);
  }
};

const saveMatches = async () => {
  try {
    // Helper to format matches for saving
    const formatMatches = (matches, scores, court) => {
      return matches.map((m, idx) => ({
        court,
        division,
        // Use player IDs instead of names
        players: m.flat().map(p => p.id),
        scores: scores[idx],
      }));
    };

    const court1Data = formatMatches(court1Matches, court1Scores, "court1");
    const court2Data = formatMatches(court2Matches, court2Scores, "court2");

    const allMatches = [...court1Data, ...court2Data];

    // DEBUG: confirm IDs are being saved
    console.log("Saving matches with player IDs:", allMatches);

    // Insert into Supabase
    const { data, error } = await supabase
      .from("previous_matches")
      .insert(allMatches)
      .select();

    if (error) {
      console.error("Error saving matches:", error);
      alert("Failed to save matches. Check console.");
    } else {
      alert("Matches saved successfully!");

      // Reset current matches for next round
      setCourt1Matches([]);
      setCourt2Matches([]);
      setCourt1Scores([]);
      setCourt2Scores([]);
      setRoundMatches([]);
      setCourt1Round(0);
      setCourt2Round(0);

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
  const hasGeneratedMatches = court1Matches.length > 0 || court2Matches.length > 0;
  if (!hasGeneratedMatches) {
    alert("No generated matches to clear.");
    return;
  }

  const confirmed = confirm("Clear all generated matches? This will remove unsaved fixtures.");
  if (!confirmed) return;

  setCourt1Matches([]);
  setCourt2Matches([]);
  setCourt1Scores([]);
  setCourt2Scores([]);
  setRoundMatches([]);
  setCourt1Round(0);
  setCourt2Round(0);

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

const buildSelectedPlayers = (ids) => {
  return (ids || []).map((id) => {
    const player = allDivisionPlayers.find((p) => p.id === id) || players.find((p) => p.id === id);
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

  const { error } = await supabase
    .from("previous_matches")
    .update({
      created_at: `${editMatchData.date}T00:00:00Z`,
      court: editMatchData.court,
      players: allIds,
      scores: {
        team1: parseInt(editMatchData.team1Score, 10),
        team2: parseInt(editMatchData.team2Score, 10),
      },
    })
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
    const { data, error } = await supabase
      .from("previous_matches")
      .insert({
        created_at: addMatchData.date + "T00:00:00Z",
        court: addMatchData.court,
        division,
        players: allPlayers,
        scores: {
          team1: parseInt(addMatchData.team1Score),
          team2: parseInt(addMatchData.team2Score),
        },
      })
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
    const hasPendingFixtures = court1Matches.length > 0 || court2Matches.length > 0;
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
}, [court1Scores, court2Scores, court1Matches, court2Matches, roundMatches, division]);

const hasGeneratedFixtures = court1Matches.length > 0 || court2Matches.length > 0;
const activePlayerCount = players.filter((p) => p.active).length;

  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-800 px-4 py-6 sm:p-8 text-gray-300 font-sans">
      
      {/* Header */}
      <header className="mb-8 sm:mb-10 relative">
        <h1 className="flex items-center text-2xl sm:text-4xl font-extrabold text-white tracking-tight">
          <span className="mr-3 text-yellow-400 text-3xl sm:text-4xl drop-shadow-md">
            🔥
          </span>
          Fylde Pickleball League
        </h1>
        <p className="text-gray-400 mt-2 text-xs sm:text-sm tracking-wide">
          Weekly Matches • 8 Weeks • 2 Courts • Prize for Winner!🏆
        </p>
        <div className="absolute -bottom-3 left-0 w-20 sm:w-24 h-1 bg-yellow-400 rounded-full" />
      </header>

      <HeaderStats stats={stats} />

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
              <span>{tab}</span>
            </button>
          ))}
        </div>

        {activeTab === "Players" && (
          <div className="mt-4 flex justify-end">
            <button
              onClick={handleAddPlayer}
              className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded text-sm"
            >
              👤 Add Player
            </button>
          </div>
        )}

        {activeTab === "Matches" && (
          <div className="mt-4 flex flex-col items-end gap-2">
            {!isAdmin ? (
              <button
                onClick={() => setShowAdminModal(true)}
                disabled={hasGeneratedFixtures}
                className="bg-yellow-600 hover:bg-yellow-500 text-white px-4 py-2 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                🔒 Generate Fixtures
              </button>
            ) : (
              <button
                onClick={generateMatches}
                disabled={hasGeneratedFixtures}
                className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                🔄 Generate Fixtures
              </button>
            )}
            {activePlayerCount >= 4 && activePlayerCount < 8 && (
              <p className="text-xs text-gray-400 text-right">
                Fewer than 8 active players: fixtures will be generated on Court 1 only.
              </p>
            )}
          </div>
        )}
      </section>

      {/* Content */}
      <section className="bg-gray-900 rounded-b-lg shadow overflow-hidden p-4 sm:p-6 text-gray-300">

        {/* Standings */}
{activeTab === "Standings" && (
  <div className="bg-white text-gray-700 rounded-2xl shadow-lg overflow-hidden">
    <div className="px-6 py-4 border-b border-gray-200 font-bold bg-gray-50 text-yellow-500">
      🏆 Leaderboard
    </div>

    {/* Mobile Cards */}
<div className="sm:hidden p-4 space-y-2 bg-gray-50">
  {/* Header Row */}
  <div className="grid grid-cols-6 text-xs font-bold text-gray-400 text-center mb-1">
    <span>GP</span>
    <span className="text-green-600">W</span>
    <span className="text-red-400">L</span>
    <span className="text-yellow-500">D</span>
    <span>Diff</span>
    <span className="text-cyan-600 font-black text-xs">Win %</span>
  </div>

  {players.map((p, i) => {
    const gp = p.wins + p.losses + p.draws;
    const winPct = gp > 0 ? ((p.wins / gp) * 100).toFixed(0) + "%" : "0%";
    const diff = (p.points_for || 0) - (p.points_against || 0);

    const form = computePlayerForm(p.id);

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
            #{i + 1} {p.name}
          </span>
          <span className="font-bold text-gray-900">{p.points} pts</span>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-6 text-sm font-semibold gap-1 text-center">
          <div className="flex flex-col items-center gap-1">
            <span className="text-gray-700">{gp}</span>
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
          <span className="text-green-600">{p.wins}</span>
          <span className="text-red-400">{p.losses}</span>
          <span className="text-yellow-500">{p.draws}</span>
          <span className="text-gray-700">{diff}</span>
          <span className="text-cyan-600 font-black text-base">{winPct}</span>
        </div>
        {/* Bottom row: right = recent form */}
        <div className="flex justify-end mt-3">
          <div className="flex flex-col items-end gap-1">
            <span className="text-xs uppercase tracking-widest text-gray-400">Form</span>
            <div className="flex items-center gap-1 overflow-x-auto px-1">
              {[(form.length ? form : []).concat(Array(Math.max(0, 10 - (form.length || 0))).fill(null)).slice(0, 10)].flat().map((r, idx) => (
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
        {players.map((p, i) => {
          const gp = p.wins + p.losses + p.draws;
          const winPct = gp > 0 ? ((p.wins / gp) * 100).toFixed(0) + "%" : "0%";
          const diff = (p.points_for || 0) - (p.points_against || 0);
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
                {p.name}
              </td>
              <td className="p-2 text-center text-gray-700">{gp}</td>
              <td className="p-2 text-green-600 text-center">{p.wins}</td>
              <td className="p-2 text-red-400 text-center">{p.losses}</td>
              <td className="p-2 text-yellow-500 text-center">{p.draws}</td>
              <td className="p-2 text-center text-gray-700">{diff}</td>
              <td className="p-2 text-center text-cyan-600 font-black text-base">{winPct}</td>
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
                    const padded = (form.length ? form : []).concat(Array(Math.max(0,10 - (form.length||0))).fill(null)).slice(0,10);
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
        })}
      </tbody>
    </table>

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
        🔄 Reset Leaderboard
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
                {matchesByDate.map(([date, courtMatches]) => {
                  const isOpen = openDates.includes(date);
                  const totalMatches =
                    (courtMatches.court1?.length || 0) + (courtMatches.court2?.length || 0);

                  return (
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
            <h2 className="text-lg font-bold text-red-400 mb-4 text-center">
              Reset Leaderboard
            </h2>
            <p className="text-gray-300 mb-4 text-center text-sm">
              Enter the reset passcode to reset the leaderboard.
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
                    const confirmed = confirm("Are you sure you want to reset the leaderboard? This cannot be undone.");
                    if (confirmed) {
                      try {
                        // Reset all players in Supabase
                        const { data: allPlayers } = await supabase
                          .from("players")
                          .select("*");

                        if (allPlayers) {
                          for (const player of allPlayers) {
                            await supabase
                              .from("players")
                              .update({
                                wins: 0,
                                losses: 0,
                                draws: 0,
                                points: 0,
                                points_for: 0,
                                points_against: 0,
                                win_streak: 0,
                              })
                              .eq("id", player.id);
                          }
                        }

                        // Refresh the players list
                        await fetchPlayers();

                        // Clear localStorage
                        localStorage.removeItem("leaderboard");
                        setLeaderboard([]);

                        alert("Leaderboard reset ✅");
                        setShowResetModal(false);
                        setResetPasswordInput("");
                      } catch (err) {
                        console.error("Error resetting leaderboard:", err);
                        setResetError("Error resetting leaderboard");
                      }
                    }
                  } else {
                    setResetError("Incorrect passcode");
                  }
                }}
                className="bg-red-600 hover:bg-red-500 text-white px-4 py-2 rounded text-sm"
              >
                Reset
              </button>
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
                        checked={addMatchData.team1Players.some(tp => tp.id === p.id)}
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
                        checked={addMatchData.team2Players.some(tp => tp.id === p.id)}
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

    </main>
  );
}