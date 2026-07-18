-- Create previous_matches_5champ table for 5-player championship mode
create table if not exists previous_matches_5champ (
  id text primary key,
  division integer not null,
  players jsonb not null,
  scores jsonb not null,
  created_at timestamptz default now(),
  foreign key (division) references divisions_5champ(id) on delete cascade
);

create index if not exists idx_previous_matches_5champ_division on previous_matches_5champ (division);
create index if not exists idx_previous_matches_5champ_created on previous_matches_5champ (created_at desc);
