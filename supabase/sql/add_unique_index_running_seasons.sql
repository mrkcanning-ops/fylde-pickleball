-- Ensure one active running season per division_uid
-- Run after `migrate_division_uids.sql` and verify no NULLs.

create unique index if not exists ux_running_seasons_division_uid on running_seasons (division_uid);
create unique index if not exists ux_running_seasons_doubles_division_uid on running_seasons_doubles (division_uid);

-- Optional: if you prefer uniqueness on integer `division` for legacy behaviour, add:
-- create unique index if not exists ux_running_seasons_division on running_seasons (division);
-- create unique index if not exists ux_running_seasons_doubles_division on running_seasons_doubles (division);
