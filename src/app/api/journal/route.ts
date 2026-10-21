import { dateInput } from "@/lib/validation";
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
  date: dateInput,
  mood: z.enum(["great", "good", "neutral", "tired", "bad"]).default("good"),
  gratitude: z.string().optional().nullable(),
  highlights: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

const MOOD_SCORE: Record<string, number> = {
  great: 5,
  good: 4,
  neutral: 3,
  tired: 2,
  bad: 1,
};

export async function GET(request: Request) {
  const auth = await requireUserId();
  if (auth instanceof NextResponse) return auth;

  const { searchParams } = new URL(request.url);
  const date = searchParams.get("date");
  const q = (searchParams.get("q") || "").trim().toLowerCase();

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
    .limit(90)
    .all();

  const filtered = q
    ? allEntries.filter((e) => {
        const blob = [e.gratitude, e.highlights, e.notes, e.mood]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return blob.includes(q);
      })
    : allEntries;

  const byDate = new Map(allEntries.map((e) => [e.date, e]));
  const buildTrend = (n: number) => {
    const points: { date: string; label: string; value: number; mood: string | null }[] = [];
    const d = new Date();
    d.setHours(12, 0, 0, 0);
    for (let i = n - 1; i >= 0; i--) {
      const x = new Date(d);
      x.setDate(d.getDate() - i);
      const key = x.toISOString().slice(0, 10);
      const e = byDate.get(key);
      points.push({
        date: key,
        label: key.slice(5),
        value: e ? MOOD_SCORE[e.mood] ?? 3 : 0,
        mood: e?.mood ?? null,
      });
    }
    return points;
  };

  const mood7 = buildTrend(7);
  const mood30 = buildTrend(30);
  const scored7 = mood7.filter((p) => p.mood);
  const avg7 =
    scored7.length === 0
      ? 0
      : Math.round(
          (scored7.reduce((s, p) => s + p.value, 0) / scored7.length) * 10
        ) / 10;
  const todayKey = new Date().toISOString().slice(0, 10);
  const todayEntry = byDate.get(todayKey);

  return NextResponse.json({
    entries: filtered.slice(0, 30),
    stats: {
      mood7,
      mood30,
      avgMood7: avg7,
      loggedToday: !!todayEntry,
      nextAction: todayEntry ? "review_or_extract" : "write_today",
    },
  });
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
