-- Phase 2: allow authenticated users to upsert titles (TMDB catalog rows)
-- and manage streaming_availability cache entries.
--
-- Titles are a shared catalog — any authenticated user can insert or update
-- a title (e.g., when adding to their watchlist). The service role handles
-- nightly syncs. We never allow DELETE through the app.
--
-- streaming_availability rows are inserted/refreshed when titles are added
-- and by the nightly cron. Any authenticated user can manage them (they're
-- not user-owned; they reflect TMDB data).

create policy "Authenticated users insert titles" on titles
  for insert with check (auth.role() = 'authenticated');

create policy "Authenticated users update titles" on titles
  for update using (auth.role() = 'authenticated');

create policy "Authenticated users insert availability" on streaming_availability
  for insert with check (auth.role() = 'authenticated');

create policy "Authenticated users update availability" on streaming_availability
  for update using (auth.role() = 'authenticated');

create policy "Authenticated users delete availability" on streaming_availability
  for delete using (auth.role() = 'authenticated');
