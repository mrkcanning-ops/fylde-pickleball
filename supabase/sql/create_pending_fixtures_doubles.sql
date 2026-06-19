-- Create pending_fixtures_doubles table for Doubles mode
create table if not exists pending_fixtures_doubles (
  division integer primary key,
  payload jsonb,
  status text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_pending_fixtures_doubles_division on pending_fixtures_doubles (division);
