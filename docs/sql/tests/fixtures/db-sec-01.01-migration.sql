-- LOT DB-SEC-01 — least privilege for the API roles (project digital-lab-prod).
-- STATUS: PROPOSAL FOR REVIEW. NOT APPLIED. Do not run without the owner's go-ahead.
--
-- Run order: 00-readonly-checks.sql (keep the result) → this file → 00 again → compare.
-- ONE transaction: a failed precondition, statement or self-check rolls everything back.
-- Rollback after commit: 99-rollback.sql (exact restore from the snapshot taken below).
--
-- Production facts this file is written against (owner's direct checks, 2026-11-02):
--   * the 5 public tables exist; contact_requests holds 2 rows; schema db_sec_01 does not exist;
--   * anon AND authenticated hold TRUNCATE, TRIGGER, REFERENCES on the 5 tables;
--   * authenticated has neither UPDATE nor INSERT on public.profiles.role (the RLS policy
--     "Users can update own profile" exists but is inert without the privilege);
--   * anon can INSERT the 8 form columns of contact_requests;
--   * handle_new_user() inserts id, email, full_name, avatar_url only (no role from metadata);
--   * public functions: handle_new_user, set_quotes_updated_at, both without search_path;
--   * TWO permissive INSERT policies on contact_requests (OR-ed):
--       "Anyone can submit contact requests"              TO anon, authenticated  WITH CHECK (true)
--       "Authenticated users can insert contact requests" TO authenticated        WITH CHECK (auth.uid() IS NOT NULL)
--
-- What it changes:
--   1. TRUNCATE / TRIGGER / REFERENCES revoked from anon and authenticated on every public table
--      (and in default privileges). TRUNCATE bypasses RLS; the site uses none of the three.
--   2. contact_requests, role anon: all table privileges revoked, then INSERT re-granted on the
--      8 columns the contact form sends. The anonymous form keeps working (required until the
--      server-side insert exists); id / created_at can no longer be forged by visitors.
--   3. BOTH INSERT policies replaced by two strict ones: visitors may only create an unowned
--      'new' request; signed-in users only for themselves (or unowned), status 'new'.
--      Replacing only the first would leave the second one granting authenticated users any
--      user_id / status (permissive policies are OR-ed).
--   4. EXECUTE revoked from PUBLIC / anon / authenticated on SECURITY DEFINER trigger functions.
--   5. Fixed search_path on public functions that have none (Security Advisor).
--
-- What it NEVER does: GRANT any table privilege other than the column INSERT of step 2, touch
-- public.profiles privileges other than revoking TRUNCATE/TRIGGER/REFERENCES, change any data.
-- The final self-check compares EFFECTIVE privileges (has_table_privilege /
-- has_column_privilege / has_function_privilege) with the snapshot and aborts if anon or
-- authenticated gained anything at all — in particular any UPDATE on profiles.role.

begin;

-- Fail fast instead of queueing behind a long transaction (the policy swap needs a brief
-- exclusive lock on contact_requests; while waiting it would block the contact form).
set local lock_timeout = '5s';
set local statement_timeout = '60s';

-- 0. Preconditions on EFFECTIVE privileges and on the audited state.
do $$
declare
  t text;
  unexpected text;
begin
  if to_regnamespace('db_sec_01') is not null then
    raise exception 'DB-SEC-01 precondition: schema db_sec_01 already exists (migration already applied?)';
  end if;
  foreach t in array array['public.profiles', 'public.contact_requests', 'public.quotes',
                           'public.request_documents', 'public.request_messages'] loop
    if to_regclass(t) is null then
      raise exception 'DB-SEC-01 precondition: table % not found', t;
    end if;
  end loop;

  -- Inventory: steps 1, 4 and 5 loop over public objects; they must only meet reviewed ones.
  -- (contact_request_counters and the two reference functions belong to DB-REF-01, which may
  -- have been applied first; prevent_request_message_content_update comes from the repository
  -- migration examined in DB-MSG-01, which may be applied before or after this LOT.)
  select string_agg(c.relname, ', ') into unexpected
  from pg_class c join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public' and c.relkind in ('r', 'p')
    and not exists (select 1 from pg_depend d where d.objid = c.oid and d.deptype = 'e')
    and c.relname not in ('profiles', 'contact_requests', 'quotes', 'request_documents',
                          'request_messages', 'contact_request_counters');
  if unexpected is not null then
    raise exception 'DB-SEC-01 precondition: unreviewed public table(s): %', unexpected;
  end if;
  select string_agg(p.proname, ', ') into unexpected
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public' and p.prokind = 'f'
    and not exists (select 1 from pg_depend d where d.objid = p.oid and d.deptype = 'e')
    and p.proname not in ('handle_new_user', 'set_quotes_updated_at',
                          'assign_contact_request_reference', 'guard_contact_request_reference',
                          'prevent_request_message_content_update');  -- repo migration, see DB-MSG-01
  if unexpected is not null then
    raise exception 'DB-SEC-01 precondition: unreviewed public function(s): %', unexpected;
  end if;

  -- Ownership: REVOKE only removes grants made by the current role, and ALTER FUNCTION needs
  -- ownership. Run as the owner (postgres in the SQL editor), or stop with a clear message.
  select string_agg(c.relname || ' (owner ' || pg_get_userbyid(c.relowner) || ')', ', ') into unexpected
  from pg_class c join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public' and c.relkind in ('r', 'p') and c.relowner <> current_user::text::regrole;
  if unexpected is not null then
    raise exception 'DB-SEC-01 precondition: run as the owner of every public table; not owned by %: %', current_user, unexpected;
  end if;
  select string_agg(p.proname || ' (owner ' || pg_get_userbyid(p.proowner) || ')', ', ') into unexpected
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public' and p.prokind = 'f' and p.proowner <> current_user::text::regrole
    and not exists (select 1 from pg_depend d where d.objid = p.oid and d.deptype = 'e');
  if unexpected is not null then
    raise exception 'DB-SEC-01 precondition: run as the owner of every public function; not owned by %: %', current_user, unexpected;
  end if;
  -- INSERT policies: permissive policies are OR-ed, so EVERY policy that applies to INSERT for
  -- anon / authenticated / public must be known and replaced. Production has exactly two:
  --   "Anyone can submit contact requests"              anon, authenticated  WITH CHECK (true)
  --   "Authenticated users can insert contact requests" authenticated        WITH CHECK (auth.uid() IS NOT NULL)
  -- Any other INSERT-capable policy (cmd INSERT or ALL), a different role list, a different
  -- expression or a restrictive policy means the state differs from the review: stop.
  if (
    select count(*) from pg_policies
    where schemaname = 'public' and tablename = 'contact_requests' and cmd in ('INSERT', 'ALL')
  ) <> 2
  or not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'contact_requests' and cmd = 'INSERT'
      and policyname = 'Anyone can submit contact requests' and permissive = 'PERMISSIVE'
      and (select array_agg(r order by r) from unnest(roles::text[]) r) = array['anon', 'authenticated']
      and qual is null
      and regexp_replace(lower(with_check), '[\s()]', '', 'g') = 'true'
  )
  or not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'contact_requests' and cmd = 'INSERT'
      and policyname = 'Authenticated users can insert contact requests' and permissive = 'PERMISSIVE'
      and roles::text[] = array['authenticated']
      and qual is null
      and regexp_replace(lower(with_check), '[\s()]', '', 'g') = 'auth.uidisnotnull'
  ) then
    raise exception 'DB-SEC-01 precondition: INSERT policies on contact_requests differ from the two reviewed ones — re-run 00-readonly-checks.sql';
  end if;
  if not (select relrowsecurity from pg_class where oid = 'public.contact_requests'::regclass) then
    raise exception 'DB-SEC-01 precondition: RLS is disabled on contact_requests';
  end if;
  -- A visitor-applicable read/update/delete policy must be tied to auth.uid() (null for visitors).
  if exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'contact_requests'
      and cmd in ('SELECT', 'UPDATE', 'DELETE', 'ALL')
      and roles && array['anon', 'public']::name[]
      and coalesce(qual, '') not like '%auth.uid()%'
  ) then
    raise exception 'DB-SEC-01 precondition: a policy lets visitors read/change contact_requests without auth.uid()';
  end if;
  -- The contact form must work before (anon INSERT on the 8 columns it sends).
  if exists (
    select 1 from unnest(array['user_id', 'reference', 'name', 'email', 'company',
                               'project_type', 'message', 'status']) col
    where not exists (select 1 from pg_attribute
                      where attrelid = 'public.contact_requests'::regclass and attname = col and not attisdropped)
       or not has_column_privilege('anon', 'public.contact_requests', col, 'INSERT')
  ) then
    raise exception 'DB-SEC-01 precondition: anon cannot INSERT every form column today — state differs from the audit';
  end if;
  -- Audited: authenticated cannot update profiles nor its role column. If this is no longer
  -- true, the state differs from what was reviewed: stop.
  if has_table_privilege('authenticated', 'public.profiles', 'UPDATE')
     or has_column_privilege('authenticated', 'public.profiles', 'role', 'UPDATE')
     or has_column_privilege('authenticated', 'public.profiles', 'role', 'INSERT')
     or has_column_privilege('anon', 'public.profiles', 'role', 'UPDATE') and exists (
          select 1 from pg_policies where schemaname = 'public' and tablename = 'profiles'
            and cmd in ('UPDATE', 'ALL') and roles && array['anon', 'public']::name[]
            and coalesce(qual, '') not like '%auth.uid()%') then
    raise exception 'DB-SEC-01 precondition: profiles.role is updatable through the API — state differs from the audit';
  end if;
