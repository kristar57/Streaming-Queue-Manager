# QueShare — Claude Code Build Spec

> **Name note:** "QueShare" is confirmed — the developer owns **queshare.com**. The name is locked.
>
> **Reference project:** The developer has a working production app called PreXpose built with this same stack. Mirror its patterns for auth, invite codes, admin panel, Resend email, and Fly.io deployment wherever possible. The PreXpose codebase is at `c:/Users/krist/Documents/Projects/Landscape Photography Planner/`.

---

## What This App Is

QueShare is a private, invite-only household watchlist app for tracking movies and TV shows across streaming platforms. Users manage a shared queue with per-person tracking, discover where titles are currently streaming, get notified when something on their list becomes available, and rate what they've watched — building individual taste profiles for future AI-powered recommendations.

**Initial users:** A couple (two accounts). Designed to scale to family members and eventually a small friend network.

**Access:** Progressive Web App (PWA) — deployed to Fly.io, installable on iPhone via Safari → Share → "Add to Home Screen", and on Android via Chrome. No App Store required at this stage.

---

## How QueShare Relates to Existing Apps

Understanding where QueShare fits avoids accidentally replicating what already exists and clarifies what makes it worth building.

**JustWatch** — best at answering "where can I stream this right now?" Single-user watchlist with good availability data but no per-viewer tracking, no household sharing, no priority system, and no ratings. QueShare uses the same underlying data source (TMDB) but wraps it in the organizational layer JustWatch lacks.

**Trakt** — closest analog to QueShare in feature terms. Strong watch history, episode tracking, and Plex/Kodi integration. Weak on the shared household queue concept — sharing means two separate accounts with no native "we're watching this together" state. No per-viewer ratings in a household context.

**Letterboxd** — movies only, social/diary focus. Excellent for personal film logs and social discovery, not designed for managing an active queue or household coordination.

**Plex** — a media server for content the user already owns or has downloaded locally. Entirely different problem. A Plex user would still want QueShare to track what they've watched (including Plex content added manually), rate it, and manage what to watch next across their streaming subscriptions. The two are complementary — Trakt's Plex plugin exists precisely for this reason. QueShare could eventually support manual "watched via Plex" logging without any Plex API integration required.

**The gap QueShare fills:** No existing app combines a shared household queue with per-viewer status tracking, per-viewer ratings, subscription-aware availability, and configurable alerts — all in a private, invite-only environment designed for a trusted circle rather than a public social network.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + TypeScript + Vite |
| PWA | `vite-plugin-pwa` (Workbox) |
| Styling | Tailwind CSS |
| Backend / Database | Supabase (PostgreSQL + Auth + Realtime + Storage) |
| External data | TMDB API (The Movie Database) |
| Email / Notifications | Resend (already configured in PreXpose — reuse same account) |
| Hosting | Fly.io (same account and workflow as PreXpose) |
| TMDB proxy | Supabase Edge Function (keeps API key server-side) |

**Do not add a separate backend server.** Supabase handles all data operations. The only server-side logic is a Supabase Edge Function to proxy TMDB calls and a scheduled notification function.

---

## Environment Variables

### Frontend (Vite — prefix with `VITE_`)

```
VITE_SUPABASE_URL=https://[project-id].supabase.co
VITE_SUPABASE_ANON_KEY=[anon key — safe to expose in frontend]
```

### Supabase Edge Function secrets

```
TMDB_API_KEY=[from themoviedb.org — never expose to frontend]
RESEND_API_KEY=[same key already used in PreXpose]
RESEND_FROM_EMAIL=[sending address — match or extend PreXpose setup]
```

### Getting a TMDB API Key

1. Create a free account at https://www.themoviedb.org
2. Go to Settings → API → Request an API Key → Developer
3. Fill in the form (app name: QueShare, use: personal project)
4. Copy the **API Read Access Token** (the long bearer token, not the short v3 key)
5. Store as `TMDB_API_KEY` in Supabase Edge Function secrets via:
   ```bash
   supabase secrets set TMDB_API_KEY=[token]
   ```

