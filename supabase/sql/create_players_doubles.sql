-- Create players_doubles table for Doubles mode
create table if not exists players_doubles (
  id text primary key,
  name text,
  division integer not null,
  wins integer default 0,
  losses integer default 0,
  draws integer default 0,
  points integer default 0,
  points_for integer default 0,
  points_against integer default 0,
  win_streak integer default 0,
  active boolean default true,
  created_at timestamptz default now()
);

create index if not exists idx_players_doubles_division on players_doubles (division);