end $$;

-- Snapshot (private schema, not exposed by the API): exact ACLs for the rollback, effective
-- privileges for the "nothing gained" self-check. Drop it once the LOT is accepted.
create schema db_sec_01;
revoke all on schema db_sec_01 from public;
comment on schema db_sec_01 is 'LOT DB-SEC-01 pre-migration snapshot used by 99-rollback.sql';

create function db_sec_01.effective_privileges()
returns table (table_name text, column_name text, role_name text, privilege text, granted boolean)
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

create table db_sec_01.effective_before as select * from db_sec_01.effective_privileges();

-- Exact table and column grants to anon / authenticated.
create table db_sec_01.table_acl as
select format('%I.%I', n.nspname, c.relname) as table_name, ''::text as column_name,
       g.rolname::text as grantee, a.privilege_type, a.is_grantable
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
cross join lateral aclexplode(coalesce(c.relacl, acldefault('r', c.relowner))) a
join pg_roles g on g.oid = a.grantee
where n.nspname = 'public' and c.relkind in ('r', 'p') and g.rolname in ('anon', 'authenticated')
union all
select format('%I.%I', n.nspname, c.relname), att.attname::text, g.rolname::text, a.privilege_type, a.is_grantable
from pg_attribute att
join pg_class c on c.oid = att.attrelid
join pg_namespace n on n.oid = c.relnamespace
cross join lateral aclexplode(att.attacl) a
join pg_roles g on g.oid = a.grantee
where n.nspname = 'public' and c.relkind in ('r', 'p') and att.attnum > 0 and not att.attisdropped
  and att.attacl is not null and g.rolname in ('anon', 'authenticated');

