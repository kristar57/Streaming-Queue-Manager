-- ============================================================
-- Create all tables first, then add RLS policies
-- (policies can reference each other's tables only after creation)
-- ============================================================

-- Shared queues
create table shared_queues (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  created_by uuid not null references profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger shared_queues_updated_at
  before update on shared_queues
  for each row execute procedure touch_updated_at();

-- Queue members
create table queue_members (
  queue_id   uuid not null references shared_queues(id) on delete cascade,
  user_id    uuid not null references profiles(id) on delete cascade,
  joined_at  timestamptz not null default now(),
  primary key (queue_id, user_id)
);

-- Queue titles (the canonical shared list)
create table queue_titles (
  id             uuid primary key default gen_random_uuid(),
  queue_id       uuid not null references shared_queues(id) on delete cascade,
  title_id       uuid not null references titles(id) on delete cascade,
  added_by       uuid not null references profiles(id) on delete cascade,
  queue_position integer,
  created_at     timestamptz not null default now(),
  unique(queue_id, title_id)
);

-- ============================================================
-- RLS — shared_queues
-- ============================================================
alter table shared_queues enable row level security;

create policy "Queue members read their queues" on shared_queues
  for select using (
    exists (
      select 1 from queue_members
      where queue_id = shared_queues.id and user_id = auth.uid()
    )
  );

create policy "Creator manages their queues" on shared_queues
  for all using (auth.uid() = created_by);

grant select, insert, update, delete on shared_queues to authenticated;

-- ============================================================
-- RLS — queue_members
-- ============================================================
alter table queue_members enable row level security;

create policy "Members read queue membership" on queue_members
  for select using (
    exists (
      select 1 from queue_members qm
      where qm.queue_id = queue_members.queue_id and qm.user_id = auth.uid()
    )
  );

create policy "Creator manages members" on queue_members
  for all using (
    exists (
      select 1 from shared_queues sq
      where sq.id = queue_members.queue_id and sq.created_by = auth.uid()
    )
  );

create policy "Users leave queues" on queue_members
  for delete using (auth.uid() = user_id);

grant select, insert, update, delete on queue_members to authenticated;

-- ============================================================
-- RLS — queue_titles
-- ============================================================
alter table queue_titles enable row level security;

create policy "Members read queue titles" on queue_titles
  for select using (
    exists (
      select 1 from queue_members
      where queue_id = queue_titles.queue_id and user_id = auth.uid()
    )
  );

create policy "Members insert queue titles" on queue_titles
  for insert with check (
    exists (
      select 1 from queue_members
      where queue_id = queue_titles.queue_id and user_id = auth.uid()
    )
  );

create policy "Members update queue titles" on queue_titles
  for update using (
    exists (
      select 1 from queue_members
      where queue_id = queue_titles.queue_id and user_id = auth.uid()
    )
  );

create policy "Members delete queue titles" on queue_titles
  for delete using (
    exists (
      select 1 from queue_members
      where queue_id = queue_titles.queue_id and user_id = auth.uid()
    )
  );

grant select, insert, update, delete on queue_titles to authenticated;

-- ============================================================
-- Trigger: when a title is added to a queue, auto-add a
-- watchlist_entry (want_to_watch) for each member who doesn't
-- already have that title in their personal list.
-- ============================================================
create or replace function auto_add_to_watchlist()
returns trigger language plpgsql security definer as $$
begin
  insert into watchlist_entries (user_id, title_id, status, priority)
  select qm.user_id, new.title_id, 'want_to_watch', 'medium'
  from queue_members qm
  where qm.queue_id = new.queue_id
    and not exists (
      select 1 from watchlist_entries we
      where we.user_id = qm.user_id
        and we.title_id = new.title_id
    );
  return new;
end;
$$;

create trigger queue_title_added
  after insert on queue_titles
  for each row execute procedure auto_add_to_watchlist();
