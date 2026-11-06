// LOT NOTIFY-01A — SQL tests on a throwaway in-memory Postgres (PGlite). Never connects to Supabase.
//
// Replica of the production state AFTER DB-SEC-01 and DB-MSG-01 (both applied on 2026-11-04):
// the model of docs/sql/tests/db-msg-01.pglite.mjs (branch fix/db-msg-01, variant "prod"), then the
// two applied migrations, copied unchanged into docs/sql/tests/fixtures/ (SHA-256 checked below).
//
// PGlite is not a project dependency (same convention as DB-SEC-01 / DB-MSG-01): copy this file and
// notify-01a.model.mjs into a scratch folder, then
//   npm i @electric-sql/pglite@0.2.17 && node --expose-gc notify-01a.pglite.mjs <repo root>
import { loadModel } from "./notify-01a.model.mjs";

const repo = process.argv[2];
if (!repo) {
  console.error("usage: node --expose-gc notify-01a.pglite.mjs <repo root>");
  process.exit(2);
}
const model = loadModel(repo);
const { sha, FIXTURES, fixture, SEC_RB, MSG_RB, N00, N01, N02, N90, N91, N99, N80, statements, A, B, RA, RB, RN, fresh, prod, api, run, q, formInsert, claim, mark, outbox, lastRequestId, untouched, runReadOnlyChecks } = model;

const results = [];
let group = "";
const check = (name, ok, detail = "") => {
  results.push({ name: `${group} ${name}`, ok: Boolean(ok) });
  console.log(`${ok ? "PASS" : "FAIL"} ${group} ${name}${!ok && detail ? ` — ${detail}` : ""}`);
};

// ─────────────────────────────────────────────────────────────── fixtures
group = "[fixtures]";
for (const [name, expected] of Object.entries(FIXTURES)) {
  check(`${name} is the reviewed file (SHA-256)`, sha(fixture(name)) === expected, sha(fixture(name)));
}

// ─────────────────────────────────────────────────────────────── migration: shape and invariance
group = "[migration]";
{
  const db = await prod();
  const before = await untouched(db);
  const checksBefore = await runReadOnlyChecks(db);
  check("00-readonly-checks runs read-only before 01", checksBefore.ok, checksBefore.error);
  const err = await run(db, N01);
  check("01-migration applies on the DB-SEC-01 + DB-MSG-01 replica", err === null, err ?? "");
  check("pre-existing policies, privileges, columns, functions, default ACLs, RLS: identical", (await untouched(db)) === before);
  const checksAfter = await runReadOnlyChecks(db);
  check("00-readonly-checks runs read-only after 01", checksAfter.ok, checksAfter.error);
  check("00 sections 1–4 (columns, policies, privileges, request_messages) identical before / after",
    checksAfter.ok && JSON.stringify(checksAfter.out.slice(1, 5)) === JSON.stringify(checksBefore.out.slice(1, 5)));
  const again = await run(db, N01);
  check("second run refused (precondition)", again && /already exists/.test(again), again ?? "");
  const s = (await q(db, `select * from notify_01a.settings`))[0];
  check("created disabled, no cutover", s.enabled === false && s.cutover_at === null);
  check("default caps 20 / h and 80 / 24 h, 8 attempts, 23 h window", s.hourly_cap === 20 && s.daily_cap === 80 && s.max_attempts === 8);
  const trg = await q(db, `select tgname, tgenabled from pg_trigger where tgrelid = 'public.contact_requests'::regclass and not tgisinternal`);
  check("exactly one user trigger on contact_requests: notify_01a_enqueue, enabled", trg.length === 1 && trg[0].tgname === "notify_01a_enqueue" && trg[0].tgenabled === "O", JSON.stringify(trg));
  const notOwner = await fresh();
  await notOwner.exec(`create role intruder login; grant usage, create on schema public to intruder; grant all on public.contact_requests to intruder;`);
  await notOwner.exec("set role intruder");
  const refused = await run(notOwner, N01);
  await notOwner.exec("reset role");
  check("refused when not run by the owner of contact_requests", refused && /owner/.test(refused), refused ?? "");
}

