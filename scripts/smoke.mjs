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
  env: { ...process.env, PORT: String(port), HOSTNAME: "127.0.0.1", HESABDARI_ROOT: serverDir || process.cwd(), HESABDARI_DATA_DIR: dataDir, SESSION_SECRET: "isolated-smoke-test-secret-do-not-use-in-production", NEXT_TELEMETRY_DISABLED: "1" },
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
  const me = (await request("/api/auth/me")).data;
  const authEnabled = !me.user;
  let alice, bob;
  if (authEnabled) {
    await request("/api/accounts", { status: 401 });
    alice = await request("/api/auth/register", { method: "POST", body: { email: "alice@smoke.test", password: "Test-password-123", name: "آزمایش", gender: "female" } });
    bob = await request("/api/auth/register", { method: "POST", body: { email: "bob@smoke.test", password: "Test-password-123", name: "کاربر دوم", gender: "male" } });
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
  await request(`/api/transactions/${tx.id}`, { method: "DELETE", cookie });
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
