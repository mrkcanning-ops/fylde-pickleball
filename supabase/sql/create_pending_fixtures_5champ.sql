-- Create pending_fixtures_5champ table for 5-player championship mode
create table if not exists pending_fixtures_5champ (
  division integer not null primary key,
  payload jsonb not null,
  status text default 'pending',
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  foreign key (division) references divisions_5champ(id) on delete cascade
);

create index if not exists idx_pending_fixtures_5champ_status on pending_fixtures_5champ (status);
