import { readJsonObject } from "@/lib/validation";
import { NextResponse } from "next/server";
import { z } from "zod";
import { ensureDb, db, todos, getTodos } from "@/lib/db/queries";
import { requireUserId } from "@/lib/api-auth";
import { nanoid } from "@/lib/db/nanoid";

const createSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional().nullable(),
  area: z.enum(["work", "personal", "health", "home", "other"]).optional(),
  priority: z.enum(["low", "medium", "high"]).optional(),
  dueDate: z.string().optional().nullable(),
  checklist: z
    .array(z.object({ id: z.string(), title: z.string().min(1), done: z.boolean() }))
    .optional()
    .nullable(),
});

export async function GET(request: Request) {
  await ensureDb();
  const auth = await requireUserId();
  if (auth instanceof NextResponse) return auth;

  const { searchParams } = new URL(request.url);
  const filter = (searchParams.get("filter") ?? "all") as
    | "all"
    | "active"
    | "done"
    | "today"
    | "overdue";

  return NextResponse.json(await getTodos(auth, filter));
}

export async function POST(request: Request) {
  await ensureDb();
  const auth = await requireUserId();
  if (auth instanceof NextResponse) return auth;

  const body = await readJsonObject(request);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "داده نامعتبر" }, { status: 400 });
  }

  const id = nanoid();
  await db.insert(todos)
    .values({
      id,
      userId: auth,
      title: parsed.data.title,
      description: parsed.data.description ?? null,
      area: parsed.data.area ?? "personal",
      priority: parsed.data.priority ?? "medium",
      dueDate: parsed.data.dueDate ? new Date(parsed.data.dueDate) : null,
      checklist: parsed.data.checklist
        ? JSON.stringify(parsed.data.checklist)
        : null,
    })
    .run();

  return NextResponse.json({ id });
}
