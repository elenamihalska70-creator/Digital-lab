-- LOT NOTIFY-01A — 01-migration.sql
-- Reliable e-mail notification of new contact requests, through a PostgreSQL outbox.
--
-- STATUS: PREPARED, NOT APPLIED. Run only on explicit authorisation, as the role that owns
-- public.contact_requests (postgres), in the Supabase SQL editor. One transaction.
--
-- What it creates (and nothing else):
--   * schema notify_01a (private: not exposed by the Data API, no grant to anon/authenticated)
--       - settings  (one row: enabled = false, cutover_at = null, caps, retry policy)
--       - outbox    (one row per notification; request_id unique)
--       - enqueue_contact_request()  trigger function (SECURITY DEFINER, search_path = '')
--       - backoff(), requeue(), cancel_pending()  operator helpers (no grant)
--       - v_diagnostic  view (no grant)
--   * trigger notify_01a_enqueue AFTER INSERT ON public.contact_requests
--   * three RPC wrappers in public, EXECUTE granted to service_role ONLY:
--       public.notify_01a_claim(int), public.notify_01a_mark(...), public.notify_01a_reconcile()
--
-- What it never touches: columns, policies, grants, data or existing functions of
-- contact_requests and of the other public tables (DB-SEC-01 / DB-MSG-01 stay as applied),
-- default privileges, extensions, other schemas.
--
-- After this migration nothing changes for visitors and nothing is sent: enabled = false.
-- Activation is a separate, explicit step (02-activate.sql), synchronised with the deployment
-- that replaces the old relay (see docs/LOT-NOTIFY-01A.md, "Bascule").

begin;
set local lock_timeout = '5s';
set local statement_timeout = '60s';

-- ───────────────────────────────────────────── Preconditions (fail closed)
do $$
declare
  missing text;
begin
  if to_regnamespace('notify_01a') is not null then
    raise exception 'NOTIFY-01A precondition: schema notify_01a already exists (already applied?)';
  end if;
  if to_regclass('public.contact_requests') is null then
    raise exception 'NOTIFY-01A precondition: public.contact_requests not found';
  end if;
  if (select relowner::regrole::text from pg_class where oid = 'public.contact_requests'::regclass) <> current_user then
    raise exception 'NOTIFY-01A precondition: run as the owner of public.contact_requests (%), not %',
      (select relowner::regrole::text from pg_class where oid = 'public.contact_requests'::regclass), current_user;
  end if;
  select string_agg(c, ', ') into missing
  from unnest(array['id', 'reference', 'name', 'email', 'company', 'project_type', 'message', 'created_at']) c
  where not exists (select 1 from pg_attribute a
                    where a.attrelid = 'public.contact_requests'::regclass and a.attname = c
                      and a.attnum > 0 and not a.attisdropped);
  if missing is not null then
    raise exception 'NOTIFY-01A precondition: contact_requests columns missing: %', missing;
  end if;
  if (select format_type(atttypid, atttypmod) from pg_attribute
      where attrelid = 'public.contact_requests'::regclass and attname = 'id') <> 'uuid' then
    raise exception 'NOTIFY-01A precondition: contact_requests.id is not uuid';
  end if;
  if exists (select 1 from pg_trigger where tgrelid = 'public.contact_requests'::regclass and tgname = 'notify_01a_enqueue') then
    raise exception 'NOTIFY-01A precondition: trigger notify_01a_enqueue already exists';
  end if;
  if exists (select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
             where n.nspname = 'public' and p.proname like 'notify\_01a\_%') then
    raise exception 'NOTIFY-01A precondition: public.notify_01a_* functions already exist';
  end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role') then
    raise exception 'NOTIFY-01A precondition: role service_role not found';
  end if;
end $$;

-- ───────────────────────────────────────────── Private schema
create schema notify_01a;
revoke all on schema notify_01a from public;
comment on schema notify_01a is 'LOT NOTIFY-01A: notification outbox for contact_requests. Private: no API access.';

