-- Grant table-level access to anon and authenticated roles.
-- RLS policies control what rows each role can see/modify,
-- but the underlying table grant must exist first.

grant select on invite_codes to anon;

grant select, insert, update, delete on profiles to authenticated;
grant select, insert, update, delete on watchlist_entries to authenticated;
grant select, insert, update, delete on ratings to authenticated;
grant select, insert, update, delete on user_subscriptions to authenticated;
grant select, insert, update, delete on notification_preferences to authenticated;
grant select on titles to authenticated;
grant select on streaming_availability to authenticated;
grant select on notification_log to authenticated;
grant select on invite_codes to authenticated;
