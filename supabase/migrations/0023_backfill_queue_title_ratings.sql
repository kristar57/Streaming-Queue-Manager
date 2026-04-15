-- Backfill queue_title_ratings for titles that were already in shared queues
-- before migration 0022 created the table. Copies the added_by user's personal
-- rating into queue_title_ratings where one doesn't already exist.

insert into queue_title_ratings (queue_id, title_id, user_id, rating)
select
  qt.queue_id,
  qt.title_id,
  qt.added_by,
  we.user_rating
from queue_titles qt
join watchlist_entries we
  on we.user_id = qt.added_by
  and we.title_id = qt.title_id
  and we.user_rating is not null
where not exists (
  select 1 from queue_title_ratings qtr
  where qtr.queue_id = qt.queue_id
    and qtr.title_id = qt.title_id
    and qtr.user_id = qt.added_by
);
