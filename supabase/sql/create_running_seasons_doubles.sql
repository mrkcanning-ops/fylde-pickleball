-- Create running_seasons_doubles table for Doubles mode
create table if not exists running_seasons_doubles (
  id text primary key,
  name text,
  started_at timestamptz,
  division integer not null
);

create index if not exists idx_running_seasons_doubles_division on running_seasons_doubles (division);
