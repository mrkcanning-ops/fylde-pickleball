-- Create players_roundrobin table for round-robin mode
create table if not exists players_roundrobin (
  id text primary key,
  name text not null,
  division integer not null,
  wins integer default 0,
  losses integer default 0,
  draws integer default 0,
  points integer default 0,
  points_for integer default 0,
  points_against integer default 0,
  win_streak integer default 0,
  active boolean default true,
  created_at timestamptz default now(),
  foreign key (division) references divisions_roundrobin(id) on delete cascade
);

create index if not exists idx_players_roundrobin_division on players_roundrobin (division);
create index if not exists idx_players_roundrobin_active on players_roundrobin (active);
