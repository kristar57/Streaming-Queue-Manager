-- Phase 2/3: store full TMDB detail data fetched when a title is added.
-- These columns are populated by the detail+credits endpoint call in the
-- frontend upsertTitle helper. Existing rows will have NULLs until the
-- title is re-added or a background sync runs.
-- Note: "cast" is a reserved SQL keyword — stored as cast_members.

alter table titles
  add column if not exists cast_members jsonb,           -- [{name, character, profile_path}] top 5
  add column if not exists tagline text,
  add column if not exists director text,                -- movies: comma-joined director names
  add column if not exists created_by text,             -- shows: comma-joined creator names
  add column if not exists network text,                -- shows: primary network name
  add column if not exists last_air_date date,          -- shows
  add column if not exists next_episode_air_date date,  -- shows: null = no scheduled next ep
  add column if not exists in_production boolean;       -- shows
