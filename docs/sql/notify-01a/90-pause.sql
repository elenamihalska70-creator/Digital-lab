-- LOT NOTIFY-01A — 90-pause.sql
-- Immediate stop of all sending. Takes effect at the next worker call; an attempt already in
-- flight finishes (at most one e-mail per leased row, same idempotency key).
-- While paused: requests are still saved; nothing is enqueued and nothing is sent.
-- Resume with 91-resume.sql (catches up everything saved since cutover_at, nothing lost).

begin;
update notify_01a.settings set enabled = false, updated_at = now() where singleton;
select enabled, cutover_at from notify_01a.settings;
select * from notify_01a.v_diagnostic;
commit;
