-- LOT DB-MSG-01 — private client conversations (public.request_messages), project digital-lab-prod.
-- STATUS: PROPOSAL FOR REVIEW. NOT APPLIED. Do not run without the owner's go-ahead.
--
-- Run order: 00-readonly-checks.sql (keep the result) → this file → 00 again → compare.
-- ONE transaction: a failed precondition, statement or self-check rolls everything back.
-- Rollback after commit: 99-rollback.sql (conditional, see that file).
--
-- Production facts this file is written against (READ-ONLY check by Digital Lab AI OS, 2026-11-04):
--   * 8 columns; id, request_id, sender_role, sender_id, message NOT NULL; created_at,
--     read_by_admin, read_by_client NULLABLE (defaults now(), false, false);
--   * SELECT policy "Users can read request messages" TO authenticated USING (true): any
--     signed-in account reads every conversation, through the REST API and through Realtime
--     (the portal subscribes to request_messages without a filter);
--   * authenticated: table SELECT and INSERT (so id / created_at can be forged on insert),
--     UPDATE on read_by_admin / read_by_client only; anon: no SELECT / INSERT / UPDATE;
--   * no guard trigger (read flags can be reset, incl. to NULL, where an UPDATE policy allows);
--   * profiles.role not writable by anon / authenticated; contact_requests UPDATE admin-only.
-- The INSERT / UPDATE policies were not listed in the verification. The preconditions below
-- therefore check the SHAPE of every policy instead of trusting names, and stop on anything
-- that was not reviewed.
--
-- Why every policy is replaced and not just the open one: permissive policies are OR-ed. A
-- strict SELECT policy added next to USING (true) changes nothing; dropping only the policy we
-- know about would leave any other wide one in place. So ALL policies of request_messages are
-- snapshotted, dropped, and replaced by the reviewed set below (same names as the repository
-- files supabase/request_messages.sql and migration 20260618123000).
--
-- What it changes (request_messages only):
--   1. Privileges. anon: none (visitors never use this table). authenticated: SELECT,
--      INSERT on the 6 columns the portal sends, UPDATE on the 2 read flags only. No DELETE,
--      TRUNCATE, TRIGGER, REFERENCES. Content, author, date, request and id can no longer be
--      written by the API roles, whatever policy exists now or later.
--   2. Policies (all TO authenticated, all PERMISSIVE):
--        read    : admin (profiles.role = 'admin') or owner of the request;
--        insert  : client on their own request, as themselves, read_by_admin = false;
--                  admin as themselves, read_by_client = false;
--        update  : client marks admin messages of their own request as read;
--                  admin marks client messages as read.
--   3. Trigger prevent_request_message_content_update (SECURITY INVOKER, fixed search_path):
--      content columns are immutable for EVERY role; for the API roles a changed read flag
--      can only become TRUE (from false or NULL), and only on the side of the person reading.
--      No column, nullability or default is changed: production structure is kept as is.
--
-- What it NEVER does: change or delete a row, touch another table, grant anything that
-- anon / authenticated did not already have (self-check on effective privileges).

begin;

set local lock_timeout = '5s';
set local statement_timeout = '60s';

-- 0. Preconditions.
do $$
declare
  unexpected text;
