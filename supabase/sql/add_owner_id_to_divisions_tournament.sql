-- Migration: Add owner_id column to divisions_tournament table
alter table if exists divisions_tournament
add column if not exists owner_id uuid;

-- Create index on owner_id for faster queries
create index if not exists idx_divisions_tournament_owner_id on divisions_tournament (owner_id);
