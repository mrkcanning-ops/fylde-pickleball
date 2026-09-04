-- Create matches_tournament table for storing tournament match results
create table if not exists matches_tournament (
  id text primary key,
  division integer not null,
  bracket_id text,
  round integer,
  match_position integer,
  team1_player1_id text,
  team1_player2_id text,
  team2_player1_id text,
  team2_player2_id text,
  winner_id text,
  score1 integer,
  score2 integer,
  completed boolean default false,
  created_at timestamptz default now(),
  completed_at timestamptz,
  foreign key (division) references divisions_tournament(id)
);

create index if not exists idx_matches_tournament_division on matches_tournament (division);
create index if not exists idx_matches_tournament_bracket_id on matches_tournament (bracket_id);
create index if not exists idx_matches_tournament_round on matches_tournament (round);
