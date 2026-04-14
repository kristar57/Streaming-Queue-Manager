-- Add delegate (can_invite) and disabled flags to profiles
alter table profiles
  add column if not exists can_invite boolean not null default false,
  add column if not exists is_disabled boolean not null default false;

-- Allow delegates to create and read invite codes (same as admins for insert/select)
create policy "Delegates manage invite codes" on invite_codes
  for all using (
    exists (select 1 from profiles where id = auth.uid() and can_invite = true)
  );

-- Admins can toggle can_invite and is_disabled on any profile
-- (existing admin update policy covers this since it's a full profile update)