create table notify_01a.settings (
  singleton boolean primary key default true check (singleton),
  -- Master switch. false: the trigger enqueues nothing and claim() hands out nothing.
  enabled boolean not null default false,
  -- Only requests created at or after this instant are notified (set by 02-activate.sql).
  cutover_at timestamptz,
  hourly_cap integer not null default 20 check (hourly_cap between 1 and 100),
  daily_cap integer not null default 80 check (daily_cap between 1 and 1000),
  max_attempts integer not null default 8 check (max_attempts between 1 and 8),
  -- Resend keeps idempotency keys 24 h: automatic retries must stay inside that window.
  retry_window interval not null default interval '23 hours' check (retry_window <= interval '23 hours'),
  lease interval not null default interval '2 minutes' check (lease between interval '30 seconds' and interval '10 minutes'),
  updated_at timestamptz not null default now()
);
insert into notify_01a.settings default values;

create table notify_01a.outbox (
  id bigint generated always as identity primary key,
  kind text not null check (kind in ('new_request', 'volume_alert')),
  request_id uuid unique references public.contact_requests (id) on delete cascade,
  alert_day date,
  status text not null default 'pending'
    check (status in ('pending', 'sending', 'sent', 'failed', 'dead', 'cancelled')),
  attempts integer not null default 0 check (attempts >= 0),
  idempotency_key text not null unique check (char_length(idempotency_key) <= 256),
  payload_sha256 text check (payload_sha256 ~ '^[0-9a-f]{64}$'),
  first_attempt_at timestamptz,
  next_attempt_at timestamptz not null default now(),
  lease_until timestamptz,
  resend_id text check (char_length(resend_id) <= 128),
  last_error text check (char_length(last_error) <= 200),
  enqueued_by text not null check (enqueued_by in ('trigger', 'reconcile', 'cap', 'manual')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  sent_at timestamptz,
  constraint outbox_kind_shape check (
    (kind = 'new_request' and request_id is not null and alert_day is null)
    or (kind = 'volume_alert' and request_id is null and alert_day is not null)),
  constraint outbox_one_alert_per_day unique (kind, alert_day)
);
create index outbox_due on notify_01a.outbox (status, next_attempt_at);
create index outbox_sent_at on notify_01a.outbox (sent_at) where status = 'sent';
comment on table notify_01a.outbox is 'LOT NOTIFY-01A: one row per notification. Contains no copy of the request content.';

-- Retry delay after the n-th failed attempt (cumulative 22 h 21 min for attempts 1..7, inside the
-- 23 h window; the 8th failure is final).
create function notify_01a.backoff(attempt integer) returns interval
language sql immutable set search_path = '' as $$
  select case
    when attempt <= 1 then interval '1 minute'
    when attempt = 2 then interval '5 minutes'
    when attempt = 3 then interval '15 minutes'
    when attempt = 4 then interval '1 hour'
    when attempt = 5 then interval '3 hours'
    when attempt = 6 then interval '6 hours'
    else interval '12 hours'
  end
$$;

-- ───────────────────────────────────────────── Trigger: enqueue, never block the insert
create function notify_01a.enqueue_contact_request() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  begin
    if exists (select 1 from notify_01a.settings where singleton and enabled and cutover_at is not null) then
      insert into notify_01a.outbox (kind, request_id, idempotency_key, enqueued_by)
      values ('new_request', new.id, 'notify-01a/' || new.id::text, 'trigger')
      on conflict do nothing;
    end if;
  exception when others then
    -- The request itself must always be saved; reconcile() re-enqueues what is missing.
    raise warning 'NOTIFY-01A: enqueue failed (SQLSTATE %), reconcile will catch up', sqlstate;
  end;
  return null;
end $$;
revoke all on function notify_01a.enqueue_contact_request() from public;

create trigger notify_01a_enqueue
  after insert on public.contact_requests
  for each row execute function notify_01a.enqueue_contact_request();

-- ───────────────────────────────────────────── RPC for the Vercel worker (service_role only)

-- Hands out at most p_limit due notifications, within the hourly / daily caps, and leases them.
-- Serialised by a transaction-level advisory lock (caps are exact even with concurrent workers).
create function public.notify_01a_claim(p_limit integer default 3)
returns table (
  outbox_id bigint, kind text, attempts integer, idempotency_key text, payload_sha256 text,
  request_id uuid, reference text, name text, email text, company text, project_type text,
  message text, request_created_at timestamptz, alert_day date)
language plpgsql security definer set search_path = '' as $$
declare
  s notify_01a.settings;
  sent_hour integer;
  sent_day integer;
  in_flight integer;
  cap_left integer;
  capacity integer;
  today date := (now() at time zone 'Europe/Paris')::date;
begin
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext('notify_01a.claim'));
  select * into s from notify_01a.settings where singleton;
  if not found or not s.enabled then
    return;
  end if;

  -- Expired leases: the attempt is counted, the row becomes due again (same idempotency key).
  update notify_01a.outbox o
     set status = 'failed', lease_until = null, last_error = 'lease_expired',
         next_attempt_at = now(), updated_at = now()
   where o.status = 'sending' and o.lease_until < now();

  -- Out of the Resend idempotency window or out of attempts: final, needs an operator.
  update notify_01a.outbox o
     set status = 'dead', last_error = 'window_expired', updated_at = now()
   where o.status in ('pending', 'failed') and o.first_attempt_at < now() - s.retry_window;
  update notify_01a.outbox o
     set status = 'dead', last_error = coalesce('max_attempts:' || o.last_error, 'max_attempts'), updated_at = now()
   where o.status in ('pending', 'failed') and o.attempts >= s.max_attempts;

  select count(*) filter (where o.sent_at > now() - interval '1 hour'),
         count(*) filter (where o.sent_at > now() - interval '24 hours')
    into sent_hour, sent_day
    from notify_01a.outbox o
   where o.kind = 'new_request' and o.status = 'sent';
  select count(*) into in_flight from notify_01a.outbox o where o.kind = 'new_request' and o.status = 'sending';
  cap_left := greatest(0, least(s.hourly_cap - sent_hour - in_flight, s.daily_cap - sent_day - in_flight));
  capacity := least(greatest(coalesce(p_limit, 3), 0), 10, cap_left);

  -- Cap reached while requests wait: one alert e-mail per day (outside the caps). Nothing is lost:
  -- the waiting rows stay pending and are sent when capacity comes back.
  if cap_left = 0
     and exists (select 1 from notify_01a.outbox o where o.kind = 'new_request' and o.status in ('pending', 'failed')
                 and o.next_attempt_at <= now()) then
    insert into notify_01a.outbox (kind, alert_day, idempotency_key, enqueued_by)
    values ('volume_alert', today, 'notify-01a/volume-alert/' || today::text, 'cap')
    on conflict do nothing;
  end if;

  return query
  with due_alert as (
    select o.id from notify_01a.outbox o
     where o.kind = 'volume_alert' and o.status in ('pending', 'failed') and o.next_attempt_at <= now()
     order by o.id limit 1 for update skip locked
  ), due_request as (
    select o.id from notify_01a.outbox o
     where o.kind = 'new_request' and o.status in ('pending', 'failed') and o.next_attempt_at <= now()
     order by o.created_at, o.id limit capacity for update skip locked
  ), leased as (
    update notify_01a.outbox o
       set status = 'sending', attempts = o.attempts + 1,
           first_attempt_at = coalesce(o.first_attempt_at, now()),
           lease_until = now() + s.lease, updated_at = now()
     where o.id in (select d.id from due_alert d union all select d.id from due_request d)
    returning o.*
  )
  select l.id, l.kind, l.attempts, l.idempotency_key, l.payload_sha256,
         r.id, r.reference::text, r.name::text, r.email::text, r.company::text, r.project_type::text,
         r.message::text, r.created_at::timestamptz, l.alert_day
    from leased l
    left join public.contact_requests r on r.id = l.request_id
   order by l.kind desc, l.id;
