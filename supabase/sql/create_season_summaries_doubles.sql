-- Create season_summaries_doubles table for archived Doubles seasons
create table if not exists season_summaries_doubles (
  id text primary key,
  division integer not null,
  timestamp timestamptz not null,
  top_by_points jsonb,
  top_by_wins jsonb,
  highest_scoring_match jsonb,
  avg_points integer,
  most_active text,
  players jsonb,
  matches jsonb,
  final_standings jsonb,
  tracker jsonb
);

create index if not exists idx_season_summaries_doubles_division on season_summaries_doubles (division);
create index if not exists idx_season_summaries_doubles_timestamp on season_summaries_doubles (timestamp desc);
