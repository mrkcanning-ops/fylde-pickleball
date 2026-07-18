-- Create divisions_5champ table for 5-player championship mode
create table if not exists divisions_5champ (
  id serial primary key,
  name text not null unique,
  min_qualify_games integer default 10,
  created_at timestamptz default now()
);
