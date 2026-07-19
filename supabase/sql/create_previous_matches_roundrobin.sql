-- Create previous_matches_roundrobin table for round-robin mode
create table if not exists previous_matches_roundrobin (
  id text primary key,
  division integer not null,
  players jsonb not null,
  scores jsonb not null,
  created_at timestamptz default now(),
  foreign key (division) references divisions_roundrobin(id) on delete cascade
);

create index if not exists idx_previous_matches_roundrobin_division on previous_matches_roundrobin (division);
create index if not exists idx_previous_matches_roundrobin_created on previous_matches_roundrobin (created_at desc);