---

## Authentication

Follow the PreXpose invite-code pattern exactly:

- No public signup page — registration requires a valid invite code
- Admin generates codes via the admin panel with optional expiry date
- New user registers at `/register?code=[code]` — code is validated server-side before account creation
- On first login, user sees a consent screen (Privacy Policy + Terms of Service) and must accept before accessing the app
- Record consent with: user ID, policy version, timestamp
- Auth provider: Supabase email + password (no OAuth for now)

---

## Database Schema

Apply all schema changes via `supabase db push`. Never paste SQL manually into the Supabase dashboard.

```sql
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
  provider_id integer not null,    -- TMDB provider ID (see common IDs below)
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

-- Invite codes: admins manage; public read for registration validation
create policy "Admins manage invite codes" on invite_codes
  for all using (
    exists (select 1 from profiles where id = auth.uid() and is_admin = true)
  );
create policy "Public can validate invite codes" on invite_codes
  for select using (true);
```

---

## TMDB API Integration

All TMDB calls go through a **Supabase Edge Function** (`/functions/v1/tmdb`) to keep the API key off the client.

### Edge Function proxy

```typescript
// supabase/functions/tmdb/index.ts
// POST { path: '/search/multi', params: { query: 'severance' } }

Deno.serve(async (req) => {
  const { path, params } = await req.json()
  const url = new URL(`https://api.themoviedb.org/3${path}`)
  Object.entries(params ?? {}).forEach(([k, v]) => url.searchParams.set(k, String(v)))

  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${Deno.env.get('TMDB_API_KEY')}` }
  })
  const data = await res.json()
  return new Response(JSON.stringify(data), {
    headers: { 'Content-Type': 'application/json' }
  })
})
```

### Key TMDB endpoints

| Purpose | Endpoint |
|---|---|
| Search (movies + shows) | `GET /search/multi?query={q}&include_adult=false` |
| Movie details | `GET /movie/{tmdb_id}` |
| Show details | `GET /tv/{tmdb_id}` |
| Movie streaming providers | `GET /movie/{tmdb_id}/watch/providers` |
| Show streaming providers | `GET /tv/{tmdb_id}/watch/providers` |
| Movie genre list | `GET /genre/movie/list` |
| Show genre list | `GET /genre/tv/list` |

### Image URL construction

```typescript
const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p'

const thumbnailUrl = (path: string) => `${TMDB_IMAGE_BASE}/w92${path}`   // list view
const cardUrl      = (path: string) => `${TMDB_IMAGE_BASE}/w342${path}`  // card view
const fullUrl      = (path: string) => `${TMDB_IMAGE_BASE}/w500${path}`  // detail view
```

Always store only the `poster_path` string in the database and build the full URL at render time. This keeps the DB clean if TMDB's base URL ever changes.

### Streaming providers response shape

```json
{
  "results": {
    "US": {
      "flatrate": [{ "provider_id": 8, "provider_name": "Netflix", "logo_path": "/..." }],
      "rent":     [{ "provider_id": 2,  "provider_name": "Apple TV",  "logo_path": "/..." }],
      "buy":      [...]
    }
  }
}
```

Always extract `results.US`. Make country code a user setting if international support is added later.

### Common US provider IDs

| Provider | TMDB ID |
|---|---|
| Netflix | 8 |
| Hulu | 15 |
| Max (HBO) | 384 |
| Disney+ | 337 |
| Apple TV+ | 350 |
| Amazon Prime Video | 9 |
| Peacock | 386 |
| Paramount+ | 531 |
| Showtime | 37 |
| BritBox | 151 |

---

## Features

### 1. Title search and add

