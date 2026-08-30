-- Add round column to previous_matches tables for proper round-by-round grouping
ALTER TABLE previous_matches_roundrobin ADD COLUMN IF NOT EXISTS round INTEGER DEFAULT 1;
ALTER TABLE previous_matches_doubles ADD COLUMN IF NOT EXISTS round INTEGER DEFAULT 1;
ALTER TABLE previous_matches_5champ ADD COLUMN IF NOT EXISTS round INTEGER DEFAULT 1;

-- Create index on round for faster queries
CREATE INDEX IF NOT EXISTS idx_previous_matches_roundrobin_round ON previous_matches_roundrobin (round);
CREATE INDEX IF NOT EXISTS idx_previous_matches_doubles_round ON previous_matches_doubles (round);
CREATE INDEX IF NOT EXISTS idx_previous_matches_5champ_round ON previous_matches_5champ (round);
