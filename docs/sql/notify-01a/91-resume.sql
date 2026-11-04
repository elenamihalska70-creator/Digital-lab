-- LOT NOTIFY-01A — 91-resume.sql
-- Resume after 90-pause.sql, once a safe NOTIFY-01A deployment is live again (docs/LOT-NOTIFY-01A.md §10).
-- Keeps cutover_at: the next worker call (visitor form or daily cron) re-enqueues and sends the
-- requests saved during the pause (no outbox row yet). Also used after rollback R2-A / R2-B, when no
-- e-mail notification went out meanwhile: rows cancelled by cancel_pending() stay cancelled (their
-- requests are checked in /admin, docs/LOT-NOTIFY-01A.md §10.4).
-- Never resume while a deployment older than LOT SEC-EMAIL-02 is served (§10.1).

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
