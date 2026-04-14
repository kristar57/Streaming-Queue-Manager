# QueShare — Operations Manual

> **Keep this document current.** Update it whenever a service provider changes, a new integration is added, a workflow changes, or a key decision is made about how the site is run.

---

## What This Document Is

This is a plain-language guide to how QueShare is run — what services it depends on, how to perform common tasks, and what to be careful about. It's written to be useful even if you're not a developer.

---

## The Services QueShare Depends On

QueShare is made up of several separate services that work together. Here's what each one does and where to find it.

---

### Fly.io — The Website Host

**What it does:** This is where the QueShare website (what users see in their browser) lives. Think of it like the web server that answers when someone visits queshare.com.

- **The website:** lives at https://queshare.com (also directly at https://queshare-web.fly.dev)
- **Local dev:** http://localhost:5174 (run `npm run dev` from the `frontend/` folder)
- **Account:** Kris's personal Fly.io account
- **Dashboard:** https://fly.io/apps/queshare-web/monitoring

---

### Supabase — The Database, Login, and Edge Functions

**What it does:** Supabase is the engine behind the scenes. It stores all the data (watchlists, shared queues, user profiles, recommendations), handles login, and runs backend functions like sending invite emails.

- **Project name:** Streaming Queue Manager
- **Project ID:** `idwjvvwywlqnslinpazp`
- **Dashboard:** https://supabase.com/dashboard/project/idwjvvwywlqnslinpazp

**What Supabase handles:**
- All watchlist, queue, profile, and recommendation data
- Login (email + password, invite codes)
- Row-level security — every user can only see data they're permitted to see, enforced in the database itself
- Edge Functions — serverless backend functions (e.g. sending invite emails via Resend)
- Real-time subscriptions — shared queue badges update instantly without refreshing

---

### Resend — Email Delivery

**What it does:** Resend is the service that sends invite emails on behalf of QueShare.

- **Current use:** Sending registration invite codes to new members
- **Sending address:** `invites@queshare.com` (once DNS and domain verification are configured in Resend)
- **API key:** Stored as a Supabase Edge Function secret (`RESEND_API_KEY`)
- **Dashboard:** https://resend.com

> **Note:** The Resend API key is set in Supabase Edge Function secrets and invite emails are working.

---

### TMDB (The Movie Database) — Title Metadata

**What it does:** Provides all movie and TV show information — titles, posters, overviews, cast, ratings, streaming availability, production status, and TMDB-based recommendations.

- **API key:** Stored as a frontend environment variable (`VITE_TMDB_API_KEY`) — not checked into the code
- **Used for:** Searching titles to add, enriching title metadata, streaming availability lookups, and generating automated recommendations
- **Dashboard:** https://www.themoviedb.org/settings/api

**TMDB data freshness:** Title metadata (cast, status, seasons, etc.) is cached in the database. Titles are re-synced automatically in the background when you sign in if they haven't been synced in the last 7 days. A manual sync is also available in the Admin panel.

---

### Cloudflare — DNS and Email Routing

**What it does:** Manages DNS for queshare.com and routes inbound email to the owner's personal inbox.

- **Domain:** `queshare.com` — registered at GoDaddy, DNS managed at Cloudflare
- **Email routing:** `hello@queshare.com` → forwarded to owner's personal Gmail
- **Dashboard:** https://dash.cloudflare.com
- **DNS record:** `CNAME @ → queshare-web.fly.dev` (DNS only, not proxied)

> If email stops arriving at `hello@queshare.com`, check the Email Routing section in the Cloudflare dashboard and verify the forwarding rule is still active and the destination address is verified.

---

### GoDaddy — Domain Registration

**What it does:** Holds the registration for `queshare.com`. DNS is managed through Cloudflare — GoDaddy is only used for the domain registration itself and nameserver configuration.

- **Nameservers:** Set to Cloudflare's nameservers (do not change these)
- **Dashboard:** https://dcc.godaddy.com

---

## How to Do Common Tasks

### Inviting a New User

1. Log in as admin and go to the **Admin panel** (link in the app header)
2. Click the **Invite Codes** tab
3. Generate a code (optionally set an expiry date)
4. Use the **Send invite** button to email it directly via Resend, or copy the code and share it manually
5. The new user registers at queshare.com using the code
6. On their first login, they'll see a consent screen — they must accept the Privacy Policy and Terms of Service before accessing the app

---

### Temporarily Locking a User Out

1. Admin panel → **Users** tab → toggle **Disable** next to their name
2. They are immediately locked out but their data is preserved
3. Toggle it back the same way to restore access

---

### Deploying a Change to the Website

After any change to the website code:

```bash
cd "c:/Users/krist/Documents/Projects/Streaming Queue Manager/frontend"
npx tsc --noEmit   # check for type errors first
fly deploy
```

---

### Applying a Database Change (Migration)

Database changes are stored as numbered SQL files in `supabase/migrations/` and applied using the Supabase CLI:

```bash
cd "c:/Users/krist/Documents/Projects/Streaming Queue Manager"
supabase db push
```

Never apply database changes by pasting SQL manually into the Supabase dashboard — always use this command so migrations stay in sync.

---

### Re-syncing Stale Title Metadata from TMDB

