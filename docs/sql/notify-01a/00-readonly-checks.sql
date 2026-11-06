-- LOT NOTIFY-01A — 00-readonly-checks.sql
-- READ ONLY. Run before 01-migration.sql (expected results noted in each section), and again
-- after it: sections 1–4 must return exactly the same rows before and after (nothing touched).
-- Safe to run in a read-only transaction:
--   begin transaction read only;  <paste the queries>;  rollback;

-- 0. Context
select current_user, version(), now();

-- 1. contact_requests: owner and columns. Expected: owner = the role that will run 01 (postgres);
--    id uuid; reference, name, email, company, project_type, message, created_at present.
select c.relowner::regrole as owner, a.attnum, a.attname, format_type(a.atttypid, a.atttypmod) as type,
       a.attnotnull, pg_get_expr(d.adbin, d.adrelid) as default_value
from pg_class c
join pg_attribute a on a.attrelid = c.oid and a.attnum > 0 and not a.attisdropped
left join pg_attrdef d on d.adrelid = c.oid and d.adnum = a.attnum
where c.oid = 'public.contact_requests'::regclass
order by a.attnum;

-- 2. Policies of contact_requests (DB-SEC-01 state). Must be identical after 01.
select policyname, permissive, cmd, roles, qual, with_check
from pg_policies where schemaname = 'public' and tablename = 'contact_requests' order by policyname;

-- 3. Effective privileges of the API roles on contact_requests. Must be identical after 01.
select r as role, p as privilege, has_table_privilege(r, 'public.contact_requests', p) as granted
from unnest(array['anon', 'authenticated']) r,
     unnest(array['SELECT', 'INSERT', 'UPDATE', 'DELETE', 'TRUNCATE', 'REFERENCES', 'TRIGGER']) p
order by 1, 2;

-- 4. request_messages policies (DB-MSG-01 state). Must be identical after 01.
select policyname, permissive, cmd, roles, qual, with_check
from pg_policies where schemaname = 'public' and tablename = 'request_messages' order by policyname;

-- 5. Triggers on contact_requests. Before 01: no notify_01a_enqueue. After 01: notify_01a_enqueue
--    (AFTER INSERT, FOR EACH ROW, notify_01a.enqueue_contact_request) plus the FK triggers of the outbox.
select tgname, tgenabled, tgisinternal, tgfoid::regproc as function, pg_get_triggerdef(oid) as definition
from pg_trigger where tgrelid = 'public.contact_requests'::regclass order by tgisinternal, tgname;

-- 6. NOTIFY-01A objects. Before 01: no row. After 01: schema + 3 public functions.
select 'schema' as kind, nspname as name from pg_namespace where nspname = 'notify_01a'
union all
select 'function', p.oid::regprocedure::text from pg_proc p join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public' and p.proname like 'notify\_01a\_%';

-- 7. Roles. Expected: service_role exists (used by the Vercel worker key).
select rolname, rolbypassrls from pg_roles where rolname in ('anon', 'authenticated', 'service_role') order by 1;

-- 8. Default privileges on functions created in public (shows why 01 revokes EXECUTE explicitly).
select pg_get_userbyid(d.defaclrole) as for_role, n.nspname as schema, d.defaclobjtype as object_type,
       d.defaclacl as acl
from pg_default_acl d left join pg_namespace n on n.oid = d.defaclnamespace
order by 1, 2, 3;

-- 9. Previous LOT snapshots (rollback ordering). Expected: db_sec_01 and db_msg_01 present.
select nspname from pg_namespace where nspname in ('db_sec_01', 'db_msg_01', 'notify_01a') order by 1;

-- 10. Volume (counts only, no content): requests per day over 30 days, to size the caps (20/h, 80/24 h).
select (created_at at time zone 'Europe/Paris')::date as day, count(*) as requests
from public.contact_requests where created_at > now() - interval '30 days'
group by 1 order by 1 desc;

-- 11. After 01 only: privileges of the API roles on NOTIFY-01A objects. Expected: no row.
select 'schema usage' as what, r as role from unnest(array['anon', 'authenticated']) r
where to_regnamespace('notify_01a') is not null and has_schema_privilege(r, 'notify_01a', 'USAGE')
union all
select 'execute ' || p.oid::regprocedure::text, r from pg_proc p join pg_namespace n on n.oid = p.pronamespace,
       unnest(array['anon', 'authenticated']) r
where (n.nspname = 'notify_01a' or (n.nspname = 'public' and p.proname like 'notify\_01a\_%'))
  and has_function_privilege(r, p.oid, 'EXECUTE');

-- 12. After 01 only: settings and queue state. Expected right after 01: enabled = false, cutover_at null.
--     (Errors with "relation does not exist" before 01: expected.)
-- select * from notify_01a.settings;
-- select * from notify_01a.v_diagnostic;
