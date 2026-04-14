-- Add 'shelved' as a valid queue_titles status (proposed → shelved = "not now, revisit later")
alter table queue_titles drop constraint if exists queue_titles_status_check;
alter table queue_titles add constraint queue_titles_status_check
  check (status in ('proposed', 'active', 'rejected', 'shelved'));
