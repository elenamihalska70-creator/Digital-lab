-- LOT DB-SEC-01 — rollback. Restores EXACTLY the state captured by 01-migration.sql in the
-- private schema db_sec_01 (grants, policy, EXECUTE, search_path, default privileges), checks
-- that effective privileges are identical to the snapshot, then drops the snapshot.
-- One transaction: if the final comparison fails, nothing is changed.
--
-- Run as the role that ran the migration (postgres in the SQL editor).
--
-- SAFETY: this file only UNDOES DB-SEC-01. It refuses to run (and changes nothing) when:
--   * it is run by another role than the one that applied the migration;
--   * the migration is older than the validation window (7 days, see below);
--   * ANYTHING changed after the migration on the objects it covers: table structure (column
--     added, dropped, renamed or retyped), effective privileges of anon/authenticated (tables,
--     columns, functions), function settings (search_path, SECURITY DEFINER) and definitions
--     (SHA-256 of pg_get_functiondef, body included), policies of contact_requests, default
--     privileges.
-- So it can never re-open privileges over a later decision (e.g. anonymous INSERT removed once
-- the server-side insert exists, or a column-level grant added on profiles). In that case,
-- review the drift it reports and write a targeted fix instead of rolling back.

begin;
set local lock_timeout = '5s';
set local statement_timeout = '60s';

do $$
declare
  drift text;
  validation_window constant interval := interval '7 days';
