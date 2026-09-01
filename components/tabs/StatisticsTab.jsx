'use client';

import { useState } from 'react';

/**
 * StatisticsTab Component - Displays detailed player statistics
 * 
 * Props:
 *   - players: array of player objects
 *   - playerStats: stats object from usePlayerStats hook
 *   - selectedPlayerId: currently selected player ID
 *   - onSelectPlayer: callback when player selection changes
 */
export function StatisticsTab({ 
  players = [], 
  playerStats, 
  selectedPlayerId, 
  onSelectPlayer,
  viewMode = 'league'
}) {
  const [statsView, setStatsView] = useState('overview');

  if (!players.length) {
    return (
      <div className="bg-white text-gray-700 rounded-2xl shadow-lg overflow-hidden p-6">
        <p className="text-center text-gray-500">No players in this division yet.</p>
      </div>
    );
  }

  return (
    <div className="bg-white text-gray-700 rounded-2xl shadow-lg overflow-hidden">
      {/* Header with player selector */}
      <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-yellow-500 text-lg sm:text-xl">📊 Player Statistics</h2>
          </div>

          {/* Player Selector */}
          <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
            <label className="text-sm font-semibold text-gray-600">Select Player:</label>
            <select
              value={selectedPlayerId || ''}
              onChange={(e) => onSelectPlayer(e.target.value)}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 focus:outline-none focus:border-blue-500"
            >
              <option value="">-- Choose a player --</option>
              {players.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          {/* Stats View Tabs */}
          {selectedPlayerId && (
            <div className="flex flex-wrap gap-2">
              {['overview', 'headToHead', 'performance'].map((view) => (
                <button
                  key={view}
                  onClick={() => setStatsView(view)}
                  className={`px-3 py-2 rounded-lg text-sm font-semibold transition ${
                    statsView === view
                      ? 'bg-gray-800 text-white'
                      : 'bg-white text-gray-900 border border-gray-200'
                  }`}
                >
                  {view === 'overview' && '📈 Overview'}
                  {view === 'headToHead' && '⚔️ H2H'}
                  {view === 'performance' && '📅 Trends'}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        {!selectedPlayerId ? (
          <p className="text-center text-gray-500">Select a player to view their statistics.</p>
        ) : !playerStats?.player ? (
          <p className="text-center text-gray-500">Player not found.</p>
        ) : statsView === 'overview' ? (
          <OverviewView stats={playerStats} />
        ) : statsView === 'headToHead' ? (
          <HeadToHeadView stats={playerStats} />
        ) : (
          <PerformanceView stats={playerStats} />
        )}
      </div>
    </div>
  );
}

// ============================================================================
// OVERVIEW VIEW
// ============================================================================
function OverviewView({ stats }) {
  if (!stats?.player) return null;

  return (
    <div className="space-y-6">
      {/* Player Name and Basic Info */}
      <div className="bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg p-4 border border-blue-200">
        <h3 className="text-2xl font-bold text-gray-900 mb-1">{stats.player.name}</h3>
        {stats.player.gender && (
          <p className="text-sm text-gray-600">
            {stats.player.gender === 'male' ? '♂️' : '♀️'} {stats.player.gender}
          </p>
        )}
      </div>

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {/* Wins */}
        <MetricCard
          icon="🏆"
          label="Wins"
          value={stats.wins}
          subtext={`${stats.totalMatches} total matches`}
        />

        {/* Win Rate */}
        <MetricCard
          icon="📊"
          label="Win Rate"
          value={`${stats.winRate}%`}
          subtext={`${stats.losses} losses, ${stats.draws} draws`}
        />

        {/* Current Streak */}
        <MetricCard
          icon={stats.streakType === 'win' ? '🔥' : stats.streakType === 'loss' ? '❄️' : '➖'}
          label="Current Streak"
          value={stats.currentStreak}
          subtext={stats.streakType ? `${stats.streakType}s` : 'No matches'}
        />

        {/* Avg Points For */}
        <MetricCard
          icon="⚽"
          label="Avg Points For"
          value={stats.avgPointsFor}
          subtext="per match"
        />

        {/* Avg Points Against */}
        <MetricCard
          icon="🛡️"
          label="Avg Points Against"
          value={stats.avgPointsAgainst}
          subtext="per match"
        />

        {/* Point Differential */}
        <MetricCard
          icon={stats.pointsDifferential >= 0 ? '📈' : '📉'}
          label="Point Differential"
          value={stats.pointsDifferential}
          subtext="total +/-"
          isPositive={stats.pointsDifferential >= 0}
        />
      </div>

      {/* Recent Matches */}
      {stats.recentMatches && stats.recentMatches.length > 0 && (
        <div>
          <h4 className="font-semibold text-gray-900 mb-3">Recent Matches</h4>
          <div className="space-y-2">
            {stats.recentMatches.slice(0, 5).map((match, idx) => (
              <RecentMatchCard key={idx} match={match} playerId={stats.player.id} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// HEAD-TO-HEAD VIEW
// ============================================================================
function HeadToHeadView({ stats }) {
  if (!stats?.headToHead || !stats.headToHead.length) {
    return (
      <div className="text-center text-gray-500 py-8">
        <p>No head-to-head data available yet.</p>
      </div>
    );
  }

  return (
    <div>
      <h3 className="font-semibold text-gray-900 mb-4">Head-to-Head Records</h3>
      <div className="space-y-2">
        {stats.headToHead.map((h2h) => (
          <div
            key={h2h.opponentId}
            className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200"
          >
            <div>
              <p className="font-semibold text-gray-900">{h2h.opponentName}</p>
              <p className="text-sm text-gray-500">
                {h2h.wins}W - {h2h.losses}L - {h2h.draws}D
              </p>
            </div>
            <div className="text-right">
              {h2h.wins > h2h.losses && (
                <span className="text-lg font-bold text-green-600">↑ +{h2h.wins - h2h.losses}</span>
              )}
              {h2h.wins < h2h.losses && (
                <span className="text-lg font-bold text-red-600">↓ {h2h.wins - h2h.losses}</span>
              )}
              {h2h.wins === h2h.losses && (
                <span className="text-lg font-bold text-gray-600">→ Even</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// PERFORMANCE VIEW
// ============================================================================
function PerformanceView({ stats }) {
  if (!stats?.performance) {
    return (
      <div className="text-center text-gray-500 py-8">
        <p>No performance data available yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Monthly Performance */}
      <div>
        <h3 className="font-semibold text-gray-900 mb-3">Monthly Performance</h3>
        <div className="space-y-2">
          {Object.entries(stats.performance.monthly || {})
            .sort((a, b) => b[0].localeCompare(a[0]))
            .slice(0, 6)
            .map(([month, perf]) => (
              <PerformancePeriodCard key={month} period={month} performance={perf} />
            ))}
        </div>
      </div>

      {/* Weekly Performance */}
      <div>
        <h3 className="font-semibold text-gray-900 mb-3">Weekly Performance</h3>
        <div className="space-y-2">
          {Object.entries(stats.performance.weekly || {})
            .sort((a, b) => b[0].localeCompare(a[0]))
            .slice(0, 8)
            .map(([week, perf]) => (
              <PerformancePeriodCard
                key={week}
                period={`Week of ${week}`}
                performance={perf}
              />
            ))}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// HELPER COMPONENTS
// ============================================================================

function MetricCard({ icon, label, value, subtext, isPositive }) {
  return (
    <div className="bg-gray-50 rounded-lg p-4 border border-gray-200 text-center">
      <div className="text-2xl mb-2">{icon}</div>
      <p className="text-sm text-gray-600 mb-1">{label}</p>
      <p className={`text-2xl font-bold ${isPositive !== undefined ? (isPositive ? 'text-green-600' : 'text-red-600') : 'text-gray-900'}`}>
        {value}
      </p>
      {subtext && <p className="text-xs text-gray-500 mt-1">{subtext}</p>}
    </div>
  );
}

function RecentMatchCard({ match, playerId }) {
  if (!match.scores) return null;

  const team1Count = match.players.slice(0, 2).filter((id) => String(id) === String(playerId)).length;
  const isTeam1 = team1Count > 0;
  const playerScore = isTeam1 ? match.scores.team1 : match.scores.team2;
  const oppScore = isTeam1 ? match.scores.team2 : match.scores.team1;

  let result = 'draw';
  let resultBg = 'bg-gray-100';
  let resultText = 'text-gray-600';

  if (playerScore > oppScore) {
    result = 'W';
    resultBg = 'bg-green-100';
    resultText = 'text-green-700';
  } else if (playerScore < oppScore) {
    result = 'L';
    resultBg = 'bg-red-100';
    resultText = 'text-red-700';
  } else {
    result = 'D';
  }

  const date = new Date(match.created_at);
  const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  return (
    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
      <div className="flex-1">
        <p className="text-sm text-gray-600">{dateStr}</p>
      </div>
      <div className="flex items-center gap-3">
        <span className="text-sm font-semibold">
          {playerScore} - {oppScore}
        </span>
        <span className={`${resultBg} ${resultText} px-3 py-1 rounded font-bold text-sm`}>
          {result}
        </span>
      </div>
    </div>
  );
}

function PerformancePeriodCard({ period, performance }) {
  const total = performance.matches || 0;
  const winRate =
    total > 0
      ? (((performance.wins || 0) / total) * 100).toFixed(0)
      : 0;

  return (
    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
      <div>
        <p className="font-semibold text-gray-900">{period}</p>
        <p className="text-sm text-gray-500">
          {performance.wins || 0}W - {performance.losses || 0}L - {performance.draws || 0}D
        </p>
      </div>
      <div className="text-right">
        <p className="font-bold text-lg text-blue-600">{winRate}%</p>
        <p className="text-xs text-gray-500">{total} matches</p>
      </div>
    </div>
  );
}
