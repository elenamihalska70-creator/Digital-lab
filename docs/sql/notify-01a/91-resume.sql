-- LOT NOTIFY-01A — 91-resume.sql
-- Resume after 90-pause.sql, the NOTIFY-01A deployment still being live (old relay NOT restored).
-- Keeps cutover_at: the next worker call (visitor form or daily cron) re-enqueues and sends the
-- requests saved during the pause. Do NOT use after an Instant Rollback to the old relay: those
-- requests were already notified by it; use cancel_pending() + 02-activate.sql instead.

begin;
do $$
begin
  if not exists (select 1 from notify_01a.settings where cutover_at is not null) then
    raise exception 'NOTIFY-01A resume: never activated, use 02-activate.sql';
  end if;
end $$;
update notify_01a.settings set enabled = true, updated_at = now() where singleton;
select public.notify_01a_reconcile();
commit;
