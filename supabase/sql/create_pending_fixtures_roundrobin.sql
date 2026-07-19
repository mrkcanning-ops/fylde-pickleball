-- Create pending_fixtures_roundrobin table for round-robin mode
create table if not exists pending_fixtures_roundrobin (
  division integer not null primary key,
  payload jsonb,
  court1_matches jsonb,
  court1_scores jsonb,
  court1_byes jsonb,
  court2_matches jsonb,
  court2_scores jsonb,
  court2_byes jsonb,
  court3_matches jsonb,
  court3_scores jsonb,
  court3_byes jsonb,
  court4_matches jsonb,
  court4_scores jsonb,
  court4_byes jsonb,
  status text default 'pending',
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  foreign key (division) references divisions_roundrobin(id) on delete cascade
);

create index if not exists idx_pending_fixtures_roundrobin_status on pending_fixtures_roundrobin (status);
