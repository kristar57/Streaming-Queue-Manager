-- Extend user_rating to support 3 levels of thumbs up (1, 2, 3) plus thumbs down (-1)
ALTER TABLE watchlist_entries
  DROP CONSTRAINT IF EXISTS watchlist_entries_user_rating_check;

ALTER TABLE watchlist_entries
  ADD CONSTRAINT watchlist_entries_user_rating_check
  CHECK (user_rating IN (-1, 1, 2, 3));
