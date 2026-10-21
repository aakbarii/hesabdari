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


test("workbench rejects protected fields and inconsistent learning progress", async () => {
  const { validateRecordPatch } = await import("../src/lib/workbench");
  assert.throws(() => validateRecordPatch("debts", { paidAmount: 0 }, {}));
  assert.throws(() => validateRecordPatch("books", { userId: "other" }, {}));
  assert.throws(() => validateRecordPatch("books", { currentPage: 101 }, { totalPages: 100 }));
  assert.throws(() => validateRecordPatch("courses", { totalLessons: 1 }, { completedLessons: 2 }));
  assert.throws(() => validateRecordPatch("trips", { endDate: "2026-10-01" }, { startDate: "2026-10-02" }));
  assert.throws(() => validateRecordPatch("sleepLogs", { date: "2026-02-30" }, {}));
  assert.throws(() => validateRecordPatch("medications", { reminderHour: 24 }, {}));
  assert.deepEqual(validateRecordPatch("books", { status: "completed" }, { totalPages: 300, currentPage: 10 }), { status: "completed", currentPage: 300 });
  assert.equal(validateRecordPatch("books", { currentPage: 50 }, { totalPages: 100, status: "completed" }).status, "reading");
  assert.equal(validateRecordPatch("sleepLogs", { hours: 7.5 }, {}).hours, 7.5);
});
test("exports neutralize spreadsheet formulas and timer handles suspended tabs", async () => {
  const { csvCell } = await import("../src/lib/workbench");
  const { remainingSeconds, timerSchema } = await import("../src/lib/focus-timer");
  assert.equal(csvCell('=1+1'), '\"\'=1+1\"');
  assert.equal(csvCell('a,\"b\"'), '\"a,\"\"b\"\"\"');
  assert.equal(remainingSeconds(2000, 500), 2);
  assert.equal(remainingSeconds(2000, 3000), 0);
  assert.equal(timerSchema.safeParse({ mode: "work", duration: -1, remaining: 100, deadline: null, payload: null, pending: false }).success, false);
});


test("cycle history pairs actual starts and ends and keeps estimates statistical", async () => {
  const {legacyPeriods,cycleSummary,daysBetween,addDays,periodSchema} = await import("../src/lib/cycle-tracking");
  assert.equal(addDays("2024-02-28",1),"2024-02-29");
  assert.equal(daysBetween("2026-03-20","2026-03-22"),2);
  assert.equal(periodSchema.safeParse({startDate:"2026-02-30",endDate:null}).success,false);
  assert.equal(periodSchema.safeParse({startDate:"2026-10-10",endDate:"2026-10-09"}).success,false);
  const legacy=[{id:"a",date:"2026-07-01",kind:"period_start",notes:"old"},{id:"b",date:"2026-07-05",kind:"period_end",notes:null},{id:"c",date:"2026-07-29",kind:"period_start",notes:null},{id:"d",date:"2026-08-02",kind:"period_end",notes:null}];
  const history=legacyPeriods(legacy,new Set());
  assert.equal(history[0].endDate,"2026-07-05");
  assert.equal(legacyPeriods(legacy,new Set(["a"])).length,1);
  const summary=cycleSummary([...history,{id:"e",startDate:"2026-08-30",endDate:"2026-09-04",notes:null}],"2026-09-03",28);
  assert.equal(summary.average,30);assert.equal(summary.cycleDay,5);assert.equal(summary.nextEstimate,"2026-09-29");assert.equal(summary.ongoing?.id,"e");
  assert.equal(cycleSummary([{id:"f",startDate:"2026-01-01",endDate:"2026-01-05",notes:null}],"2026-10-21",28).ongoing,null);
});
test("personal care validates schedules and counts historical goals by their snapshots", async () => {
  const {careItemSchema,careLogSchema,scheduledOn,careWeek} = await import("../src/lib/selfcare");
  const item={title:"مطالعه",category:"mind",timeOfDay:"evening",weekdays:[6],targetValue:10,unit:"صفحه"};
  assert.equal(careItemSchema.safeParse(item).success,true);
  assert.equal(careItemSchema.safeParse({...item,weekdays:[]}).success,false);
  assert.equal(careItemSchema.safeParse({...item,targetValue:0}).success,false);
  assert.equal(careLogSchema.safeParse({itemId:"i",date:"2026-02-30",value:1}).success,false);
  assert.equal(scheduledOn("[6]","2026-10-24"),true);
  assert.equal(scheduledOn("[6]","2026-10-25"),false);
  const week=careWeek([{date:"2026-10-20",value:10,targetValue:10},{date:"2026-10-21",value:10,targetValue:15}],"2026-10-21");
  assert.equal(week[5].completed,1);assert.equal(week[6].completed,0);assert.equal(week.length,7);
});
