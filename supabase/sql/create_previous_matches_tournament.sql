-- Create previous_matches_tournament table for tournament match history
create table if not exists previous_matches_tournament (
  id text primary key,
  division integer not null,
  player1_id text,
  player2_id text,
  player3_id text,
  player4_id text,
  score1 integer,
  score2 integer,
  winner_id text,
  round integer,
  bracket_id text,
  created_at timestamptz default now(),
  foreign key (division) references divisions_tournament(id)
);

create index if not exists idx_previous_matches_tournament_division on previous_matches_tournament (division);
create index if not exists idx_previous_matches_tournament_bracket_id on previous_matches_tournament (bracket_id);
create index if not exists idx_previous_matches_tournament_player1 on previous_matches_tournament (player1_id);