end $$;

-- Records the outcome of one attempt. p_attempts is a fencing token: a worker whose lease expired
-- (and whose row was handed out again) cannot overwrite the newer attempt.
-- p_result: 'sent' | 'retry' | 'dead'. Returns the resulting status, or 'stale'.
create function public.notify_01a_mark(
  p_outbox_id bigint, p_attempts integer, p_result text,
  p_resend_id text default null, p_error text default null, p_payload_sha256 text default null)
returns text
language plpgsql security definer set search_path = '' as $$
declare
  s notify_01a.settings;
  o notify_01a.outbox;
  new_status text;
begin
  if p_result not in ('sent', 'retry', 'dead') then
    raise exception 'notify_01a_mark: invalid result %', p_result;
  end if;
  select * into s from notify_01a.settings where singleton;
  select * into o from notify_01a.outbox where id = p_outbox_id for update;
  if not found or o.status <> 'sending' or o.attempts <> p_attempts then
    return 'stale';
  end if;

  new_status := case
    when p_result = 'sent' then 'sent'
    when p_result = 'dead' then 'dead'
    when o.attempts >= s.max_attempts then 'dead'
    when o.first_attempt_at + s.retry_window < now() + notify_01a.backoff(o.attempts) then 'dead'
    else 'failed'
  end;

  update notify_01a.outbox
     set status = new_status,
         lease_until = null,
         resend_id = case when p_result = 'sent' then left(p_resend_id, 128) else resend_id end,
         sent_at = case when p_result = 'sent' then now() else sent_at end,
         last_error = case when p_result = 'sent' then null
                           when new_status = 'dead' and p_result = 'retry' and o.attempts >= s.max_attempts
                             then left('max_attempts:' || coalesce(p_error, 'error'), 200)
                           when new_status = 'dead' and p_result = 'retry' then left('window_expired:' || coalesce(p_error, 'error'), 200)
                           else left(coalesce(p_error, 'error'), 200) end,
         payload_sha256 = coalesce(payload_sha256,
                                   case when p_payload_sha256 ~ '^[0-9a-f]{64}$' then p_payload_sha256 end),
         next_attempt_at = case when new_status = 'failed' then now() + notify_01a.backoff(o.attempts) else next_attempt_at end,
         updated_at = now()
   where id = p_outbox_id;
  return new_status;
