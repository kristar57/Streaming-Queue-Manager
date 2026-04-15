-- Per-member ratings on shared queue titles, independent of personal watchlist ratings.
-- Seeded from the adder's personal rating at insert time, then editable separately.

create table queue_title_ratings (
  id         uuid        primary key default gen_random_uuid(),
  queue_id   uuid        not null references shared_queues(id) on delete cascade,
  title_id   uuid        not null references titles(id) on delete cascade,
  user_id    uuid        not null references profiles(id) on delete cascade,
  rating     smallint    not null check (rating in (-1, 1, 2, 3)),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (queue_id, title_id, user_id)
);

alter table queue_title_ratings enable row level security;

-- Any queue member can read all ratings for titles in their queues
create policy "Queue members view ratings" on queue_title_ratings
  for select using (
    exists (
      select 1 from queue_members
      where queue_id = queue_title_ratings.queue_id
        and user_id = auth.uid()
    )
  );

-- Users can only insert/update/delete their own ratings
create policy "Users insert own queue ratings" on queue_title_ratings
  for insert with check (user_id = auth.uid());

create policy "Users update own queue ratings" on queue_title_ratings
  for update using (user_id = auth.uid());

create policy "Users delete own queue ratings" on queue_title_ratings
  for delete using (user_id = auth.uid());

grant select, insert, update, delete on queue_title_ratings to authenticated;

-- Seed trigger: when a title is added to a queue, copy the adder's personal
-- rating into queue_title_ratings if one exists.
create or replace function seed_queue_title_rating()
returns trigger language plpgsql security definer as $$
declare
  personal_rating smallint;
begin
  select user_rating into personal_rating
  from watchlist_entries
  where user_id = new.added_by
    and title_id = new.title_id
    and user_rating is not null
  limit 1;

  if personal_rating is not null then
    insert into queue_title_ratings (queue_id, title_id, user_id, rating)
    values (new.queue_id, new.title_id, new.added_by, personal_rating)
    on conflict (queue_id, title_id, user_id) do nothing;
  end if;

  return new;
end;
$$;

create trigger queue_title_added_seed_rating
  after insert on queue_titles
  for each row execute procedure seed_queue_title_rating();
