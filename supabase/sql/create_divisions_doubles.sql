-- Create divisions_doubles table for Doubles mode
create table if not exists divisions_doubles (
  id integer primary key,
  name text
);

create index if not exists idx_divisions_doubles_id on divisions_doubles (id);
