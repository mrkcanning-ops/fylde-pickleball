-- Create club_members table for user authentication
create table if not exists club_members (
  id uuid primary key default gen_random_uuid(),
  username text not null unique,
  password_hash text not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_club_members_username on club_members (username);

-- Add owner_id columns to existing tables to link data to club members
-- These columns are nullable to preserve existing data

-- Pickleball League (singles)
alter table if exists divisions 
add column if not exists owner_id uuid references club_members(id) on delete cascade;

alter table if exists players 
add column if not exists owner_id uuid references club_members(id) on delete cascade;

alter table if exists matches 
add column if not exists owner_id uuid references club_members(id) on delete cascade;

alter table if exists previous_matches 
add column if not exists owner_id uuid references club_members(id) on delete cascade;

alter table if exists season_summaries 
add column if not exists owner_id uuid references club_members(id) on delete cascade;

alter table if exists running_seasons 
add column if not exists owner_id uuid references club_members(id) on delete cascade;

alter table if exists pending_fixtures 
add column if not exists owner_id uuid references club_members(id) on delete cascade;

-- Doubles variant tables
alter table if exists divisions_doubles 
add column if not exists owner_id uuid references club_members(id) on delete cascade;

alter table if exists players_doubles 
add column if not exists owner_id uuid references club_members(id) on delete cascade;

alter table if exists matches_doubles 
add column if not exists owner_id uuid references club_members(id) on delete cascade;

alter table if exists previous_matches_doubles 
add column if not exists owner_id uuid references club_members(id) on delete cascade;

alter table if exists season_summaries_doubles 
add column if not exists owner_id uuid references club_members(id) on delete cascade;

alter table if exists running_seasons_doubles 
add column if not exists owner_id uuid references club_members(id) on delete cascade;

alter table if exists pending_fixtures_doubles 
add column if not exists owner_id uuid references club_members(id) on delete cascade;

-- 5 Player Champ variant tables
alter table if exists divisions_5champ 
add column if not exists owner_id uuid references club_members(id) on delete cascade;

alter table if exists players_5champ 
add column if not exists owner_id uuid references club_members(id) on delete cascade;

alter table if exists matches_5champ 
add column if not exists owner_id uuid references club_members(id) on delete cascade;

alter table if exists previous_matches_5champ 
add column if not exists owner_id uuid references club_members(id) on delete cascade;

alter table if exists season_summaries_5champ 
add column if not exists owner_id uuid references club_members(id) on delete cascade;

alter table if exists running_seasons_5champ 
add column if not exists owner_id uuid references club_members(id) on delete cascade;

alter table if exists pending_fixtures_5champ 
add column if not exists owner_id uuid references club_members(id) on delete cascade;

-- Round Robin variant tables
alter table if exists divisions_roundrobin 
add column if not exists owner_id uuid references club_members(id) on delete cascade;

alter table if exists players_roundrobin 
add column if not exists owner_id uuid references club_members(id) on delete cascade;

alter table if exists matches_roundrobin 
add column if not exists owner_id uuid references club_members(id) on delete cascade;

alter table if exists previous_matches_roundrobin 
add column if not exists owner_id uuid references club_members(id) on delete cascade;

alter table if exists season_summaries_roundrobin 
add column if not exists owner_id uuid references club_members(id) on delete cascade;

alter table if exists running_seasons_roundrobin 
add column if not exists owner_id uuid references club_members(id) on delete cascade;

alter table if exists pending_fixtures_roundrobin 
add column if not exists owner_id uuid references club_members(id) on delete cascade;

-- Create indexes on owner_id for faster filtering (singles)
create index if not exists idx_divisions_owner_id on divisions (owner_id) where owner_id is not null;
create index if not exists idx_players_owner_id on players (owner_id) where owner_id is not null;
create index if not exists idx_matches_owner_id on matches (owner_id) where owner_id is not null;
create index if not exists idx_previous_matches_owner_id on previous_matches (owner_id) where owner_id is not null;
create index if not exists idx_season_summaries_owner_id on season_summaries (owner_id) where owner_id is not null;
create index if not exists idx_running_seasons_owner_id on running_seasons (owner_id) where owner_id is not null;
create index if not exists idx_pending_fixtures_owner_id on pending_fixtures (owner_id) where owner_id is not null;

-- Create indexes on owner_id for doubles
create index if not exists idx_divisions_doubles_owner_id on divisions_doubles (owner_id) where owner_id is not null;
create index if not exists idx_players_doubles_owner_id on players_doubles (owner_id) where owner_id is not null;
create index if not exists idx_matches_doubles_owner_id on matches_doubles (owner_id) where owner_id is not null;
create index if not exists idx_previous_matches_doubles_owner_id on previous_matches_doubles (owner_id) where owner_id is not null;
create index if not exists idx_season_summaries_doubles_owner_id on season_summaries_doubles (owner_id) where owner_id is not null;
create index if not exists idx_running_seasons_doubles_owner_id on running_seasons_doubles (owner_id) where owner_id is not null;
create index if not exists idx_pending_fixtures_doubles_owner_id on pending_fixtures_doubles (owner_id) where owner_id is not null;

-- Create indexes on owner_id for 5champ
create index if not exists idx_divisions_5champ_owner_id on divisions_5champ (owner_id) where owner_id is not null;
create index if not exists idx_players_5champ_owner_id on players_5champ (owner_id) where owner_id is not null;
create index if not exists idx_matches_5champ_owner_id on matches_5champ (owner_id) where owner_id is not null;
create index if not exists idx_previous_matches_5champ_owner_id on previous_matches_5champ (owner_id) where owner_id is not null;
create index if not exists idx_season_summaries_5champ_owner_id on season_summaries_5champ (owner_id) where owner_id is not null;
create index if not exists idx_running_seasons_5champ_owner_id on running_seasons_5champ (owner_id) where owner_id is not null;
create index if not exists idx_pending_fixtures_5champ_owner_id on pending_fixtures_5champ (owner_id) where owner_id is not null;

-- Create indexes on owner_id for roundrobin
create index if not exists idx_divisions_roundrobin_owner_id on divisions_roundrobin (owner_id) where owner_id is not null;
create index if not exists idx_players_roundrobin_owner_id on players_roundrobin (owner_id) where owner_id is not null;
create index if not exists idx_matches_roundrobin_owner_id on matches_roundrobin (owner_id) where owner_id is not null;
create index if not exists idx_previous_matches_roundrobin_owner_id on previous_matches_roundrobin (owner_id) where owner_id is not null;
create index if not exists idx_season_summaries_roundrobin_owner_id on season_summaries_roundrobin (owner_id) where owner_id is not null;
create index if not exists idx_running_seasons_roundrobin_owner_id on running_seasons_roundrobin (owner_id) where owner_id is not null;
create index if not exists idx_pending_fixtures_roundrobin_owner_id on pending_fixtures_roundrobin (owner_id) where owner_id is not null;

-- Create member_storage table for club member data persistence
-- This table stores all localStorage data for club members (leagues, tournaments, scores, etc)
create table if not exists member_storage (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references club_members(id) on delete cascade,
  key text not null,
  data_type text default 'general',
  value jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Ensure each member has one entry per key
create unique index if not exists idx_member_storage_owner_key on member_storage (owner_id, key);
create index if not exists idx_member_storage_owner_id on member_storage (owner_id);
create index if not exists idx_member_storage_data_type on member_storage (data_type);