end $$;

-- Re-enqueues requests created since cutover_at that have no outbox row (failed trigger, rows
-- inserted while the trigger was being created, ...). Returns counters for the logs (no content).
create function public.notify_01a_reconcile()
returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  s notify_01a.settings;
  added integer := 0;
  result jsonb;
begin
  select * into s from notify_01a.settings where singleton;
  if found and s.enabled and s.cutover_at is not null then
    insert into notify_01a.outbox (kind, request_id, idempotency_key, enqueued_by)
    select 'new_request', r.id, 'notify-01a/' || r.id::text, 'reconcile'
      from public.contact_requests r
     where r.created_at >= s.cutover_at
       and not exists (select 1 from notify_01a.outbox o where o.request_id = r.id)
    on conflict do nothing;
    get diagnostics added = row_count;
  end if;
  select jsonb_build_object(
           'enabled', coalesce(s.enabled, false),
           'enqueued', added,
           'pending', count(*) filter (where o.status = 'pending'),
           'sending', count(*) filter (where o.status = 'sending'),
           'failed', count(*) filter (where o.status = 'failed'),
           'dead', count(*) filter (where o.status = 'dead'),
           'sent_24h', count(*) filter (where o.status = 'sent' and o.sent_at > now() - interval '24 hours'),
           'oldest_waiting_minutes',
             floor(extract(epoch from now() - min(o.created_at) filter (where o.status in ('pending', 'failed', 'sending'))) / 60))
    into result
    from notify_01a.outbox o;
  return result;
end $$;

-- Supabase grants EXECUTE on new public functions to anon / authenticated by default privileges:
-- removed here, in the same transaction, before anything can call them.
revoke all on function public.notify_01a_claim(integer) from public, anon, authenticated;
revoke all on function public.notify_01a_mark(bigint, integer, text, text, text, text) from public, anon, authenticated;
revoke all on function public.notify_01a_reconcile() from public, anon, authenticated;
grant execute on function public.notify_01a_claim(integer) to service_role;
grant execute on function public.notify_01a_mark(bigint, integer, text, text, text, text) to service_role;
grant execute on function public.notify_01a_reconcile() to service_role;

-- ───────────────────────────────────────────── Operator helpers (SQL editor only, no grant)

-- Puts a dead / failed / cancelled notification back in the queue.
-- Inside 24 h after the first attempt, the same idempotency key is kept: Resend cannot send twice.
-- After that, a new key is required (p_new_key => true) and a duplicate is possible if the first
-- attempt was in fact delivered: check the Resend logs first.
create function notify_01a.requeue(p_request_id uuid, p_new_key boolean default false)
returns text
language plpgsql set search_path = '' as $$
declare
  o notify_01a.outbox;
