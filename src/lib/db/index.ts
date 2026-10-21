import { createClient, type Client } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { migrate } from "drizzle-orm/libsql/migrator";
import fs from "fs";
import path from "path";
import * as schema from "./schema";

const dataDir =
  process.env.HESABDARI_DATA_DIR ||
  path.join(
    /* turbopackIgnore: true */ process.env.HESABDARI_ROOT || process.cwd(),
    "data"
  );
const appRoot =
  /* turbopackIgnore: true */ process.env.HESABDARI_ROOT || process.cwd();

type Database = ReturnType<typeof drizzle<typeof schema>>;

declare global {
  var __hesabdari_client__: Client | undefined;

  var __hesabdari_db__: Database | undefined;
}

/**
 * TURSO_DATABASE_URL (libsql://…) points at the shared cloud database.
 * Without it, a local SQLite file in the data directory is used.
 */
function databaseUrl(): string {
  const remote = process.env.TURSO_DATABASE_URL?.trim();
  if (remote) return remote;
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  return `file:${path.join(dataDir, "hesabdari.db").split(path.sep).join("/")}`;
}

function getConnection(): { client: Client; db: Database } {
  if (globalThis.__hesabdari_client__ && globalThis.__hesabdari_db__) {
    return { client: globalThis.__hesabdari_client__, db: globalThis.__hesabdari_db__ };
  }

  const client = createClient({
    url: databaseUrl(),
    authToken: process.env.TURSO_AUTH_TOKEN?.trim() || undefined,
  });
  const db = drizzle(client, { schema });

  globalThis.__hesabdari_client__ = client;
  globalThis.__hesabdari_db__ = db;

  return { client, db };
}

export function getDb(): Database {
  return getConnection().db;
}

export function getClient(): Client {
  return getConnection().client;
}

export const db = new Proxy({} as Database, {
  get(_target, prop, receiver) {
    const value = Reflect.get(getDb() as object, prop, receiver);
    return typeof value === "function" ? value.bind(getDb()) : value;
  },
});

