-- Permanent dismissals for recommendation shelves.
-- A dismissed (user_id, tmdb_id) pair is excluded from all rec displays
-- and feeds a blacklist signal to the recommendation algorithm.
-- Does not create a watchlist entry.

create table rec_dismissals (
  id         uuid        primary key default gen_random_uuid(),
  user_id    uuid        not null references profiles(id) on delete cascade,
  tmdb_id    integer     not null,
  created_at timestamptz not null default now(),
  unique (user_id, tmdb_id)
);

alter table rec_dismissals enable row level security;

create policy "Users manage own dismissals" on rec_dismissals
  for all
  using  (user_id = auth.uid())
  with check (user_id = auth.uid());

grant select, insert, delete on rec_dismissals to authenticated;
