import { readJsonObject } from "@/lib/validation";
import { NextResponse } from "next/server";
import { z } from "zod";
import {
  ensureDb,
  db,
  routines,
  getRoutines,
  getLifeSummary,
  toggleRoutineCompletion,
} from "@/lib/db/queries";
import { requireUserId } from "@/lib/api-auth";
import { nanoid } from "@/lib/db/nanoid";

const createSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional().nullable(),
  frequency: z.enum(["daily", "weekly", "monthly"]).optional(),
  weeklyDays: z.array(z.number().min(0).max(6)).optional(),
  timeOfDay: z.string().optional().nullable(),
  color: z.string().optional(),
});

const completeSchema = z.object({
  routineId: z.string(),
  date: z.string().optional(),
});

export async function GET(request: Request) {
  await ensureDb();
  const auth = await requireUserId();
  if (auth instanceof NextResponse) return auth;

  const { searchParams } = new URL(request.url);
  if (searchParams.get("summary") === "1") {
    return NextResponse.json(await getLifeSummary(auth));
  }

  return NextResponse.json(await getRoutines(auth));
}

export async function POST(request: Request) {
  await ensureDb();
  const auth = await requireUserId();
  if (auth instanceof NextResponse) return auth;

  const body = await readJsonObject(request);

  if (body.routineId) {
    const parsed = completeSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "داده نامعتبر" }, { status: 400 });
    }
    const result = await toggleRoutineCompletion(
      auth,
      parsed.data.routineId,
      parsed.data.date
    );
    if (!result) {
      return NextResponse.json({ error: "عادت یافت نشد" }, { status: 404 });
    }
    return NextResponse.json(result);
  }

  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "داده نامعتبر" }, { status: 400 });
  }

  const id = nanoid();
  await db.insert(routines)
    .values({
      id,
      userId: auth,
      name: parsed.data.name,
      description: parsed.data.description ?? null,
      frequency: parsed.data.frequency ?? "daily",
      weeklyDays: parsed.data.weeklyDays
        ? JSON.stringify(parsed.data.weeklyDays)
        : null,
      timeOfDay: parsed.data.timeOfDay ?? null,
      color: parsed.data.color ?? "#8b5cf6",
    })
    .run();

  return NextResponse.json({ id });
}
