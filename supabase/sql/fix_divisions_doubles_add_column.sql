-- fix_divisions_doubles_add_column.sql
-- Safely add min_qualify_games to divisions_doubles if missing, matching default of league divisions.

BEGIN;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'divisions_doubles' AND column_name = 'min_qualify_games'
  ) THEN
    ALTER TABLE divisions_doubles ADD COLUMN min_qualify_games integer DEFAULT 10;
  END IF;
END$$;

-- Ensure divisions table has the column as well
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'divisions' AND column_name = 'min_qualify_games'
  ) THEN
    ALTER TABLE divisions ADD COLUMN min_qualify_games integer DEFAULT 10;
  END IF;
END$$;

COMMIT;

-- After running, verify with:
-- SELECT column_name, column_default FROM information_schema.columns WHERE table_name IN ('divisions','divisions_doubles') AND column_name='min_qualify_games';
