-- Backfill `division_uid` into related tables and create indexes
-- Run this after `add_division_uid.sql` has been applied and verified.

begin;

-- players
alter table if exists players add column if not exists division_uid text;
update players
set division_uid = d.uid
from divisions d
where players.division = d.id;
create index if not exists idx_players_division_uid on players (division_uid);

-- players_doubles
alter table if exists players_doubles add column if not exists division_uid text;
update players_doubles
set division_uid = d.uid
from divisions_doubles d
where players_doubles.division = d.id;
create index if not exists idx_players_doubles_division_uid on players_doubles (division_uid);

-- previous_matches
alter table if exists previous_matches add column if not exists division_uid text;
update previous_matches
set division_uid = d.uid
from divisions d
where previous_matches.division = d.id;
create index if not exists idx_previous_matches_division_uid on previous_matches (division_uid);

-- previous_matches_doubles
alter table if exists previous_matches_doubles add column if not exists division_uid text;
update previous_matches_doubles
set division_uid = d.uid
from divisions_doubles d
where previous_matches_doubles.division = d.id;
create index if not exists idx_previous_matches_doubles_division_uid on previous_matches_doubles (division_uid);

-- season_summaries
alter table if exists season_summaries add column if not exists division_uid text;
update season_summaries
set division_uid = d.uid
from divisions d
where season_summaries.division = d.id;
create index if not exists idx_season_summaries_division_uid on season_summaries (division_uid);

-- season_summaries_doubles
alter table if exists season_summaries_doubles add column if not exists division_uid text;
update season_summaries_doubles
set division_uid = d.uid
from divisions_doubles d
where season_summaries_doubles.division = d.id;
create index if not exists idx_season_summaries_doubles_division_uid on season_summaries_doubles (division_uid);

-- running_seasons
alter table if exists running_seasons add column if not exists division_uid text;
update running_seasons
set division_uid = d.uid
from divisions d
where running_seasons.division = d.id;
create index if not exists idx_running_seasons_division_uid on running_seasons (division_uid);

-- running_seasons_doubles
alter table if exists running_seasons_doubles add column if not exists division_uid text;
update running_seasons_doubles
set division_uid = d.uid
from divisions_doubles d
where running_seasons_doubles.division = d.id;
create index if not exists idx_running_seasons_doubles_division_uid on running_seasons_doubles (division_uid);

-- pending_fixtures
alter table if exists pending_fixtures add column if not exists division_uid text;
update pending_fixtures
set division_uid = d.uid
from divisions d
where pending_fixtures.division = d.id;
create index if not exists idx_pending_fixtures_division_uid on pending_fixtures (division_uid);

-- pending_fixtures_doubles
alter table if exists pending_fixtures_doubles add column if not exists division_uid text;
update pending_fixtures_doubles
set division_uid = d.uid
from divisions_doubles d
where pending_fixtures_doubles.division = d.id;
create index if not exists idx_pending_fixtures_doubles_division_uid on pending_fixtures_doubles (division_uid);

commit;

-- Notes:
-- 1) Verify results before setting `division_uid` NOT NULL constraints.
-- 2) After app migration, you can drop the integer `division` columns or keep them as legacy.
-- 3) Update backend/client code to write/consume `division_uid` going forward.
