-- Create season_summaries_roundrobin table for round-robin mode
create table if not exists season_summaries_roundrobin (
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
  tracker jsonb,
  created_at timestamptz default now(),
  foreign key (division) references divisions_roundrobin(id) on delete cascade
);

create index if not exists idx_season_summaries_roundrobin_division on season_summaries_roundrobin (division);
create index if not exists idx_season_summaries_roundrobin_timestamp on season_summaries_roundrobin (timestamp desc);