- Search bar triggers TMDB `/search/multi` via Edge Function as user types (debounced 300ms)
- Results show: poster thumbnail, title, year, type badge (movie/show), TMDB rating
- Selecting a result:
  - Upserts title into `titles` table
  - Fetches and caches streaming availability into `streaming_availability`
  - Creates `watchlist_entries` row for the current user
  - Opens add form: status, priority, notes, custom tags

### 2. Watchlist views

**Two view modes — toggle button in the filter bar:**

**List view** (default on mobile)
- Each row: `w92` poster thumbnail (36×54px) | title + genre tags + sub-info | right-side status badges + platform indicator
- Tap a row to open the title detail view
- Upcoming titles dimmed to 70% opacity

**Card view** (default on desktop)
- `auto-fill minmax(220px, 1fr)` grid
- Each card: full `w342` poster | platform badge overlay bottom-left | body with all metadata | footer with rating + actions
- 3px platform-colored accent bar at top of card

Both views group entries by status section: **Currently watching** → **Up next** → **Watched**.

### 3. Filter system

All active filters are AND-combined. Show a count badge on the filter bar when filters are active.

| Filter | Options |
|---|---|
| Status | All / Watching / Up next / Watched |
| Type | All / Movies / Shows |
| Viewer | All / [each user's display\_name] |
| Genre | All + TMDB genres + user custom tags (multi-select chips) |
| Platform/Availability | All / Subscribed only / Not subscribed / Available now / Upcoming |
| Priority | All / High / Medium / Low |
| Sort | Date added · Priority · A–Z · Rating · Release year · Platform |
| Search | Free-text across title and notes |

**Viewer filter note:** Since each user has their own account, "viewer" is simply a filter on whose `watchlist_entries` you're browsing. A future household view will show all members' entries for a title side-by-side.

**Genre note:** TMDB genres populate automatically. "Dramedy", "Romcom", and other composite genres are user-defined `custom_tags` stored on the entry — not TMDB genres. Both appear together in the genre filter chips.

### 4. Quick-status actions

Available from both list rows and cards without opening the full edit form:

- **"Start watching"** → status: `watching`, sets `date_started = now()`
- **"Mark watched"** → status: `watched`, sets `date_completed = now()`, immediately prompts for rating
- **Priority dot click** → cycles through high → medium → low

### 5. Per-viewer ratings

Prompted automatically when a title is marked watched. Also accessible from the title detail view.

- Half-star increments (0.5 to 5.0)
- Optional short review text field
- Stored in `ratings` table keyed to `user_id + title_id`
- Both users' ratings shown side-by-side on shared title detail view
- **Ratings are per-viewer intentionally** — they will feed AI-powered recommendations in a future version. Do not average or combine them.

### 6. Custom genre tags

In the add/edit form, a tag input lets users type custom labels (Dramedy, Romcom, Slow Burn, Feel-good, etc.) stored in `custom_tags text[]` on the watchlist entry. These appear alongside TMDB genres in the filter chips. Suggest previously used tags on input focus.

### 7. Streaming availability display

On each title card and detail view:
- **Green badge:** available on a service the user subscribes to
- **Yellow/amber badge:** streaming somewhere but not on a subscribed service
- **Gray / no badge:** not currently streaming (upcoming or unavailable digitally)

Availability is refreshed from TMDB:
- When the title is first added to anyone's watchlist
- When the user taps "Refresh" on a title detail view
- Nightly via scheduled Edge Function

### 8. Configurable notification alerts (via Resend)

User sets their own preferences in Settings → Notifications. **Not automatic by default** — user explicitly opts in to each type.

| Alert type | Trigger |
|---|---|
| Now streaming | A title in the user's watchlist lands on a service they subscribe to |
| New season | A show the user has watched or is watching gets a new season |
| Leaving soon | A title is leaving a service the user subscribes to (if available from TMDB data) |

**Implementation:** Supabase Edge Function on a daily cron schedule:
1. Refresh `streaming_availability` for all watchlisted titles
2. Cross-reference against each user's `user_subscriptions`
3. Check `notification_log` — skip if already sent
4. Send email via Resend, insert record into `notification_log`

### 9. Title detail view

Full-screen view containing:
- Large backdrop image (`w500`) or poster if no backdrop
- Title, year, type, runtime/season count
- TMDB overview text
- All streaming providers with subscription status indicators
- Progress tracker (current season / episode for shows, editable inline)
- Both users' ratings side-by-side when both have rated
- Notes (editable inline)
- TMDB rating score
- Edit and delete actions
- "Refresh availability" button

### 10. Settings

**Subscriptions tab:** Checkboxes for all major streaming providers (populated from a curated list with TMDB provider IDs). Drives availability filtering and alert logic across the app.

**Notifications tab:** Toggle each alert type on/off. Toggle email on/off.

**Account tab:** Update display name, change password.

### 11. Admin panel

Admin-only (`is_admin = true` required), follow PreXpose pattern:

- **Invite Codes tab:** Generate codes, set expiry, send via Resend email, view used/unused status, revoke unused codes
- **Users tab:** View all users with joined date and status, disable/enable accounts, delete accounts
- **Settings tab:** Maintenance mode toggle (non-admin users see a maintenance notice; admins retain full access)

---

## PWA Configuration

```typescript
// vite.config.ts
import { VitePWA } from 'vite-plugin-pwa'

VitePWA({
  registerType: 'autoUpdate',
  manifest: {
    name: 'QueShare',
    short_name: 'QueShare',
    description: 'Your household streaming watchlist',
    theme_color: '#0a0a0a',
    background_color: '#0a0a0a',
    display: 'standalone',
    orientation: 'portrait',
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
    ]
  },
  workbox: {
    globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
    runtimeCaching: [
      {
        urlPattern: /^https:\/\/image\.tmdb\.org\//,
        handler: 'CacheFirst',
        options: {
          cacheName: 'tmdb-images',
          expiration: { maxEntries: 500, maxAgeSeconds: 60 * 60 * 24 * 7 }
        }
      }
    ]
  }
})
```

### Install prompt

**Android / desktop:** Listen for `beforeinstallprompt` event and show a custom banner with an "Add to home screen" button.

**iOS:** Detect `navigator.userAgent` containing `iPhone|iPad` and `navigator.standalone === false`. Show an instructional banner: *"To install: tap the Share button in Safari, then tap 'Add to Home Screen'."* Suppress this banner once dismissed (store in localStorage).

**Important:** The iOS PWA must be opened in Safari. If the user opens the link in Chrome on iOS, the full-screen standalone mode is not available. Consider adding a detection message: *"For the best experience, open this link in Safari."*

---

## Design System

**Mode:** Dark by default. `prefers-color-scheme: dark` as the primary target; light mode is not a priority for this version.

### Color palette

```css
:root {
  --bg-primary: #0a0a0a;
  --bg-secondary: #141414;
  --bg-card: #1a1a1a;
  --border: rgba(255, 255, 255, 0.08);
  --border-hover: rgba(255, 255, 255, 0.16);
  --text-primary: #f5f5f5;
  --text-secondary: #a0a0a0;
  --text-muted: #555555;
  --accent: #6366f1;
  --accent-hover: #4f46e5;
}
```

### Platform brand colors (accent bars and badges)

```typescript
const PLATFORM_COLORS: Record<string, string> = {
  'Netflix':            '#E50914',
  'Hulu':               '#1CE783',
  'Max':                '#5822B4',
  'Disney+':            '#113CCF',
  'Apple TV+':          '#555555',
  'Amazon Prime Video': '#00A8E0',
  'Peacock':            '#F47521',
  'Paramount+':         '#0064FF',
  'Showtime':           '#E31919',
  'BritBox':            '#E32526',
}
```

### Status badge colors

| Status | Background | Text |
|---|---|---|
| Watching | `#1e3a5f` | `#93c5fd` |
| Up next / Want to watch | `#3b1f6e` | `#c4b5fd` |
| Watched | `#14532d` | `#86efac` |
| Upcoming | `#451a03` | `#fcd34d` |

### Priority dots (list view — dot only, no label)

- High: `#ef4444`
- Medium: `#f59e0b`
- Low: `#4b5563`

### Typography

System font stack. `font-weight: 500` for titles and labels, `400` for body and secondary text.

---

## Deployment

Follow the PreXpose deployment workflow exactly.

### Frontend deploy

```bash
cd "c:/Users/krist/Documents/Projects/QueShare/frontend"
npm run build
fly deploy
```

### fly.toml

```toml
app = 'queshare-web'
primary_region = 'iad'

[build]

[http_service]
  internal_port = 8080
  force_https = true
  auto_stop_machines = 'stop'
  auto_start_machines = true
  min_machines_running = 0

[[vm]]
  memory = '256mb'
  cpu_kind = 'shared'
  cpus = 1
```

Serve the Vite `dist/` output with `sirv-cli` or `serve`.

### Supabase Edge Functions deploy

```bash
supabase functions deploy tmdb
supabase functions deploy send-notifications

supabase secrets set TMDB_API_KEY=[token]
supabase secrets set RESEND_API_KEY=[key]
supabase secrets set RESEND_FROM_EMAIL=[address]
```

### Domain

The developer owns **queshare.com** (registered via GoDaddy). Point it to Fly.io using the same DNS process as PreXpose:

1. In Fly.io dashboard: Apps → queshare-web → Certificates → Add certificate → enter `queshare.com` and `www.queshare.com`
2. Fly.io will show the CNAME/A record values to add
3. In GoDaddy DNS manager: add those records for `queshare.com` and `www.queshare.com`
4. Fly.io provisions a TLS certificate automatically once DNS propagates (usually within minutes)

Set up the custom domain before the first real user is invited — changing URLs after someone has added the PWA to their home screen requires them to reinstall it.

---

## Recommended Build Order

Complete and manually test each phase before starting the next.

### Phase 1 — Foundation
1. New Supabase project (same account as PreXpose)
2. Apply full database schema as a single migration file
3. Scaffold: `npm create vite@latest frontend -- --template react-ts`, add Tailwind
4. Supabase client setup + auth context provider
5. Login, logout, and register flows with invite code validation
6. Consent screen on first login (record to `profiles`)
7. Route structure with auth guards (public: `/login`, `/register` — protected: everything else)
8. Fly.io deployment of blank app — confirm CI works before building features

### Phase 2 — Core watchlist
1. Supabase Edge Function: TMDB proxy
2. Title search UI with debounced TMDB results
3. Add-to-watchlist flow (search → select → form → save)
4. Watchlist list view with thumbnails and status badges
5. Watchlist card view
6. Filter bar: status, type, genre chips, platform/availability, priority, sort, search
7. Status grouping (Watching / Up next / Watched sections)
8. Quick-status actions (start watching, mark watched, priority toggle)
9. Edit entry form (full fields)
10. Delete entry with confirmation

### Phase 3 — Enrichment
1. Title detail view (backdrop, overview, all metadata)
2. Streaming availability fetch + cache on add
3. Availability display on cards, rows, and detail view (green/amber/gray badges)
4. Per-viewer ratings (prompt on mark-watched + accessible from detail view)
5. Both users' ratings shown side-by-side on detail view
6. Custom genre tags input + filter integration

### Phase 4 — Notifications
1. Settings → Subscriptions: provider checklist (drives availability filtering immediately)
2. Settings → Notifications: per-alert-type toggles
3. `send-notifications` Edge Function with daily cron trigger
4. Resend email templates for each alert type
5. Notification log to prevent duplicates

### Phase 5 — Admin and PWA
1. Admin panel: Invite Codes tab (mirror PreXpose)
2. Admin panel: Users tab (mirror PreXpose)
3. Admin panel: Settings tab with maintenance mode toggle
4. PWA manifest + Workbox service worker via `vite-plugin-pwa`
5. iOS install prompt banner
6. Android/desktop install prompt
7. App icons: 192×192 and 512×512 (maskable)

---

## File Structure

```
queshare/
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── watchlist/
│   │   │   │   ├── ListView.tsx
│   │   │   │   ├── CardView.tsx
│   │   │   │   ├── EntryRow.tsx
│   │   │   │   ├── EntryCard.tsx
│   │   │   │   └── FilterBar.tsx
│   │   │   ├── title/
│   │   │   │   ├── TitleSearch.tsx
│   │   │   │   ├── TitleDetail.tsx
│   │   │   │   ├── AddEntryForm.tsx
│   │   │   │   └── StreamingBadge.tsx
│   │   │   ├── ratings/
│   │   │   │   ├── StarRating.tsx
│   │   │   │   └── RatingPrompt.tsx
│   │   │   ├── admin/
│   │   │   │   ├── AdminPanel.tsx
│   │   │   │   ├── InviteCodes.tsx
│   │   │   │   └── UserManagement.tsx
│   │   │   └── ui/
│   │   │       ├── Button.tsx
│   │   │       ├── Badge.tsx
│   │   │       ├── Modal.tsx
│   │   │       └── InstallPrompt.tsx
│   │   ├── hooks/
│   │   │   ├── useAuth.ts
│   │   │   ├── useWatchlist.ts
│   │   │   ├── useTMDB.ts
│   │   │   └── useRealtime.ts
│   │   ├── lib/
│   │   │   ├── supabase.ts
│   │   │   └── tmdb.ts
│   │   ├── pages/
│   │   │   ├── Home.tsx
│   │   │   ├── Login.tsx
│   │   │   ├── Register.tsx
│   │   │   ├── TitleDetailPage.tsx
│   │   │   ├── Settings.tsx
│   │   │   └── Admin.tsx
│   │   └── types/
│   │       └── index.ts
│   ├── public/
│   │   └── icons/
│   │       ├── icon-192.png
│   │       └── icon-512.png
│   ├── index.html
│   ├── vite.config.ts
│   ├── tailwind.config.ts
│   ├── fly.toml
│   └── package.json
└── supabase/
    ├── migrations/
    │   └── 0001_initial_schema.sql
    └── functions/
        ├── tmdb/
        │   └── index.ts
        └── send-notifications/
            └── index.ts
```

---

## Notes and Constraints

- **No separate backend server.** All data goes through Supabase directly or via Edge Functions. Do not introduce Express, FastAPI, or any standalone server.
- **TMDB API key must never reach the browser.** Always proxy through the Edge Function.
- **Streaming availability is cached, not live.** Never fetch from TMDB on every page load. Use the cached `streaming_availability` table and refresh on a schedule.
- **Ratings are per-viewer and must stay separate.** Do not average, combine, or derive a single household rating. They are individual data points for future AI recommendation use.
- **Realtime sync:** Subscribe to `watchlist_entries` changes via Supabase Realtime so both users' additions and status changes appear instantly without a page refresh.
- **Offline support:** Service worker caches the app shell. The Supabase JS client handles local caching of data. Write operations while offline should queue and sync on reconnect.
- **iOS install:** Must be Safari. If Chrome is detected on iOS and the app is not in standalone mode, show a message directing the user to open in Safari.
- **No App Store at this stage.** PWA only. If App Store distribution is needed later, the React app can be wrapped with Capacitor without a rewrite.
- **Invite-only permanently** for this version. No public registration path should exist anywhere in the codebase.
- **Plex users:** QueShare complements Plex rather than competing with it. A future enhancement could allow manually logging a title as "watched via Plex" without any Plex API integration — just a source label on the watchlist entry.
