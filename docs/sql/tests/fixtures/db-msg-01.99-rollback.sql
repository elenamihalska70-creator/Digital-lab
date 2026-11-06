-- LOT DB-MSG-01 — conditional rollback. Undoes 01-migration.sql from the snapshot kept in the
-- private schema db_msg_01, checks the result, then drops the snapshot. One transaction.
-- It never changes a message row.
--
-- Run as the role that ran the migration (postgres in the SQL editor).
--
-- It REFUSES to run (and changes nothing) when:
--   * it is run by another role than the one that applied the migration;
--   * the migration is older than the validation window (7 days);
--   * ANYTHING changed on request_messages since the migration: columns (name, type, NOT NULL,
--     default), RLS flags, owner, policies (name, kind, roles, expressions), trigger
--     (definition, enabled state), guard function (body, settings, grants), or the effective
--     privileges of anon / authenticated on the table, its columns and the guard function.
--     (So it also refuses after DB-SEC-01 if DB-SEC-01 was applied AFTER this LOT: roll back
--     in reverse order — DB-SEC-01 first.)
--
-- NOT the incident procedure. If the portal breaks after the migration, use the forward fix
-- 98-emergency-recovery.sql (keeps privileges minimal and reading private). This file is for a
-- deliberate, reviewed decision to undo the LOT. Any 98 intervention not reverted (guard-on /
-- reviewed-writes) is drift: this file then refuses.
--
-- MODE (edit the set_config line below, nothing else):
--   'safe' (default): removes the trigger and the guard function; restores the previous
--     privileges EXCEPT TRUNCATE, TRIGGER and REFERENCES, which are never re-granted (unused by
--     the site; TRUNCATE bypasses RLS; DB-SEC-01 removes them too); restores the previous
--     INSERT / UPDATE policies, but NO previous SELECT policy: the reviewed "request messages
--     read for admin or owner" stays. A behavioural probe then checks that a signed-in account
--     owning nothing reads 0 message. Conversations stay private; the previous WRITE behaviour
--     comes back, since that is what is being undone (table-level INSERT, so id / created_at
--     can be set on insert again; read flags resettable where an old UPDATE policy allows it).
--     DELETE is restored as it was: inert, since no DELETE policy is restored.
--   'exact-reopen-cross-client-read': restores EVERY previous policy and privilege, including
--     USING (true) and TRUNCATE. Every signed-in account can then read every conversation again
--     (API and Realtime). Never part of a standard procedure: only with the owner's explicit
--     written decision.

begin;
set local lock_timeout = '5s';
set local statement_timeout = '60s';

select set_config('db_msg_01.rollback_mode', 'safe', true);  -- 'safe' or 'exact-reopen-cross-client-read'

do $$
declare
  drift text;
  validation_window constant interval := interval '7 days';
  mode text := current_setting('db_msg_01.rollback_mode', true);