-- Exact EXECUTE grants (PUBLIC included) and configuration of the public functions.
create table db_sec_01.function_state as
select format('%I.%I(%s)', n.nspname, f.proname, pg_get_function_identity_arguments(f.oid)) as fn,
       f.proconfig,
       array(select case when a.grantee = 0 then 'public' else pg_get_userbyid(a.grantee)::text end
             from aclexplode(coalesce(f.proacl, acldefault('f', f.proowner))) a
             where a.privilege_type = 'EXECUTE'
               and (a.grantee = 0 or pg_get_userbyid(a.grantee) in ('anon', 'authenticated'))) as execute_grantees
from pg_proc f
join pg_namespace n on n.oid = f.pronamespace
where n.nspname = 'public' and f.prokind = 'f'
  and not exists (select 1 from pg_depend d where d.objid = f.oid and d.deptype = 'e');

-- The two INSERT policies that are replaced, exactly as they are.
create table db_sec_01.policies as
select policyname, permissive, cmd, roles::text[] as roles, qual, with_check
from pg_policies
where schemaname = 'public' and tablename = 'contact_requests'
  and policyname in ('Anyone can submit contact requests', 'Authenticated users can insert contact requests');

-- Default privileges for tables created later in public by the current role.
create table db_sec_01.default_acl as
select pg_get_userbyid(d.defaclrole)::text as owner_role, pg_get_userbyid(a.grantee)::text as grantee, a.privilege_type
from pg_default_acl d
join pg_namespace n on n.oid = d.defaclnamespace
cross join lateral aclexplode(d.defaclacl) a
where n.nspname = 'public' and d.defaclobjtype = 'r' and d.defaclrole = current_user::text::regrole
  and pg_get_userbyid(a.grantee) in ('anon', 'authenticated')
  and a.privilege_type in ('TRUNCATE', 'TRIGGER', 'REFERENCES');

revoke all on all tables in schema db_sec_01 from public, anon, authenticated;
revoke all on function db_sec_01.effective_privileges() from public, anon, authenticated;

-- 1. No TRUNCATE / TRIGGER / REFERENCES for the API roles, on every public table.
do $$
declare
  t record;