// ─────────────────────────────────────────────────────────────── privileges of the API roles
group = "[privileges]";
{
  const db = await prod();
  await run(db, N01);
  for (const role of ["anon", "authenticated"]) {
    const sub = role === "authenticated" ? A : null;
    const tbl = await api(db, role, sub, `select * from notify_01a.outbox`);
    check(`${role}: no access to notify_01a.outbox`, !tbl.ok && /permission denied/.test(tbl.error), tbl.error);
    const st = await api(db, role, sub, `update notify_01a.settings set enabled = true`);
    check(`${role}: cannot switch notifications on`, !st.ok && /permission denied/.test(st.error), st.error);
    for (const call of [`select * from public.notify_01a_claim(3)`, `select public.notify_01a_mark(1, 1, 'sent')`, `select public.notify_01a_reconcile()`,
      `select notify_01a.requeue('${RA}')`, `select notify_01a.cancel_pending()`]) {
      const res = await api(db, role, sub, call);
      check(`${role}: ${call.replace(/select (\* from )?/, "").split("(")[0]} refused`, !res.ok && /permission denied/.test(res.error), res.error);
    }
    const trigFn = await q(db, `select has_function_privilege($1, 'notify_01a.enqueue_contact_request()', 'EXECUTE') as x`, [role]);
    check(`${role}: no EXECUTE on the trigger function`, trigFn[0].x === false);
  }
  const svc = await api(db, "service_role", null, `select public.notify_01a_reconcile() as r`);
  check("service_role: RPC allowed", svc.ok, svc.error);
  const svcTable = await api(db, "service_role", null, `select * from notify_01a.outbox`);
  check("service_role: no direct table access (only through the 3 functions)", !svcTable.ok, svcTable.error);
  const disabled = await claim(db);
  check("claim hands out nothing while disabled", disabled.ok && disabled.rows.length === 0, disabled.error);
  const insert = await formInsert(db);
  check("disabled: visitor form still saves the request", insert.ok, insert.error);
  check("disabled: nothing enqueued", (await outbox(db)).length === 0);
  const forged = await formInsert(db, "anon", null, { status: "completed" });
  check("DB-SEC-01 still enforced: visitor cannot choose the status", !forged.ok, forged.error);
  const msgLeak = await api(db, "authenticated", B, `select count(*)::int n from public.request_messages m join public.contact_requests r on r.id = m.request_id where r.user_id <> '${B}'`);
  check("DB-MSG-01 still enforced: a client reads no other conversation", msgLeak.ok && msgLeak.rows[0].n === 0, msgLeak.error);
}

// ─────────────────────────────────────────────────────────────── activation, trigger, reconcile
group = "[enqueue]";
{
  const db = await prod();
  await run(db, N01);
  const act = await run(db, N02);
  check("02-activate: enabled with cutover_at = now()", act === null && (await q(db, `select enabled and cutover_at is not null as x from notify_01a.settings`))[0].x, act ?? "");
  check("02-activate refused when already enabled", /already enabled/.test((await run(db, N02)) ?? ""));
  const v = await formInsert(db);
  check("visitor form insert works (DB-SEC-01 column grants + trigger)", v.ok, v.error);
  const c = await formInsert(db, "authenticated", A, { user_id: A });
  check("signed-in client insert works", c.ok, c.error);
  const rows = await outbox(db);
  check("one pending outbox row per new request, enqueued by the trigger", rows.length === 2 && rows.every((r) => r.status === "pending" && r.enqueued_by === "trigger" && r.kind === "new_request"));
  check("idempotency key = notify-01a/<request id>", rows.every((r) => r.idempotency_key === `notify-01a/${r.request_id}`));
  check("requests saved before cutover_at are never enqueued", !rows.some((r) => [RA, RB, RN].includes(r.request_id)));
  const rec = await api(db, "service_role", null, `select public.notify_01a_reconcile() as r`);
  check("reconcile: nothing missing → nothing added", rec.ok && rec.rows[0].r.enqueued === 0 && rec.rows[0].r.pending === 2, JSON.stringify(rec.rows?.[0]));

  // Failing trigger: the request is still saved, reconcile catches up.
  await db.exec(`alter table notify_01a.outbox add constraint t_fail check (request_id is null) not valid`);
  const broken = await formInsert(db, "anon", null, { name: "Pendant la panne" });
  check("trigger failure never blocks the visitor's insert", broken.ok, broken.error);
  const brokenId = (await q(db, `select id from public.contact_requests where name = 'Pendant la panne'`))[0]?.id;
  check("…and nothing was enqueued for it", brokenId && !(await outbox(db)).some((r) => r.request_id === brokenId));
  await db.exec(`alter table notify_01a.outbox drop constraint t_fail`);
  const caught = await api(db, "service_role", null, `select public.notify_01a_reconcile() as r`);
  const after = (await outbox(db)).find((r) => r.request_id === brokenId);
  check("reconcile re-enqueues it (enqueued_by = reconcile)", caught.rows?.[0].r.enqueued === 1 && after?.enqueued_by === "reconcile" && after.status === "pending");
  const deleted = await run(db, `delete from public.contact_requests where id = '${brokenId}'`);
  check("deleting a request removes its outbox row (no orphan)", deleted === null && !(await outbox(db)).some((r) => r.request_id === brokenId), deleted ?? "");
}

