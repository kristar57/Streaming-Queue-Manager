-- ============================================================
-- Fix: queue members can't see each other's membership rows.
--
-- The queue_members SELECT policy was "user_id = auth.uid()" only,
-- meaning the creator couldn't see who they'd invited, and members
-- couldn't see other members in the shared queue view.
--
-- Fix: use a security definer function (same pattern as is_admin())
-- to check queue membership without circular RLS recursion.
-- Members of a queue can now see all membership rows for that queue.
-- ============================================================

create or replace function public.is_queue_member(p_queue_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.queue_members
    where queue_id = p_queue_id
      and user_id  = auth.uid()
  );
$$;

-- Replace the overly-restrictive queue_members SELECT policy
drop policy if exists "Members see own membership" on queue_members;
create policy "Members see queue membership" on queue_members
  for select using (public.is_queue_member(queue_id));

-- Replace the shared_queues members SELECT policy with the security definer
-- version (avoids the queue_members ↔ shared_queues circular reference)
drop policy if exists "Members read shared queues" on shared_queues;
create policy "Members read shared queues" on shared_queues
  for select using (public.is_queue_member(id));
