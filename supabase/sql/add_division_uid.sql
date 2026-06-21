-- Add a text `uid` column to divisions tables and backfill with UUIDs
create extension if not exists pgcrypto;

-- divisions
alter table if exists divisions
  add column if not exists uid text;

update divisions
set uid = gen_random_uuid()::text
where uid is null;

alter table if exists divisions
  alter column uid set not null;

create unique index if not exists idx_divisions_uid on divisions (uid);
alter table if exists divisions
  alter column uid set default gen_random_uuid()::text;

-- divisions_doubles
alter table if exists divisions_doubles
  add column if not exists uid text;

update divisions_doubles
set uid = gen_random_uuid()::text
where uid is null;

alter table if exists divisions_doubles
  alter column uid set not null;

create unique index if not exists idx_divisions_doubles_uid on divisions_doubles (uid);
alter table if exists divisions_doubles
  alter column uid set default gen_random_uuid()::text;