begin
  select * into o from notify_01a.outbox where request_id = p_request_id for update;
  if not found then
    insert into notify_01a.outbox (kind, request_id, idempotency_key, enqueued_by)
    values ('new_request', p_request_id, 'notify-01a/' || p_request_id::text, 'manual');
    return 'enqueued';
  end if;
  if o.status in ('sent', 'sending', 'pending') then
    return 'refused: status ' || o.status;
  end if;
  if not p_new_key and o.first_attempt_at is not null and o.first_attempt_at < now() - interval '23 hours' then
    return 'refused: idempotency window over, call with p_new_key => true after checking the Resend logs';
  end if;
  update notify_01a.outbox
     set status = 'pending', attempts = 0, next_attempt_at = now(), lease_until = null,
         first_attempt_at = case when p_new_key then null else first_attempt_at end,
         payload_sha256 = case when p_new_key then null else payload_sha256 end,
         idempotency_key = case when p_new_key
                                then 'notify-01a/' || p_request_id::text || '/manual-' || floor(extract(epoch from now()))::bigint::text
                                else idempotency_key end,
         last_error = 'requeued:' || coalesce(last_error, ''), enqueued_by = 'manual', updated_at = now()
   where id = o.id;
  return 'requeued';
end $$;

-- Cancels everything not yet sent. Used in rollback R2-B (docs/LOT-NOTIFY-01A.md §10.2), AFTER the
-- Instant Rollback behind the Firewall rules, so that nothing queued meanwhile is sent later.
create function notify_01a.cancel_pending()
returns integer
language plpgsql set search_path = '' as $$
declare
  n integer;
begin
  update notify_01a.outbox set status = 'cancelled', lease_until = null, updated_at = now(),
         last_error = left('cancelled:' || coalesce(last_error, ''), 200)
   where status in ('pending', 'failed', 'sending');
  get diagnostics n = row_count;
  return n;
end $$;
revoke all on function notify_01a.requeue(uuid, boolean) from public;
revoke all on function notify_01a.cancel_pending() from public;
revoke all on function notify_01a.backoff(integer) from public;

create view notify_01a.v_diagnostic as
select o.status, o.kind, count(*) as notifications,
       min(o.created_at) as oldest, max(o.updated_at) as last_change,
       (array_agg(o.last_error order by o.updated_at desc) filter (where o.last_error is not null))[1] as last_error
  from notify_01a.outbox o
 group by o.status, o.kind;
-- Belt and braces against any default privilege defined outside schema public.
revoke all on all tables in schema notify_01a from public, anon, authenticated;
revoke all on all sequences in schema notify_01a from public, anon, authenticated;
revoke all on all functions in schema notify_01a from public, anon, authenticated;
revoke all on schema notify_01a from anon, authenticated;

-- ───────────────────────────────────────────── Self-checks
do $$
declare
  leak text;
begin
  -- No privilege at all for the API roles on the new schema and its objects.
  select string_agg(x, ', ') into leak from (
    select 'schema usage ' || r from unnest(array['anon', 'authenticated']) r
     where has_schema_privilege(r, 'notify_01a', 'USAGE')
    union all
    select format('%s %s on %s', r, p, c.oid::regclass) from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
      cross join unnest(array['anon', 'authenticated']) r
      cross join unnest(array['SELECT', 'INSERT', 'UPDATE', 'DELETE', 'TRUNCATE', 'REFERENCES', 'TRIGGER']) p
     where n.nspname = 'notify_01a' and c.relkind in ('r', 'v') and has_table_privilege(r, c.oid, p)
    union all
    select format('%s EXECUTE %s', r, f.oid::regprocedure) from pg_proc f
      join pg_namespace n on n.oid = f.pronamespace
      cross join unnest(array['anon', 'authenticated']) r
     where (n.nspname = 'notify_01a' or (n.nspname = 'public' and f.proname like 'notify\_01a\_%'))
       and has_function_privilege(r, f.oid, 'EXECUTE')
  ) t(x);
  if leak is not null then
    raise exception 'NOTIFY-01A self-check: API roles gained access: %', leak;
  end if;
  if (select count(*) from pg_proc f join pg_namespace n on n.oid = f.pronamespace
      where n.nspname = 'public' and f.proname like 'notify\_01a\_%'
        and has_function_privilege('service_role', f.oid, 'EXECUTE')) <> 3 then
    raise exception 'NOTIFY-01A self-check: service_role must execute exactly the 3 RPC functions';
  end if;
  if exists (select 1 from notify_01a.settings where enabled) then
    raise exception 'NOTIFY-01A self-check: must be created disabled';
  end if;
end $$;

commit;
