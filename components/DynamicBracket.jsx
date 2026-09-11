'use client';

function formatTeam(team) {
  const players = Array.isArray(team) ? team : team ? [team] : [];
  return players.map(player => player?.name).filter(Boolean).join(' & ') || 'TBD';
}

function teamsMatch(left, right) {
  const leftTeam = Array.isArray(left) ? left : left ? [left] : [];
  const rightTeam = Array.isArray(right) ? right : right ? [right] : [];
  return leftTeam.length === rightTeam.length &&
    leftTeam.every(player => rightTeam.some(candidate => candidate?.id === player?.id));
}

export default function DynamicBracket({ rounds = [] }) {
  const visibleRounds = rounds.filter(round => round?.matchups?.length);

  if (visibleRounds.length === 0) {
    return <div className="text-center text-gray-400 py-8">No knockout matches generated yet.</div>;
  }

  return (
    <div className="overflow-x-auto">
      <div className="flex items-start gap-6 min-w-max p-4">
        {visibleRounds.map((round) => (
          <section key={`${round.stageName}-${round.roundNumber}`} className="w-64">
            <h5 className="text-sm font-bold uppercase tracking-wide text-blue-300 mb-3">
              {round.stageName}
            </h5>
            <div className="space-y-4">
              {round.matchups.map((match, index) => {
                const winner = match.winner && !match.winner.draw ? match.winner : null;
                return (
                  <article key={match.id || `${round.stageName}-${index}`} className="rounded border border-blue-400 bg-gray-900 p-3">
                    <div className="text-xs text-gray-500 mb-2">Match {match.position ?? index + 1}</div>
                    {[match.team1, match.team2].map((team, teamIndex) => (
                      <div
                        key={teamIndex}
                        className={`flex items-center justify-between gap-2 rounded px-2 py-2 text-sm ${
                          winner && teamsMatch(winner, team)
                            ? 'bg-green-900 text-green-100'
                            : 'bg-gray-700 text-gray-200'
                        } ${teamIndex === 0 ? 'mb-1' : ''}`}
                      >
                        <span className="truncate">{team ? formatTeam(team) : 'BYE'}</span>
                        {winner && teamsMatch(winner, team) && <span aria-label="winner">★</span>}
                      </div>
                    ))}
                    {match.score && (
                      <div className="text-xs text-gray-400 text-right mt-2">
                        {match.score.team1} - {match.score.team2}
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
