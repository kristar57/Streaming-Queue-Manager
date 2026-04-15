-- Fix auto_add_to_watchlist trigger to only add a watchlist entry for the
-- user who added the title to the shared queue (NEW.added_by), not for all
-- queue members. Other members decide for themselves what goes in their list.
create or replace function auto_add_to_watchlist()
returns trigger language plpgsql security definer as $$
begin
  insert into watchlist_entries (user_id, title_id, status, priority)
  select new.added_by, new.title_id, 'want_to_watch', 'medium'
  where not exists (
    select 1 from watchlist_entries we
    where we.user_id = new.added_by
      and we.title_id = new.title_id
  );
  return new;
end;
$$;
