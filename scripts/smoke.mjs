import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

// Always use a disposable database; this script never connects to the user's data.
const dataDir = mkdtempSync(path.join(tmpdir(), "hesabdari-smoke-"));
const port = Number(process.env.SMOKE_PORT || 3117);
const base = `http://127.0.0.1:${port}`;
const serverDir = process.env.SMOKE_SERVER_DIR ? path.resolve(process.env.SMOKE_SERVER_DIR) : undefined;
const nodeBin = process.env.SMOKE_NODE_BIN || process.execPath;
const serverArgs = serverDir ? [path.join(serverDir, "server.js")] : ["node_modules/next/dist/bin/next", "start", "--hostname", "127.0.0.1", "--port", String(port)];
const server = spawn(nodeBin, serverArgs, {
  cwd: serverDir,
  env: { ...process.env, ADMIN_EMAIL: "admin@smoke.test", ADMIN_SETUP_TOKEN: "isolated-admin-setup-token", TURSO_DATABASE_URL: "", TURSO_AUTH_TOKEN: "", PORT: String(port), HOSTNAME: "127.0.0.1", HESABDARI_ROOT: serverDir || process.cwd(), HESABDARI_DATA_DIR: dataDir, SESSION_SECRET: "isolated-smoke-test-secret-do-not-use-in-production", NEXT_TELEMETRY_DISABLED: "1" },
  stdio: ["ignore", "pipe", "pipe"], windowsHide: true,
});
let logs = "";
server.stdout.on("data", (chunk) => { logs += chunk; });
server.stderr.on("data", (chunk) => { logs += chunk; });
let checks = 0;
async function request(url, { method = "GET", body, cookie, status = 200, raw } = {}) {
  const response = await fetch(base + url, {
    method, headers: { "Content-Type": "application/json", ...(cookie ? { Cookie: cookie } : {}) },
    ...(body !== undefined ? { body: JSON.stringify(body) } : raw !== undefined ? { body: raw } : {}),
    redirect: "manual",
  });
  assert.equal(response.status, status, `${method} ${url}: ${await response.clone().text()}`);
  checks++;
  const data = await response.json();
  return { data, cookie: response.headers.get("set-cookie")?.split(";")[0] };
}