begin
  if to_regnamespace('db_msg_01') is not null then
    raise exception 'DB-MSG-01 precondition: schema db_msg_01 already exists (migration already applied?)';
  end if;
  if to_regclass('public.request_messages') is null or to_regclass('public.contact_requests') is null
     or to_regclass('public.profiles') is null then
    raise exception 'DB-MSG-01 precondition: request_messages, contact_requests or profiles not found';
  end if;

  -- Structure: exactly the 8 columns verified in production (2026-11-04), with their type,
  -- nullability and the defaults this LOT relies on:
  --   id, request_id, sender_role, sender_id, message  NOT NULL;
  --   read_by_admin, read_by_client  NULLABLE, DEFAULT false  (the policies require an explicit
  --     false / true, so NULL never passes; the trigger treats NULL as "not read");
  --   created_at  NULLABLE, DEFAULT now()  (no longer insertable through the API: the default
  --     always applies to new messages);
  --   id  must have a default (no longer insertable through the API).
  -- Defaults of request_id / sender_role / sender_id / message are not relied upon: not checked.
  -- Any other difference (column added or missing, type, nullability, default) stops here.
  select string_agg(coalesce(e.col, a.attname) || ' (expected '
                    || coalesce(e.typ || case when e.not_null then ' not null' else ' nullable' end
                                || case e.dflt when '?' then '' when '*' then ' default <any>' else ' default ' || e.dflt end, 'no such column')
                    || ', found ' || coalesce(a.typ || case when a.attnotnull then ' not null' else ' nullable' end
                                              || coalesce(' default ' || a.dflt, ''), 'missing') || ')', ', ')
  into unexpected
  from (select attname, format_type(atttypid, atttypmod) as typ, attnotnull, pg_get_expr(d.adbin, d.adrelid) as dflt
        from pg_attribute
        left join pg_attrdef d on d.adrelid = attrelid and d.adnum = attnum
        where attrelid = 'public.request_messages'::regclass and attnum > 0 and not attisdropped) a
  full join (values ('id', 'uuid', true, '*'), ('request_id', 'uuid', true, '?'), ('sender_role', 'text', true, '?'),
                    ('sender_id', 'uuid', true, '?'), ('message', 'text', true, '?'),
                    ('read_by_admin', 'boolean', false, 'false'), ('read_by_client', 'boolean', false, 'false'),
                    ('created_at', 'timestamp with time zone', false, 'now()')) e(col, typ, not_null, dflt)
    on e.col = a.attname
  where e.col is null or a.attname is null
     or a.typ <> e.typ or a.attnotnull <> e.not_null
     or (e.dflt = '*' and a.dflt is null)
     or (e.dflt not in ('*', '?') and a.dflt is distinct from e.dflt);
  if unexpected is not null then
    raise exception 'DB-MSG-01 precondition: request_messages columns differ from the verified state: %', unexpected;
  end if;

  if exists (select 1 from pg_class where oid in ('public.request_messages'::regclass,
             'public.contact_requests'::regclass, 'public.profiles'::regclass) and not relrowsecurity) then
    raise exception 'DB-MSG-01 precondition: RLS is disabled on request_messages, contact_requests or profiles';
  end if;
  if (select relowner from pg_class where oid = 'public.request_messages'::regclass) <> current_user::text::regrole then
    raise exception 'DB-MSG-01 precondition: run as the owner of public.request_messages (%)',
      pg_get_userbyid((select relowner from pg_class where oid = 'public.request_messages'::regclass));
  end if;

  -- The guard must not exist yet (production: absent). A partial earlier attempt = review first.
  if to_regprocedure('public.prevent_request_message_content_update()') is not null then
    raise exception 'DB-MSG-01 precondition: public.prevent_request_message_content_update() already exists — re-run 00-readonly-checks.sql';
  end if;
  if exists (select 1 from pg_trigger where tgrelid = 'public.request_messages'::regclass and not tgisinternal) then
    raise exception 'DB-MSG-01 precondition: request_messages already has a trigger — re-run 00-readonly-checks.sql';
  end if;

  -- Policies: shape check on EVERY policy (names are not trusted).
  select string_agg(policyname || ' [' || permissive || ' ' || cmd || ' ' || array_to_string(roles, ',') || ']', ', ')
  into unexpected
  from pg_policies
  where schemaname = 'public' and tablename = 'request_messages'
    and (permissive <> 'PERMISSIVE'
         or cmd not in ('SELECT', 'INSERT', 'UPDATE')
         or not roles <@ array['anon', 'authenticated', 'public']::name[]);
  if unexpected is not null then
    raise exception 'DB-MSG-01 precondition: unreviewed policy kind on request_messages (restrictive, ALL/DELETE or other role): %', unexpected;
  end if;
  -- The audited flaw must be there; if not, the state changed since the review.
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'request_messages' and cmd = 'SELECT'
      and roles && array['authenticated', 'public']::name[]
      and regexp_replace(lower(coalesce(qual, 'true')), '[\s()]', '', 'g') = 'true'
  ) then
    raise exception 'DB-MSG-01 precondition: no SELECT policy with USING (true) on request_messages — state differs from the audit, re-run 00-readonly-checks.sql';
  end if;

  -- The new policies trust profiles.role and contact_requests.user_id. Neither may be
  -- writable by a non-admin, or "admin" / "owner" could be self-declared.
  if has_table_privilege('authenticated', 'public.profiles', 'UPDATE')
     or has_column_privilege('authenticated', 'public.profiles', 'role', 'UPDATE')
     or has_column_privilege('authenticated', 'public.profiles', 'role', 'INSERT')
     -- anon: Supabase default grants are inert unless a policy lets visitors in without auth.uid()
     -- (same test as DB-SEC-01).
     or (has_column_privilege('anon', 'public.profiles', 'role', 'UPDATE')
         or has_column_privilege('anon', 'public.profiles', 'role', 'INSERT')) and exists (
          select 1 from pg_policies where schemaname = 'public' and tablename = 'profiles'
            and cmd in ('UPDATE', 'INSERT', 'ALL') and roles && array['anon', 'public']::name[]
            and coalesce(qual, with_check, '') not like '%auth.uid()%') then
    raise exception 'DB-MSG-01 precondition: profiles.role is writable through the API — admin status could be self-declared';
  end if;
  select string_agg(policyname, ', ') into unexpected
  from pg_policies
  where schemaname = 'public' and tablename = 'contact_requests' and cmd in ('UPDATE', 'ALL')
    and not (coalesce(qual, '') ~ 'role\s*=\s*''admin''' and coalesce(with_check, qual, '') ~ 'role\s*=\s*''admin''');
  if unexpected is not null then
    raise exception 'DB-MSG-01 precondition: contact_requests UPDATE policies not admin-only (user_id could be reassigned): %', unexpected;
  end if;

  -- The portal must work today with the privileges it keeps (else the GRANT below would add).
  if not has_table_privilege('authenticated', 'public.request_messages', 'SELECT')
     or exists (select 1 from unnest(array['request_id', 'sender_role', 'sender_id', 'message',
                                           'read_by_admin', 'read_by_client']) c
                where not has_column_privilege('authenticated', 'public.request_messages', c, 'INSERT'))
     or not has_column_privilege('authenticated', 'public.request_messages', 'read_by_admin', 'UPDATE')
     or not has_column_privilege('authenticated', 'public.request_messages', 'read_by_client', 'UPDATE') then
    raise exception 'DB-MSG-01 precondition: authenticated lacks a privilege the portal uses today — state differs from the audit';
  end if;
