-- 1. Allow admins to update any profile (fixes the silent RLS block on admin buttons)
create policy "Admins update all profiles" on profiles
  for update using (
    exists (select 1 from profiles where id = auth.uid() and is_admin = true)
  );

-- 2. Add can_delegate: sponsors can invite, delegates can invite AND grant invite to others
alter table profiles
  add column if not exists can_delegate boolean not null default false;

-- 3. Allow delegates to update can_invite on profiles they directly invited
--    (restricted by WITH CHECK so they can only act on their own invitees)
create policy "Delegates grant invite to their invitees" on profiles
  for update
  using (
    invited_by = auth.uid()
    and exists (select 1 from profiles where id = auth.uid() and can_delegate = true)
  )
  with check (
    invited_by = auth.uid()
  );