// ─────────────────────────────────────────────────────────────── claim, lease, fencing, retries
group = "[claim]";
{
  const db = await prod();
  await run(db, N01);
  await run(db, N02);
  await formInsert(db, "anon", null, { name: "Alice <b>", company: "ACME", message: "Ligne 1\nLigne 2" });
  const id = await lastRequestId(db);
  const c1 = await claim(db, 3);
  const row = c1.rows?.[0];
  check("claim returns the request fields needed for the e-mail", c1.ok && c1.rows.length === 1 && row.request_id === id && row.name === "Alice <b>" && row.message === "Ligne 1\nLigne 2" && row.kind === "new_request" && row.attempts === 1, c1.error ?? JSON.stringify(c1.rows));
  const leased = (await outbox(db))[0];
  check("row leased: status sending, attempts 1, first_attempt_at set, lease ≈ 2 min", leased.status === "sending" && leased.attempts === 1 && leased.first_attempt_at && leased.lease_until - Date.now() > 60_000);
  const c2 = await claim(db, 3);
  check("a concurrent worker gets nothing while the lease runs (no double send)", c2.ok && c2.rows.length === 0);
  check("stale mark (wrong attempts token) is ignored", (await mark(db, row.outbox_id, 99, "sent", "x")).rows[0].s === "stale");
  // Lease expiry (worker crashed after calling Resend): handed out again with the SAME key.
  await db.exec(`update notify_01a.outbox set lease_until = now() - interval '1 second'`);
  const c3 = await claim(db, 3);
  check("expired lease: handed out again, attempts 2, same idempotency key", c3.rows?.[0]?.attempts === 2 && c3.rows[0].idempotency_key === row.idempotency_key);
  check("the crashed worker's late mark is fenced off", (await mark(db, row.outbox_id, 1, "sent", "late")).rows[0].s === "stale");
  const shaValue = "a".repeat(64);
  check("mark sent", (await mark(db, row.outbox_id, 2, "sent", "re_123", null, shaValue)).rows[0].s === "sent");
  const sent = (await outbox(db))[0];
  check("sent row: resend_id, sent_at, payload_sha256 stored, no error", sent.status === "sent" && sent.resend_id === "re_123" && sent.sent_at && sent.payload_sha256 === shaValue && sent.last_error === null);
  check("a sent row is never handed out again", (await claim(db, 3)).rows.length === 0);
  check("mark after sent is stale", (await mark(db, row.outbox_id, 2, "retry")).rows[0].s === "stale");
  const bad = await mark(db, row.outbox_id, 2, "bogus");
  check("invalid result value refused", !bad.ok);
}

