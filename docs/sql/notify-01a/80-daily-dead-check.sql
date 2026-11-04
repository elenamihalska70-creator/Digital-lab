-- LOT NOTIFY-01A — 80-daily-dead-check.sql (added by LOT SEC-EMAIL-02)
-- TEMPORARY DAILY CHECK, READ ONLY, NO PERSONAL DATA.
-- Run once a day in the Supabase SQL editor from activation until the end of the observation
-- period (14 days, see docs/LOT-NOTIFY-01A.md §10.4). Shows only technical columns of the outbox
-- and the request reference (DL-YYYY-NNNN): never name, e-mail, company or message.
-- Expected every day: query 2 returns no row, query 3 returns 0.

begin transaction read only;

-- 1. Queue state by status (counts only).
select status, kind, count(*) as notifications, min(created_at) as oldest, max(updated_at) as last_change
from notify_01a.outbox
group by status, kind
order by status, kind;

-- 2. Dead notifications (decision needed): technical details only.
select o.id as outbox_id, r.reference, o.request_id, o.kind, o.attempts, o.last_error,
       o.first_attempt_at, o.updated_at,
       o.first_attempt_at is not null and o.first_attempt_at > now() - interval '23 hours' as same_key_requeue_possible
from notify_01a.outbox o
left join public.contact_requests r on r.id = o.request_id
where o.status = 'dead'
order by o.updated_at desc
limit 50;

-- 3. Notifications waiting for more than 8 hours (one cron passage missed or Resend failing).
select count(*) as waiting_over_8h
from notify_01a.outbox
where status in ('pending', 'failed') and created_at < now() - interval '8 hours';

rollback;

-- What to do with a dead row (outside this read-only script, one row at a time):
--   * Resend logs: search the header X-DigitalLab-Notification = notify-01a/<request_id>.
--   * Not delivered and same_key_requeue_possible = true:   select notify_01a.requeue('<request_id>');
--   * Not delivered and the 23 h window is over:            select notify_01a.requeue('<request_id>', true);
--     (new idempotency key: only after checking the Resend logs, a duplicate is otherwise possible)
--   * Delivered after all: leave it dead, it is only a record.
--   * The request itself is always in /admin, whatever the notification status.
