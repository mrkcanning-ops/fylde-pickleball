-- Create matches_doubles table for Admin weekly matches (Doubles mode)
create table if not exists matches_doubles (
  id text primary key,
  player1_id text,
  player2_id text,
  player3_id text,
  player4_id text,
  court integer,
  score1 integer,
  score2 integer,
  week integer,
  completed boolean default false,
  created_at timestamptz default now()
);

create index if not exists idx_matches_doubles_week on matches_doubles (week);