end $$;

-- Snapshot (private schema, not exposed by the API). Drop it once the LOT is accepted.
create schema db_msg_01;
revoke all on schema db_msg_01 from public;
comment on schema db_msg_01 is 'LOT DB-MSG-01 snapshot used by 99-rollback.sql';

-- Effective privileges of anon / authenticated on every public table, column and function.
create function db_msg_01.effective_privileges()
returns table (object_name text, column_name text, role_name text, privilege text, granted boolean)
language sql stable
set search_path = pg_catalog
as $$
  select format('%I.%I', n.nspname, c.relname), ''::text, r.role_name, p.privilege,
         has_table_privilege(r.role_name, c.oid, p.privilege)
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  cross join (values ('anon'), ('authenticated')) r(role_name)
  cross join (values ('SELECT'), ('INSERT'), ('UPDATE'), ('DELETE'), ('TRUNCATE'), ('REFERENCES'), ('TRIGGER')) p(privilege)
  where n.nspname = 'public' and c.relkind in ('r', 'p')
  union all
  select format('%I.%I', n.nspname, c.relname), a.attname::text, r.role_name, p.privilege,
         has_column_privilege(r.role_name, c.oid, a.attnum, p.privilege)
  from pg_attribute a
  join pg_class c on c.oid = a.attrelid
  join pg_namespace n on n.oid = c.relnamespace
  cross join (values ('anon'), ('authenticated')) r(role_name)
  cross join (values ('SELECT'), ('INSERT'), ('UPDATE'), ('REFERENCES')) p(privilege)
  where n.nspname = 'public' and c.relkind in ('r', 'p') and a.attnum > 0 and not a.attisdropped
  union all
  select format('%I.%I(%s)', n.nspname, f.proname, pg_get_function_identity_arguments(f.oid)), '()',
         r.role_name, 'EXECUTE', has_function_privilege(r.role_name, f.oid, 'EXECUTE')
  from pg_proc f
  join pg_namespace n on n.oid = f.pronamespace
  cross join (values ('anon'), ('authenticated')) r(role_name)
  where n.nspname = 'public' and f.prokind = 'f'
$$;

