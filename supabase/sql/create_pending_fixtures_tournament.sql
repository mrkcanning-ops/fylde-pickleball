-- Create pending_fixtures_tournament table for Tournament mode
create table if not exists pending_fixtures_tournament (
  division integer primary key,
  payload jsonb,
  status text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  foreign key (division) references divisions_tournament(id)
);

create index if not exists idx_pending_fixtures_tournament_division on pending_fixtures_tournament (division);
