-- fix_matches_doubles_add_division.sql
-- Safely add a `division` column to matches_doubles so doubles matches can be scoped

BEGIN;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'matches_doubles' AND column_name = 'division'
  ) THEN
    ALTER TABLE matches_doubles ADD COLUMN division integer DEFAULT 1;
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE tablename = 'matches_doubles' AND indexname = 'idx_matches_doubles_division'
  ) THEN
    CREATE INDEX idx_matches_doubles_division ON matches_doubles (division);
  END IF;
END$$;

COMMIT;
