import { NextResponse } from "next/server";
import { count, eq, inArray, asc } from "drizzle-orm";
import { db, getUserById, users } from "@/lib/db/queries";
import * as schema from "@/lib/db/schema";
import { requireUserId } from "@/lib/api-auth";
import { isAdminEmail } from "@/lib/admin";

type UserScopedTable = typeof schema.accounts;

/** Every table whose rows belong to one user. Secret columns are never exported. */
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
];

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
  const countByUser = new Map(transactionCounts.map((row) => [row.userId, Number(row.total)]));

  return rows.map((row) => ({ ...row, transactionCount: countByUser.get(row.id) ?? 0 }));
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

  const tables: Record<string, unknown[]> = {};
  for (const [label, table] of USER_SCOPED_TABLES) {
    const scoped = table as UserScopedTable;
    tables[label] = await db.select().from(scoped).where(eq(scoped.userId, userId));
  }

  // Child rows reference their parent instead of the user.
  tables.debtPayments = await db
    .select()
    .from(schema.debtPayments)
    .where(
      inArray(
        schema.debtPayments.debtId,
        db.select({ id: schema.debts.id }).from(schema.debts).where(eq(schema.debts.userId, userId))
      )
    );
  tables.goalContributions = await db
    .select()
    .from(schema.goalContributions)
    .where(
      inArray(
        schema.goalContributions.goalId,
        db.select({ id: schema.goals.id }).from(schema.goals).where(eq(schema.goals.userId, userId))
      )
    );

  // Receipt images are summarized, not dumped.
  tables.receiptFiles = await db
    .select({
      id: schema.receiptFiles.id,
      mimeType: schema.receiptFiles.mimeType,
      createdAt: schema.receiptFiles.createdAt,
    })
    .from(schema.receiptFiles)
    .where(eq(schema.receiptFiles.userId, userId));

  return { user, tables };
}
