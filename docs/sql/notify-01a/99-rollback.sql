-- LOT NOTIFY-01A — 99-rollback.sql
-- Removes every NOTIFY-01A object. Never changes a row, column, policy or grant of
-- public.contact_requests or of any other existing table.
--
-- Refused when:
--   * NOTIFY-01A is still enabled (run 90-pause.sql first);
--   * notifications are still unsent (pending / failed / sending): they would be lost silently.
--     Decide first: let them go out (resume), or cancel them (select notify_01a.cancel_pending();),
--     or force with:  set local notify_01a.force_rollback = 'on';  inside this transaction.
-- Order with the other LOTs: independent of DB-SEC-01 / DB-MSG-01 (tested in both orders).

begin;
set local lock_timeout = '5s';
set local statement_timeout = '60s';

do $$
declare
  unsent integer;
begin
  if to_regnamespace('notify_01a') is null then
    raise exception 'NOTIFY-01A rollback: schema notify_01a not found (nothing to roll back)';
  end if;
  if exists (select 1 from notify_01a.settings where enabled) then
    raise exception 'NOTIFY-01A rollback: still enabled — run 90-pause.sql first';
  end if;
  select count(*) into unsent from notify_01a.outbox where status in ('pending', 'failed', 'sending');
  if unsent > 0 and coalesce(current_setting('notify_01a.force_rollback', true), '') <> 'on' then
    raise exception 'NOTIFY-01A rollback: % unsent notification(s); cancel_pending() or force explicitly', unsent;
  end if;
  -- Only our own trigger, pointing to our own function.
  if exists (select 1 from pg_trigger
             where tgrelid = 'public.contact_requests'::regclass and tgname = 'notify_01a_enqueue'
               and tgfoid <> 'notify_01a.enqueue_contact_request()'::regprocedure) then
    raise exception 'NOTIFY-01A rollback: trigger notify_01a_enqueue does not point to the NOTIFY-01A function';
  end if;
end $$;

create temporary table notify_01a_rb_before on commit drop as
select count(*) as n, md5(coalesce(string_agg(id::text, ',' order by id), '')) as ids from public.contact_requests;

drop trigger if exists notify_01a_enqueue on public.contact_requests;
drop function if exists public.notify_01a_claim(integer);
drop function if exists public.notify_01a_mark(bigint, integer, text, text, text, text);
drop function if exists public.notify_01a_reconcile();
-- Objects of the schema only (tables, view, functions); the outbox FK goes with the outbox.
drop schema notify_01a cascade;

do $$
begin
  if to_regnamespace('notify_01a') is not null
     or exists (select 1 from pg_trigger where tgrelid = 'public.contact_requests'::regclass and tgname = 'notify_01a_enqueue')
     or exists (select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
                where n.nspname = 'public' and p.proname like 'notify\_01a\_%') then
    raise exception 'NOTIFY-01A rollback self-check: objects remain';
  end if;
  if (select (n, ids) from notify_01a_rb_before)
     is distinct from (select (count(*), md5(coalesce(string_agg(id::text, ',' order by id), ''))) from public.contact_requests) then
    raise exception 'NOTIFY-01A rollback self-check: contact_requests changed';
  end if;
end $$;

commit;