begin
  for t in
    select format('%I.%I', n.nspname, c.relname) as rel
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind in ('r', 'p')
      and not exists (select 1 from pg_depend d where d.objid = c.oid and d.deptype = 'e')
  loop
    execute format('revoke truncate, trigger, references on table %s from anon, authenticated', t.rel);
  end loop;
end $$;

alter default privileges in schema public
  revoke truncate, trigger, references on tables from anon, authenticated;

-- 2. contact_requests: anon keeps exactly what the anonymous form needs. Table-level AND any
--    column-level grant are removed first (REVOKE ... ON TABLE leaves column grants in place).
revoke all on table public.contact_requests from anon;
do $$
declare
  cols text;
begin
  select string_agg(quote_ident(attname), ', ') into cols
  from pg_attribute
  where attrelid = 'public.contact_requests'::regclass and attnum > 0 and not attisdropped;
  execute format('revoke all (%s) on table public.contact_requests from anon', cols);
end $$;
grant insert (user_id, reference, name, email, company, project_type, message, status)
  on table public.contact_requests to anon;

-- 3. INSERT policies: no ownership forgery, no pre-set status. BOTH permissive policies go:
--    keeping "Authenticated users can insert contact requests" would OR its check
--    (auth.uid() IS NOT NULL) with the new one and leave any user_id / status allowed.
drop policy "Anyone can submit contact requests" on public.contact_requests;
drop policy "Authenticated users can insert contact requests" on public.contact_requests;

create policy "Visitors submit unowned contact requests"
  on public.contact_requests
  for insert
  to anon
  with check (user_id is null and status = 'new');

create policy "Users submit their own contact requests"
  on public.contact_requests
  for insert
  to authenticated
  with check ((user_id is null or user_id = auth.uid()) and status = 'new');

-- 4. SECURITY DEFINER trigger functions: nobody needs to call them directly.
do $$
declare
  f record;
begin
  for f in
    select p.oid::regprocedure as fn
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.prosecdef and p.prorettype = 'trigger'::regtype
      and not exists (select 1 from pg_depend d where d.objid = p.oid and d.deptype = 'e')
  loop
    execute format('revoke execute on function %s from public, anon, authenticated', f.fn);
    raise notice 'DB-SEC-01: execute revoked on %', f.fn;
  end loop;
end $$;

-- 5. Fixed search_path where none is set (functions from extensions are left alone).
do $$
declare
  f record;
begin
  for f in
    select p.oid::regprocedure as fn
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.prokind = 'f'
      and not exists (select 1 from pg_depend d where d.objid = p.oid and d.deptype = 'e')
      and not exists (select 1 from unnest(coalesce(p.proconfig, '{}')) c where c like 'search_path=%')
  loop
    execute format('alter function %s set search_path = public, extensions, pg_temp', f.fn);
    raise notice 'DB-SEC-01: search_path fixed on %', f.fn;
  end loop;
end $$;

-- Self-check on EFFECTIVE privileges before commit.
do $$
declare
  gained text;
  t text;
