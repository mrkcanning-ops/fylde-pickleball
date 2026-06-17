-- Create table for archived season summaries
create table if not exists season_summaries (
  id text primary key,
  division integer not null,
  timestamp timestamptz not null,
  top_by_points jsonb,
  top_by_wins jsonb,
  highest_scoring_match jsonb,
  avg_points integer,
  most_active text,
  players jsonb,
  matches jsonb
);

create index if not exists idx_season_summaries_division on season_summaries (division);
create index if not exists idx_season_summaries_timestamp on season_summaries (timestamp desc);
