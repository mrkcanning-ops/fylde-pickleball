-- Create previous_matches_doubles table for Doubles mode
create table if not exists previous_matches_doubles (
  id text primary key,
  division integer not null,
  players jsonb,
  scores jsonb,
  created_at timestamptz default now()
);

create index if not exists idx_previous_matches_doubles_division_created on previous_matches_doubles (division, created_at desc);