If a title is showing outdated information (missing cast, wrong status, no network name, etc.):

1. Admin panel → **TMDB Title Sync** section
2. Click **Load titles** to see what's in the database
3. Click **Sync stale titles** to re-fetch any title not synced in the last 7 days
4. Or click **Sync all titles** to force-refresh everything (slower — use sparingly)

Titles are also synced automatically in the background on sign-in.

---

### Rotating an API Key or Secret

- **TMDB API key:** Update the `VITE_TMDB_API_KEY` environment variable in the Fly.io app → redeploy frontend
- **Resend API key:** Update the `RESEND_API_KEY` secret in Supabase → Edge Functions → Secrets
- **Supabase anon key:** Used by the frontend — safe to expose publicly, but if rotation is needed update `VITE_SUPABASE_ANON_KEY` in Fly.io and redeploy
- **Supabase service role key:** Never exposed to the frontend — only used server-side if needed

---

### Updating the Privacy Policy or Terms of Service

1. Edit the content in `frontend/src/pages/PrivacyPage.tsx` or `frontend/src/pages/TermsPage.tsx`
2. Update the version string in `frontend/src/types/index.ts`:
   ```ts
   export const CURRENT_POLICY_VERSION = '2026-04'  // change this
   ```
3. Update the "Effective" date in both policy page headers to match
4. Deploy the frontend

When the version string changes, existing users will be shown a consent screen on their next login asking them to review and accept the updated policies before continuing. New users always see the consent screen on first login.

---

## App Features Overview

### Personal Watchlist

Each user has their own private watchlist. Titles can be in one of four states:

- **Up next** — want to watch, manually ordered by the user
- **Currently watching** — in progress
- **Upcoming** — not yet released or returning series the user is tracking
- **Watched** — completed

Entries can have a **priority** (high / medium / low), notes, season/episode tracking for shows, and a **caught up** flag. Users can rate entries as **Pass / Good / Loved** — these ratings feed the automated recommendation system.

### Shared Queues

Users can create shared queues and invite others as members. Shared queues have a proposal/approval workflow:

- Any member can **propose** a title
- Other members can **approve** (moves to Up Next), **shelve** (move to On the Shelf), or **remove** it
- Members can also add titles directly without approval (bypassing the proposal step)
- Each member's watch status is tracked independently within the queue

Groups within a shared queue: **Proposed → Up next → Upcoming → All watched → On the shelf**

### Streaming Availability

The app shows which streaming services a title is available on, and highlights services the user subscribes to. Subscriptions are managed in Settings (streaming services icon in the app header).

### Recommendations

**In-app (human):** Any user can recommend a title to another user with a personal message. The recipient sees a badge on the Rec button and can accept or decline.

**Automated (personal):** Based on the user's own ratings and watch history, the app fetches TMDB recommendations seeded by their top-rated titles. Shown in a collapsible "Recommended for you" panel on the personal list. Can be toggled on/off per user.

**Automated (group):** When viewing a shared queue, a "Suggested for the queue" panel shows TMDB recommendations based on what queue members have rated.

**Partner discovery:** Shows titles a queue partner has rated well that the user hasn't added to their own list.

Automated recommendations require at least one Good or Loved rating to generate results. Results are cached per session and refresh when ratings change.

### Admin Panel

Accessible to admin users only (admin flag set in the database). Tabs:

- **Invite Codes** — generate, send, and manage invite codes
- **Users** — view all users, disable/enable accounts
- **TMDB Title Sync** — view and re-sync stale title metadata

---

## Things to Know About the Infrastructure

### Privacy Enforcement Is in the Database

Row-level security (RLS) policies in Supabase ensure users can only read and write their own data. Shared queue visibility is enforced at the database level — even a bug in the website code can't expose data it shouldn't. Admin-only operations use security definer functions (`is_admin`, `is_queue_member`) to avoid RLS policy recursion.

### Real-time Queue Badges

When a title is added to a shared queue, the badge on that title in the personal list updates automatically without refreshing. This uses Supabase real-time subscriptions on the `queue_titles` table.

### Session Caching for Recommendations

Automated recommendation results are cached in `sessionStorage` to avoid hammering the TMDB API on every page load. The cache is invalidated when the user changes a rating. Each cache key is scoped to the user or queue ID.

### Policy Consent Versioning

The consent system tracks which policy version each user accepted (`consent_policy_version` on the `profiles` table). When `CURRENT_POLICY_VERSION` in the code is bumped, existing users whose stored version doesn't match are shown a re-consent screen on next login. The session-level consent key also includes the version, so bumping the version clears cached consent for the current session.

---

## Data and Privacy

### How Long Data Is Kept

- **Account deletion** is not yet automated — users must email `hello@queshare.com` to request deletion
- **Supabase backups** are handled by Supabase according to the plan tier
- There are no automated cleanup jobs

### Compliance Notes

- Privacy Policy and Terms of Service are live at `/privacy` and `/terms`
- Both pages are accessible without logging in (required for the consent flow)
- Every time a user accepts the policies, a timestamp and policy version are saved to their profile
- The site is invite-only — there is no public signup page
- Contact email for data deletion and policy questions: `hello@queshare.com` (forwarded to owner's Gmail via Cloudflare Email Routing)