group = "[retries]";
{
  const db = await prod();
  await run(db, N01);
  await run(db, N02);
  await formInsert(db);
  let r = (await claim(db)).rows[0];
  check("retry → failed, next attempt in 1 min", (await mark(db, r.outbox_id, 1, "retry", null, "http_503")).rows[0].s === "failed");
  let o = (await outbox(db))[0];
  check("…delay ≈ 1 min, error code kept", o.last_error === "http_503" && Math.abs(o.next_attempt_at - Date.now() - 60_000) < 5_000);
  check("not due yet → nothing handed out", (await claim(db)).rows.length === 0);
  const delays = [];
  for (let attempt = 2; attempt <= 8; attempt += 1) {
    await db.exec(`update notify_01a.outbox set next_attempt_at = now() - interval '1 second'`);
    r = (await claim(db)).rows[0];
    if (!r) break;
    const status = (await mark(db, r.outbox_id, r.attempts, "retry", null, "timeout")).rows[0].s;
    o = (await outbox(db))[0];
    delays.push(status === "failed" ? Math.round((o.next_attempt_at - Date.now()) / 60_000) : status);
    // keep the first attempt "recent" so that only the attempt limit applies here
    await db.exec(`update notify_01a.outbox set first_attempt_at = now()`);
  }
  check("backoff 5, 15, 60, 180, 360, 720 min then dead at the 8th attempt", JSON.stringify(delays) === JSON.stringify([5, 15, 60, 180, 360, 720, "dead"]), JSON.stringify(delays));
  check("dead after max attempts, reason kept", (await outbox(db))[0].last_error === "max_attempts:timeout", (await outbox(db))[0].last_error);
  check("a dead row is never handed out automatically", (await claim(db)).rows.length === 0);

  // Idempotency window: automatic retries stop before Resend forgets the key (24 h).
  await formInsert(db, "anon", null, { name: "Fenêtre" });
  r = (await claim(db)).rows[0];
  await mark(db, r.outbox_id, 1, "retry", null, "http_500");
  await db.exec(`update notify_01a.outbox set first_attempt_at = now() - interval '23 hours 1 minute', next_attempt_at = now() - interval '1 second' where id = ${r.outbox_id}`);
  check("first attempt older than 23 h → not handed out", (await claim(db)).rows.length === 0);
  check("…and marked dead window_expired", (await q(db, `select status, last_error from notify_01a.outbox where id = ${r.outbox_id}`))[0].last_error === "window_expired");
  await formInsert(db, "anon", null, { name: "Fenêtre 2" });
  r = (await claim(db)).rows[0];
  await db.exec(`update notify_01a.outbox set first_attempt_at = now() - interval '22 hours 59 minutes 30 seconds' where id = ${r.outbox_id}`);
  check("a retry that would land after the window is not scheduled: dead", (await mark(db, r.outbox_id, 1, "retry", null, "timeout")).rows[0].s === "dead");
  await formInsert(db, "anon", null, { name: "Rejet" });
  r = (await claim(db)).rows[0];
  check("non-retryable error → dead at once", (await mark(db, r.outbox_id, 1, "dead", null, "http_422")).rows[0].s === "dead");

  // Operator requeue.
  const dead = (await q(db, `select request_id, idempotency_key from notify_01a.outbox where last_error = 'http_422'`))[0];
  check("requeue a dead row (inside 24 h): same key", (await q(db, `select notify_01a.requeue($1) as s`, [dead.request_id]))[0].s === "requeued"
    && (await q(db, `select idempotency_key, status from notify_01a.outbox where request_id = $1`, [dead.request_id]))[0].idempotency_key === dead.idempotency_key);
  const win = (await q(db, `select request_id from notify_01a.outbox where last_error = 'window_expired'`))[0];
  check("requeue after the window refused without p_new_key", /refused: idempotency window/.test((await q(db, `select notify_01a.requeue($1) as s`, [win.request_id]))[0].s));
  check("requeue with p_new_key → new key …/manual-<epoch>", (await q(db, `select notify_01a.requeue($1, true) as s`, [win.request_id]))[0].s === "requeued"
    && /^notify-01a\/.+\/manual-\d+$/.test((await q(db, `select idempotency_key from notify_01a.outbox where request_id = $1`, [win.request_id]))[0].idempotency_key));
  const sentReq = await q(db, `select notify_01a.requeue($1) as s`, [dead.request_id]);
  check("requeue of a pending row refused", /refused: status pending/.test(sentReq[0].s));
}