try {
  let ready = false;
  for (let attempt = 0; attempt < 100; attempt++) {
    if (server.exitCode !== null) throw new Error(logs);
    try { await fetch(base + "/api/auth/me"); ready = true; break; } catch { await new Promise((resolve) => setTimeout(resolve, 200)); }
  }
  assert.ok(ready, "Test server did not start");
  await request("/api/health");
  const installResponse = await fetch(base + "/install/joojo", { redirect: "manual" });
  assert.equal(installResponse.status, 200, "Install page must work without a session");
  const installHtml = await installResponse.text();
  assert.match(installHtml, /rel="apple-touch-icon"[^>]*href="\/joojo\/stella-icon-180\.png\?v=4"/);
  assert.match(installHtml, /rel="manifest"[^>]*href="\/joojo\/manifest\.json\?v=4"/);
  checks += 3;
  const me = (await request("/api/auth/me")).data;
  const authEnabled = !me.user;
  let alice, bob;
  if (authEnabled) {
    await request("/api/accounts", { status: 401 });
    await request("/api/admin/users", { status: 401 });
    await request("/api/auth/register", { method: "POST", body: { email: " ADMIN@smoke.test ", password: "Test-password-123", name: "Reserved", gender: "male" }, status: 403 });
    await request("/api/auth/register", { method: "POST", body: { email: "spoof@smoke.test", password: "Test-password-123", name: "Spoof", gender: "male", role: "admin", isAdmin: true }, status: 400 });
    await request("/api/auth/setup", { method: "POST", body: { email: "admin@smoke.test", password: "Test-password-123", setupToken: "wrong-token" }, status: 403 });
    const admin = await request("/api/auth/setup", { method: "POST", body: { email: "admin@smoke.test", password: "Test-password-123", name: "مدیر آزمایشی", setupToken: "isolated-admin-setup-token" } });
    assert.equal((await request("/api/auth/me", { cookie: admin.cookie })).data.user.role, "admin");
    await request("/api/admin/users", { cookie: admin.cookie });
    const adminPanel = await fetch(base + "/sanjabadmin", { headers: { Cookie: admin.cookie }, redirect: "manual" });
    assert.equal(adminPanel.status, 200);
    checks++;
    alice = await request("/api/auth/register", { method: "POST", body: { email: "alice@smoke.test", password: "Test-password-123", name: "آزمایش", gender: "female" } });
    bob = await request("/api/auth/register", { method: "POST", body: { email: "bob@smoke.test", password: "Test-password-123", name: "کاربر دوم", gender: "male" } });
    assert.equal(alice.data.role, "user");
    assert.equal(alice.data.isAdmin, false);
    const ordinary = (await request("/api/auth/me", { cookie: alice.cookie })).data.user;
    assert.equal(ordinary.role, "user");
    assert.equal(ordinary.isAdmin, false);
    await request("/api/admin/users", { cookie: alice.cookie, status: 403 });
    await request(`/api/admin/users/${admin.data.userId}`, { cookie: alice.cookie, status: 403 });
    await request("/api/profile", { method: "PATCH", cookie: alice.cookie, body: { email: "ADMIN@smoke.test" }, status: 403 });
    await request("/api/profile", { method: "PATCH", cookie: alice.cookie, body: { role: "admin", isAdmin: true }, status: 400 });
    assert.equal((await request("/api/auth/me", { cookie: alice.cookie })).data.user.role, "user");
    const login = await request("/api/auth/login", { method: "POST", body: { email: " ALICE@SMOKE.TEST ", password: "Test-password-123" } });
    assert.equal(login.data.user.role, "user");
    await request("/api/admin/users", { cookie: login.cookie, status: 403 });
    await request("/api/auth/setup", { method: "POST", cookie: alice.cookie, body: { email: "admin@smoke.test", password: "Test-password-123" }, status: 403 });
    await request("/api/auth/register", { method: "POST", body: { email: "ALICE@smoke.test", password: "Test-password-123", name: "Duplicate", gender: "male" }, status: 400 });
  } else {
    assert.equal(me.user.id, "default-user");
    assert.equal(me.needsSetup, false);
    await request("/api/accounts");
    for (const route of ["login", "register", "forgot-password", "reset-password"]) {
      const page = await fetch(`${base}/${route}`, { redirect: "manual" });
      assert.equal(page.status, 307);
      assert.equal(new URL(page.headers.get("location"), base).pathname, "/");
      checks++;
    }
    for (const route of ["login", "register", "setup", "logout"]) {
      await request(`/api/auth/${route}`, { method: "POST", body: {}, status: 403 });
    }
    await request("/api/profile", { method: "PATCH", body: { newPassword: "test-password" }, status: 403 });
    alice = bob = {};
  }
  const cookie = alice.cookie;
  const initialAppearance = (await request("/api/settings", { cookie })).data;
  assert.equal(initialAppearance.appearanceMood, "joojo");
  assert.equal(initialAppearance.accentColor, "rose");
  assert.deepEqual(initialAppearance.widgets, ["balance", "monthly", "recent", "life"]);
  await request("/api/settings", { method: "PATCH", cookie, body: { gender: "female" } });
  assert.equal((await request("/api/settings", { cookie })).data.appearanceMood, "joojo", "Profile changes must preserve the chosen theme");
  const account = (await request("/api/accounts", { method: "POST", cookie, body: { name: "بانک آزمایشی", type: "bank", initialBalance: 100000 } })).data;
  const destination = (await request("/api/accounts", { method: "POST", cookie, body: { name: "نقدی", type: "cash" } })).data;
  let other;
  if (authEnabled) {
    other = (await request("/api/accounts", { method: "POST", cookie: bob.cookie, body: { name: "حساب دوم", type: "bank" } })).data;
  } else {
    // Seed a foreign fixture only inside this script's disposable database.
    const { createClient } = await import("@libsql/client");
    const fixtures = createClient({ url: `file:${path.join(dataDir, "hesabdari.db")}` });
    const timestamp = Math.floor(Date.now() / 1000);
    await fixtures.execute({ sql: "INSERT INTO users (id, email, name, created_at) VALUES (?, ?, ?, ?)", args: ["smoke-other", "other@smoke.test", "Other", timestamp] });
    await fixtures.execute({ sql: "INSERT INTO accounts (id, user_id, name, type, color, initial_balance, is_active, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)", args: ["smoke-foreign-account", "smoke-other", "Other", "bank", "#10b981", 0, 1, timestamp] });
    fixtures.close();
    other = { id: "smoke-foreign-account" };
  }
  const categories = (await request("/api/categories", { cookie })).data;
  const expense = categories.find((item) => item.type === "expense");
  const income = categories.find((item) => item.type === "income");
  const body = { accountId: account.id, categoryId: expense.id, type: "expense", amount: 2500, date: "2026-10-19" };
  const tx = (await request("/api/transactions", { method: "POST", cookie, body })).data;
  await request("/api/transactions", { method: "POST", cookie: bob.cookie, body: authEnabled ? body : { ...body, accountId: other.id }, status: 400 });
  await request("/api/transactions", { method: "POST", cookie, body: { ...body, categoryId: income.id }, status: 400 });
  await request("/api/transactions", { method: "POST", cookie, body: { ...body, date: "2026-02-30" }, status: 400 });
  await request("/api/transactions", { method: "POST", cookie, body: { ...body, amount: 1.5 }, status: 400 });
  await request(`/api/transactions/${tx.id}`, { method: "PATCH", cookie, body: { accountId: other.id }, status: 400 });
  await request(`/api/transactions/${tx.id}`, { method: "PATCH", cookie, body: { amount: 3000 } });
  await request("/api/debts", { method: "POST", cookie, body: null, status: 400 });
  await request("/api/transactions", { method: "POST", cookie, raw: "{broken", status: 400 });
  const transfer = (await request("/api/transfers", { method: "POST", cookie, body: { fromAccountId: account.id, toAccountId: destination.id, amount: 5000, date: "2026-10-19" } })).data;
  await request(`/api/transfers/${transfer.id}`, { method: "PATCH", cookie, body: { toAccountId: other.id }, status: 400 });
  await request("/api/transfers", { method: "POST", cookie, body: { fromAccountId: account.id, toAccountId: account.id, amount: 1, date: "2026-10-19" }, status: 400 });
  const balances = (await request("/api/accounts", { cookie })).data;
  assert.equal(balances.find((a) => a.id === account.id).balance, 92000);
  assert.equal(balances.find((a) => a.id === destination.id).balance, 5000);
  const debt = (await request("/api/debts", { method: "POST", cookie, body: { personName: "آزمایشی", type: "owing", totalAmount: 1000, description: null } })).data;
  await request("/api/debts", { method: "POST", cookie, body: { debtId: debt.id, amount: 1200, date: "2026-10-19" }, status: 400 });
  await request("/api/debts", { method: "POST", cookie, body: { debtId: debt.id, amount: 1000, date: "2026-10-19" } });
  for (const route of ["dashboard", "fitness", "growth", "journal", "nutrition", "maintenance", "focus", "todos", "routines", "search?q=test", "budgets", "reports/annual"]) {
    await request(`/api/${route}`, { cookie });
  }
  await request("/api/dashboard", { method: "PATCH", cookie, body: { widgets: ["not-a-widget"] }, status: 400 });
  await request("/api/settings", { method: "PATCH", cookie, body: { currencyUnit: "rial" } });
  // Switching the complete skin survives a fresh GET and retains the separate accent preference.
  await request("/api/settings", { method: "PATCH", cookie, body: { appearanceMood: "joojo", accentColor: "indigo" } });
  const joojoSettings = (await request("/api/settings", { cookie })).data;
  const adminPage = await fetch(base + "/sanjabadmin", { headers: cookie ? { Cookie: cookie } : {}, redirect: "manual" });
  if (!authEnabled) assert.equal(adminPage.status, 200);
  else if (adminPage.status === 307) assert.equal(new URL(adminPage.headers.get("location"), base).pathname, "/");
  else {
    // Next may have started streaming before the nested server layout redirects.
    assert.equal(adminPage.status, 200);
    const html = await adminPage.text();
    assert.ok(html.includes("NEXT_REDIRECT;replace;/;307") || html.includes('content="0;url=/"'), "A regular user must receive the streamed redirect, never the admin page");
  }
  const oldAdminPage = await fetch(base + "/admin", { headers: cookie ? { Cookie: cookie } : {}, redirect: "manual" });
  assert.equal(oldAdminPage.status, 404);
  checks += 2;
  assert.equal(joojoSettings.appearanceMood, "joojo");
  assert.equal(joojoSettings.accentColor, "indigo");
  if (authEnabled) assert.notEqual((await request("/api/settings", { cookie: bob.cookie })).data.accentColor, "indigo");
  await request("/api/settings", { method: "PATCH", cookie, body: { appearanceMood: "neutral" } });
  const restoredSettings = (await request("/api/settings", { cookie })).data;
  assert.equal(restoredSettings.appearanceMood, "neutral");
  assert.equal(restoredSettings.accentColor, "indigo");
  await request(`/api/transactions/${tx.id}`, { method: "DELETE", cookie });

  // Functional depth: every workbench resource is owner-scoped, edits detect stale data.
  for (const resource of ["books", "courses", "workouts", "bodyMetrics", "meals", "waterLogs", "focusSessions", "dailyJournals", "vehicleServices", "sleepLogs", "medications", "trips", "tripExpenses", "habits", "todos", "routines", "transactions", "accounts", "budgets", "debts", "goals", "assets", "cycleEntries"]) await request(`/api/workbench?resource=${resource}`, { cookie });
  await request("/api/workbench?resource=users", { cookie, status: 404 });
  const wb = (await request("/api/workbench?resource=accounts", { cookie })).data.records.find(r => r.id === account.id);
  const patch = { resource: "accounts", id: account.id, version: wb._version, values: { name: "Renamed safely" } };
  await request("/api/workbench", { method: "PATCH", cookie, body: patch });
  await request("/api/workbench", { method: "PATCH", cookie, body: patch, status: 409 });
  if (authEnabled) await request("/api/workbench", { method: "PATCH", cookie: bob.cookie, body: patch, status: 404 });
  const latest = (await request("/api/workbench?resource=accounts", { cookie })).data.records.find(r => r.id === account.id);
  await request("/api/workbench", { method: "PATCH", cookie, body: { ...patch, version: latest._version, values: { userId: "other" } }, status: 400 });
  await request("/api/growth", { method: "POST", cookie, body: { title: "Bad progress", author: "Test", totalPages: 10, currentPage: 11 }, status: 400 });
  const book = (await request("/api/growth", { method: "POST", cookie, body: { title: "Editable book", author: "Test", totalPages: 100 } })).data;
  const br = (await request("/api/workbench?resource=books", { cookie })).data.records.find(r => r.id === book.id);
  await request("/api/workbench", { method: "PATCH", cookie, body: { resource: "books", id: book.id, version: br._version, values: { status: "completed", notes: "Actual takeaway" } } });
  assert.equal((await request("/api/growth", { cookie })).data.books.find(r => r.id === book.id).currentPage, 100);
  const focus = { clientId: "123e4567-e89b-42d3-a456-426614174000", taskName: "One actual outcome", durationMinutes: 10, category: "work", date: "2026-10-21" };
  await request("/api/focus", { method: "POST", cookie, body: focus });
  await request("/api/focus", { method: "POST", cookie, body: focus });
  assert.equal((await request("/api/focus?date=2026-10-21", { cookie })).data.sessionCount, 1);
  await request("/api/focus", { method: "POST", cookie, body: { ...focus, durationMinutes: 11 }, status: 409 });
  await request("/api/sleep", { method: "POST", cookie, body: { date: "2026-10-21", hours: 7.5 } });
  await request("/api/sleep", { method: "POST", cookie, body: { date: "2026-02-30", hours: 7 }, status: 400 });

  // Multi-day cycle tracking, legacy preservation, archive/restore and private daily logs.
  await request("/api/cycle",{method:"POST",cookie,body:{kind:"period_start",date:"2026-07-01",notes:"Preserve legacy history"}});
  await request("/api/cycle",{method:"POST",cookie,body:{kind:"period_end",date:"2026-07-05"}});
  let cycle=(await request("/api/cycle?today=2026-10-21",{cookie})).data;
  const legacyPeriod=cycle.periods.find(p=>p.startDate==="2026-07-01");assert.ok(legacyPeriod.id.startsWith("legacy:"));assert.equal(legacyPeriod.endDate,"2026-07-05");
  await request("/api/cycle/periods",{method:"POST",cookie,body:{startDate:"2026-08-01",endDate:"2026-08-05",notes:"Full range"}});
  await request("/api/cycle/periods",{method:"POST",cookie,status:400,body:{startDate:"2026-09-05",endDate:"2026-09-01"}});
  await request("/api/cycle/periods",{method:"POST",cookie,status:409,body:{startDate:"2026-08-03",endDate:"2026-08-06"}});
  cycle=(await request("/api/cycle?today=2026-10-21",{cookie})).data;
  const period=cycle.periods.find(p=>p.startDate==="2026-08-01");
  await request("/api/cycle/periods",{method:"PATCH",cookie,body:{id:period.id,archived:true}});
  assert.equal((await request("/api/cycle",{cookie})).data.archivedPeriods.length,1);
  await request("/api/cycle/periods",{method:"PATCH",cookie,body:{id:period.id,archived:false}});
  await request("/api/cycle/periods",{method:"POST",cookie,body:{id:legacyPeriod.id,startDate:"2026-07-02",endDate:"2026-07-06",notes:"Legacy edited without deleting markers"}});
  cycle=(await request("/api/cycle",{cookie})).data;assert.equal(cycle.periods.length,2);assert.ok(cycle.entries.some(e=>e.date==="2026-07-01"));
  const daily={action:"daily",date:"2026-10-20",flow:"medium",pain:3,mood:"tired",symptoms:["cramps","fatigue"],notes:"Daily note"};
  await request("/api/cycle",{method:"POST",cookie,body:daily});
  await request("/api/cycle",{method:"POST",cookie,body:{...daily,notes:"Updated note"}});
  cycle=(await request("/api/cycle",{cookie})).data;assert.equal(cycle.daily.length,1);assert.equal(cycle.daily[0].notes,"Updated note");
  if(authEnabled){await request("/api/cycle/periods",{method:"PATCH",cookie:bob.cookie,status:404,body:{id:period.id,archived:true}});assert.equal((await request("/api/cycle",{cookie:bob.cookie})).data.daily.length,0);}
  // Personal care: real goals, weekday plans, immutable history and repeat-safe migration.
  await request("/api/selfcare",{method:"POST",cookie,body:{action:"seed",packId:"morning"}});
  await request("/api/selfcare",{method:"POST",cookie,body:{action:"seed",packId:"morning"}});
  assert.equal((await request("/api/selfcare?date=2026-10-21",{cookie})).data.items.length,3);
  const care={title:"Read for myself",description:"After dinner",category:"mind",timeOfDay:"evening",weekdays:[0,1,2,3,4,5,6],targetValue:10,unit:"pages"};
  await request("/api/selfcare",{method:"POST",cookie,body:care});
  let careData=(await request("/api/selfcare?date=2026-10-21",{cookie})).data;
  const careItem=careData.items.find(item=>item.title===care.title);
  await request("/api/selfcare",{method:"POST",cookie,body:{action:"log",itemId:careItem.id,date:"2026-10-20",value:4,notes:"Started"}});
  await request("/api/selfcare",{method:"POST",cookie,body:{action:"log",itemId:careItem.id,date:"2026-10-20",value:10,notes:"Done"}});
  await request("/api/selfcare",{method:"POST",cookie,body:{...care,id:careItem.id,targetValue:15}});
  await request("/api/selfcare",{method:"POST",cookie,body:{action:"log",itemId:careItem.id,date:"2026-10-21",value:10}});
  careData=(await request("/api/selfcare?date=2026-10-21",{cookie})).data;
  assert.equal(careData.logs.find(log=>log.date==="2026-10-20"&&log.itemId===careItem.id).targetValue,10);
  assert.equal(careData.logs.find(log=>log.date==="2026-10-21"&&log.itemId===careItem.id).targetValue,15);
  assert.equal(careData.week.at(-2).completed,1);assert.equal(careData.week.at(-1).completed,0);
  await request("/api/selfcare",{method:"PATCH",cookie,body:{id:careItem.id,archived:true}});
  await request("/api/selfcare",{method:"POST",cookie,status:409,body:{action:"log",itemId:careItem.id,date:"2026-10-21",value:15}});
  await request("/api/selfcare",{method:"PATCH",cookie,body:{id:careItem.id,archived:false}});
  const oldCare={action:"import",days:[{date:"2026-10-19",ids:["journal","sleep"]}]};
  await request("/api/selfcare",{method:"POST",cookie,body:oldCare});await request("/api/selfcare",{method:"POST",cookie,body:oldCare});
  assert.equal((await request("/api/selfcare?date=2026-10-21",{cookie})).data.logs.filter(log=>log.date==="2026-10-19").length,2);
  await request("/api/selfcare",{method:"POST",cookie,status:400,body:{...care,weekdays:[]}});
  if(authEnabled){await request("/api/selfcare",{method:"POST",cookie:bob.cookie,status:404,body:{action:"log",itemId:careItem.id,date:"2026-10-21",value:15}});assert.equal((await request("/api/selfcare",{cookie:bob.cookie})).data.items.length,0);}
  await request("/api/auth/logout", { method: "POST", cookie, status: authEnabled ? 200 : 403 });
  console.log(`PASS: ${checks} HTTP checks, balances, ownership, validation, debt settlement, and all main modules.`);
} catch (error) {
  console.error(logs.slice(-4000));
  throw error;
} finally {
  server.kill();
  await new Promise((resolve) => { if (server.exitCode !== null) resolve(); else server.once("exit", resolve); });
  rmSync(dataDir, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
}
