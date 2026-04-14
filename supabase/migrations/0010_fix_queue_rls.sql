-- ============================================================
-- Fix circular RLS policies on shared_queues / queue_members.
--
-- The original queue_members SELECT policy referenced itself
-- (select from queue_members inside a queue_members policy),
-- causing infinite recursion on any INSERT or SELECT.
-- The shared_queues SELECT policy then cross-referenced back,
-- compounding the problem.
--
-- Fix: simplify queue_members SELECT to a direct column check
-- (no self-join), and allow create-queue INSERT via two clear
-- non-circular checks.
-- ============================================================

-- Drop all existing policies on both tables and start clean
drop policy if exists "Queue members read their queues"  on shared_queues;
drop policy if exists "Creator manages their queues"     on shared_queues;

drop policy if exists "Members read queue membership"    on queue_members;
drop policy if exists "Creator manages members"          on queue_members;
drop policy if exists "Users leave queues"               on queue_members;

drop policy if exists "Members read queue titles"        on queue_titles;
drop policy if exists "Members insert queue titles"      on queue_titles;
drop policy if exists "Members update queue titles"      on queue_titles;
drop policy if exists "Members delete queue titles"      on queue_titles;

-- ============================================================
-- shared_queues policies
-- ============================================================

-- SELECT: creator sees all their queues; members see via simple queue_members lookup
-- (queue_members SELECT is now non-self-referential so this is safe)
create policy "Creator reads own queues" on shared_queues
  for select using (created_by = auth.uid());

create policy "Members read shared queues" on shared_queues
  for select using (
    exists (
      select 1 from queue_members qm
      where qm.queue_id = shared_queues.id
        and qm.user_id  = auth.uid()
    )
  );

-- INSERT: creator inserts (created_by must equal caller)
create policy "Creator inserts queues" on shared_queues
  for insert with check (created_by = auth.uid());

-- UPDATE / DELETE: creator only
create policy "Creator updates queues" on shared_queues
  for update using (created_by = auth.uid());

create policy "Creator deletes queues" on shared_queues
  for delete using (created_by = auth.uid());

-- ============================================================
-- queue_members policies — no self-reference
-- ============================================================

-- SELECT: you can see your own membership row only
-- (non-self-referential; avoids infinite recursion)
create policy "Members see own membership" on queue_members
  for select using (user_id = auth.uid());

-- INSERT: caller is inserting themselves (join), OR caller is the queue creator (invite)
create policy "Insert queue members" on queue_members
  for insert with check (
    user_id = auth.uid()
    or exists (
      select 1 from shared_queues sq
      where sq.id = queue_members.queue_id
        and sq.created_by = auth.uid()
    )
  );

-- DELETE: members can remove themselves; creator can remove anyone
create policy "Remove queue members" on queue_members
  for delete using (
    user_id = auth.uid()
    or exists (
      select 1 from shared_queues sq
      where sq.id = queue_members.queue_id
        and sq.created_by = auth.uid()
    )
  );

-- ============================================================
-- queue_titles policies — member check via simple join
-- ============================================================

create policy "Members read queue titles" on queue_titles
  for select using (
    exists (
      select 1 from queue_members qm
      where qm.queue_id = queue_titles.queue_id
        and qm.user_id  = auth.uid()
    )
  );

create policy "Members insert queue titles" on queue_titles
  for insert with check (
    exists (
      select 1 from queue_members qm
      where qm.queue_id = queue_titles.queue_id
        and qm.user_id  = auth.uid()
    )
  );

create policy "Members update queue titles" on queue_titles
  for update using (
    exists (
      select 1 from queue_members qm
      where qm.queue_id = queue_titles.queue_id
        and qm.user_id  = auth.uid()
    )
  );

create policy "Members delete queue titles" on queue_titles
  for delete using (
    exists (
      select 1 from queue_members qm
      where qm.queue_id = queue_titles.queue_id
        and qm.user_id  = auth.uid()
    )
  );
