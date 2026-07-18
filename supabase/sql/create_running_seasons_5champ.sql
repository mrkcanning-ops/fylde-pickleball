-- Create running_seasons_5champ table for 5-player championship mode
create table if not exists running_seasons_5champ (
  id text primary key,
  name text not null,
  started_at timestamptz default now(),
  division integer not null,
  created_at timestamptz default now(),
  foreign key (division) references divisions_5champ(id) on delete cascade
);

create index if not exists idx_running_seasons_5champ_division on running_seasons_5champ (division);