begin
  if to_regnamespace('db_sec_01') is null then
    raise exception 'DB-SEC-01 rollback: snapshot schema db_sec_01 not found';
  end if;
  if to_regclass('db_sec_01.meta') is null or to_regclass('db_sec_01.effective_after') is null
     or to_regclass('db_sec_01.structure_after') is null
     or not exists (select 1 from pg_attribute where attrelid = 'db_sec_01.function_config_after'::regclass
                    and attname = 'definition_sha256' and not attisdropped) then
    raise exception 'DB-SEC-01 rollback: post-migration state missing — refuse to roll back blindly';
  end if;
  if (select applied_by from db_sec_01.meta) <> current_user then
    raise exception 'DB-SEC-01 rollback: run as %, the role that applied the migration', (select applied_by from db_sec_01.meta);
  end if;
  if (select applied_at from db_sec_01.meta) < now() - validation_window then
    raise exception 'DB-SEC-01 rollback: migration applied on %, outside the % validation window — review instead of rolling back',
      (select applied_at from db_sec_01.meta), validation_window;
  end if;

  -- Drift: table structure, checked FIRST. The privilege comparison below joins on the columns
  -- known at migration time, so an added column would escape it, while the restore step revokes
  -- on every current column. Any added, dropped, renamed or retyped column (or a dropped table)
  -- of a table covered by the snapshot stops the rollback.
  with current_structure as (
    select format('%I.%I', n.nspname, c.relname) as table_name, a.attnum::integer as attnum,
           a.attname::text as column_name, format_type(a.atttypid, a.atttypmod) as column_type,
           a.attnotnull
    from pg_attribute a
    join pg_class c on c.oid = a.attrelid
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind in ('r', 'p') and a.attnum > 0 and not a.attisdropped
      and format('%I.%I', n.nspname, c.relname) in (select table_name from db_sec_01.structure_after)
  ), differences as (
    (select 'now ' as side, * from current_structure
     except select 'now ', * from db_sec_01.structure_after)
    union all
    (select 'was ', * from db_sec_01.structure_after
     except select 'was ', * from current_structure)
  )
  select string_agg(side || table_name || '.' || column_name || ' (#' || attnum || ', ' || column_type || ')', ', '
                    order by table_name, attnum, side)
  into drift
  from differences;
  if drift is not null then
    raise exception 'DB-SEC-01 rollback refused: table structure changed since the migration: %', drift;
  end if;

  -- Drift: effective privileges on every object that existed at migration time.
  select string_agg(a.role_name || ' ' || a.privilege || ' on ' || a.table_name
                    || case when a.column_name not in ('', '()') then '.' || a.column_name else '' end
                    || ' = ' || a.granted || ' (after migration: ' || b.granted || ')', ', ')
  into drift
  from db_sec_01.effective_privileges() a
  join db_sec_01.effective_after b using (table_name, column_name, role_name, privilege)
  where a.granted is distinct from b.granted;
  if drift is not null then
    raise exception 'DB-SEC-01 rollback refused: privileges changed since the migration: %', drift;
  end if;
  if exists (select 1 from db_sec_01.effective_after b
             where b.column_name = '' and to_regclass(b.table_name) is null) then
    raise exception 'DB-SEC-01 rollback refused: a table covered by the snapshot no longer exists';
  end if;

  -- Drift: function settings and full definitions (body included, via SHA-256).
  select string_agg(f.fn, ', ') into drift
  from db_sec_01.function_config_after f
  left join pg_proc p on p.oid = to_regprocedure(f.fn)
  where p.oid is null
     or p.proconfig is distinct from f.proconfig
     or p.prosecdef is distinct from f.prosecdef
     or encode(sha256(convert_to(pg_get_functiondef(p.oid), 'UTF8')), 'hex') is distinct from f.definition_sha256;
  if drift is not null then
    raise exception 'DB-SEC-01 rollback refused: function settings or definitions changed since the migration: %', drift;
  end if;

  -- Drift: every policy of contact_requests (not only INSERT).
  if exists (
    select policyname, permissive, cmd, roles::text[], qual, with_check from pg_policies
    where schemaname = 'public' and tablename = 'contact_requests'
    except
    select policyname, permissive, cmd, roles, qual, with_check from db_sec_01.policies_after
  ) or exists (
    select policyname, permissive, cmd, roles, qual, with_check from db_sec_01.policies_after
    except
    select policyname, permissive, cmd, roles::text[], qual, with_check from pg_policies
    where schemaname = 'public' and tablename = 'contact_requests'
  ) then
    raise exception 'DB-SEC-01 rollback refused: policies of contact_requests changed since the migration';
  end if;

  -- Drift: default privileges.
  if exists (
    select pg_get_userbyid(a.grantee)::text, a.privilege_type
    from pg_default_acl d
    join pg_namespace n on n.oid = d.defaclnamespace
    cross join lateral aclexplode(d.defaclacl) a
    where n.nspname = 'public' and d.defaclobjtype = 'r' and d.defaclrole = current_user::text::regrole
      and pg_get_userbyid(a.grantee) in ('anon', 'authenticated')
    except
    select grantee, privilege_type from db_sec_01.default_acl_after
  ) or exists (
    select grantee, privilege_type from db_sec_01.default_acl_after
    except
    select pg_get_userbyid(a.grantee)::text, a.privilege_type
    from pg_default_acl d
    join pg_namespace n on n.oid = d.defaclnamespace
    cross join lateral aclexplode(d.defaclacl) a
    where n.nspname = 'public' and d.defaclobjtype = 'r' and d.defaclrole = current_user::text::regrole
      and pg_get_userbyid(a.grantee) in ('anon', 'authenticated')
  ) then
    raise exception 'DB-SEC-01 rollback refused: default privileges changed since the migration';
  end if;
end $$;

-- 3. INSERT policies: drop the two new ones, recreate the TWO original ones exactly as
--    captured (name, permissive/restrictive, command, roles, expressions).
do $$
begin
  if (select count(*) from db_sec_01.policies) <> 2 then
    raise exception 'DB-SEC-01 rollback: the snapshot does not hold the two original INSERT policies';
  end if;
end $$;
drop policy if exists "Visitors submit unowned contact requests" on public.contact_requests;
drop policy if exists "Users submit their own contact requests" on public.contact_requests;
do $$
declare
  p record;
