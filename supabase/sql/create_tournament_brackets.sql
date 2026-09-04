-- Create tournament_brackets table to store active tournament brackets
create table if not exists tournament_brackets (
  id text primary key,
  division integer not null,
  format text not null,
  bracket_data jsonb,
  status text default 'active',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_tournament_brackets_division on tournament_brackets (division);
create index if not exists idx_tournament_brackets_status on tournament_brackets (status);