-- Current shape of request_messages (policies, trigger, function, structure), for the drift
-- check of the rollback.
create function db_msg_01.current_shape()
returns table (kind text, name text, detail text)
language sql stable
set search_path = pg_catalog
as $$
  select 'policy', policyname::text,
         permissive || '|' || cmd || '|' || array_to_string(roles, ',') || '|' || coalesce(qual, '-') || '|' || coalesce(with_check, '-')
  from pg_policies where schemaname = 'public' and tablename = 'request_messages'
  union all
  select 'trigger', tgname::text, pg_get_triggerdef(oid) || '|enabled=' || tgenabled::text
  from pg_trigger where tgrelid = 'public.request_messages'::regclass and not tgisinternal
  union all
  select 'function', p.oid::regprocedure::text,
         encode(sha256(convert_to(pg_get_functiondef(p.oid), 'UTF8')), 'hex')
         || '|' || coalesce(array_to_string(p.proconfig, ','), '-') || '|secdef=' || p.prosecdef
         || '|acl=' || coalesce((select string_agg(x::text, ',' order by x::text) from unnest(p.proacl) x), 'default')
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public' and p.proname = 'prevent_request_message_content_update'
  union all
  select 'column', a.attnum || ':' || a.attname, format_type(a.atttypid, a.atttypmod) || '|notnull=' || a.attnotnull
                                                 || '|default=' || coalesce(pg_get_expr(d.adbin, d.adrelid), '-')
  from pg_attribute a left join pg_attrdef d on d.adrelid = a.attrelid and d.adnum = a.attnum
  where a.attrelid = 'public.request_messages'::regclass and a.attnum > 0 and not a.attisdropped
  union all
  select 'table', 'request_messages', 'rls=' || relrowsecurity || '|force=' || relforcerowsecurity
                                      || '|owner=' || pg_get_userbyid(relowner)
  from pg_class where oid = 'public.request_messages'::regclass
$$;

create table db_msg_01.effective_before as select * from db_msg_01.effective_privileges();

-- Exact table / column grants to anon and authenticated on request_messages.
create table db_msg_01.acl_before as
select ''::text as column_name, g.rolname::text as grantee, a.privilege_type, a.is_grantable
from pg_class c
cross join lateral aclexplode(coalesce(c.relacl, acldefault('r', c.relowner))) a
join pg_roles g on g.oid = a.grantee
where c.oid = 'public.request_messages'::regclass and g.rolname in ('anon', 'authenticated')
union all
select att.attname::text, g.rolname::text, a.privilege_type, a.is_grantable
from pg_attribute att
cross join lateral aclexplode(att.attacl) a
join pg_roles g on g.oid = a.grantee
where att.attrelid = 'public.request_messages'::regclass and att.attnum > 0 and not att.attisdropped
  and att.attacl is not null and g.rolname in ('anon', 'authenticated');

-- Every policy, exactly as it is (restored by the rollback).
create table db_msg_01.policies_before as
select policyname::text, permissive, cmd, roles::text[] as roles, qual, with_check
from pg_policies where schemaname = 'public' and tablename = 'request_messages';

revoke all on all tables in schema db_msg_01 from public, anon, authenticated;
revoke all on all functions in schema db_msg_01 from public, anon, authenticated;

-- 1. Privileges: start from nothing, give back only what the portal uses. REVOKE ... ON TABLE
--    leaves column grants in place, hence the column-level revoke too.
revoke all on table public.request_messages from anon, authenticated;
revoke all (id, request_id, sender_role, sender_id, message, read_by_admin, read_by_client, created_at)
  on table public.request_messages from anon, authenticated;

grant select on table public.request_messages to authenticated;
grant insert (request_id, sender_role, sender_id, message, read_by_admin, read_by_client)
  on table public.request_messages to authenticated;
grant update (read_by_admin, read_by_client) on table public.request_messages to authenticated;

-- 2. Policies: drop EVERY policy (listed in the snapshot), then the reviewed set.
do $$
declare
  p record;
begin
  for p in select policyname from db_msg_01.policies_before order by policyname loop
    execute format('drop policy %I on public.request_messages', p.policyname);
    raise notice 'DB-MSG-01: policy dropped: %', p.policyname;
  end loop;
end $$;

create policy "request messages read for admin or owner"
  on public.request_messages
  as permissive
  for select
  to authenticated
  using (
    exists (select 1 from public.profiles
            where profiles.id = (select auth.uid()) and profiles.role = 'admin')
    or exists (select 1 from public.contact_requests
               where contact_requests.id = request_messages.request_id
                 and contact_requests.user_id = (select auth.uid()))
  );

create policy "clients insert own request messages"
  on public.request_messages
  as permissive
  for insert
  to authenticated
  with check (
    sender_role = 'client'
    and sender_id = (select auth.uid())
    and read_by_admin = false
    and exists (select 1 from public.contact_requests
                where contact_requests.id = request_messages.request_id
                  and contact_requests.user_id = (select auth.uid()))
  );