begin
  for p in select * from db_sec_01.policies order by policyname loop
    execute format('create policy %I on public.contact_requests as %s for %s to %s%s%s',
      p.policyname, p.permissive, p.cmd,
      (select string_agg(case when r = 'public' then 'public' else quote_ident(r) end, ', ') from unnest(p.roles) r),
      case when p.qual is not null then ' using (' || p.qual || ')' else '' end,
      case when p.with_check is not null then ' with check (' || p.with_check || ')' else '' end);
  end loop;
end $$;

-- 1 + 2. Table and column grants of anon / authenticated, exactly as captured.
do $$
declare
  t record;
  g record;
  cols text;
begin
  for t in select distinct table_name from db_sec_01.effective_before where column_name = '' and table_name not like '%(%' loop
    continue when to_regclass(t.table_name) is null;
    select string_agg(quote_ident(attname), ', ') into cols
    from pg_attribute where attrelid = t.table_name::regclass and attnum > 0 and not attisdropped;
    execute format('revoke all on table %s from anon, authenticated', t.table_name);
    execute format('revoke all (%s) on table %s from anon, authenticated', cols, t.table_name);
  end loop;
  for g in select * from db_sec_01.table_acl loop
    continue when to_regclass(g.table_name) is null;
    execute format('grant %s%s on table %s to %I%s', g.privilege_type,
      case when g.column_name <> '' then ' (' || quote_ident(g.column_name) || ')' else '' end,
      g.table_name, g.grantee, case when g.is_grantable then ' with grant option' else '' end);
  end loop;
end $$;

-- Default privileges.
do $$
declare
  d record;
begin
  for d in select * from db_sec_01.default_acl loop
    execute format('alter default privileges for role %I in schema public grant %s on tables to %I',
      d.owner_role, d.privilege_type, d.grantee);
  end loop;
end $$;

-- 4 + 5. EXECUTE grants and search_path of the functions, exactly as captured.
do $$
declare
  f record;
  grantee text;
begin
  for f in select * from db_sec_01.function_state loop
    continue when to_regprocedure(f.fn) is null;
    execute format('revoke execute on function %s from public, anon, authenticated', f.fn);
    foreach grantee in array f.execute_grantees loop
      execute format('grant execute on function %s to %s', f.fn,
        case when grantee = 'public' then 'public' else quote_ident(grantee) end);
    end loop;
    if not exists (select 1 from unnest(coalesce(f.proconfig, '{}')) c where c like 'search_path=%') then
      execute format('alter function %s reset search_path', f.fn);
    end if;
  end loop;
end $$;

-- Final comparison: policies and effective privileges must equal the snapshot.
do $$
declare
  diff text;
begin
  if exists (
    select policyname, permissive, cmd, roles::text[], qual, with_check from pg_policies
    where schemaname = 'public' and tablename = 'contact_requests' and cmd in ('INSERT', 'ALL')
    except
    select policyname, permissive, cmd, roles, qual, with_check from db_sec_01.policies
  ) or exists (
    select policyname, permissive, cmd, roles, qual, with_check from db_sec_01.policies
    except
    select policyname, permissive, cmd, roles::text[], qual, with_check from pg_policies
    where schemaname = 'public' and tablename = 'contact_requests' and cmd in ('INSERT', 'ALL')
  ) then
    raise exception 'DB-SEC-01 rollback: INSERT policies differ from the snapshot';
  end if;

  select string_agg(a.role_name || ' ' || a.privilege || ' on ' || a.table_name
                    || case when a.column_name not in ('', '()') then '.' || a.column_name else '' end
                    || ' = ' || a.granted || ' (was ' || b.granted || ')', ', ')
  into diff
  from db_sec_01.effective_privileges() a
  join db_sec_01.effective_before b using (table_name, column_name, role_name, privilege)
  where a.granted is distinct from b.granted;
  if diff is not null then
    raise exception 'DB-SEC-01 rollback: privileges differ from the snapshot: %', diff;
  end if;
end $$;

drop schema db_sec_01 cascade;

commit;
