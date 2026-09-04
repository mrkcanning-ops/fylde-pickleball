-- Create running_seasons_tournament table for Tournament mode
create table if not exists running_seasons_tournament (
  id text primary key,
  name text,
  started_at timestamptz,
  division integer not null,
  foreign key (division) references divisions_tournament(id)
);

create index if not exists idx_running_seasons_tournament_division on running_seasons_tournament (division);
