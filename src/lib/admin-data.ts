import { NextResponse } from "next/server";
import { count, eq, inArray, asc, or } from "drizzle-orm";
import { db, getUserById, users } from "@/lib/db/queries";
import * as schema from "@/lib/db/schema";
import { requireUserId } from "@/lib/api-auth";
import { isAdminEmail } from "@/lib/admin";
import { ADMIN_TABLE_META } from "@/lib/admin-catalog";

type UserScopedTable = typeof schema.accounts;

/** Direct userId-scoped tables (secrets stripped after fetch where needed). */
const USER_SCOPED_TABLES: Array<[string, unknown]> = [
  ["accounts", schema.accounts],
  ["categories", schema.categories],
  ["transactions", schema.transactions],
  ["transfers", schema.transfers],
  ["budgets", schema.budgets],
  ["debts", schema.debts],
  ["goals", schema.goals],
  ["categoryRules", schema.categoryRules],
  ["userSettings", schema.userSettings],
  ["recurringTransactions", schema.recurringTransactions],
  ["assets", schema.assets],
  ["assetPriceHistory", schema.assetPriceHistory],
  ["pendingBankImports", schema.pendingBankImports],
  ["todos", schema.todos],
  ["routines", schema.routines],
  ["routineCompletions", schema.routineCompletions],
  ["meals", schema.meals],
  ["waterLogs", schema.waterLogs],
  ["workouts", schema.workouts],
  ["bodyMetrics", schema.bodyMetrics],
  ["books", schema.books],
  ["courses", schema.courses],
  ["focusSessions", schema.focusSessions],
  ["dailyJournals", schema.dailyJournals],
  ["vehicleServices", schema.vehicleServices],
  ["cycleSettings", schema.cycleSettings],
  ["cycleEntries", schema.cycleEntries],
  ["periodRecords", schema.periodRecords],
  ["cycleDailyLogs", schema.cycleDailyLogs],
  ["selfCareItems", schema.selfCareItems],
  ["selfCareLogs", schema.selfCareLogs],
  ["weeklyInsights", schema.weeklyInsights],
  ["sleepLogs", schema.sleepLogs],
  ["medications", schema.medications],
  ["medicationLogs", schema.medicationLogs],
  ["trips", schema.trips],
  ["tripExpenses", schema.tripExpenses],
  ["habits", schema.habits],
  ["habitCompletions", schema.habitCompletions],
];

function sanitizeRows(label: string, rows: Record<string, unknown>[]): Record<string, unknown>[] {
  if (label === "userSettings") {
    return rows.map((row) => {
      const { smsIngestToken, ...rest } = row;
      return {
        ...rest,
        smsIngestToken: smsIngestToken ? "[hidden]" : null,
      };
    });
  }
  return rows;
}

/** Returns a 401/403 response unless the signed-in user is the administrator. */
export async function requireAdmin(): Promise<NextResponse | string> {
  const auth = await requireUserId();
  if (auth instanceof NextResponse) return auth;
  const user = await getUserById(auth);
  if (!isAdminEmail(user?.email)) {
    return NextResponse.json({ error: "دسترسی فقط برای مدیر" }, { status: 403 });
  }
  return auth;
}

export async function listUsersForAdmin() {
  const rows = await db
    .select({
      id: users.id,
      email: users.email,
      name: users.name,
      createdAt: users.createdAt,
    })
    .from(users)
    .orderBy(asc(users.createdAt));

  const transactionCounts = await db
    .select({ userId: schema.transactions.userId, total: count() })
    .from(schema.transactions)
    .groupBy(schema.transactions.userId);
  const countByUser = new Map(
    transactionCounts.map((row) => [row.userId, Number(row.total)])
  );

  return rows.map((row) => ({
    ...row,
    transactionCount: countByUser.get(row.id) ?? 0,
  }));
}

