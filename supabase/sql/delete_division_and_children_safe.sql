-- Safe RPC to delete division-related rows only if the tables exist.
-- Run this in Supabase SQL editor to replace the previous function.

create or replace function public.delete_division_and_children(old_id int)
returns void
language plpgsql
security definer
as $$
begin
  -- Delete previous_matches for the division if table exists
  if to_regclass('public.previous_matches') is not null then
    delete from previous_matches where division = old_id;
  end if;

  -- Delete players for the division if table exists
  if to_regclass('public.players') is not null then
    delete from players where division = old_id;
  end if;

  -- Delete division row only if a divisions table exists
  if to_regclass('public.divisions') is not null then
    delete from divisions where id = old_id;
  end if;
end;
$$;