// ─────────────────────────────────────────────────────────────── caps and volume alert
group = "[caps]";
{
  const db = await prod();
  await run(db, N01);
  await run(db, N02);
  await db.exec(`update notify_01a.settings set hourly_cap = 2`);
  for (let i = 0; i < 4; i += 1) await formInsert(db, "anon", null, { name: `P${i}` });
  const first = (await claim(db, 10)).rows;
  check("hourly cap: only 2 handed out", first.length === 2 && first.every((r) => r.kind === "new_request"), JSON.stringify(first.map((r) => r.kind)));
  for (const r of first) await mark(db, r.outbox_id, r.attempts, "sent", `re_${r.outbox_id}`);
  const second = (await claim(db, 10)).rows;
  check("cap reached: one volume alert, no request", second.length === 1 && second[0].kind === "volume_alert" && second[0].alert_day && second[0].request_id === null, JSON.stringify(second));
  check("alert key is per day", /^notify-01a\/volume-alert\/\d{4}-\d{2}-\d{2}$/.test(second[0]?.idempotency_key ?? ""));
  await mark(db, second[0].outbox_id, second[0].attempts, "sent", "re_alert");
  check("no second alert the same day", (await claim(db, 10)).rows.length === 0);
  check("waiting requests are kept pending (nothing lost)", (await q(db, `select count(*)::int n from notify_01a.outbox where kind = 'new_request' and status = 'pending'`))[0].n === 2);
  await db.exec(`update notify_01a.outbox set sent_at = now() - interval '2 hours' where status = 'sent'`);
  const later = (await claim(db, 10)).rows;
  check("capacity back an hour later: the waiting requests go out", later.length === 2 && later.every((r) => r.kind === "new_request"));
  await db.exec(`update notify_01a.settings set hourly_cap = 100, daily_cap = 3`);
  for (const r of later) await mark(db, r.outbox_id, r.attempts, "sent", "x");
  await formInsert(db, "anon", null, { name: "Quota jour" });
  check("daily cap (rolling 24 h) also enforced", (await claim(db, 10)).rows.filter((r) => r.kind === "new_request").length === 0);
  await db.exec(`update notify_01a.settings set hourly_cap = 100, daily_cap = 1000; update notify_01a.outbox set sent_at = now() - interval '2 days' where status = 'sent'`);
  for (let i = 0; i < 14; i += 1) await formInsert(db, "anon", null, { name: `Lot ${i}` });
  const tooMany = await claim(db, 1000);
  check("claim never hands out more than 10 rows per call", tooMany.ok && tooMany.rows.length === 10, `${tooMany.rows?.length} ${tooMany.error ?? ""}`);
  const negative = await claim(db, -5);
  check("negative limit hands out nothing", negative.ok && negative.rows.length === 0, negative.error);
}

// ─────────────────────────────────────────────────────────────── daily dead check (SEC-EMAIL-02)
group = "[daily dead check]";
{
  const db = await prod();
  await run(db, N01);
  await run(db, N02);
  await formInsert(db, "anon", null, { name: "Personne Secrète", email: "secret.person@example.fr", company: "Société Privée", message: "Message confidentiel" });
  const r = (await claim(db)).rows[0];
  await mark(db, r.outbox_id, 1, "dead", null, "http_422:validation_error");
  await formInsert(db, "anon", null, { name: "Autre", email: "autre@example.fr" });
  await db.exec(`update notify_01a.outbox set created_at = now() - interval '9 hours' where status = 'pending'`);
  const before = JSON.stringify(await q(db, `select * from notify_01a.outbox order by id`));
  const parts = statements(N80).filter((s) => !/^(begin|rollback)\b/i.test(s));
  const outputs = [];
  let error = null;
  for (const statement of parts) {
    try {
      await db.exec("begin transaction read only");
      outputs.push((await db.query(statement)).rows);
      await db.exec("rollback");
    } catch (e) {
      error = e.message;
      try { await db.exec("rollback"); } catch { /* none */ }
    }
  }
  check("80-daily-dead-check runs entirely read-only (3 queries)", error === null && outputs.length === 3, error ?? String(outputs.length));
  check("changes nothing", JSON.stringify(await q(db, `select * from notify_01a.outbox order by id`)) === before);
  const dead = outputs[1] ?? [];
  check("lists the dead notification with its error and reference", dead.length === 1 && dead[0].last_error === "http_422:validation_error" && dead[0].reference === "DL-2026-0001" && dead[0].same_key_requeue_possible === true);
  check("counts the notification waiting for more than 8 h", outputs[2]?.[0]?.waiting_over_8h === 1, JSON.stringify(outputs[2]));
  const allowed = new Set(["status", "kind", "notifications", "oldest", "last_change", "outbox_id", "reference", "request_id", "attempts", "last_error", "first_attempt_at", "updated_at", "same_key_requeue_possible", "waiting_over_8h"]);
  const columns = outputs.flatMap((rows) => rows.flatMap((row) => Object.keys(row)));
  check("only technical columns (no name / email / company / message)", columns.length > 0 && columns.every((c) => allowed.has(c)), [...new Set(columns)].join(","));
  const dump = JSON.stringify(outputs);
  check("no personal value in the output", !["Personne Secrète", "secret.person@example.fr", "Société Privée", "Message confidentiel", "autre@example.fr"].some((s) => dump.includes(s)));
  const anonRun = await api(db, "anon", null, parts[1]);
  check("not readable by the API roles", !anonRun.ok && /permission denied/.test(anonRun.error), anonRun.error);
}

