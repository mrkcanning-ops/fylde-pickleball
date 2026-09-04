-- Create season_summaries_tournament table for archived Tournament seasons
create table if not exists season_summaries_tournament (
  id text primary key,
  division integer not null,
  timestamp timestamptz not null,
  tournament_champion text,
  runner_up text,
  final_bracket jsonb,
  tournament_format text,
  top_scorers jsonb,
  match_results jsonb,
  players jsonb,
  foreign key (division) references divisions_tournament(id)
);

create index if not exists idx_season_summaries_tournament_division on season_summaries_tournament (division);
create index if not exists idx_season_summaries_tournament_timestamp on season_summaries_tournament (timestamp desc);