create policy "admins insert request messages"
  on public.request_messages
  as permissive
  for insert
  to authenticated
  with check (
    sender_role = 'admin'
    and sender_id = (select auth.uid())
    and read_by_client = false
    and exists (select 1 from public.profiles
                where profiles.id = (select auth.uid()) and profiles.role = 'admin')
  );

create policy "clients mark admin messages as read"
  on public.request_messages
  as permissive
  for update
  to authenticated
  using (
    sender_role = 'admin'
    and exists (select 1 from public.contact_requests
                where contact_requests.id = request_messages.request_id
                  and contact_requests.user_id = (select auth.uid()))
  )
  with check (
    sender_role = 'admin'
    and read_by_client = true
    and exists (select 1 from public.contact_requests
                where contact_requests.id = request_messages.request_id
                  and contact_requests.user_id = (select auth.uid()))
  );

create policy "admins mark client messages as read"
  on public.request_messages
  as permissive
  for update
  to authenticated
  using (
    sender_role = 'client'
    and exists (select 1 from public.profiles
                where profiles.id = (select auth.uid()) and profiles.role = 'admin')
  )
  with check (
    sender_role = 'client'
    and read_by_admin = true
    and exists (select 1 from public.profiles
                where profiles.id = (select auth.uid()) and profiles.role = 'admin')
  );

-- 3. Guard trigger. Name kept from the repository migration: it is in the reviewed inventory
--    of DB-SEC-01, which can therefore run before or after this LOT.
--    Content immutability applies to EVERY role, owner included: correcting a message later
--    requires an explicit, reviewed "alter table ... disable trigger" in its own transaction.
create function public.prevent_request_message_content_update()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if new.id is distinct from old.id
     or new.request_id is distinct from old.request_id
     or new.sender_role is distinct from old.sender_role
     or new.sender_id is distinct from old.sender_id
     or new.message is distinct from old.message
     or new.created_at is distinct from old.created_at then
    raise exception 'Only request message read flags can be updated.' using errcode = '42501';
  end if;

  -- API roles only: server-side roles (postgres, service_role) may correct flags.
  -- The flags are NULLABLE in production: a changed flag may only become TRUE (written with
  -- IS DISTINCT FROM / IS NOT TRUE so that NULL never slips through a three-valued test).
  -- This refuses true → false, true → NULL and NULL → false; NULL → true stays allowed for the
  -- person reading (legacy rows).
  if current_user in ('anon', 'authenticated') then
    if (new.read_by_client is distinct from old.read_by_client and new.read_by_client is not true)
       or (new.read_by_admin is distinct from old.read_by_admin and new.read_by_admin is not true) then
      raise exception 'A read flag can only be set to true.' using errcode = '42501';
    end if;
    if new.read_by_client is distinct from old.read_by_client
       and not (old.sender_role = 'admin'
                and exists (select 1 from public.contact_requests
                            where contact_requests.id = old.request_id
                              and contact_requests.user_id = auth.uid())) then
      raise exception 'Only the owning client can mark admin messages as read.' using errcode = '42501';
    end if;
    if new.read_by_admin is distinct from old.read_by_admin
       and not (old.sender_role = 'client'
                and exists (select 1 from public.profiles
                            where profiles.id = auth.uid() and profiles.role = 'admin')) then
      raise exception 'Only an admin can mark client messages as read.' using errcode = '42501';
    end if;
  end if;

  return new;
end;
$$;

-- A trigger fires without EXECUTE; nobody needs to call it directly.
revoke execute on function public.prevent_request_message_content_update() from public, anon, authenticated;

create trigger prevent_request_message_content_update_trigger
  before update on public.request_messages
  for each row execute function public.prevent_request_message_content_update();

-- Self-check before commit.
do $$
declare
  bad text;
