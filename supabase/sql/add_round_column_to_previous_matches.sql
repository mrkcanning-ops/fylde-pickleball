-- Add round and court columns to previous_matches tables for proper round-by-round and court grouping
ALTER TABLE previous_matches_roundrobin ADD COLUMN IF NOT EXISTS round INTEGER DEFAULT 1;
ALTER TABLE previous_matches_roundrobin ADD COLUMN IF NOT EXISTS court TEXT DEFAULT 'court1';

ALTER TABLE previous_matches_doubles ADD COLUMN IF NOT EXISTS round INTEGER DEFAULT 1;
ALTER TABLE previous_matches_doubles ADD COLUMN IF NOT EXISTS court TEXT DEFAULT 'court1';

ALTER TABLE previous_matches_5champ ADD COLUMN IF NOT EXISTS round INTEGER DEFAULT 1;
ALTER TABLE previous_matches_5champ ADD COLUMN IF NOT EXISTS court TEXT DEFAULT 'court1';

-- Create indexes on round and court for faster queries
CREATE INDEX IF NOT EXISTS idx_previous_matches_roundrobin_round ON previous_matches_roundrobin (round);
CREATE INDEX IF NOT EXISTS idx_previous_matches_roundrobin_court ON previous_matches_roundrobin (court);

CREATE INDEX IF NOT EXISTS idx_previous_matches_doubles_round ON previous_matches_doubles (round);
CREATE INDEX IF NOT EXISTS idx_previous_matches_doubles_court ON previous_matches_doubles (court);

CREATE INDEX IF NOT EXISTS idx_previous_matches_5champ_round ON previous_matches_5champ (round);
CREATE INDEX IF NOT EXISTS idx_previous_matches_5champ_court ON previous_matches_5champ (court);
