-- add_min_qualify_games_to_divisions.sql
-- Add a `min_qualify_games` column to divisions and divisions_doubles with default 10

BEGIN;

ALTER TABLE IF EXISTS divisions
  ADD COLUMN IF NOT EXISTS min_qualify_games integer DEFAULT 10;

ALTER TABLE IF EXISTS divisions_doubles
  ADD COLUMN IF NOT EXISTS min_qualify_games integer DEFAULT 10;

COMMIT;

-- Verify with:
-- SELECT column_default FROM information_schema.columns WHERE table_name='divisions' AND column_name='min_qualify_games';
-- SELECT column_default FROM information_schema.columns WHERE table_name='divisions_doubles' AND column_name='min_qualify_games';
