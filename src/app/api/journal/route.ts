import { readJsonObject } from "@/lib/validation";
import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { dailyJournals, todos } from "@/lib/db/schema";
import { requireUserId } from "@/lib/api-auth";
import { nanoid } from "@/lib/db/nanoid";
import { eq, and, desc } from "drizzle-orm";
import { extractTasksFromJournal } from "@/lib/ai/gemini";
import { getUserSettings } from "@/lib/db/queries";

const journalSchema = z.object({
  date: z.string(),
  mood: z.enum(["great", "good", "neutral", "tired", "bad"]).default("good"),
  gratitude: z.string().optional().nullable(),
  highlights: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export async function GET(request: Request) {
  const auth = await requireUserId();
  if (auth instanceof NextResponse) return auth;

  const { searchParams } = new URL(request.url);
  const date = searchParams.get("date");

  if (date) {
    const entry = await db
      .select()
      .from(dailyJournals)
      .where(and(eq(dailyJournals.userId, auth), eq(dailyJournals.date, date)))
      .get();
    return NextResponse.json({ entry });
  }

  const allEntries = await db
    .select()
    .from(dailyJournals)
    .where(eq(dailyJournals.userId, auth))
    .orderBy(desc(dailyJournals.date))
    .limit(30)
    .all();

  return NextResponse.json({ entries: allEntries });
}

export async function POST(request: Request) {
  const auth = await requireUserId();
  if (auth instanceof NextResponse) return auth;

  const body = await readJsonObject(request);

  if (body.action === "extract-tasks") {
    const text = String(body.text ?? "");
    if (text.trim().length < 4) {
      return NextResponse.json({ error: "empty" }, { status: 400 });
    }
    const settings = await getUserSettings(auth);
    const locale = settings.locale === "en" ? "en" : "fa";
    const tasks = await extractTasksFromJournal(text, locale);
    const created: string[] = [];
    if (body.create === true) {
      for (const title of tasks) {
        const id = nanoid();
        await db
          .insert(todos)
          .values({
            id,
            userId: auth,
            title,
            area: "personal",
            priority: "medium",
            status: "active",
          })
          .run();
        created.push(id);
      }
    }
    return NextResponse.json({ tasks, created });
  }

  const parsed = journalSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "داده‌های ژورنال نامعتبر است" }, { status: 400 });
  }

  // Check if journal for this date already exists
  const existing = await db
    .select()
    .from(dailyJournals)
    .where(and(eq(dailyJournals.userId, auth), eq(dailyJournals.date, parsed.data.date)))
    .get();

  if (existing) {
    await db.update(dailyJournals)
      .set({
        mood: parsed.data.mood,
        gratitude: parsed.data.gratitude ?? null,
        highlights: parsed.data.highlights ?? null,
        notes: parsed.data.notes ?? null,
      })
      .where(eq(dailyJournals.id, existing.id))
      .run();
    return NextResponse.json({ success: true, id: existing.id });
  }

  const id = nanoid();
  await db.insert(dailyJournals)
    .values({
      id,
      userId: auth,
      date: parsed.data.date,
      mood: parsed.data.mood,
      gratitude: parsed.data.gratitude ?? null,
      highlights: parsed.data.highlights ?? null,
      notes: parsed.data.notes ?? null,
    })
    .run();

  return NextResponse.json({ success: true, id });
}
