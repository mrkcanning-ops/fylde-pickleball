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

const [showAddMatchModal, setShowAddMatchModal] = useState(false);
const [showAddMatchPasscodeModal, setShowAddMatchPasscodeModal] = useState(false);
const [addMatchPasscode, setAddMatchPasscode] = useState("");
const [addMatchPasscodeError, setAddMatchPasscodeError] = useState("");
const [addMatchError, setAddMatchError] = useState("");
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
  // 1️⃣ Get all players
  const { data: players } = await supabase
    .from("players")
    .select("*");

  if (!players) return;

  // 2️⃣ Reset all stats to zero
  for (const player of players) {
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

  // 3️⃣ Get all matches
  const { data: matches } = await supabase
    .from("previous_matches")
    .select("*");

  if (!matches) return;

  // 4️⃣ Recalculate from scratch
  for (const match of matches) {
    console.log("Players in match:", match.players);
    const team1 = match.players.slice(0, 2);
    const team2 = match.players.slice(2, 4);
    const score1 = Number(match.scores.team1);
    const score2 = Number(match.scores.team2);

    let result1, result2;

    if (score1 > score2) {
      result1 = "win";
      result2 = "loss";
    } else if (score1 < score2) {
      result1 = "loss";
      result2 = "win";
    } else {
      result1 = "draw";
      result2 = "draw";
    }

    const updatePlayer = async (playerId, result, scored, conceded) => {
  const { data: player, error: fetchError } = await supabase
    .from("players")
    .select("*")
    .eq("id", playerId)
    .single();

  if (fetchError) {
    console.error(`Failed to fetch player ${playerId}:`, fetchError);
    return;
  }
  if (!player) return;

  let newStats = {
    wins: player.wins || 0,
    losses: player.losses || 0,
    draws: player.draws || 0,
    points: player.points || 0,
    points_for: player.points_for || 0,
    points_against: player.points_against || 0,
    win_streak: player.win_streak || 0,
  };

  if (result === "win") {
    newStats.wins += 1;
    newStats.points += 3;
    newStats.win_streak = (player.win_streak || 0) + 1;
  } else if (result === "loss") {
    newStats.losses += 1;
    newStats.win_streak = 0;
  } else {
    newStats.draws += 1;
    newStats.points += 1;
    newStats.win_streak = 0;
  }

  newStats.points_for += scored;
  newStats.points_against += conceded;

  console.log(`Updating player ${playerId} with`, newStats);

  const { error: updateError } = await supabase
    .from("players")
    .update(newStats)
    .eq("id", playerId);

  if (updateError) {
    console.error(`Failed to update player ${playerId}:`, updateError);
  }
};

    for (const p of team1) {
      await updatePlayer(p, result1, score1, score2);
    }

    for (const p of team2) {
      await updatePlayer(p, result2, score2, score1);
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
    .order("created_at", { ascending: false }); // Most recent first

  if (error) {
    console.error("Error fetching previous matches:", error);
  } else {
    setPreviousMatches(data || []);
  }
};

  useEffect(() => {
    fetchPlayers();
    fetchPreviousMatches();
    fetchAllDivisionPlayers();
  }, [division]);

  const sortPlayersByStats = (players) => {
    return [...players].sort((a, b) => {
      // Calculate stats for sorting
      const aGP = (a.wins || 0) + (a.losses || 0) + (a.draws || 0);
      const bGP = (b.wins || 0) + (b.losses || 0) + (b.draws || 0);
      const aWinPct = aGP > 0 ? (a.wins || 0) / aGP : 0;
      const bWinPct = bGP > 0 ? (b.wins || 0) / bGP : 0;
      const aDiff = (a.points_for || 0) - (a.points_against || 0);
      const bDiff = (b.points_for || 0) - (b.points_against || 0);

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
      // load previous leaderboard from localStorage for improvement calculation
      const saved = JSON.parse(localStorage.getItem("leaderboard")) || [];
      const prevPoints = {};
      const prevPositions = {};
      saved.forEach((p, idx) => {
        if (p.id != null) {
          prevPoints[p.id] = p.points || 0;
          prevPositions[p.id] = idx; // position in previous leaderboard
        }
      });

      const processed = (data || []).map((p) => ({
        ...p,
        win_streak: p.win_streak || 0,
        improved: prevPoints[p.id] !== undefined ? (p.points || 0) - prevPoints[p.id] : 0,
      }));

      // Sort using new criteria and calculate positionChange based on new positions
      const sorted = sortPlayersByStats(processed);
      const withPositionChange = sorted.map((p) => ({
        ...p,
        positionChange: prevPositions[p.id] !== undefined ? prevPositions[p.id] - sorted.indexOf(p) : 0,
      }));

      setPlayers(withPositionChange);

      // update localStorage snapshot for next round
      const snapshot = withPositionChange.map((p) => ({
        id: p.id,
        name: p.name,
        points: p.points || 0,
      }));
      localStorage.setItem("leaderboard", JSON.stringify(snapshot));
    }
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
  const mostImprovedPlayer =
    players.reduce(
      (best, p) => (p.positionChange > (best.positionChange || 0) ? p : best),
      {}
    ) || {};

  const highestWinStreakPlayer =
    players.reduce(
      (best, p) => {
        // If best doesn't have an id (empty object), or if p has higher streak, select p
        return !best.id || p.win_streak > best.win_streak ? p : best;
      },
      {}
    ) || {};

  const stats = [
    {
  label: "Division",
  value: division, // keep a value so HeaderStats shows the stat
  highlight: "blue",
  onClick: toggleDivision,
  renderCustom: () => (
    <div className="flex flex-col items-center cursor-pointer select-none">
      {/* Current division */}
      <span className="text-yellow-400 font-extrabold text-lg">
        Division {division}
      </span>
      {/* Other division */}
      <span className="text-gray-400 text-sm mt-1">
        Division {division === 1 ? 2 : 1}
      </span>
    </div>
  ),
},
    { label: "Current Leader", value: currentLeader, highlight: "gold" },
    { label: "Most Improved", value: mostImprovedPlayer.name || "—", highlight: "grayButton", positionChange: mostImprovedPlayer.positionChange || 0 },
    {
      label: "Highest Win Streak",
      value: highestWinStreakPlayer.name || "—",
      highlight: "grayButton",
      streak: highestWinStreakPlayer.win_streak || 0,
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

 const generateMatches = () => {
  const available = players
    .filter((p) => p.active)
    .sort((a, b) => b.points - a.points);

  if (available.length < 4) {
    alert("At least 4 active players required.");
    return;
  }

  // Split top-ranked for Court 1
  const half = Math.ceil(available.length / 2);
  const court1Group = available.slice(0, half);
  const court2Group = available.slice(half);

  // Decide games per player for each court
  const gamesPerPlayer = (group) => {
    const n = group.length;
    if (n <= 5) return n;        // Keep current logic for 4–5
    if (n === 6) return 4;
    if (n === 7) return 4;
    return 3;                     // 8 players
  };

  const buildCourt = (group) => {
    const matches = [];
    const byes = [];
    const usedMatchKeys = new Set();
    const gamesPlayed = {};
    group.forEach((p) => (gamesPlayed[p.id] = 0));

    const maxGames = gamesPerPlayer(group);

    while (Object.values(gamesPlayed).some((g) => g < maxGames)) {
      // Pick 4 players with least games played
      const sorted = [...group].sort((a, b) => gamesPlayed[a.id] - gamesPlayed[b.id]);
      const playing = sorted.slice(0, 4);

      // Generate a match key to prevent duplicate 4-player groups
      const matchKey = playing.map((p) => p.id).sort().join("-");
      if (usedMatchKeys.has(matchKey)) {
        // Try next combination if duplicate (rotate players)
        let found = false;
        for (let i = 0; i < group.length - 3 && !found; i++) {
          for (let j = i + 1; j < group.length - 2 && !found; j++) {
            for (let k = j + 1; k < group.length - 1 && !found; k++) {
              for (let l = k + 1; l < group.length && !found; l++) {
                const candidate = [group[i], group[j], group[k], group[l]];
                const candidateKey = candidate.map((p) => p.id).sort().join("-");
                if (!usedMatchKeys.has(candidateKey) && candidate.every((p) => gamesPlayed[p.id] < maxGames)) {
                  playing.splice(0, 4, ...candidate);
                  found = true;
                  break;
                }
              }
            }
          }
        }
      }

      usedMatchKeys.add(playing.map((p) => p.id).sort().join("-"));

      // Assign teams (simple split)
      const team1 = [playing[0], playing[1]];
      const team2 = [playing[2], playing[3]];

      matches.push([team1, team2]);

      // Resting players
      const resting = group.filter((p) => !playing.includes(p));
      byes.push(resting);

      // Increment games played
      playing.forEach((p) => (gamesPlayed[p.id]++));
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

      // Recalculate standings
      console.log("Recalculating standings...");
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

    // Recalculate standings
    await recalculateStandings();
    await fetchPlayers();
    await fetchPreviousMatches();
  } catch (err) {
    console.error("Unexpected error adding match:", err);
    setAddMatchError("Something went wrong");
  }
};
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
  <div className="mt-4 flex justify-end">
    {!isAdmin ? (
      <button
        onClick={() => setShowAdminModal(true)}
        className="bg-yellow-600 hover:bg-yellow-500 text-white px-4 py-2 rounded text-sm"
      >
        🔒 Generate Fixtures
      </button>
    ) : (
      <button
        onClick={generateMatches}
        className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded text-sm"
      >
        🔄 Generate Fixtures
      </button>
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
  <div className="grid grid-cols-7 text-xs font-bold text-gray-400 text-center mb-1">
    <span>GP</span>
    <span className="text-green-600">W</span>
    <span className="text-red-400">L</span>
    <span className="text-yellow-500">D</span>
    <span>Diff</span>
    <span className="text-cyan-600 font-black text-xs">Win %</span>
    <span>Pts</span>
  </div>

  {players.map((p, i) => {
    const gp = p.wins + p.losses + p.draws;
    const winPct = gp > 0 ? ((p.wins / gp) * 100).toFixed(0) + "%" : "0%";
    const diff = (p.points_for || 0) - (p.points_against || 0);

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
        <div className="grid grid-cols-7 text-sm font-semibold gap-1 text-center">
          <span className="text-gray-700">{gp}</span>
          <span className="text-green-600">{p.wins}</span>
          <span className="text-red-400">{p.losses}</span>
          <span className="text-yellow-500">{p.draws}</span>
          <span className="text-gray-700">{diff}</span>
          <span className="text-cyan-600 font-black text-base">{winPct}</span>
          <span className="text-gray-900 font-bold">{p.points}</span>
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
          <th className="p-2 text-right">Points</th>
        </tr>
      </thead>
      <tbody>
        {players.map((p, i) => {
          const gp = p.wins + p.losses + p.draws;
          const winPct = gp > 0 ? ((p.wins / gp) * 100).toFixed(0) + "%" : "0%";
          const diff = p.points - (gp - p.points); // Adjust as needed
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
              <td className="p-2 text-right font-semibold">{p.points}</td>
            </tr>
          );
        })}
      </tbody>
    </table>

    <div className="mt-8 px-6 py-6 flex justify-center border-t border-gray-200 bg-red-50">
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
    <div className="col-span-1 md:col-span-2 flex justify-center mt-4">
      <button onClick={saveMatches} className="bg-green-600 hover:bg-green-500 text-white px-6 py-2 rounded">
        💾 Save Matches
      </button>
    </div>
  </div>
)}

        {activeTab === "Previous Matches" && (
  <div className="bg-gray-700 rounded shadow p-4">
    {/* Add Match Button */}
    <div className="flex justify-center mb-4">
      <button onClick={() => setShowAddMatchPasscodeModal(true)} className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2 rounded">
        ➕ Add Match
      </button>
    </div>
    {previousMatches.length === 0 ? (
      <p className="text-gray-300 italic text-sm">No previous matches yet...</p>
    ) : (
      <div className="space-y-8">
        {matchesByDate.map(([date, courtMatches]) => (
          <div key={date}>
            <button
              onClick={() => toggleDate(date)}
              className="w-full text-left bg-yellow-400 text-gray-900 font-bold px-4 py-2 rounded mb-2 hover:bg-yellow-500"
            >
              📅 {date}
            </button>
            {openDates.includes(date) && (
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
                      <div key={idx} className="bg-white p-3 rounded text-gray-700 text-sm border border-gray-300">
                        <div className="text-blue-600 font-semibold mb-1">
                          Division {m.division}
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 items-center">
                          <div className="text-center">
                            <div className="font-bold text-base text-gray-700">
                              {m.players.slice(0,2).map(id => getPlayerNameFromId(id)).join(" & ")}
                            </div>
                            <div className="text-3xl font-extrabold text-yellow-600 mt-1">
                              {m.scores?.team1 ?? "—"}
                            </div>
                          </div>
                          <div className="text-center">
                            <div className="font-bold text-base text-gray-700">
                              {m.players.slice(2,4).map(id => getPlayerNameFromId(id)).join(" & ")}
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
                      <div key={idx} className="bg-white p-3 rounded text-gray-700 text-sm border border-gray-300">
                        <div className="text-purple-600 font-semibold mb-1">
                          Division {m.division}
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 items-center">
                          <div className="text-center">
                            <div className="font-bold text-base text-gray-700">
                              {m.players.slice(0,2).map(id => getPlayerNameFromId(id)).join(" & ")}
                            </div>
                            <div className="text-3xl font-extrabold text-yellow-600 mt-1">
                              {m.scores?.team1 ?? "—"}
                            </div>
                          </div>
                          <div className="text-center">
                            <div className="font-bold text-base text-gray-700">
                              {m.players.slice(2,4).map(id => getPlayerNameFromId(id)).join(" & ")}
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
            )}
          </div>
        ))}
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