-- Create players_tournament table for Tournament mode
create table if not exists players_tournament (
  id text primary key,
  name text,
  division integer not null,
  gender text,
  wins integer default 0,
  losses integer default 0,
  draws integer default 0,
  points integer default 0,
  points_for integer default 0,
  points_against integer default 0,
  win_streak integer default 0,
  active boolean default true,
  owner_id uuid,
  created_at timestamptz default now()
);

create index if not exists idx_players_tournament_division on players_tournament (division);
create index if not exists idx_players_tournament_active on players_tournament (active);
create index if not exists idx_players_tournament_owner_id on players_tournament (owner_id);
