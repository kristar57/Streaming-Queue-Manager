-- User rating on watchlist entries: -1 = Pass, 1 = Good, 2 = Loved
ALTER TABLE watchlist_entries
  ADD COLUMN IF NOT EXISTS user_rating smallint CHECK (user_rating IN (-1, 1, 2));

-- Opt-in flag for automated recommendations (default on)
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS enable_recommendations boolean NOT NULL DEFAULT true;
