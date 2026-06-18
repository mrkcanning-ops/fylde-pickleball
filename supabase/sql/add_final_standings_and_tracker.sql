-- Add columns for final standings and tracker to season_summaries
alter table if exists season_summaries
  add column if not exists final_standings jsonb,
  add column if not exists tracker jsonb;

-- Optionally, add indexes if you plan to query these fields directly
-- create index if not exists idx_season_summaries_final_standings on season_summaries using gin (final_standings);
-- create index if not exists idx_season_summaries_tracker on season_summaries using gin (tracker);
