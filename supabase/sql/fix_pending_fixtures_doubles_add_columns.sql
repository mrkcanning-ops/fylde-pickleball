-- fix_pending_fixtures_doubles_add_columns.sql
-- Safely add expected pending_fixtures columns to pending_fixtures_doubles

BEGIN;

-- Add columns used by the app if they are missing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'pending_fixtures_doubles' AND column_name = 'court1_matches'
  ) THEN
    ALTER TABLE pending_fixtures_doubles ADD COLUMN court1_matches jsonb DEFAULT '[]'::jsonb;
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'pending_fixtures_doubles' AND column_name = 'court2_matches'
  ) THEN
    ALTER TABLE pending_fixtures_doubles ADD COLUMN court2_matches jsonb DEFAULT '[]'::jsonb;
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'pending_fixtures_doubles' AND column_name = 'court1_scores'
  ) THEN
    ALTER TABLE pending_fixtures_doubles ADD COLUMN court1_scores jsonb DEFAULT '[]'::jsonb;
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'pending_fixtures_doubles' AND column_name = 'court2_scores'
  ) THEN
    ALTER TABLE pending_fixtures_doubles ADD COLUMN court2_scores jsonb DEFAULT '[]'::jsonb;
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'pending_fixtures_doubles' AND column_name = 'court1_byes'
  ) THEN
    ALTER TABLE pending_fixtures_doubles ADD COLUMN court1_byes jsonb DEFAULT '[]'::jsonb;
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'pending_fixtures_doubles' AND column_name = 'court2_byes'
  ) THEN
    ALTER TABLE pending_fixtures_doubles ADD COLUMN court2_byes jsonb DEFAULT '[]'::jsonb;
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'pending_fixtures_doubles' AND column_name = 'status'
  ) THEN
    ALTER TABLE pending_fixtures_doubles ADD COLUMN status text DEFAULT 'generated';
  END IF;
END$$;

COMMIT;

-- After running, verify with:
-- SELECT column_name, data_type, column_default FROM information_schema.columns
-- WHERE table_name = 'pending_fixtures_doubles' AND column_name IN (
--   'court1_matches','court2_matches','court1_scores','court2_scores','court1_byes','court2_byes','status'
-- );
