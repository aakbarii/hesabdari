import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import fs from "fs";
import path from "path";
import * as schema from "./schema";

const dataDir =
  process.env.HESABDARI_DATA_DIR ||
  path.join(
    /* turbopackIgnore: true */ process.env.HESABDARI_ROOT || process.cwd(),
    "data"
  );
const dbPath = path.join(dataDir, "hesabdari.db");
const appRoot =
  /* turbopackIgnore: true */ process.env.HESABDARI_ROOT || process.cwd();

declare global {
  // eslint-disable-next-line no-var
  var __hesabdari_sqlite__: Database.Database | undefined;
  // eslint-disable-next-line no-var
  var __hesabdari_db__: ReturnType<typeof drizzle<typeof schema>> | undefined;
}

function createConnection() {
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  const sqlite = new Database(dbPath);
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON");
  sqlite.pragma("busy_timeout = 5000");
  sqlite.pragma("synchronous = NORMAL");
  sqlite.pragma("temp_store = MEMORY");
  sqlite.pragma("cache_size = -32000");
  return { sqlite, db: drizzle(sqlite, { schema }) };
}

function getConnection() {
  if (globalThis.__hesabdari_sqlite__ && globalThis.__hesabdari_db__) {
    return {
      sqlite: globalThis.__hesabdari_sqlite__,
      db: globalThis.__hesabdari_db__,
    };
  }

  const { sqlite, db } = createConnection();

  globalThis.__hesabdari_sqlite__ = sqlite;
  globalThis.__hesabdari_db__ = db;

  return { sqlite, db };
}

export function getDb() {
  return getConnection().db;
}

export const db = new Proxy({} as ReturnType<typeof drizzle<typeof schema>>, {
  get(_target, prop, receiver) {
    const value = Reflect.get(getDb() as object, prop, receiver);
    return typeof value === "function" ? value.bind(getDb()) : value;
  },
});

function tableExists(sqlite: Database.Database, name: string) {
  return Boolean(
    sqlite
      .prepare("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = ?")
      .get(name)
  );
}

function columnExists(sqlite: Database.Database, table: string, column: string) {
  return sqlite
    .prepare(`PRAGMA table_info(${table})`)
    .all()
    .some((c) => (c as { name: string }).name === column);
}

/** Patch schema gaps when a migration was skipped (e.g. journal hole). */
function repairSchema(sqlite: Database.Database) {
  if (tableExists(sqlite, "transactions") && !columnExists(sqlite, "transactions", "receipt_path")) {
    sqlite.exec("ALTER TABLE `transactions` ADD `receipt_path` text");
  }
  if (!tableExists(sqlite, "assets")) {
    sqlite.exec(`
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
  if (!tableExists(sqlite, "recurring_transactions")) {
    sqlite.exec(`
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

  if (!tableExists(sqlite, "meals")) {
    sqlite.exec(`
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

  if (!tableExists(sqlite, "water_logs")) {
    sqlite.exec(`
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

  if (!tableExists(sqlite, "workouts")) {
    sqlite.exec(`
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

  if (!tableExists(sqlite, "body_metrics")) {
    sqlite.exec(`
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

  if (!tableExists(sqlite, "books")) {
    sqlite.exec(`
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

  if (!tableExists(sqlite, "courses")) {
    sqlite.exec(`
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

  if (!tableExists(sqlite, "focus_sessions")) {
    sqlite.exec(`
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

  if (!tableExists(sqlite, "daily_journals")) {
    sqlite.exec(`
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

  if (!tableExists(sqlite, "vehicle_services")) {
    sqlite.exec(`
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
    if (tableExists(sqlite, "flow_day_tasks")) {
      sqlite.exec("DROP TABLE IF EXISTS `flow_day_tasks`");
    }
    if (tableExists(sqlite, "flow_focus_sessions")) {
      sqlite.exec("DROP TABLE IF EXISTS `flow_focus_sessions`");
    }
    if (tableExists(sqlite, "flow_mind_inbox")) {
      sqlite.exec("DROP TABLE IF EXISTS `flow_mind_inbox`");
    }
    if (tableExists(sqlite, "flow_days")) {
      sqlite.exec("DROP TABLE IF EXISTS `flow_days`");
    }
  } catch {
    // ignore
  }

  // Remove legacy household feature leftovers (safe if already gone)
  try {
    if (tableExists(sqlite, "transaction_splits")) {
      sqlite.exec("DROP TABLE IF EXISTS `transaction_splits`");
    }
    if (tableExists(sqlite, "household_members")) {
      sqlite.exec("DROP TABLE IF EXISTS `household_members`");
    }
    if (columnExists(sqlite, "transactions", "household_id")) {
      sqlite.exec("ALTER TABLE `transactions` DROP COLUMN `household_id`");
    }
    if (columnExists(sqlite, "transactions", "is_shared")) {
      sqlite.exec("ALTER TABLE `transactions` DROP COLUMN `is_shared`");
    }
    if (columnExists(sqlite, "budgets", "household_id")) {
      sqlite.exec("ALTER TABLE `budgets` DROP COLUMN `household_id`");
    }
    if (tableExists(sqlite, "households")) {
      sqlite.exec("DROP TABLE IF EXISTS `households`");
    }
  } catch {
    // Older SQLite / locked DB — migration 0009 may still apply later
  }

  sqlite.exec(`
    CREATE INDEX IF NOT EXISTS \`transactions_user_date_idx\` ON \`transactions\` (\`user_id\`,\`date\`);
    CREATE INDEX IF NOT EXISTS \`transactions_user_type_cat_date_idx\` ON \`transactions\` (\`user_id\`,\`type\`,\`category_id\`,\`date\`);
    CREATE INDEX IF NOT EXISTS \`todos_user_status_idx\` ON \`todos\` (\`user_id\`,\`status\`);
  `);
}

export function runMigrations() {
  const { sqlite } = getConnection();
  migrate(db, {
    migrationsFolder: path.join(
      /* turbopackIgnore: true */ appRoot,
      "drizzle"
    ),
  });
  repairSchema(sqlite);
}
