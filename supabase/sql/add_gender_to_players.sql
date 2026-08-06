-- add_gender_to_players.sql
-- Add a `gender` column to all players tables for gender-based match generation

BEGIN;

ALTER TABLE IF EXISTS players
  ADD COLUMN IF NOT EXISTS gender text;

ALTER TABLE IF EXISTS players_doubles
  ADD COLUMN IF NOT EXISTS gender text;

ALTER TABLE IF EXISTS players_5champ
  ADD COLUMN IF NOT EXISTS gender text;

ALTER TABLE IF EXISTS players_roundrobin
  ADD COLUMN IF NOT EXISTS gender text;

ALTER TABLE IF EXISTS players_partner_practice
  ADD COLUMN IF NOT EXISTS gender text;

COMMIT;

-- Verify with:
-- SELECT column_name FROM information_schema.columns WHERE table_name='players' AND column_name='gender';
-- SELECT column_name FROM information_schema.columns WHERE table_name='players_doubles' AND column_name='gender';
-- SELECT column_name FROM information_schema.columns WHERE table_name='players_5champ' AND column_name='gender';
-- SELECT column_name FROM information_schema.columns WHERE table_name='players_roundrobin' AND column_name='gender';
-- SELECT column_name FROM information_schema.columns WHERE table_name='players_partner_practice' AND column_name='gender';
