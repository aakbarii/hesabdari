import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { requireUserId } from "@/lib/api-auth";
import { ensureDb } from "@/lib/db/queries";
import { db } from "@/lib/db";
import * as schema from "@/lib/db/schema";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const TABLES: Array<[string, any]> = [
  ["accounts", schema.accounts],
  ["categories", schema.categories],
  ["transactions", schema.transactions],
  ["budgets", schema.budgets],
  ["debts", schema.debts],
  ["goals", schema.goals],
  ["todos", schema.todos],
  ["routines", schema.routines],
  ["meals", schema.meals],
  ["workouts", schema.workouts],
  ["dailyJournals", schema.dailyJournals],
  ["vehicleServices", schema.vehicleServices],
  ["cycleEntries", schema.cycleEntries],
  ["sleepLogs", schema.sleepLogs],
  ["medications", schema.medications],
  ["trips", schema.trips],
  ["tripExpenses", schema.tripExpenses],
  ["habits", schema.habits],
  ["habitCompletions", schema.habitCompletions],
];

async function collectUserData(userId: string) {
  const out: Record<string, unknown[]> = {};
  for (const [name, table] of TABLES) {
    try {
      const rows = await db
        .select()
        .from(table)
        .where(eq(table.userId, userId))
        .all();
      out[name] = rows;
    } catch {
      out[name] = [];
    }
  }
  return out;
}

function toCsv(data: Record<string, unknown[]>) {
  const lines: string[] = [];
  for (const [table, rows] of Object.entries(data)) {
    lines.push(`# ${table}`);
    if (!rows.length) {
      lines.push("(empty)");
      lines.push("");
      continue;
    }
    const keys = Object.keys(rows[0] as object);
    lines.push(keys.join(","));
    for (const row of rows) {
      const r = row as Record<string, unknown>;
      lines.push(
        keys
          .map((k) => {
            const v = r[k];
            const s = v == null ? "" : String(v);
            return `"${s.replace(/"/g, '""')}"`;
          })
          .join(",")
      );
    }
    lines.push("");
  }
  return lines.join("\n");
}

function toHtml(data: Record<string, unknown[]>) {
  const sections = Object.entries(data)
    .map(([name, rows]) => {
      if (!rows.length) return `<h2>${name}</h2><p>empty</p>`;
      const keys = Object.keys(rows[0] as object);
      const head = keys.map((k) => `<th>${k}</th>`).join("");
      const body = rows
        .slice(0, 200)
        .map((row) => {
          const r = row as Record<string, unknown>;
          return `<tr>${keys.map((k) => `<td>${String(r[k] ?? "")}</td>`).join("")}</tr>`;
        })
        .join("");
      return `<h2>${name}</h2><table border="1" cellpadding="4" cellspacing="0"><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>`;
    })
    .join("");
  return `<!doctype html><html lang="fa" dir="rtl"><head><meta charset="utf-8"/><title>Ravaal Export</title><style>body{font-family:Tahoma,sans-serif;padding:24px}table{border-collapse:collapse;width:100%;margin-bottom:24px;font-size:12px}th{background:#eee}</style></head><body><h1>روال — پشتیبان</h1><p>برای PDF از مرورگر Print → Save as PDF را بزن.</p>${sections}</body></html>`;
}

export async function GET(request: Request) {
  await ensureDb();
  const auth = await requireUserId();
  if (auth instanceof NextResponse) return auth;

  const format = new URL(request.url).searchParams.get("format") ?? "json";
  const data = await collectUserData(auth);
  const payload = {
    exportedAt: new Date().toISOString(),
    userId: auth,
    tables: data,
  };

  if (format === "csv") {
    return new NextResponse(toCsv(data), {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": 'attachment; filename="ravaal-backup.csv"',
      },
    });
  }

  if (format === "html" || format === "pdf") {
    return new NextResponse(toHtml(data), {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Content-Disposition": 'inline; filename="ravaal-backup.html"',
      },
    });
  }

  return new NextResponse(JSON.stringify(payload, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": 'attachment; filename="ravaal-backup.json"',
    },
  });
}
