import assert from "node:assert/strict";
import { test, after } from "node:test";
import { mkdtempSync, rmSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { dateInput, moneyInput } from "../src/lib/validation";
import { parseRawNumber, parseAmountInput, isCurrencyUnit } from "../src/lib/currency";
import { toISODate } from "../src/lib/format";
import { signSession, verifySession } from "../src/lib/auth";
import { getSessionSecret } from "../src/lib/session-secret";
import { eq } from "drizzle-orm";

const dir = mkdtempSync(path.join(tmpdir(), "hesabdari-test-"));
process.env.HESABDARI_DATA_DIR = dir;
delete process.env.TURSO_DATABASE_URL;
delete process.env.SESSION_SECRET;
const queriesPromise = import("../src/lib/db/queries");
after(() => {
  globalThis.__hesabdari_client__?.close();
  // Windows can keep the libsql file locked briefly after close; the OS temp cleanup handles leftovers.
  try {
    rmSync(dir, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
  } catch {
    // ignored
  }
});

test("money parsing accepts Persian and Arabic digits and rejects unsafe or partial values", () => {
  assert.equal(parseRawNumber("١٬۲۳۴"), 1234);
  assert.equal(parseRawNumber("۱۲۳abc"), 0);
  assert.equal(parseRawNumber("9007199254740992"), 0);
  assert.equal(parseAmountInput("۱۰۰٬۰۰۰", "rial"), 10000);
  assert.equal(isCurrencyUnit("toString"), false);
  for (const amount of [-1, 0, 1.2, Infinity, Number.MAX_SAFE_INTEGER + 1]) assert.equal(moneyInput.safeParse(amount).success, false);
});

test("calendar validation rejects impossible dates and preserves local day", () => {
  assert.equal(dateInput.safeParse("2026-02-30").success, false);
  assert.equal(dateInput.safeParse("not-a-date").success, false);
  assert.equal(dateInput.safeParse("2024-02-29").success, true);
  assert.equal(toISODate(new Date(2026, 9, 19, 0, 15)), "2026-10-19");
});

test("session key persists and malformed or modified cookies fail closed", async () => {
  const secret = getSessionSecret();
  assert.ok(secret.length >= 32);
  assert.equal(secret, readFileSync(path.join(dir, ".session-secret"), "utf8"));
  const token = await signSession("test-user");
  assert.equal(await verifySession(token), "test-user");
  for (const invalid of ["", "x", "a.%", "a.a", "..", "x".repeat(5000), token + "tampered"]) {
    assert.equal(await verifySession(invalid), null);
  }
});

test("financial references reject another user's account and mismatched categories", async () => {
  const { ensureDb, db, createUserWithDefaults, accounts, categories, recurringTransactions, transactions, processDueRecurring, getAccountBalance } = await queriesPromise;
  const { validateFinancialReferences } = await import("../src/lib/financial-validation");
  await ensureDb();
  const alice = await createUserWithDefaults("alice@test.local", "test-hash", "Alice");
  const bob = await createUserWithDefaults("bob@test.local", "test-hash", "Bob");
  await db.insert(accounts).values({ id: "alice-account", userId: alice, name: "Test", type: "bank", initialBalance: 1000 }).run();
  const category = (await db.select().from(categories).where(eq(categories.userId, alice)).all()).find((c) => c.type === "expense")!;
  assert.equal(await validateFinancialReferences(alice, { accountId: "alice-account", categoryId: category.id, type: "expense" }), null);
  assert.equal((await validateFinancialReferences(bob, { accountId: "alice-account" }))?.status, 400);
  assert.equal((await validateFinancialReferences(bob, { categoryId: category.id }))?.status, 400);
  assert.equal((await validateFinancialReferences(alice, { categoryId: category.id, type: "income" }))?.status, 400);
  assert.equal((await validateFinancialReferences(alice, { accountId: "" }))?.status, 400);
  await db.insert(recurringTransactions).values({ id: "recurring-test", userId: alice, accountId: "alice-account", type: "expense", amount: 100, frequency: "daily", nextRunDate: new Date() }).run();
  await processDueRecurring(alice);
  await processDueRecurring(alice);
  assert.equal((await db.select().from(transactions).where(eq(transactions.userId, alice)).all()).length, 1);
  assert.equal(await getAccountBalance("alice-account"), 900);
});
