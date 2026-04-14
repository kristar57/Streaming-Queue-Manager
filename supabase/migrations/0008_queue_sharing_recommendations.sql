-- ============================================================
-- Queue position (manual stack rank for Up Next)
-- ============================================================
alter table watchlist_entries
  add column if not exists queue_position integer;  -- null = unranked (sorts last)

-- ============================================================
-- RLS: split watchlist_entries into read-all + own-write
-- so household members can see each other's lists.
-- ============================================================
drop policy if exists "Users manage own watchlist" on watchlist_entries;

create policy "Authenticated users read all watchlist entries" on watchlist_entries
  for select using (auth.role() = 'authenticated');

create policy "Users insert own watchlist entries" on watchlist_entries
  for insert with check (auth.uid() = user_id);

create policy "Users update own watchlist entries" on watchlist_entries
  for update using (auth.uid() = user_id);

create policy "Users delete own watchlist entries" on watchlist_entries
  for delete using (auth.uid() = user_id);

-- ============================================================
-- RLS: allow all authenticated users to read all profiles
-- (needed to show display names on shared entries)
-- ============================================================
create policy "Authenticated users view all profiles" on profiles
  for select using (auth.role() = 'authenticated');

-- ============================================================
-- Recommendations (in-app only; email alerts are Phase 4)
-- ============================================================
create table recommendations (
  id uuid primary key default gen_random_uuid(),
  from_user_id uuid not null references profiles(id) on delete cascade,
  to_user_id   uuid not null references profiles(id) on delete cascade,
  title_id     uuid not null references titles(id)   on delete cascade,
  message      text,
  status       text not null default 'pending'
               check (status in ('pending', 'accepted', 'declined')),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique(from_user_id, to_user_id, title_id)
);

create trigger recommendations_updated_at
  before update on recommendations
  for each row execute procedure touch_updated_at();

alter table recommendations enable row level security;

-- Sender sees recommendations they sent; recipient sees ones addressed to them
create policy "Users read own recommendations" on recommendations
  for select using (auth.uid() = from_user_id or auth.uid() = to_user_id);

create policy "Users send recommendations" on recommendations
  for insert with check (auth.uid() = from_user_id);

-- Recipient updates status (accept / decline)
create policy "Recipient updates recommendation" on recommendations
  for update using (auth.uid() = to_user_id);

-- Sender can retract an unsent/pending recommendation
create policy "Sender deletes recommendation" on recommendations
  for delete using (auth.uid() = from_user_id);

-- Grant table access to authenticated role
grant select, insert, update, delete on recommendations to authenticated;