begin
  -- (a) Nothing gained by anon / authenticated, on any public table, column or function.
  select string_agg(a.role_name || ' ' || a.privilege || ' on ' || a.object_name
                    || case when a.column_name not in ('', '()') then '.' || a.column_name else '' end, ', ')
  into bad
  from db_msg_01.effective_privileges() a
  left join db_msg_01.effective_before b using (object_name, column_name, role_name, privilege)
  where a.granted and coalesce(b.granted, false) = false;
  if bad is not null then
    raise exception 'DB-MSG-01 self-check: privileges gained: %', bad;
  end if;

  -- (b) Only request_messages changed.
  select string_agg(distinct a.object_name, ', ') into bad
  from db_msg_01.effective_privileges() a
  join db_msg_01.effective_before b using (object_name, column_name, role_name, privilege)
  where a.granted is distinct from b.granted and a.object_name <> 'public.request_messages';
  if bad is not null then
    raise exception 'DB-MSG-01 self-check: privileges changed outside request_messages: %', bad;
  end if;

  -- (c) Exact privileges on request_messages.
  if has_any_column_privilege('anon', 'public.request_messages', 'SELECT')
     or has_any_column_privilege('anon', 'public.request_messages', 'INSERT')
     or has_any_column_privilege('anon', 'public.request_messages', 'UPDATE')
     or has_table_privilege('anon', 'public.request_messages', 'DELETE')
     or has_table_privilege('authenticated', 'public.request_messages', 'DELETE')
     or has_table_privilege('authenticated', 'public.request_messages', 'TRUNCATE')
     or has_table_privilege('authenticated', 'public.request_messages', 'TRIGGER')
     or has_table_privilege('authenticated', 'public.request_messages', 'REFERENCES')
     or exists (select 1 from unnest(array['id', 'request_id', 'sender_role', 'sender_id', 'message', 'created_at']) c
                where has_column_privilege('authenticated', 'public.request_messages', c, 'UPDATE'))
     or has_column_privilege('authenticated', 'public.request_messages', 'id', 'INSERT')
     or has_column_privilege('authenticated', 'public.request_messages', 'created_at', 'INSERT') then
    raise exception 'DB-MSG-01 self-check: privileges on request_messages still too broad';
  end if;

  -- (d) Policies: exactly the five reviewed ones, none open.
  if (select count(*) from pg_policies where schemaname = 'public' and tablename = 'request_messages') <> 5
     or (select count(*) from pg_policies where schemaname = 'public' and tablename = 'request_messages'
         and policyname in ('request messages read for admin or owner', 'clients insert own request messages',
                            'admins insert request messages', 'clients mark admin messages as read',
                            'admins mark client messages as read')
         and permissive = 'PERMISSIVE' and roles::text[] = array['authenticated']
         and coalesce(qual, with_check) like '%auth.uid()%') <> 5 then
    raise exception 'DB-MSG-01 self-check: policies on request_messages are not exactly the reviewed set';
  end if;

  -- (e) Guard in place and enabled; RLS still on.
  if not exists (select 1 from pg_trigger where tgrelid = 'public.request_messages'::regclass
                 and tgname = 'prevent_request_message_content_update_trigger' and tgenabled = 'O')
     or not (select relrowsecurity from pg_class where oid = 'public.request_messages'::regclass) then
    raise exception 'DB-MSG-01 self-check: guard trigger or RLS missing';
  end if;
end $$;

-- (f) Behavioural probe: a signed-in account that owns nothing and is not admin reads 0 message
--     (this is what Realtime evaluates too). Runs as authenticated with a random user id.
do $$
declare
  n bigint;
begin
  perform set_config('request.jwt.claims',
                     json_build_object('sub', gen_random_uuid()::text, 'role', 'authenticated')::text, true);
  set local role authenticated;
  select count(*) into n from public.request_messages;
  reset role;
  perform set_config('request.jwt.claims', '', true);
  if n <> 0 then
    raise exception 'DB-MSG-01 self-check: a stranger account still reads % message(s)', n;
  end if;
end $$;

-- Post-migration state: 99-rollback.sql refuses to run if any of it changed afterwards.
create table db_msg_01.meta as
select now() as applied_at, current_user::text as applied_by;
create table db_msg_01.effective_after as select * from db_msg_01.effective_privileges();
create table db_msg_01.shape_after as select * from db_msg_01.current_shape();

-- The reviewed policies exactly as created, so that 98-emergency-recovery.sql can return to them
-- without a second copy of their SQL; and the log of every emergency intervention.
create table db_msg_01.policies_after as
select policyname::text, permissive, cmd, roles::text[] as roles, qual, with_check
from pg_policies where schemaname = 'public' and tablename = 'request_messages';
create table db_msg_01.recovery_log (
  at timestamptz not null default now(),
  mode text not null,
  run_by text not null default current_user
);

revoke all on all tables in schema db_msg_01 from public, anon, authenticated;

commit;
