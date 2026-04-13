-- Fix infinite recursion in admin RLS policies.
--
-- The "Admins view all profiles" policy on profiles queries profiles to check
-- is_admin, and the "Admins manage invite_codes" policy also queries profiles —
-- both cause PostgreSQL to recurse infinitely.
--
-- Solution: a security definer function that reads profiles as the postgres
-- role (bypassing RLS entirely), breaking the cycle.

create or replace function public.is_admin()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select coalesce(
    (select is_admin from public.profiles where id = auth.uid()),
    false
  );
$$;

-- Re-create the offending policies using is_admin() instead

drop policy if exists "Admins view all profiles" on profiles;
create policy "Admins view all profiles" on profiles
  for select using (public.is_admin());

drop policy if exists "Admins manage invite codes" on invite_codes;
create policy "Admins manage invite codes" on invite_codes
  for all using (public.is_admin());
