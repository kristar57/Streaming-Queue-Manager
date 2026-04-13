# QueShare — Claude Code Kickoff Prompt

Paste this prompt into Claude Code at the start of the project. The spec file (queshare-spec.md) should be in your project root or referenced directly.

---

## Prompt

I'm building a web app called **QueShare** — a private, invite-only household watchlist for tracking movies and TV shows across streaming platforms. Please read the full spec in `queshare-spec.md` before doing anything else. All decisions about stack, schema, architecture, and feature scope have already been made and are documented there. Follow the spec precisely — don't make substitutions or suggest alternatives unless something in the spec is technically impossible.

A few things to know about me and this project before we start:

**I have a reference app called PreXpose** that was built with this same stack (React + Vite + Supabase + Fly.io + Resend). It lives at `c:/Users/krist/Documents/Projects/Landscape Photography Planner/`. Whenever the spec says "mirror the PreXpose pattern," look at that codebase. The auth flow, invite code system, admin panel, consent screen, and Fly.io deployment are all proven there — replicate them, don't reinvent them.

**My deploy workflow is:**
```bash
cd "c:/Users/krist/Documents/Projects/QueShare/frontend"
npm run build
fly deploy
```
Match this path convention when setting up the project.

**My Supabase workflow is:**
```bash
supabase db push
```
Never write migrations by pasting SQL into the Supabase dashboard. Always use migration files.

---

## Start with Phase 1 only

Don't jump ahead. Build Phase 1 completely, then stop and confirm with me before moving to Phase 2.

**Phase 1 tasks in order:**

1. Create the project folder structure at `c:/Users/krist/Documents/Projects/QueShare/` matching the file structure in the spec
2. Scaffold the frontend: `npm create vite@latest frontend -- --template react-ts`, then add Tailwind CSS
3. Create `supabase/migrations/0001_initial_schema.sql` using the full schema from the spec — every table, type, trigger, and RLS policy
4. Set up the Supabase client in `src/lib/supabase.ts`
5. Build the auth context provider (`useAuth` hook) with login, logout, and session persistence
6. Build the registration flow at `/register?code=[code]` with server-side invite code validation
7. Build the login page at `/login`
8. Build the consent screen that fires on first login and writes to `profiles.consent_accepted_at`
9. Set up React Router with auth guards — protected routes redirect to `/login`, authenticated users trying to access `/login` redirect to `/`
10. Configure `fly.toml` for `queshare-web` and confirm a blank deployment reaches `queshare-web.fly.dev`

**When Phase 1 is complete**, show me the running app at the login screen and confirm the Supabase schema is applied. Then wait for me to say "proceed to Phase 2" before continuing.

---

## Ongoing instructions

- **Ask before adding dependencies** not mentioned in the spec. The stack is intentionally lean.
- **Dark mode is the only mode** — don't build light mode variants or `prefers-color-scheme` toggles.
- **No backend server** — Supabase and Edge Functions only. If you find yourself reaching for Express or any standalone server, stop and tell me instead.
- **TypeScript strictly** — no `any` types, no `@ts-ignore`. Define interfaces for every database table in `src/types/index.ts`.
- **The TMDB API key never touches the browser** — all TMDB calls go through the Supabase Edge Function proxy defined in the spec.
- **Ratings stay per-viewer** — never average or combine ratings from multiple users. They are individual data points preserved for future AI recommendation use.
- **When in doubt about a feature decision**, check the spec first. If the spec doesn't cover it, ask me before implementing.