/** Creates or patches tables the migration journal does not cover. */
async function repairSchema(client: Client) {
  const schemaRows = await client.execute(
    "SELECT m.name AS table_name, p.name AS column_name FROM sqlite_master m JOIN pragma_table_info(m.name) p WHERE m.type = 'table'"
  );
  const tableSet = new Set<string>();
  const columnSet = new Set<string>();
  for (const row of schemaRows.rows) {
    tableSet.add(String(row.table_name));
    columnSet.add(`${row.table_name}.${row.column_name}`);
  }
  const tableExists = (name: string) => tableSet.has(name);
  const columnExists = (table: string, column: string) => columnSet.has(`${table}.${column}`);

  if (tableExists("transactions") && !columnExists("transactions", "receipt_path")) {
    await client.executeMultiple("ALTER TABLE `transactions` ADD `receipt_path` text");
  }
  if (!tableExists("receipt_files")) {
    await client.executeMultiple(`
      CREATE TABLE IF NOT EXISTS \`receipt_files\` (
        \`id\` text PRIMARY KEY NOT NULL,
        \`user_id\` text NOT NULL,
        \`mime_type\` text NOT NULL,
        \`data\` blob NOT NULL,
        \`created_at\` integer NOT NULL,
        FOREIGN KEY (\`user_id\`) REFERENCES \`users\`(\`id\`) ON UPDATE no action ON DELETE cascade
      )
    `);
  }
  if (!tableExists("assets")) {
    await client.executeMultiple(`
      CREATE TABLE IF NOT EXISTS \`assets\` (
        \`id\` text PRIMARY KEY NOT NULL,
        \`user_id\` text NOT NULL,
        \`name\` text NOT NULL,
        \`type\` text NOT NULL,
        \`quantity\` integer DEFAULT 1 NOT NULL,
        \`unit_price\` integer NOT NULL,
        \`purchase_price\` integer,
        \`purchase_date\` integer,
        \`notes\` text,
        \`color\` text DEFAULT '#f59e0b' NOT NULL,
        \`created_at\` integer NOT NULL,
        FOREIGN KEY (\`user_id\`) REFERENCES \`users\`(\`id\`) ON UPDATE no action ON DELETE cascade
      )
    `);
  }
  if (!tableExists("recurring_transactions")) {
    await client.executeMultiple(`
      CREATE TABLE IF NOT EXISTS \`recurring_transactions\` (
        \`id\` text PRIMARY KEY NOT NULL,
        \`user_id\` text NOT NULL,
        \`account_id\` text NOT NULL,
        \`category_id\` text,
        \`type\` text NOT NULL,
        \`amount\` integer NOT NULL,
        \`description\` text,
        \`frequency\` text NOT NULL,
        \`next_run_date\` integer NOT NULL,
        \`is_active\` integer DEFAULT 1 NOT NULL,
        \`created_at\` integer NOT NULL,
        FOREIGN KEY (\`user_id\`) REFERENCES \`users\`(\`id\`) ON UPDATE no action ON DELETE cascade,
        FOREIGN KEY (\`account_id\`) REFERENCES \`accounts\`(\`id\`) ON UPDATE no action ON DELETE cascade,
        FOREIGN KEY (\`category_id\`) REFERENCES \`categories\`(\`id\`) ON UPDATE no action ON DELETE set null
      )
    `);
  }

  if (!tableExists("meals")) {
    await client.executeMultiple(`
      CREATE TABLE IF NOT EXISTS \`meals\` (
        \`id\` text PRIMARY KEY NOT NULL,
        \`user_id\` text NOT NULL,
        \`meal_type\` text NOT NULL,
        \`date\` text NOT NULL,
        \`name\` text NOT NULL,
        \`calories\` integer DEFAULT 0 NOT NULL,
        \`protein\` integer DEFAULT 0 NOT NULL,
        \`carbs\` integer DEFAULT 0 NOT NULL,
        \`fat\` integer DEFAULT 0 NOT NULL,
        \`note\` text,
        \`created_at\` integer NOT NULL,
        FOREIGN KEY (\`user_id\`) REFERENCES \`users\`(\`id\`) ON UPDATE no action ON DELETE cascade
      );
      CREATE INDEX IF NOT EXISTS \`meals_user_date_idx\` ON \`meals\` (\`user_id\`,\`date\`);
    `);
  }

  if (!tableExists("water_logs")) {
    await client.executeMultiple(`
      CREATE TABLE IF NOT EXISTS \`water_logs\` (
        \`id\` text PRIMARY KEY NOT NULL,
        \`user_id\` text NOT NULL,
        \`date\` text NOT NULL,
        \`amount_ml\` integer NOT NULL,
        \`created_at\` integer NOT NULL,
        FOREIGN KEY (\`user_id\`) REFERENCES \`users\`(\`id\`) ON UPDATE no action ON DELETE cascade
      );
      CREATE INDEX IF NOT EXISTS \`water_user_date_idx\` ON \`water_logs\` (\`user_id\`,\`date\`);
    `);
  }

  if (!tableExists("workouts")) {
    await client.executeMultiple(`
      CREATE TABLE IF NOT EXISTS \`workouts\` (
        \`id\` text PRIMARY KEY NOT NULL,
        \`user_id\` text NOT NULL,
        \`title\` text NOT NULL,
        \`type\` text NOT NULL,
        \`duration_minutes\` integer NOT NULL,
        \`calories_burned\` integer DEFAULT 0 NOT NULL,
        \`date\` text NOT NULL,
        \`notes\` text,
        \`created_at\` integer NOT NULL,
        FOREIGN KEY (\`user_id\`) REFERENCES \`users\`(\`id\`) ON UPDATE no action ON DELETE cascade
      );
      CREATE INDEX IF NOT EXISTS \`workouts_user_date_idx\` ON \`workouts\` (\`user_id\`,\`date\`);
    `);
  }

  if (!tableExists("body_metrics")) {
    await client.executeMultiple(`
      CREATE TABLE IF NOT EXISTS \`body_metrics\` (
        \`id\` text PRIMARY KEY NOT NULL,
        \`user_id\` text NOT NULL,
        \`date\` text NOT NULL,
        \`weight_kg\` integer NOT NULL,
        \`body_fat\` integer,
        \`note\` text,
        \`created_at\` integer NOT NULL,
        FOREIGN KEY (\`user_id\`) REFERENCES \`users\`(\`id\`) ON UPDATE no action ON DELETE cascade
      );
    `);
  }

  if (!tableExists("books")) {
    await client.executeMultiple(`
      CREATE TABLE IF NOT EXISTS \`books\` (
        \`id\` text PRIMARY KEY NOT NULL,
        \`user_id\` text NOT NULL,
        \`title\` text NOT NULL,
        \`author\` text NOT NULL,
        \`total_pages\` integer NOT NULL,
        \`current_page\` integer DEFAULT 0 NOT NULL,
        \`status\` text DEFAULT 'reading' NOT NULL,
        \`rating\` integer,
        \`category\` text DEFAULT 'توسعه فردی' NOT NULL,
        \`notes\` text,
        \`created_at\` integer NOT NULL,
        FOREIGN KEY (\`user_id\`) REFERENCES \`users\`(\`id\`) ON UPDATE no action ON DELETE cascade
      );
    `);
  }

  if (!tableExists("courses")) {
    await client.executeMultiple(`
      CREATE TABLE IF NOT EXISTS \`courses\` (
        \`id\` text PRIMARY KEY NOT NULL,
        \`user_id\` text NOT NULL,
        \`title\` text NOT NULL,
        \`platform\` text DEFAULT 'Online' NOT NULL,
        \`total_lessons\` integer NOT NULL,
        \`completed_lessons\` integer DEFAULT 0 NOT NULL,
        \`status\` text DEFAULT 'in_progress' NOT NULL,
        \`notes\` text,
        \`created_at\` integer NOT NULL,
        FOREIGN KEY (\`user_id\`) REFERENCES \`users\`(\`id\`) ON UPDATE no action ON DELETE cascade
      );
    `);
  }

  if (!tableExists("focus_sessions")) {
    await client.executeMultiple(`
      CREATE TABLE IF NOT EXISTS \`focus_sessions\` (
        \`id\` text PRIMARY KEY NOT NULL,
        \`user_id\` text NOT NULL,
        \`task_name\` text NOT NULL,
        \`duration_minutes\` integer DEFAULT 25 NOT NULL,
        \`category\` text DEFAULT 'work' NOT NULL,
        \`date\` text NOT NULL,
        \`created_at\` integer NOT NULL,
        FOREIGN KEY (\`user_id\`) REFERENCES \`users\`(\`id\`) ON UPDATE no action ON DELETE cascade
      );
    `);
  }

  if (!tableExists("daily_journals")) {
    await client.executeMultiple(`
      CREATE TABLE IF NOT EXISTS \`daily_journals\` (
        \`id\` text PRIMARY KEY NOT NULL,
        \`user_id\` text NOT NULL,
        \`date\` text NOT NULL,
        \`mood\` text DEFAULT 'good' NOT NULL,
        \`gratitude\` text,
        \`highlights\` text,
        \`notes\` text,
        \`created_at\` integer NOT NULL,
        FOREIGN KEY (\`user_id\`) REFERENCES \`users\`(\`id\`) ON UPDATE no action ON DELETE cascade
      );
      CREATE INDEX IF NOT EXISTS \`journal_user_date_idx\` ON \`daily_journals\` (\`user_id\`,\`date\`);
    `);
  }

  if (!tableExists("vehicle_services")) {
    await client.executeMultiple(`
      CREATE TABLE IF NOT EXISTS \`vehicle_services\` (
        \`id\` text PRIMARY KEY NOT NULL,
        \`user_id\` text NOT NULL,
        \`vehicle_name\` text NOT NULL,
        \`service_type\` text NOT NULL,
        \`current_mileage\` integer DEFAULT 0 NOT NULL,
        \`next_due_mileage\` integer,
        \`service_date\` text NOT NULL,
        \`next_due_date\` text,
        \`cost\` integer DEFAULT 0 NOT NULL,
        \`notes\` text,
        \`created_at\` integer NOT NULL,
        FOREIGN KEY (\`user_id\`) REFERENCES \`users\`(\`id\`) ON UPDATE no action ON DELETE cascade
      );
    `);
  }

  // Drop Flow protocol leftovers (safe if already gone)
  try {
    if (tableExists("flow_day_tasks")) {
      await client.executeMultiple("DROP TABLE IF EXISTS `flow_day_tasks`");
    }
    if (tableExists("flow_focus_sessions")) {
      await client.executeMultiple("DROP TABLE IF EXISTS `flow_focus_sessions`");
    }
    if (tableExists("flow_mind_inbox")) {
      await client.executeMultiple("DROP TABLE IF EXISTS `flow_mind_inbox`");
    }
    if (tableExists("flow_days")) {
      await client.executeMultiple("DROP TABLE IF EXISTS `flow_days`");
    }
  } catch {
    // ignore
  }

  // Remove legacy household feature leftovers (safe if already gone)
  try {
    if (tableExists("transaction_splits")) {
      await client.executeMultiple("DROP TABLE IF EXISTS `transaction_splits`");
    }
    if (tableExists("household_members")) {
      await client.executeMultiple("DROP TABLE IF EXISTS `household_members`");
    }
    if (columnExists("transactions", "household_id")) {
      await client.executeMultiple("ALTER TABLE `transactions` DROP COLUMN `household_id`");
    }
    if (columnExists("transactions", "is_shared")) {
      await client.executeMultiple("ALTER TABLE `transactions` DROP COLUMN `is_shared`");
    }
    if (columnExists("budgets", "household_id")) {
      await client.executeMultiple("ALTER TABLE `budgets` DROP COLUMN `household_id`");
    }
    if (tableExists("households")) {
      await client.executeMultiple("DROP TABLE IF EXISTS `households`");
    }
  } catch {
    // Older SQLite / locked DB — migration 0009 may still apply later
  }

  if (tableExists("user_settings") && !columnExists("user_settings", "appearance_mood")) {
    await client.executeMultiple(
      "ALTER TABLE `user_settings` ADD `appearance_mood` text DEFAULT 'neutral' NOT NULL"
    );
  }
  if (tableExists("user_settings") && !columnExists("user_settings", "accent_color")) {
    await client.executeMultiple(
      "ALTER TABLE `user_settings` ADD `accent_color` text DEFAULT 'emerald' NOT NULL"
    );
  }
  if (tableExists("user_settings") && !columnExists("user_settings", "visible_nav")) {
    await client.executeMultiple("ALTER TABLE `user_settings` ADD `visible_nav` text");
  }
  if (tableExists("user_settings") && !columnExists("user_settings", "locale")) {
    await client.executeMultiple(
      "ALTER TABLE `user_settings` ADD `locale` text DEFAULT 'fa' NOT NULL"
    );
  }
  if (tableExists("user_settings") && !columnExists("user_settings", "sms_ingest_token")) {
    await client.executeMultiple(
      "ALTER TABLE `user_settings` ADD `sms_ingest_token` text"
    );
  }
  if (tableExists("user_settings") && !columnExists("user_settings", "gender")) {
    await client.executeMultiple("ALTER TABLE `user_settings` ADD `gender` text");
  }
  if (tableExists("user_settings") && !columnExists("user_settings", "page_heroes")) {
    await client.executeMultiple("ALTER TABLE `user_settings` ADD `page_heroes` text");
  }
  if (tableExists("user_settings") && !columnExists("user_settings", "mobile_nav")) {
    await client.executeMultiple("ALTER TABLE `user_settings` ADD `mobile_nav` text");
  }
  if (tableExists("user_settings") && !columnExists("user_settings", "health_targets")) {
    await client.executeMultiple("ALTER TABLE `user_settings` ADD `health_targets` text");
  }
  if (tableExists("habits") && !columnExists("habits", "cue")) {
    await client.executeMultiple("ALTER TABLE `habits` ADD `cue` text");
  }
  if (tableExists("habits") && !columnExists("habits", "time_of_day")) {
    await client.executeMultiple("ALTER TABLE `habits` ADD `time_of_day` text");
  }
  if (tableExists("todos") && !columnExists("todos", "checklist")) {
    await client.executeMultiple("ALTER TABLE `todos` ADD `checklist` text");
  }
  if (tableExists("focus_sessions") && !columnExists("focus_sessions", "todo_id")) {
    await client.executeMultiple("ALTER TABLE `focus_sessions` ADD `todo_id` text");
  }
  if (!tableExists("asset_price_history")) {
    await client.executeMultiple(`
      CREATE TABLE IF NOT EXISTS \`asset_price_history\` (
        \`id\` text PRIMARY KEY NOT NULL,
        \`asset_id\` text NOT NULL,
        \`user_id\` text NOT NULL,
        \`unit_price\` integer NOT NULL,
        \`recorded_at\` integer NOT NULL,
        FOREIGN KEY (\`asset_id\`) REFERENCES \`assets\`(\`id\`) ON DELETE cascade,
        FOREIGN KEY (\`user_id\`) REFERENCES \`users\`(\`id\`) ON DELETE cascade
      );
      CREATE INDEX IF NOT EXISTS \`asset_price_history_asset_idx\` ON \`asset_price_history\` (\`asset_id\`,\`recorded_at\`);
    `);
  }

  await client.executeMultiple(`
    CREATE TABLE IF NOT EXISTS \`cycle_settings\` (
      \`user_id\` text PRIMARY KEY NOT NULL,
      \`avg_cycle_length\` integer DEFAULT 28 NOT NULL,
      \`avg_period_length\` integer DEFAULT 5 NOT NULL,
      \`updated_at\` integer NOT NULL,
      FOREIGN KEY (\`user_id\`) REFERENCES \`users\`(\`id\`) ON DELETE cascade
    );
    CREATE TABLE IF NOT EXISTS \`cycle_entries\` (
      \`id\` text PRIMARY KEY NOT NULL,
      \`user_id\` text NOT NULL,
      \`date\` text NOT NULL,
      \`kind\` text NOT NULL,
      \`symptoms\` text,
      \`flow\` text,
      \`notes\` text,
      \`created_at\` integer NOT NULL,
      FOREIGN KEY (\`user_id\`) REFERENCES \`users\`(\`id\`) ON DELETE cascade
    );
    CREATE TABLE IF NOT EXISTS \`groups\` (
      \`id\` text PRIMARY KEY NOT NULL,
      \`name\` text NOT NULL,
      \`invite_code\` text NOT NULL UNIQUE,
      \`owner_id\` text NOT NULL,
      \`created_at\` integer NOT NULL,
      FOREIGN KEY (\`owner_id\`) REFERENCES \`users\`(\`id\`) ON DELETE cascade
    );
    CREATE TABLE IF NOT EXISTS \`group_members\` (
      \`id\` text PRIMARY KEY NOT NULL,
      \`group_id\` text NOT NULL,
      \`user_id\` text NOT NULL,
      \`role\` text DEFAULT 'member' NOT NULL,
      \`joined_at\` integer NOT NULL,
      FOREIGN KEY (\`group_id\`) REFERENCES \`groups\`(\`id\`) ON DELETE cascade,
      FOREIGN KEY (\`user_id\`) REFERENCES \`users\`(\`id\`) ON DELETE cascade
    );
    CREATE TABLE IF NOT EXISTS \`group_mood_shares\` (
      \`id\` text PRIMARY KEY NOT NULL,
      \`group_id\` text NOT NULL,
      \`user_id\` text NOT NULL,
      \`mood\` text NOT NULL,
      \`note\` text,
      \`date\` text NOT NULL,
      \`created_at\` integer NOT NULL,
      FOREIGN KEY (\`group_id\`) REFERENCES \`groups\`(\`id\`) ON DELETE cascade,
      FOREIGN KEY (\`user_id\`) REFERENCES \`users\`(\`id\`) ON DELETE cascade
    );
    CREATE TABLE IF NOT EXISTS \`group_shopping_items\` (
      \`id\` text PRIMARY KEY NOT NULL,
      \`group_id\` text NOT NULL,
      \`created_by\` text NOT NULL,
      \`title\` text NOT NULL,
      \`qty\` text,
      \`done\` integer DEFAULT 0 NOT NULL,
      \`created_at\` integer NOT NULL,
      FOREIGN KEY (\`group_id\`) REFERENCES \`groups\`(\`id\`) ON DELETE cascade,
      FOREIGN KEY (\`created_by\`) REFERENCES \`users\`(\`id\`) ON DELETE cascade
    );
    CREATE TABLE IF NOT EXISTS \`group_tasks\` (
      \`id\` text PRIMARY KEY NOT NULL,
      \`group_id\` text NOT NULL,
      \`created_by\` text NOT NULL,
      \`title\` text NOT NULL,
      \`done\` integer DEFAULT 0 NOT NULL,
      \`assignee_name\` text,
      \`created_at\` integer NOT NULL,
      FOREIGN KEY (\`group_id\`) REFERENCES \`groups\`(\`id\`) ON DELETE cascade,
      FOREIGN KEY (\`created_by\`) REFERENCES \`users\`(\`id\`) ON DELETE cascade
    );
    CREATE TABLE IF NOT EXISTS \`group_expenses\` (
      \`id\` text PRIMARY KEY NOT NULL,
      \`group_id\` text NOT NULL,
      \`created_by\` text NOT NULL,
      \`title\` text NOT NULL,
      \`amount\` integer NOT NULL,
      \`category\` text DEFAULT 'عمومی' NOT NULL,
      \`date\` text NOT NULL,
      \`created_at\` integer NOT NULL,
      FOREIGN KEY (\`group_id\`) REFERENCES \`groups\`(\`id\`) ON DELETE cascade,
      FOREIGN KEY (\`created_by\`) REFERENCES \`users\`(\`id\`) ON DELETE cascade
    );
    CREATE TABLE IF NOT EXISTS \`sleep_logs\` (
      \`id\` text PRIMARY KEY NOT NULL,
      \`user_id\` text NOT NULL,
      \`date\` text NOT NULL,
      \`bedtime\` text,
      \`wake_time\` text,
      \`hours\` integer,
      \`quality\` integer DEFAULT 3 NOT NULL,
      \`energy\` integer DEFAULT 3 NOT NULL,
      \`notes\` text,
      \`created_at\` integer NOT NULL,
      FOREIGN KEY (\`user_id\`) REFERENCES \`users\`(\`id\`) ON DELETE cascade
    );
    CREATE TABLE IF NOT EXISTS \`medications\` (
      \`id\` text PRIMARY KEY NOT NULL,
      \`user_id\` text NOT NULL,
      \`name\` text NOT NULL,
      \`dose\` text,
      \`schedule\` text DEFAULT 'daily' NOT NULL,
      \`reminder_hour\` integer DEFAULT 9 NOT NULL,
      \`active\` integer DEFAULT 1 NOT NULL,
      \`notes\` text,
      \`created_at\` integer NOT NULL,
      FOREIGN KEY (\`user_id\`) REFERENCES \`users\`(\`id\`) ON DELETE cascade
    );
    CREATE TABLE IF NOT EXISTS \`medication_logs\` (
      \`id\` text PRIMARY KEY NOT NULL,
      \`medication_id\` text NOT NULL,
      \`user_id\` text NOT NULL,
      \`date\` text NOT NULL,
      \`taken\` integer DEFAULT 1 NOT NULL,
      \`created_at\` integer NOT NULL,
      FOREIGN KEY (\`medication_id\`) REFERENCES \`medications\`(\`id\`) ON DELETE cascade,
      FOREIGN KEY (\`user_id\`) REFERENCES \`users\`(\`id\`) ON DELETE cascade
    );
    CREATE TABLE IF NOT EXISTS \`trips\` (
      \`id\` text PRIMARY KEY NOT NULL,
      \`user_id\` text NOT NULL,
      \`title\` text NOT NULL,
      \`place\` text,
      \`start_date\` text NOT NULL,
      \`end_date\` text,
      \`budget\` integer DEFAULT 0 NOT NULL,
      \`notes\` text,
      \`created_at\` integer NOT NULL,
      FOREIGN KEY (\`user_id\`) REFERENCES \`users\`(\`id\`) ON DELETE cascade
    );
    CREATE TABLE IF NOT EXISTS \`trip_expenses\` (
      \`id\` text PRIMARY KEY NOT NULL,
      \`trip_id\` text NOT NULL,
      \`user_id\` text NOT NULL,
      \`title\` text NOT NULL,
      \`amount\` integer NOT NULL,
      \`category\` text DEFAULT 'سایر' NOT NULL,
      \`date\` text NOT NULL,
      \`created_at\` integer NOT NULL,
      FOREIGN KEY (\`trip_id\`) REFERENCES \`trips\`(\`id\`) ON DELETE cascade,
      FOREIGN KEY (\`user_id\`) REFERENCES \`users\`(\`id\`) ON DELETE cascade
    );
    CREATE TABLE IF NOT EXISTS \`habits\` (
      \`id\` text PRIMARY KEY NOT NULL,
      \`user_id\` text NOT NULL,
      \`title\` text NOT NULL,
      \`color\` text DEFAULT '#10b981' NOT NULL,
      \`active\` integer DEFAULT 1 NOT NULL,
      \`created_at\` integer NOT NULL,
      FOREIGN KEY (\`user_id\`) REFERENCES \`users\`(\`id\`) ON DELETE cascade
    );
    CREATE TABLE IF NOT EXISTS \`habit_completions\` (
      \`id\` text PRIMARY KEY NOT NULL,
      \`habit_id\` text NOT NULL,
      \`user_id\` text NOT NULL,
      \`date\` text NOT NULL,
      \`created_at\` integer NOT NULL,
      FOREIGN KEY (\`habit_id\`) REFERENCES \`habits\`(\`id\`) ON DELETE cascade,
      FOREIGN KEY (\`user_id\`) REFERENCES \`users\`(\`id\`) ON DELETE cascade
    );
    CREATE TABLE IF NOT EXISTS \`pending_bank_imports\` (
      \`id\` text PRIMARY KEY NOT NULL,
      \`user_id\` text NOT NULL,
      \`raw_text\` text NOT NULL,
      \`sender\` text,
      \`suggested_type\` text,
      \`suggested_amount\` integer,
      \`suggested_title\` text,
      \`suggested_date\` text,
      \`suggested_account_id\` text,
      \`suggested_category_id\` text,
      \`confidence\` integer DEFAULT 50 NOT NULL,
      \`status\` text DEFAULT 'pending' NOT NULL,
      \`parse_source\` text DEFAULT 'heuristic' NOT NULL,
      \`created_at\` integer NOT NULL,
      FOREIGN KEY (\`user_id\`) REFERENCES \`users\`(\`id\`) ON DELETE cascade
    );
    CREATE TABLE IF NOT EXISTS \`group_petty_cash\` (
      \`id\` text PRIMARY KEY NOT NULL,
      \`group_id\` text NOT NULL,
      \`manager_user_id\` text NOT NULL,
      \`year\` integer NOT NULL,
      \`month\` integer NOT NULL,
      \`monthly_budget\` integer DEFAULT 0 NOT NULL,
      \`title\` text DEFAULT 'تنخواه' NOT NULL,
      \`created_at\` integer NOT NULL,
      FOREIGN KEY (\`group_id\`) REFERENCES \`groups\`(\`id\`) ON DELETE cascade,
      FOREIGN KEY (\`manager_user_id\`) REFERENCES \`users\`(\`id\`) ON DELETE cascade
    );
    CREATE TABLE IF NOT EXISTS \`group_petty_cash_items\` (
      \`id\` text PRIMARY KEY NOT NULL,
      \`petty_cash_id\` text NOT NULL,
      \`group_id\` text NOT NULL,
      \`created_by\` text NOT NULL,
      \`title\` text NOT NULL,
      \`amount\` integer NOT NULL,
      \`date\` text NOT NULL,
      \`notes\` text,
      \`receipt_path\` text,
      \`created_at\` integer NOT NULL,
      FOREIGN KEY (\`petty_cash_id\`) REFERENCES \`group_petty_cash\`(\`id\`) ON DELETE cascade,
      FOREIGN KEY (\`group_id\`) REFERENCES \`groups\`(\`id\`) ON DELETE cascade,
      FOREIGN KEY (\`created_by\`) REFERENCES \`users\`(\`id\`) ON DELETE cascade
    );
    CREATE TABLE IF NOT EXISTS \`weekly_insights\` (
      \`id\` text PRIMARY KEY NOT NULL,
      \`user_id\` text NOT NULL,
      \`week_start\` text NOT NULL,
      \`locale\` text DEFAULT 'fa' NOT NULL,
      \`content\` text NOT NULL,
      \`suggestions_json\` text,
      \`created_at\` integer NOT NULL,
      FOREIGN KEY (\`user_id\`) REFERENCES \`users\`(\`id\`) ON DELETE cascade
    );
    CREATE INDEX IF NOT EXISTS \`transactions_user_date_idx\` ON \`transactions\` (\`user_id\`,\`date\`);
    CREATE INDEX IF NOT EXISTS \`transactions_user_type_cat_date_idx\` ON \`transactions\` (\`user_id\`,\`type\`,\`category_id\`,\`date\`);
    CREATE INDEX IF NOT EXISTS \`todos_user_status_idx\` ON \`todos\` (\`user_id\`,\`status\`);
  `);
}


export async function runMigrations() {
  const { client } = getConnection();
  await migrate(db, {
    migrationsFolder: path.join(
      /* turbopackIgnore: true */ appRoot,
      "drizzle"
    ),
  });
  await repairSchema(client);
}
