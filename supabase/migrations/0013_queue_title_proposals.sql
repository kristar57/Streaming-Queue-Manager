-- ============================================================
-- Add proposal workflow to shared queue titles.
--
-- New titles added to a shared queue start as 'proposed'.
-- Other members can approve (→ 'active') or reject (delete).
-- Existing rows are backfilled to 'active' so nothing breaks.
-- ============================================================

-- Add column, defaulting existing rows to 'active'
alter table queue_titles
  add column if not exists status text not null default 'active'
    check (status in ('proposed', 'active', 'rejected'));

-- Backfill any rows that got null (shouldn't happen, but belt-and-suspenders)
update queue_titles set status = 'active' where status is null;

-- Change default so new inserts start as 'proposed'
alter table queue_titles alter column status set default 'proposed';
