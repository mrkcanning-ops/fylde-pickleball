-- Create divisions_roundrobin table for round-robin mode
create table if not exists divisions_roundrobin (
  id serial primary key,
  name text not null unique,
  min_qualify_games integer default 10,
  created_at timestamptz default now()
);
