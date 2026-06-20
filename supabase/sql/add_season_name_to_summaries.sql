-- Add `name` column to season_summaries tables
alter table if exists season_summaries
  add column if not exists name text;

alter table if exists season_summaries_doubles
  add column if not exists name text;
