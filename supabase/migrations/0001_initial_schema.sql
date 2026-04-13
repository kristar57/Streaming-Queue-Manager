-- ============================================================
-- PROFILES (extends Supabase auth.users)
-- ============================================================
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  is_admin boolean not null default false,
  invited_by uuid references profiles(id),
  consent_accepted_at timestamptz,
  consent_policy_version text,
  created_at timestamptz not null default now()
);

-- Auto-create profile on signup
create or replace function handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into profiles (id, display_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1))
  );
  return new;
end;
$$;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();

-- ============================================================
-- INVITE CODES
-- ============================================================
create table invite_codes (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  created_by uuid not null references profiles(id),
  used_by uuid references profiles(id),
  expires_at timestamptz,
  created_at timestamptz not null default now()
);

-- ============================================================
-- TITLES (TMDB-sourced catalog — shared across all users)
-- ============================================================
create type title_type as enum ('movie', 'show');

create table titles (
  id uuid primary key default gen_random_uuid(),
  tmdb_id integer unique not null,
  type title_type not null,
  title text not null,
  overview text,
  poster_path text,           -- TMDB path only; build full URL at render time
  backdrop_path text,
  release_date date,
  genres text[] not null default '{}',  -- TMDB genre name strings
  tmdb_rating numeric(3,1),
  runtime_minutes integer,    -- movies only
  season_count integer,       -- shows only
  episode_count integer,      -- shows only
  tmdb_status text,           -- 'Released', 'In Production', 'Ended', 'Canceled', etc.
  last_synced_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

-- ============================================================
-- WATCHLIST ENTRIES (one row per user per title)
-- ============================================================
create type entry_status as enum ('want_to_watch', 'watching', 'watched');
create type entry_priority as enum ('high', 'medium', 'low');

create table watchlist_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  title_id uuid not null references titles(id) on delete cascade,
  status entry_status not null default 'want_to_watch',
  priority entry_priority not null default 'medium',
  custom_tags text[] not null default '{}',  -- user-defined tags: 'dramedy', 'romcom', etc.
  current_season integer,
  current_episode integer,
  notes text,
  date_started timestamptz,
  date_completed timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, title_id)
);

-- Shared updated_at trigger function (used by multiple tables)
create or replace function touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger watchlist_entries_updated_at
  before update on watchlist_entries
  for each row execute procedure touch_updated_at();

-- ============================================================
-- RATINGS (per-viewer — intentionally separate from entries,
-- used as training data for AI recommendations in a future version)
-- ============================================================
create table ratings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  title_id uuid not null references titles(id) on delete cascade,
  rating numeric(2,1) check (rating >= 0.5 and rating <= 5.0),  -- half-star steps
  review text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, title_id)
);
create trigger ratings_updated_at
  before update on ratings
  for each row execute procedure touch_updated_at();

-- ============================================================
-- USER SUBSCRIPTIONS (which streaming services the user pays for)
-- Drives the "subscribed / not subscribed" filter and availability alerts
-- ============================================================
create table user_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  provider_id integer not null,    -- TMDB provider ID
  provider_name text not null,
  provider_logo_path text,
  created_at timestamptz not null default now(),
  unique(user_id, provider_id)
);

-- ============================================================
-- STREAMING AVAILABILITY (cached from TMDB — not fetched live)
-- Refreshed when a title is added and on a nightly cron schedule
-- ============================================================
create type availability_type as enum ('flatrate', 'rent', 'buy', 'ads', 'free');

create table streaming_availability (
  id uuid primary key default gen_random_uuid(),
  title_id uuid not null references titles(id) on delete cascade,
  provider_id integer not null,
  provider_name text not null,
  provider_logo_path text,
  availability_type availability_type not null,
  country_code text not null default 'US',
  last_checked_at timestamptz not null default now(),
  unique(title_id, provider_id, availability_type, country_code)
);

-- ============================================================
-- NOTIFICATION PREFERENCES
-- User-configured — not automatic. User opts in to each alert type.
-- ============================================================
create table notification_preferences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique not null references profiles(id) on delete cascade,
  notify_now_streaming boolean not null default true,  -- title lands on a subscribed service
  notify_new_season boolean not null default true,     -- new season of a tracked show drops
  notify_leaving_soon boolean not null default false,  -- title leaving a subscribed service soon
  email_enabled boolean not null default true,
  created_at timestamptz not null default now()
);

-- ============================================================
-- NOTIFICATION LOG (prevents duplicate alerts)
-- ============================================================
create type notification_type as enum ('now_streaming', 'new_season', 'leaving_soon');

create table notification_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  title_id uuid not null references titles(id) on delete cascade,
  type notification_type not null,
  sent_at timestamptz not null default now(),
  unique(user_id, title_id, type)  -- prevents re-sending the same alert
);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
alter table profiles enable row level security;
alter table invite_codes enable row level security;
alter table titles enable row level security;
alter table watchlist_entries enable row level security;
alter table ratings enable row level security;
alter table user_subscriptions enable row level security;
alter table streaming_availability enable row level security;
alter table notification_preferences enable row level security;
alter table notification_log enable row level security;

-- Profiles: users see and update their own; admins see all
create policy "Users view own profile" on profiles
  for select using (auth.uid() = id);
create policy "Admins view all profiles" on profiles
  for select using (
    exists (select 1 from profiles where id = auth.uid() and is_admin = true)
  );
create policy "Users update own profile" on profiles
  for update using (auth.uid() = id);

-- Titles: readable by all authenticated users; written only by service role
create policy "Authenticated users read titles" on titles
  for select using (auth.role() = 'authenticated');

-- Watchlist entries: users manage only their own
create policy "Users manage own watchlist" on watchlist_entries
  for all using (auth.uid() = user_id);

-- Ratings: users manage only their own
create policy "Users manage own ratings" on ratings
  for all using (auth.uid() = user_id);

-- User subscriptions: users manage only their own
create policy "Users manage own subscriptions" on user_subscriptions
  for all using (auth.uid() = user_id);

-- Streaming availability: readable by all authenticated users
create policy "Authenticated users read availability" on streaming_availability
  for select using (auth.role() = 'authenticated');

-- Notification preferences: users manage only their own
create policy "Users manage own notification prefs" on notification_preferences
  for all using (auth.uid() = user_id);

-- Notification log: users read only their own
create policy "Users read own notification log" on notification_log
  for select using (auth.uid() = user_id);

-- Invite codes: admins manage; public read for registration validation
create policy "Admins manage invite codes" on invite_codes
  for all using (
    exists (select 1 from profiles where id = auth.uid() and is_admin = true)
  );
create policy "Public can validate invite codes" on invite_codes
  for select using (true);