begin
  -- (a) Nothing gained, anywhere: table, column or function, anon or authenticated.
  select string_agg(a.role_name || ' ' || a.privilege || ' on ' || a.table_name
                    || case when a.column_name <> '' then '.' || a.column_name else '' end, ', ')
  into gained
  from db_sec_01.effective_privileges() a
  join db_sec_01.effective_before b using (table_name, column_name, role_name, privilege)
  where a.granted and not b.granted;
  if gained is not null then
    raise exception 'DB-SEC-01 self-check: privileges gained: %', gained;
  end if;

  -- (b) profiles.role still not updatable through the API.
  if has_table_privilege('authenticated', 'public.profiles', 'UPDATE')
     or has_column_privilege('authenticated', 'public.profiles', 'role', 'UPDATE')
     or has_column_privilege('authenticated', 'public.profiles', 'role', 'INSERT') then
    raise exception 'DB-SEC-01 self-check: profiles.role became writable';
  end if;

  -- (c) TRUNCATE / TRIGGER / REFERENCES gone on the five tables.
  foreach t in array array['public.profiles', 'public.contact_requests', 'public.quotes',
                           'public.request_documents', 'public.request_messages'] loop
    if has_table_privilege('anon', t, 'TRUNCATE') or has_table_privilege('authenticated', t, 'TRUNCATE')
       or has_table_privilege('anon', t, 'TRIGGER') or has_table_privilege('authenticated', t, 'TRIGGER')
       or has_table_privilege('anon', t, 'REFERENCES') or has_table_privilege('authenticated', t, 'REFERENCES') then
      raise exception 'DB-SEC-01 self-check: TRUNCATE/TRIGGER/REFERENCES still granted on %', t;
    end if;
  end loop;

  -- (e) INSERT policies: exactly the two new ones, nothing else can OR a wider check in.
  if (
    select count(*) from pg_policies
    where schemaname = 'public' and tablename = 'contact_requests' and cmd in ('INSERT', 'ALL')
  ) <> 2
  or not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'contact_requests' and cmd = 'INSERT'
      and policyname = 'Visitors submit unowned contact requests' and roles::text[] = array['anon']
      and with_check like '%user_id IS NULL%' and with_check like '%''new''%'
  )
  or not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'contact_requests' and cmd = 'INSERT'
      and policyname = 'Users submit their own contact requests' and roles::text[] = array['authenticated']
      and with_check like '%auth.uid()%' and with_check like '%''new''%'
  ) then
    raise exception 'DB-SEC-01 self-check: INSERT policies on contact_requests are not exactly the two new ones';
  end if;

  -- (d) Visitors: insert only, on the 8 form columns.
  if has_any_column_privilege('anon', 'public.contact_requests', 'SELECT')
     or has_any_column_privilege('anon', 'public.contact_requests', 'UPDATE')
     or has_table_privilege('anon', 'public.contact_requests', 'DELETE')
     or has_column_privilege('anon', 'public.contact_requests', 'created_at', 'INSERT')
     or has_column_privilege('anon', 'public.contact_requests', 'id', 'INSERT') then
    raise exception 'DB-SEC-01 self-check: anon privileges on contact_requests still too broad';
  end if;
  if exists (
    select 1 from unnest(array['user_id', 'reference', 'name', 'email', 'company',
                               'project_type', 'message', 'status']) col
    where not has_column_privilege('anon', 'public.contact_requests', col, 'INSERT')
  ) then
    raise exception 'DB-SEC-01 self-check: the anonymous contact form would be blocked';
  end if;
end $$;

-- Post-migration state, used by 99-rollback.sql to REFUSE a rollback if anything changed after
-- the migration (a later hardening, a new policy, a new grant...). The rollback may only undo
-- this migration, never overwrite later decisions with the old, more permissive state.
create table db_sec_01.meta as
select now() as applied_at, current_user::text as applied_by;

create table db_sec_01.effective_after as select * from db_sec_01.effective_privileges();

-- Function settings AND full definition (SHA-256 of pg_get_functiondef: body, language,
-- SECURITY DEFINER, configuration): a body replaced after the migration is detected even when
-- its settings and grants are left identical.
create table db_sec_01.function_config_after as
select format('%I.%I(%s)', n.nspname, f.proname, pg_get_function_identity_arguments(f.oid)) as fn,
       f.proconfig, f.prosecdef,
       encode(sha256(convert_to(pg_get_functiondef(f.oid), 'UTF8')), 'hex') as definition_sha256
from pg_proc f join pg_namespace n on n.oid = f.pronamespace
where n.nspname = 'public' and f.prokind = 'f'
  and not exists (select 1 from pg_depend d where d.objid = f.oid and d.deptype = 'e');

-- Structure of every public table (columns, positions, types, nullability): the rollback
-- revokes on ALL current columns, so it must refuse if a column was added, dropped, renamed
-- or retyped since the migration (such a column would escape the privilege comparison).
create table db_sec_01.structure_after as
select format('%I.%I', n.nspname, c.relname) as table_name, a.attnum::integer as attnum,
       a.attname::text as column_name, format_type(a.atttypid, a.atttypmod) as column_type,
       a.attnotnull
from pg_attribute a
join pg_class c on c.oid = a.attrelid
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relkind in ('r', 'p') and a.attnum > 0 and not a.attisdropped;

create table db_sec_01.policies_after as
select policyname, permissive, cmd, roles::text[] as roles, qual, with_check
from pg_policies
where schemaname = 'public' and tablename = 'contact_requests';

create table db_sec_01.default_acl_after as
select pg_get_userbyid(a.grantee)::text as grantee, a.privilege_type
from pg_default_acl d
join pg_namespace n on n.oid = d.defaclnamespace
cross join lateral aclexplode(d.defaclacl) a
where n.nspname = 'public' and d.defaclobjtype = 'r' and d.defaclrole = current_user::text::regrole
  and pg_get_userbyid(a.grantee) in ('anon', 'authenticated');

revoke all on all tables in schema db_sec_01 from public, anon, authenticated;

commit;
