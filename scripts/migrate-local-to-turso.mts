// One-time copy of a local SQLite workspace into the shared cloud database.
//
//   TURSO_DATABASE_URL=libsql://… TURSO_AUTH_TOKEN=… npx tsx scripts/migrate-local-to-turso.ts [path/to/hesabdari.db]
//
// Run it once against an empty database. Rows are copied with their original ids, so
// re-running it is safe, but it refuses to touch a database that already has other accounts.
import fs from "node:fs";
import path from "node:path";
import { createClient, type InValue } from "@libsql/client";

const targetUrl = process.env.TURSO_DATABASE_URL?.trim();
if (!targetUrl) {
  throw new Error("Set TURSO_DATABASE_URL (and TURSO_AUTH_TOKEN) to the cloud database first.");
}

const sourcePath = path.resolve(process.argv[2] ?? path.join("data", "hesabdari.db"));
if (!fs.existsSync(sourcePath)) {
  throw new Error(`Local database not found: ${sourcePath}`);
}
const receiptsDir = path.join(path.dirname(sourcePath), "receipts");

// Schema first: the app creates and patches every table on the target.
const { ensureDb } = await import("../src/lib/db/queries");
const { getClient } = await import("../src/lib/db/index");
const { DEFAULT_USER_ID } = await import("../src/lib/constants");
await ensureDb();
const target = getClient();
const source = createClient({ url: `file:${sourcePath.split(path.sep).join("/")}` });

// Parents before children so foreign keys are satisfied.
const COPY_ORDER = [
  "users", "accounts", "categories", "user_settings", "category_rules", "budgets",
  "goals", "debts", "transactions", "transfers", "recurring_transactions", "assets",
  "routines", "routine_completions", "todos", "debt_payments", "goal_contributions",
  "meals", "water_logs", "workouts", "body_metrics", "books", "courses",
  "focus_sessions", "daily_journals", "vehicle_services",
];
const SKIPPED = new Set(["password_reset_tokens", "pending_2fa_tokens", "__drizzle_migrations", "receipt_files"]);

async function tableNames(client: typeof target) {
  const result = await client.execute("SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%'");
  return result.rows.map((row) => String(row.name));
}
async function columnNames(client: typeof target, table: string) {
  const result = await client.execute(`PRAGMA table_info(\`${table}\`)`);
  return result.rows.map((row) => String(row.name));
}

// Guard: only the seeded default workspace may already exist on the target.
const otherUsers = await target.execute({
  sql: "SELECT COUNT(*) AS n FROM users WHERE id <> ?",
  args: [DEFAULT_USER_ID],
});
if (Number(otherUsers.rows[0].n) > 0) {
  throw new Error("The target database already has other accounts. Copy into an empty database instead.");
}

// Replace only the seeded default workspace on the target.
const targetTables = await tableNames(target);
for (const table of targetTables) {
  if (SKIPPED.has(table)) continue;
  const columns = await columnNames(target, table);
  if (columns.includes("user_id")) {
    await target.execute({ sql: `DELETE FROM \`${table}\` WHERE user_id = ?`, args: [DEFAULT_USER_ID] });
  }
}
await target.execute({ sql: "DELETE FROM users WHERE id = ?", args: [DEFAULT_USER_ID] });

const sourceTables = new Set(await tableNames(source));
const ordered = [
  ...COPY_ORDER,
  ...[...sourceTables].filter((t) => !COPY_ORDER.includes(t) && !SKIPPED.has(t)),
].filter((t) => sourceTables.has(t) && targetTables.includes(t));

let copied = 0;
for (const table of ordered) {
  const targetColumns = new Set(await columnNames(target, table));
  const sourceColumns = await columnNames(source, table);
  const columns = sourceColumns.filter((c) => targetColumns.has(c));
  if (columns.length === 0) continue;

  const rows = (await source.execute(`SELECT ${columns.map((c) => `\`${c}\``).join(", ")} FROM \`${table}\``)).rows;
  const placeholders = columns.map(() => "?").join(", ");
  const sql = `INSERT OR REPLACE INTO \`${table}\` (${columns.map((c) => `\`${c}\``).join(", ")}) VALUES (${placeholders})`;
  for (let i = 0; i < rows.length; i += 200) {
    await target.batch(
      rows.slice(i, i + 200).map((row) => ({
        sql,
        args: columns.map((c) => row[c] as InValue),
      })),
      "write"
    );
  }
  copied += rows.length;
  console.log(`${table}: ${rows.length} rows`);
}

// Receipt images moved from data/receipts into the database.
let receipts = 0;
if (sourceTables.has("transactions") && fs.existsSync(receiptsDir)) {
  const rows = (await source.execute(
    "SELECT id, user_id, receipt_path FROM transactions WHERE receipt_path IS NOT NULL"
  )).rows;
  const mimeByExt: Record<string, string> = {
    jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", webp: "image/webp", pdf: "application/pdf",
  };
  for (const row of rows) {
    const filename = String(row.receipt_path);
    const file = path.join(receiptsDir, filename);
    if (!fs.existsSync(file)) continue;
    const ext = filename.split(".").pop()?.toLowerCase() ?? "";
    await target.execute({
      sql: "INSERT OR REPLACE INTO receipt_files (id, user_id, mime_type, data, created_at) VALUES (?, ?, ?, ?, ?)",
      args: [filename, String(row.user_id), mimeByExt[ext] ?? "application/octet-stream", fs.readFileSync(file), Math.floor(Date.now() / 1000)],
    });
    receipts++;
  }
}

console.log(`Done: ${copied} rows and ${receipts} receipts copied.`);
console.log("Next: open the app, then sign up with ADMIN_EMAIL to claim this workspace.");
source.close();
getClient().close();