export async function getUserDataForAdmin(userId: string) {
  const user = await db
    .select({
      id: users.id,
      email: users.email,
      name: users.name,
      createdAt: users.createdAt,
    })
    .from(users)
    .where(eq(users.id, userId))
    .get();
  if (!user) return null;

  const tables: Record<string, Record<string, unknown>[]> = {};

  for (const [label, table] of USER_SCOPED_TABLES) {
    const scoped = table as UserScopedTable;
    const rows = (await db
      .select()
      .from(scoped)
      .where(eq(scoped.userId, userId))) as Record<string, unknown>[];
    tables[label] = sanitizeRows(label, rows);
  }

  // Child rows via parent ids
  const debtIds = tables.debts.map((d) => String(d.id));
  tables.debtPayments =
    debtIds.length === 0
      ? []
      : ((await db
          .select()
          .from(schema.debtPayments)
          .where(inArray(schema.debtPayments.debtId, debtIds))) as Record<
          string,
          unknown
        >[]);

  const goalIds = tables.goals.map((g) => String(g.id));
  tables.goalContributions =
    goalIds.length === 0
      ? []
      : ((await db
          .select()
          .from(schema.goalContributions)
          .where(inArray(schema.goalContributions.goalId, goalIds))) as Record<
          string,
          unknown
        >[]);

  tables.receiptFiles = (await db
    .select({
      id: schema.receiptFiles.id,
      mimeType: schema.receiptFiles.mimeType,
      createdAt: schema.receiptFiles.createdAt,
    })
    .from(schema.receiptFiles)
    .where(eq(schema.receiptFiles.userId, userId))) as Record<string, unknown>[];

  // Groups: owned + memberships
  const ownedGroups = (await db
    .select()
    .from(schema.groups)
    .where(eq(schema.groups.ownerId, userId))) as Record<string, unknown>[];
  tables.groups = ownedGroups;

  const memberships = (await db
    .select()
    .from(schema.groupMembers)
    .where(eq(schema.groupMembers.userId, userId))) as Record<string, unknown>[];
  tables.groupMemberships = memberships;

  const memberGroupIds = [
    ...new Set([
      ...ownedGroups.map((g) => String(g.id)),
      ...memberships.map((m) => String(m.groupId)),
    ]),
  ];

  if (memberGroupIds.length === 0) {
    tables.groupMoodShares = [];
    tables.groupShoppingItems = [];
    tables.groupTasks = [];
    tables.groupExpenses = [];
    tables.groupPettyCash = [];
    tables.groupPettyCashItems = [];
  } else {
    tables.groupMoodShares = (await db
      .select()
      .from(schema.groupMoodShares)
      .where(
        or(
          eq(schema.groupMoodShares.userId, userId),
          inArray(schema.groupMoodShares.groupId, memberGroupIds)
        )
      )) as Record<string, unknown>[];

    tables.groupShoppingItems = (await db
      .select()
      .from(schema.groupShoppingItems)
      .where(inArray(schema.groupShoppingItems.groupId, memberGroupIds))) as Record<
      string,
      unknown
    >[];

    tables.groupTasks = (await db
      .select()
      .from(schema.groupTasks)
      .where(inArray(schema.groupTasks.groupId, memberGroupIds))) as Record<
      string,
      unknown
    >[];

    tables.groupExpenses = (await db
      .select()
      .from(schema.groupExpenses)
      .where(inArray(schema.groupExpenses.groupId, memberGroupIds))) as Record<
      string,
      unknown
    >[];

    tables.groupPettyCash = (await db
      .select()
      .from(schema.groupPettyCash)
      .where(inArray(schema.groupPettyCash.groupId, memberGroupIds))) as Record<
      string,
      unknown
    >[];

    const pettyIds = tables.groupPettyCash.map((p) => String(p.id));
    tables.groupPettyCashItems =
      pettyIds.length === 0
        ? []
        : ((await db
            .select()
            .from(schema.groupPettyCashItems)
            .where(
              inArray(schema.groupPettyCashItems.pettyCashId, pettyIds)
            )) as Record<string, unknown>[]);
  }

  const counts: Record<string, number> = {};
  let totalRecords = 0;
  for (const meta of ADMIN_TABLE_META) {
    const n = tables[meta.key]?.length ?? 0;
    counts[meta.key] = n;
    totalRecords += n;
  }

  const sectionCounts: Record<string, number> = {};
  for (const meta of ADMIN_TABLE_META) {
    sectionCounts[meta.section] =
      (sectionCounts[meta.section] ?? 0) + (counts[meta.key] ?? 0);
  }

  return {
    user,
    tables,
    counts,
    sectionCounts,
    totalRecords,
  };
}
