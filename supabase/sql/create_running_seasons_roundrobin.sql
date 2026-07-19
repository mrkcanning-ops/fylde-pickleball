-- Create running_seasons_roundrobin table for round-robin mode
create table if not exists running_seasons_roundrobin (
  id text primary key,
  name text not null,
  started_at timestamptz default now(),
  division integer not null,
  created_at timestamptz default now(),
  foreign key (division) references divisions_roundrobin(id) on delete cascade
);

create index if not exists idx_running_seasons_roundrobin_division on running_seasons_roundrobin (division);
