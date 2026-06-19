-- fix_divisions_doubles_sequence.sql
-- Ensure divisions_doubles.id auto-increments via a sequence and set its ownership

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relkind = 'S' AND c.relname = 'divisions_doubles_id_seq'
  ) THEN
    CREATE SEQUENCE divisions_doubles_id_seq;
  END IF;
END
$$;

-- Set sequence current value to max(id) so nextval won't collide
-- Set the sequence current value based on max(id) safely.
DO $$
DECLARE
  m bigint;
BEGIN
  SELECT MAX(id) INTO m FROM divisions_doubles;
  IF m IS NULL THEN
    -- no rows: set sequence so nextval() will return 1
    PERFORM setval('divisions_doubles_id_seq', 1, false);
  ELSE
    -- set to current max and mark called so nextval() returns max+1
    PERFORM setval('divisions_doubles_id_seq', m, true);
  END IF;
END
$$;

-- Attach sequence as default for the id column
ALTER TABLE divisions_doubles
  ALTER COLUMN id SET DEFAULT nextval('divisions_doubles_id_seq'::regclass);

-- Make the sequence owned by the column
ALTER SEQUENCE divisions_doubles_id_seq OWNED BY divisions_doubles.id;

-- Optional: insert a sample row to test (uncomment to run):
-- INSERT INTO divisions_doubles (name) VALUES ('Division 1');

-- Verify:
-- SELECT column_default FROM information_schema.columns WHERE table_name='divisions_doubles' AND column_name='id';
-- SELECT * FROM divisions_doubles LIMIT 10;