// ─────────────────────────────────────────────────────────────── pause, resume, rollback
group = "[pause/rollback]";
{
  const db = await prod();
  const pristine = await untouched(db);
  const requestsBefore = await q(db, `select count(*)::int n from public.contact_requests`);
  await run(db, N01);
  await run(db, N02);
  await formInsert(db, "anon", null, { name: "Avant pause" });
  const p = await run(db, N90);
  check("90-pause applies", p === null, p ?? "");
  await formInsert(db, "anon", null, { name: "Pendant pause" });
  check("paused: request saved, nothing enqueued, nothing handed out",
    (await outbox(db)).length === 1 && (await claim(db)).rows.length === 0);
  const r91 = await run(db, N91);
  check("91-resume catches up the request saved during the pause", r91 === null && (await outbox(db)).length === 2, r91 ?? "");
  check("99 refused while enabled", /still enabled/.test((await run(db, N99)) ?? ""));
  await run(db, N90);
  check("99 refused with unsent notifications", /unsent notification/.test((await run(db, N99)) ?? ""));
  check("cancel_pending() cancels them", (await q(db, `select notify_01a.cancel_pending() as n`))[0].n === 2);
  const reactivate = await run(db, `begin; ${N02.replace(/^begin;|commit;\s*$/gm, "")} rollback;`);
  check("after cancel_pending(), 02-activate is accepted again (dry run, rolled back)", reactivate === null, reactivate ?? "");
  await db.exec(`update notify_01a.settings set enabled = false`);
  const rb = await run(db, N99);
  check("99-rollback applies", rb === null, rb ?? "");
  check("no NOTIFY-01A object left", (await q(db, `select (select count(*) from pg_namespace where nspname = 'notify_01a') + (select count(*) from pg_proc where proname like 'notify\\_01a\\_%') + (select count(*) from pg_trigger where tgname = 'notify_01a_enqueue') as n`))[0].n === 0);
  check("contact_requests rows kept (2 added during the test, none removed)", (await q(db, `select count(*)::int n from public.contact_requests`))[0].n === requestsBefore[0].n + 2);
  check("policies, privileges, functions, default ACLs back to the exact pre-NOTIFY state", (await untouched(db)) === pristine);
  check("visitor form works after rollback", (await formInsert(db)).ok);
  check("01-migration can be re-applied after rollback", (await run(db, N01)) === null);
  await run(db, N02);
  await formInsert(db);
  const forced = await run(db, N90);
  const refusedForce = await run(db, N99);
  const withForce = await run(db, N99.replace("begin;\n", "begin;\nset local notify_01a.force_rollback = 'on';\n"));
  check("forced rollback with unsent rows: refused without the flag, applied with it", forced === null && /unsent/.test(refusedForce ?? "") && withForce === null, withForce ?? "");
}

// ─────────────────────────────────────────────────────────────── compatibility with DB-SEC-01 / DB-MSG-01 rollbacks
group = "[DB-SEC-01 / DB-MSG-01]";
{
  const db = await prod();
  await run(db, N01);
  await run(db, N02);
  const msgRb = await run(db, MSG_RB);
  check("DB-MSG-01 rollback still accepted with NOTIFY-01A in place (no drift reported)", msgRb === null, msgRb ?? "");
  const secRb = await run(db, SEC_RB);
  check("DB-SEC-01 rollback still accepted with NOTIFY-01A in place (no drift reported)", secRb === null, secRb ?? "");
  const v = await formInsert(db);
  check("after both rollbacks the trigger still enqueues", v.ok && (await outbox(db)).length === 1, v.error);
  const anonOut = await api(db, "anon", null, `select * from public.notify_01a_claim(3)`);
  check("after both rollbacks the API roles still cannot call NOTIFY-01A", !anonOut.ok && /permission denied/.test(anonOut.error), anonOut.error);
  // And the other way: NOTIFY-01A rollback leaves DB-SEC-01 / DB-MSG-01 as applied.
  const db2 = await prod();
  const applied = await untouched(db2);
  await run(db2, N01);
  await run(db2, N90);
  const rb = await run(db2, N99);
  check("NOTIFY-01A rollback leaves the DB-SEC-01 + DB-MSG-01 state exactly as applied", rb === null && (await untouched(db2)) === applied, rb ?? "");
  const msgRb2 = await run(db2, MSG_RB);
  const secRb2 = await run(db2, SEC_RB);
  check("…and their own rollbacks still run afterwards", msgRb2 === null && secRb2 === null, `${msgRb2 ?? ""} ${secRb2 ?? ""}`);
}

await model.close();
const passed = results.filter((r) => r.ok).length;
console.log(`\n${passed}/${results.length} passed`);
process.exit(passed === results.length ? 0 : 1);
