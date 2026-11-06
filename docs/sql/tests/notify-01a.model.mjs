// LOT NOTIFY-01A — shared PGlite replica of Production (after DB-SEC-01 and DB-MSG-01), used by
// notify-01a.pglite.mjs (SQL tests) and notify-01a.e2e.mjs (local end-to-end run). Never connects to Supabase.
// Model from docs/sql/tests/db-msg-01.pglite.mjs (branch fix/db-msg-01, variant "prod") + the two applied
// migrations copied unchanged into docs/sql/tests/fixtures/ (SHA-256 pinned in FIXTURES).
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { PGlite } from "@electric-sql/pglite";

export const loadModel = (repo) => {
  const read = (p) => readFileSync(join(repo, p), "utf8");
  const sha = (text) => createHash("sha256").update(text).digest("hex");

  const FIXTURES = {
    "db-sec-01.01-migration.sql": "b75d850900b70ef1ea5baee82107abe048bd6248a5562231f415a4315147ca93",
    "db-sec-01.99-rollback.sql": "9b574265e195991d68eaaa30390e055953678d635ab2c2613b3c060397d6c46c",
    "db-msg-01.01-migration.sql": "af3263f454f06609a51b0cdf1b831932c08121c823471aee6429978217b13a60",
    "db-msg-01.99-rollback.sql": "6fce60833a8551e357317f57b6e91d2ed188fae93a0c4d3076bb49413b1b29ae",
  };
  const fixture = (name) => read(`docs/sql/tests/fixtures/${name}`).replace(/\r\n/g, "\n");
  const SEC = fixture("db-sec-01.01-migration.sql");
  const SEC_RB = fixture("db-sec-01.99-rollback.sql");
  const MSG = fixture("db-msg-01.01-migration.sql");
  const MSG_RB = fixture("db-msg-01.99-rollback.sql");
  const N01 = read("docs/sql/notify-01a/01-migration.sql");
  const N02 = read("docs/sql/notify-01a/02-activate.sql");
  const N90 = read("docs/sql/notify-01a/90-pause.sql");
  const N91 = read("docs/sql/notify-01a/91-resume.sql");
  const N99 = read("docs/sql/notify-01a/99-rollback.sql");
  const N00 = read("docs/sql/notify-01a/00-readonly-checks.sql");
  const N80 = read("docs/sql/notify-01a/80-daily-dead-check.sql");
  const QUOTES_SQL = read("supabase/quotes.sql");
  const MESSAGES_SQL = read("supabase/request_messages.sql");
  const DOCUMENTS_SQL = read("supabase/request_documents.sql");


  const A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
  const B = "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee";
  const ADMIN = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
  const RA = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";
  const RB = "dddddddd-dddd-4ddd-8ddd-ddddddddddd2";
  const RN = "cccccccc-cccc-4ccc-8ccc-c00000004321";
  const OPEN_READ = `create policy "Users can read request messages" on public.request_messages for select to authenticated using (true);`;

  let current = null;
  const fresh = async () => {
    if (current) await current.close();
    current = null;
    for (let i = 0; i < 3; i += 1) {
      globalThis.gc?.();
      await new Promise((resolve) => setTimeout(resolve, 20));
    }
    const db = new PGlite();
    current = db;
    await db.exec(`
      create role anon nologin; create role authenticated nologin; create role service_role nologin bypassrls;
      create role supabase_auth_admin nologin;
      create schema auth; create schema extensions;
      create table auth.users (id uuid primary key, email text, raw_user_meta_data jsonb default '{}');
      create function auth.uid() returns uuid language sql stable as
        $$ select nullif(nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub', '')::uuid $$;
      grant usage on schema auth, public, extensions to anon, authenticated, service_role, supabase_auth_admin;
      grant insert, select on auth.users to supabase_auth_admin;
      set search_path = public, extensions;

      create table public.profiles (
        id uuid primary key references auth.users(id) on delete cascade,
        email text, full_name text, avatar_url text,
        role text not null default 'client');
      alter table public.profiles enable row level security;
      create policy "Users can view own profile" on public.profiles for select using (auth.uid() = id);
      create policy "Users can update own profile" on public.profiles for update using (auth.uid() = id);
      create function public.handle_new_user() returns trigger language plpgsql security definer as $$
      begin
        insert into profiles (id, email, full_name, avatar_url)
        values (new.id, new.email, new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'avatar_url');
        return new;
      end $$;
      create trigger on_auth_user_created after insert on auth.users
        for each row execute function public.handle_new_user();

      create table public.contact_requests (
        id uuid primary key default gen_random_uuid(),
        user_id uuid references auth.users(id) on delete set null,
        reference text, name text not null, email text not null, company text,
        project_type text, message text not null,
        status text not null default 'new',
        created_at timestamptz not null default now());
      alter table public.contact_requests enable row level security;
      create policy "Anyone can submit contact requests" on public.contact_requests
        for insert to anon, authenticated with check (true);
      create policy "Authenticated users can insert contact requests" on public.contact_requests
        for insert to authenticated with check (auth.uid() is not null);
      create policy "Users view own requests" on public.contact_requests
        for select using (auth.uid() = user_id);
      create policy "Admins view all requests" on public.contact_requests for select to authenticated
        using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));
      create policy "Admins update requests" on public.contact_requests for update to authenticated
        using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'))
        with check (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));
    `);
    await db.exec(QUOTES_SQL);
    await db.exec(MESSAGES_SQL.replace(/alter publication supabase_realtime[^;]*;/, ""));
    await db.exec(`
      create function public.set_quotes_updated_at() returns trigger language plpgsql as $$
      begin new.updated_at := now(); return new; end $$;
      create trigger set_quotes_updated_at before update on public.quotes
        for each row execute function public.set_quotes_updated_at();`);
    await db.exec(DOCUMENTS_SQL.slice(DOCUMENTS_SQL.indexOf("create table if not exists public.request_documents"), DOCUMENTS_SQL.indexOf('drop policy if exists "request document files read')));
    await db.exec(`alter table public.request_messages
      alter column created_at drop not null, alter column read_by_admin drop not null, alter column read_by_client drop not null;`);
    await db.exec(`drop policy "request messages read for admin or owner" on public.request_messages; ${OPEN_READ}`);
    await db.exec(`
      grant all on all tables in schema public to anon, authenticated, service_role;
      grant all on all functions in schema public to anon, authenticated, service_role;
      alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
      alter default privileges in schema public grant all on functions to anon, authenticated, service_role;
      revoke update, insert on public.profiles from authenticated;
      revoke select, insert, update on public.request_messages from anon;
      revoke update on public.request_messages from authenticated;
      grant update (read_by_admin, read_by_client) on public.request_messages to authenticated;

      insert into auth.users (id, email) values ('${A}', 'a@example.fr'), ('${B}', 'b@example.fr'), ('${ADMIN}', 'admin@example.fr');
      update public.profiles set role = 'admin' where id = '${ADMIN}';
      insert into public.contact_requests (id, user_id, reference, name, email, message, status, created_at) values
        ('${RA}', '${A}', 'DL-2026-7558', 'A', 'a@example.fr', 'm', 'in_progress', now() - interval '20 days'),
        ('${RB}', '${B}', 'DL-2026-7560', 'B', 'b@example.fr', 'm', 'in_progress', now() - interval '10 days'),
        ('${RN}', null, null, 'Visiteur', 'v@example.fr', 'm', 'new', now() - interval '2 days');
    `);
    return db;
  };

  // Production as of 2026-11-04: DB-SEC-01 then DB-MSG-01 applied.
  const prod = async () => {
    const db = await fresh();
    const sec = await run(db, SEC);
    const msg = await run(db, MSG);
    if (sec || msg) throw new Error(`model: applied LOTs failed: ${sec ?? ""} ${msg ?? ""}`);
    return db;
  };

  const api = async (db, role, sub, sql, params) => {
    const claims = JSON.stringify(sub ? { role, sub } : { role });
    await db.exec(`set role ${role}`);
    await db.query(`select set_config('request.jwt.claims', $1, false)`, [claims]);
    try {
      const res = params ? await db.query(sql, params) : await db.query(sql);
      return { ok: true, rows: res.rows, affected: res.affectedRows };
    } catch (error) {
      return { ok: false, error: error.message };
    } finally {
      await db.exec(`reset role`);
      await db.query(`select set_config('request.jwt.claims', '', false)`);
    }
  };
  const run = async (db, sql) => {
    try {
      await db.exec(sql);
      return null;
    } catch (error) {
      try { await db.exec("rollback"); } catch { /* no open transaction */ }
      return error.message;
    }
  };
  const q = async (db, sql, params) => (await db.query(sql, params)).rows;
  // The visitor form: supabase-js insert() without select (src/services/contactRequests.js).
  const formInsert = (db, role = "anon", sub = null, over = {}) => {
    const row = { user_id: sub, reference: "DL-2026-0001", name: "Prospect", email: "p@example.fr", company: null, project_type: "Site web", message: "Bonjour", status: "new", ...over };
    const cols = Object.keys(row);
    return api(db, role, sub, `insert into public.contact_requests (${cols.join(", ")}) values (${cols.map((_, i) => `$${i + 1}`).join(", ")})`, Object.values(row));
  };
  const claim = async (db, limit = 3) => api(db, "service_role", null, `select * from public.notify_01a_claim($1)`, [limit]);
  const mark = async (db, id, attempts, result, resendId = null, error = null, payloadSha = null) =>
    api(db, "service_role", null, `select public.notify_01a_mark($1, $2, $3, $4, $5, $6) as s`, [id, attempts, result, resendId, error, payloadSha]);
  const outbox = (db) => q(db, `select * from notify_01a.outbox order by id`);
  const lastRequestId = async (db) => (await q(db, `select id from public.contact_requests order by created_at desc, id desc limit 1`))[0].id;

  // Everything NOTIFY-01A must leave untouched: policies, effective privileges of the API roles on
  // every pre-existing public table / column / function, function definitions, default ACLs, columns.
  const untouched = async (db) => JSON.stringify(await q(db, `
    select 'policy ' || tablename || ' ' || policyname || ' ' || permissive || ' ' || cmd || ' ' || roles::text || ' ' || coalesce(qual, '-') || ' ' || coalesce(with_check, '-') as s
      from pg_policies where schemaname = 'public'
    union all
    select format('priv %s %s %s %s', c.relname, r, p, has_table_privilege(r, c.oid, p))
      from pg_class c join pg_namespace n on n.oid = c.relnamespace,
           unnest(array['anon', 'authenticated', 'service_role']) r,
           unnest(array['SELECT', 'INSERT', 'UPDATE', 'DELETE', 'TRUNCATE', 'REFERENCES', 'TRIGGER']) p
     where n.nspname = 'public' and c.relkind = 'r'
    union all
    select format('col %s.%s %s %s %s %s', c.relname, a.attname, format_type(a.atttypid, a.atttypmod), a.attnotnull, r,
                  has_column_privilege(r, c.oid, a.attnum, 'INSERT') || '/' || has_column_privilege(r, c.oid, a.attnum, 'UPDATE') || '/' || has_column_privilege(r, c.oid, a.attnum, 'SELECT'))
      from pg_attribute a join pg_class c on c.oid = a.attrelid join pg_namespace n on n.oid = c.relnamespace,
           unnest(array['anon', 'authenticated']) r
     where n.nspname = 'public' and c.relkind = 'r' and a.attnum > 0 and not a.attisdropped
    union all
    select format('fn %s %s %s', p.oid::regprocedure, md5(pg_get_functiondef(p.oid)), coalesce(p.proacl::text, 'default'))
      from pg_proc p join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public' and p.proname not like 'notify\\_01a\\_%'
    union all
    select 'defacl ' || coalesce(n.nspname, '*') || ' ' || d.defaclobjtype::text || ' ' || d.defaclacl::text
      from pg_default_acl d left join pg_namespace n on n.oid = d.defaclnamespace
    union all
    select 'rls ' || relname || ' ' || relrowsecurity from pg_class c join pg_namespace n on n.oid = c.relnamespace
     where n.nspname = 'public' and c.relkind = 'r'
    order by 1`));

  const statements = (sql) => sql.split("\n").filter((line) => !/^\s*--/.test(line)).join("\n")
    .split(/;\s*\n/).map((s) => s.trim()).filter(Boolean);
  const runReadOnlyChecks = async (db) => {
    const out = [];
    for (const statement of statements(N00)) {
      try {
        await db.exec("begin transaction read only");
        out.push(JSON.stringify((await db.query(statement)).rows));
        await db.exec("rollback");
      } catch (error) {
        try { await db.exec("rollback"); } catch { /* none */ }
        return { ok: false, error: `${error.message} in: ${statement.slice(0, 80)}` };
      }
    }
    return { ok: true, out };
  };
  return { repo, read, sha, FIXTURES, fixture, SEC, SEC_RB, MSG, MSG_RB, N01, N02, N90, N91, N99, N00, N80, A, B, ADMIN, RA, RB, RN, fresh, prod, api, run, q, formInsert, claim, mark, outbox, lastRequestId, untouched, statements, runReadOnlyChecks, close: async () => { if (current) await current.close(); current = null; } };
};