begin
  if mode is null or mode not in ('safe', 'exact-reopen-cross-client-read') then
    raise exception 'DB-MSG-01 rollback: unknown mode %', coalesce(mode, '(none)');
  end if;
  if to_regnamespace('db_msg_01') is null then
    raise exception 'DB-MSG-01 rollback: snapshot schema db_msg_01 not found';
  end if;
  if to_regclass('db_msg_01.meta') is null or to_regclass('db_msg_01.effective_after') is null
     or to_regclass('db_msg_01.shape_after') is null or to_regclass('db_msg_01.policies_before') is null
     or to_regclass('db_msg_01.acl_before') is null or to_regclass('db_msg_01.effective_before') is null then
    raise exception 'DB-MSG-01 rollback: snapshot incomplete — refuse to roll back blindly';
  end if;
  if (select applied_by from db_msg_01.meta) <> current_user then
    raise exception 'DB-MSG-01 rollback: run as %, the role that applied the migration', (select applied_by from db_msg_01.meta);
  end if;
  if (select applied_at from db_msg_01.meta) < now() - validation_window then
    raise exception 'DB-MSG-01 rollback: migration applied on %, outside the % validation window — review instead of rolling back',
      (select applied_at from db_msg_01.meta), validation_window;
  end if;
  if to_regclass('public.request_messages') is null then
    raise exception 'DB-MSG-01 rollback refused: public.request_messages no longer exists';
  end if;
  -- DB-SEC-01 applied AFTER this LOT also revokes TRUNCATE/TRIGGER/REFERENCES on this table.
  -- Those are already gone here, so no drift is visible, but restoring the pre-migration grants
  -- would silently undo DB-SEC-01. Roll back in reverse order.
  if to_regclass('db_sec_01.meta') is not null then
    execute 'select (select applied_at from db_sec_01.meta) >= (select applied_at from db_msg_01.meta)' into drift;
    if drift::boolean then
      raise exception 'DB-MSG-01 rollback refused: DB-SEC-01 was applied after this LOT — roll back DB-SEC-01 first';
    end if;
  end if;

  -- Drift: shape of request_messages (columns, RLS, owner, policies, trigger, guard function).
  with now_shape as (select * from db_msg_01.current_shape()),
  differences as (
    (select 'now ' as side, * from now_shape except select 'now ', * from db_msg_01.shape_after)
    union all
    (select 'was ', * from db_msg_01.shape_after except select 'was ', * from now_shape)
  )
  select string_agg(side || kind || ' ' || name, ', ' order by kind, name, side) into drift from differences;
  if drift is not null then
    raise exception 'DB-MSG-01 rollback refused: request_messages changed since the migration: %', drift;
  end if;

  -- Drift: effective privileges on request_messages and the guard function.
  select string_agg(b.role_name || ' ' || b.privilege || ' on ' || b.object_name
                    || case when b.column_name not in ('', '()') then '.' || b.column_name else '' end
                    || ' = ' || coalesce(a.granted::text, 'gone') || ' (after migration: ' || b.granted || ')', ', ')
  into drift
  from db_msg_01.effective_after b
  left join db_msg_01.effective_privileges() a using (object_name, column_name, role_name, privilege)
  where b.object_name in ('public.request_messages', 'public.prevent_request_message_content_update()')
    and a.granted is distinct from b.granted;
  if drift is not null then
    raise exception 'DB-MSG-01 rollback refused: privileges changed since the migration: %', drift;
  end if;
end $$;

-- Restore. The drift check above guarantees the objects are exactly those the migration left.
drop trigger prevent_request_message_content_update_trigger on public.request_messages;
drop function public.prevent_request_message_content_update();

-- Privileges: the grants captured before the migration (safe mode: minus TRUNCATE, TRIGGER,
-- REFERENCES).
revoke all on table public.request_messages from anon, authenticated;
revoke all (id, request_id, sender_role, sender_id, message, read_by_admin, read_by_client, created_at)
  on table public.request_messages from anon, authenticated;
do $$
declare
  g record;
  mode text := current_setting('db_msg_01.rollback_mode', true);
begin
  for g in select * from db_msg_01.acl_before loop
    if mode = 'safe' and g.privilege_type in ('TRUNCATE', 'TRIGGER', 'REFERENCES') then
      raise notice 'DB-MSG-01 rollback (safe): NOT re-granted: % % to %', g.privilege_type,
        case when g.column_name = '' then 'on table' else 'on column ' || g.column_name end, g.grantee;
      continue;
    end if;
    execute format('grant %s %s on table public.request_messages to %I%s',
                   g.privilege_type,
                   case when g.column_name = '' then '' else '(' || quote_ident(g.column_name) || ')' end,
                   g.grantee,
                   case when g.is_grantable then ' with grant option' else '' end);
  end loop;
end $$;

-- Policies.
--   exact: every previous policy comes back.
--   safe : the previous INSERT / UPDATE policies come back (previous write behaviour, including
--          its known weaknesses within the restored privileges: without the trigger, read flags
--          can be reset where an old UPDATE policy allows it); NO previous SELECT policy comes back — the reviewed
--          read policy "request messages read for admin or owner" stays. Reading is then
--          verified by behaviour, not by text (probe below).
do $$
declare
  p record;
  mode text := current_setting('db_msg_01.rollback_mode', true);
  roles_sql text;
