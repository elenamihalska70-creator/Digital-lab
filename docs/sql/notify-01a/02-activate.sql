-- LOT NOTIFY-01A — 02-activate.sql
-- FIRST activation (or re-activation after a return to the old relay).
-- Run ONLY at step 4 of the cutover (docs/LOT-NOTIFY-01A.md), immediately before `vercel promote`.
--
-- cutover_at = now(): requests saved from this instant are notified by NOTIFY-01A. Requests saved
-- before were handled by the old relay and are never sent again.
-- To resume after a simple pause (old relay NOT restored), use 91-resume.sql instead: it keeps
-- cutover_at, so requests saved during the pause are caught up.

begin;
set local lock_timeout = '5s';

do $$
begin
  if to_regnamespace('notify_01a') is null then
    raise exception 'NOTIFY-01A activate: run 01-migration.sql first';
  end if;
  if exists (select 1 from notify_01a.settings where enabled) then
    raise exception 'NOTIFY-01A activate: already enabled';
  end if;
  if exists (select 1 from notify_01a.outbox where status in ('pending', 'failed', 'sending')) then
    raise exception 'NOTIFY-01A activate: unsent rows exist; review them (v_diagnostic), then cancel_pending() or resume';
  end if;
end $$;

update notify_01a.settings set enabled = true, cutover_at = now(), updated_at = now() where singleton;

select enabled, cutover_at, hourly_cap, daily_cap from notify_01a.settings;
commit;
