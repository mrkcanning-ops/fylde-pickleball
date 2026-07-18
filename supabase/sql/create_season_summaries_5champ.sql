-- Create season_summaries_5champ table for 5-player championship mode
create table if not exists season_summaries_5champ (
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
  foreign key (division) references divisions_5champ(id) on delete cascade
);

create index if not exists idx_season_summaries_5champ_division on season_summaries_5champ (division);
create index if not exists idx_season_summaries_5champ_timestamp on season_summaries_5champ (timestamp desc);