begin
  for p in select policyname from pg_policies where schemaname = 'public' and tablename = 'request_messages'
           and not (mode = 'safe' and policyname = 'request messages read for admin or owner') loop
    execute format('drop policy %I on public.request_messages', p.policyname);
  end loop;

  for p in select * from db_msg_01.policies_before order by policyname loop
    if mode = 'safe' and p.cmd = 'SELECT' then
      raise notice 'DB-MSG-01 rollback (safe): previous SELECT policy NOT restored: % [using %]', p.policyname, coalesce(p.qual, '-');
      continue;
    end if;
    if mode = 'safe' and p.policyname = 'request messages read for admin or owner' then
      raise exception 'DB-MSG-01 rollback (safe): a previous % policy has the name of the kept read policy — use a reviewed manual fix', p.cmd;
    end if;
    select string_agg(case when r = 'public' then 'public' else quote_ident(r) end, ', ') into roles_sql
    from unnest(p.roles) r;
    execute format('create policy %I on public.request_messages as %s for %s to %s%s%s',
                   p.policyname, p.permissive, p.cmd, roles_sql,
                   case when p.qual is null then '' else ' using (' || p.qual || ')' end,
                   case when p.with_check is null then '' else ' with check (' || p.with_check || ')' end);
  end loop;
end $$;

-- Final check, then drop the snapshot.
do $$
declare
  bad text;
  mode text := current_setting('db_msg_01.rollback_mode', true);
begin
  select string_agg(b.role_name || ' ' || b.privilege || ' on ' || b.object_name
                    || case when b.column_name <> '' then '.' || b.column_name else '' end, ', ')
  into bad
  from db_msg_01.effective_before b
  join db_msg_01.effective_privileges() a using (object_name, column_name, role_name, privilege)
  where b.object_name = 'public.request_messages'
    and a.granted is distinct from
        (b.granted and not (mode = 'safe' and b.privilege in ('TRUNCATE', 'TRIGGER', 'REFERENCES')));
  if bad is not null then
    raise exception 'DB-MSG-01 rollback: privileges differ from the expected state (pre-migration snapshot%): %',
      case when mode = 'safe' then ' minus TRUNCATE / TRIGGER / REFERENCES' else '' end, bad;
  end if;
  if to_regprocedure('public.prevent_request_message_content_update()') is not null
     or exists (select 1 from pg_trigger where tgrelid = 'public.request_messages'::regclass and not tgisinternal) then
    raise exception 'DB-MSG-01 rollback: guard trigger or function still present';
  end if;

  if mode = 'exact-reopen-cross-client-read' then
    if exists (select policyname::text, permissive, cmd, roles::text[], qual, with_check from pg_policies
               where schemaname = 'public' and tablename = 'request_messages'
               except select policyname, permissive, cmd, roles, qual, with_check from db_msg_01.policies_before)
       or exists (select policyname, permissive, cmd, roles, qual, with_check from db_msg_01.policies_before
                  except select policyname::text, permissive, cmd, roles::text[], qual, with_check from pg_policies
                  where schemaname = 'public' and tablename = 'request_messages') then
      raise exception 'DB-MSG-01 rollback: restored policies differ from the snapshot';
    end if;
  else
    -- Safe mode: write policies exactly as before, the reviewed read policy as the only SELECT.
    if exists (select policyname::text, permissive, cmd, roles::text[], qual, with_check from pg_policies
               where schemaname = 'public' and tablename = 'request_messages' and cmd <> 'SELECT'
               except select policyname, permissive, cmd, roles, qual, with_check from db_msg_01.policies_before where cmd <> 'SELECT')
       or exists (select policyname, permissive, cmd, roles, qual, with_check from db_msg_01.policies_before where cmd <> 'SELECT'
                  except select policyname::text, permissive, cmd, roles::text[], qual, with_check from pg_policies
                  where schemaname = 'public' and tablename = 'request_messages' and cmd <> 'SELECT')
       or (select array_agg(policyname order by policyname) from pg_policies
           where schemaname = 'public' and tablename = 'request_messages' and cmd = 'SELECT')
          is distinct from array['request messages read for admin or owner']::name[] then
      raise exception 'DB-MSG-01 rollback (safe): restored policies differ from the expected safe set';
    end if;
  end if;
end $$;

-- Behavioural probe (safe mode): a signed-in account that owns nothing and is not admin must
-- see no message at all. Same check as the migration's self-check.
do $$
declare
  n bigint;
begin
  if current_setting('db_msg_01.rollback_mode', true) <> 'safe' then
    return;
  end if;
  perform set_config('request.jwt.claims',
                     json_build_object('sub', gen_random_uuid()::text, 'role', 'authenticated')::text, true);
  set local role authenticated;
  select count(*) into n from public.request_messages;
  reset role;
  perform set_config('request.jwt.claims', '', true);
  if n <> 0 then
    raise exception 'DB-MSG-01 rollback (safe): a stranger account still reads % message(s)', n;
  end if;
end $$;

drop schema db_msg_01 cascade;

commit;
