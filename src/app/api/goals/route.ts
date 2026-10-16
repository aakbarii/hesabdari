import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import {
  ensureDb,
  db,
  goals,
  goalContributions,
  getGoals,
} from "@/lib/db/queries";
import { requireUserId } from "@/lib/api-auth";
import { nanoid } from "@/lib/db/nanoid";

const goalSchema = z.object({
  type: z.enum(["savings", "purchase"]),
  name: z.string().min(1),
  targetAmount: z.number().positive(),
  accountId: z.string().optional().nullable(),
  deadline: z.string().optional().nullable(),
  color: z.string().optional(),
  priority: z.number().optional(),
});

const contributeSchema = z.object({
  goalId: z.string(),
  amount: z.number().positive(),
  date: z.string(),
  note: z.string().optional(),
});

export async function GET(request: Request) {
  ensureDb();
  const auth = await requireUserId();
  if (auth instanceof NextResponse) return auth;
  const userId = auth;

  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type") as "savings" | "purchase" | null;
  const list = getGoals(
    userId,
    type === "savings" || type === "purchase" ? type : undefined
  );
  return NextResponse.json(list);
}

export async function POST(request: Request) {
  ensureDb();
  const auth = await requireUserId();
  if (auth instanceof NextResponse) return auth;
  const userId = auth;

  const body = await request.json();

  if (body.goalId) {
    const parsed = contributeSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "داده نامعتبر" }, { status: 400 });
    }
    const { goalId, amount, date, note } = parsed.data;
    const goal = db.select().from(goals).where(eq(goals.id, goalId)).get();
    if (!goal || goal.userId !== userId) {
      return NextResponse.json({ error: "هدف یافت نشد" }, { status: 404 });
    }

    const id = nanoid();
    db.insert(goalContributions)
      .values({ id, goalId, amount, date: new Date(date), note })
      .run();

    const newAmount = goal.currentAmount + amount;
    const status = newAmount >= goal.targetAmount ? "completed" : "active";
    db.update(goals)
      .set({ currentAmount: newAmount, status })
      .where(eq(goals.id, goalId))
      .run();

    return NextResponse.json({ id });
  }

  const parsed = goalSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "داده نامعتبر" }, { status: 400 });
  }

  const id = nanoid();
  const { type, name, targetAmount, accountId, deadline, color, priority } =
    parsed.data;

  db.insert(goals)
    .values({
      id,
      userId,
      type,
      name,
      targetAmount,
      accountId: accountId ?? null,
      deadline: deadline ? new Date(deadline) : null,
      color: color ?? (type === "savings" ? "#10b981" : "#3b82f6"),
      priority: priority ?? 0,
    })
    .run();

  return NextResponse.json({ id });
}
