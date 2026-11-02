-- LOT SM-04 — read-only checks on public.contact_requests (project digital-lab-prod).
-- One single SELECT (the Supabase SQL Editor only displays the last result):
-- it reads catalog metadata and, for section 8, only duplicate reference values
-- and their counts. It never writes. Run it as is and share the result table.

with target as (select 'public.contact_requests'::regclass as rel)

select '1. RLS' as section,
       'row level security' as item,
       case when c.relrowsecurity then 'enabled' else 'DISABLED' end
         || case when c.relforcerowsecurity then ' (forced)' else '' end as detail
from pg_class c, target
where c.oid = target.rel

union all
select '2. Policy',
       p.policyname || ' [' || p.cmd || ']',
       'roles=' || array_to_string(p.roles, ',')
         || ' | using=' || coalesce(p.qual, '-')
         || ' | with_check=' || coalesce(p.with_check, '-')
from pg_policies p
where p.schemaname = 'public' and p.tablename = 'contact_requests'

union all
select '3. Constraint',
       con.conname || ' [' || con.contype || ']',
       pg_get_constraintdef(con.oid)
from pg_constraint con, target
where con.conrelid = target.rel

union all
select '4. Unique index',
       i.relname,
       pg_get_indexdef(ix.indexrelid)
from pg_index ix
join pg_class i on i.oid = ix.indexrelid, target
where ix.indrelid = target.rel and ix.indisunique

union all
select '5. Trigger',
       tg.tgname,
       pg_get_triggerdef(tg.oid)
from pg_trigger tg, target
where tg.tgrelid = target.rel and not tg.tgisinternal

union all
select '6. Column',
       a.attname,
       format_type(a.atttypid, a.atttypmod)
         || case when a.attnotnull then ' not null' else '' end
         || coalesce(' default ' || pg_get_expr(d.adbin, d.adrelid), '')
from pg_attribute a
left join pg_attrdef d on d.adrelid = a.attrelid and d.adnum = a.attnum, target
where a.attrelid = target.rel and a.attnum > 0 and not a.attisdropped

union all
select '7. Grant',
       g.grantee,
       string_agg(g.privilege_type, ',' order by g.privilege_type)
from information_schema.role_table_grants g
where g.table_schema = 'public' and g.table_name = 'contact_requests'
  and g.grantee in ('anon', 'authenticated')
group by g.grantee

union all
select '8. Duplicate reference',
       coalesce(r.reference, '(null)'),
       count(*)::text || ' rows'
from public.contact_requests r
group by r.reference
having count(*) > 1

order by 1, 2;
