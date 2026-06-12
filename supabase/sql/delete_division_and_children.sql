-- RPC to delete a division and all related players and previous_matches
-- Run this in your Supabase SQL editor or apply via migration

create or replace function delete_division_and_children(old_id int)
returns void as $$
begin
  -- delete dependent rows first
  delete from previous_matches where division = old_id;
  delete from players where division = old_id;
  -- finally delete the division itself
  delete from divisions where id = old_id;
end;
$$ language plpgsql;
