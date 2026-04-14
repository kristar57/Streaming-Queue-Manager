-- "Caught up" flag on watchlist entries.
-- Applies only to shows with status = 'watching'. Means: I've watched
-- everything currently available and I'm waiting for new content.
-- Drives the "Caught up" badge and will trigger new-season notifications
-- in Phase 4 (same as 'watching' but more precise intent).
-- Resets to false when status changes away from 'watching'.

alter table watchlist_entries
  add column if not exists is_caught_up boolean not null default false;
