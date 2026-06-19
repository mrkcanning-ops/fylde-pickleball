-- Combined migration to create all Doubles-mode tables
-- Run this in Supabase SQL editor or via supabase CLI to create doubles tables.

-- players_doubles
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

-- previous_matches_doubles
create table if not exists previous_matches_doubles (
  id text primary key,
  division integer not null,
  players jsonb,
  scores jsonb,
  created_at timestamptz default now()
);
create index if not exists idx_previous_matches_doubles_division_created on previous_matches_doubles (division, created_at desc);

-- season_summaries_doubles
create table if not exists season_summaries_doubles (
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
  tracker jsonb
);
create index if not exists idx_season_summaries_doubles_division on season_summaries_doubles (division);
create index if not exists idx_season_summaries_doubles_timestamp on season_summaries_doubles (timestamp desc);

-- running_seasons_doubles
create table if not exists running_seasons_doubles (
  id text primary key,
  name text,
  started_at timestamptz,
  division integer not null
);
create index if not exists idx_running_seasons_doubles_division on running_seasons_doubles (division);

-- pending_fixtures_doubles
create table if not exists pending_fixtures_doubles (
  division integer primary key,
  payload jsonb,
  status text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index if not exists idx_pending_fixtures_doubles_division on pending_fixtures_doubles (division);

-- divisions_doubles
create table if not exists divisions_doubles (
  id integer primary key,
  name text
);
create index if not exists idx_divisions_doubles_id on divisions_doubles (id);

-- matches_doubles
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
