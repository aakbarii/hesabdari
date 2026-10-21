import { sqliteTable, text, integer, blob, real, uniqueIndex } from "drizzle-orm/sqlite-core";
import { relations } from "drizzle-orm";

export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash"),
  name: text("name").notNull(),
  totpSecret: text("totp_secret"),
  totpPendingSecret: text("totp_pending_secret"),
  totpEnabled: integer("totp_enabled", { mode: "boolean" }).notNull().default(false),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

export const passwordResetTokens = sqliteTable("password_reset_tokens", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  tokenHash: text("token_hash").notNull(),
  expiresAt: integer("expires_at", { mode: "timestamp" }).notNull(),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

export const pending2faTokens = sqliteTable("pending_2fa_tokens", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  tokenHash: text("token_hash").notNull(),
  expiresAt: integer("expires_at", { mode: "timestamp" }).notNull(),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

// Receipt images live in the database so they survive serverless deploys.
export const receiptFiles = sqliteTable("receipt_files", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  mimeType: text("mime_type").notNull(),
  data: blob("data", { mode: "buffer" }).notNull(),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

export const accounts = sqliteTable("accounts", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  type: text("type", { enum: ["cash", "bank", "card", "wallet"] }).notNull(),
  color: text("color").notNull().default("#3b82f6"),
  icon: text("icon").notNull().default("wallet"),
  initialBalance: integer("initial_balance").notNull().default(0),
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

export const categories = sqliteTable("categories", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  type: text("type", { enum: ["income", "expense"] }).notNull(),
  color: text("color").notNull().default("#6b7280"),
  icon: text("icon").notNull().default("tag"),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

export const transactions = sqliteTable("transactions", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  accountId: text("account_id")
    .notNull()
    .references(() => accounts.id, { onDelete: "cascade" }),
  categoryId: text("category_id").references(() => categories.id, {
    onDelete: "set null",
  }),
  type: text("type", { enum: ["income", "expense"] }).notNull(),
  amount: integer("amount").notNull(),
  description: text("description"),
  receiptPath: text("receipt_path"),
  date: integer("date", { mode: "timestamp" }).notNull(),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

export const transfers = sqliteTable("transfers", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  fromAccountId: text("from_account_id")
    .notNull()
    .references(() => accounts.id, { onDelete: "cascade" }),
  toAccountId: text("to_account_id")
    .notNull()
    .references(() => accounts.id, { onDelete: "cascade" }),
  amount: integer("amount").notNull(),
  description: text("description"),
  date: integer("date", { mode: "timestamp" }).notNull(),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

export const budgets = sqliteTable("budgets", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  categoryId: text("category_id")
    .notNull()
    .references(() => categories.id, { onDelete: "cascade" }),
  year: integer("year").notNull(),
  month: integer("month").notNull(),
  amount: integer("amount").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

export const debts = sqliteTable("debts", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  personName: text("person_name").notNull(),
  type: text("type", { enum: ["owed", "owing"] }).notNull(),
  totalAmount: integer("total_amount").notNull(),
  paidAmount: integer("paid_amount").notNull().default(0),
  description: text("description"),
  dueDate: integer("due_date", { mode: "timestamp" }),
  status: text("status", { enum: ["active", "settled"] })
    .notNull()
    .default("active"),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

export const debtPayments = sqliteTable("debt_payments", {
  id: text("id").primaryKey(),
  debtId: text("debt_id")
    .notNull()
    .references(() => debts.id, { onDelete: "cascade" }),
  accountId: text("account_id").references(() => accounts.id, {
    onDelete: "set null",
  }),
  amount: integer("amount").notNull(),
  date: integer("date", { mode: "timestamp" }).notNull(),
  note: text("note"),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

export const goals = sqliteTable("goals", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  type: text("type", { enum: ["savings", "purchase"] }).notNull(),
  name: text("name").notNull(),
  targetAmount: integer("target_amount").notNull(),
  currentAmount: integer("current_amount").notNull().default(0),
  accountId: text("account_id").references(() => accounts.id, {
    onDelete: "set null",
  }),
  deadline: integer("deadline", { mode: "timestamp" }),
  color: text("color").notNull().default("#10b981"),
  priority: integer("priority").notNull().default(0),
  status: text("status", { enum: ["active", "completed"] })
    .notNull()
    .default("active"),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

export const goalContributions = sqliteTable("goal_contributions", {
  id: text("id").primaryKey(),
  goalId: text("goal_id")
    .notNull()
    .references(() => goals.id, { onDelete: "cascade" }),
  amount: integer("amount").notNull(),
  date: integer("date", { mode: "timestamp" }).notNull(),
  note: text("note"),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

export const categoryRules = sqliteTable("category_rules", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  keyword: text("keyword").notNull(),
  categoryId: text("category_id")
    .notNull()
    .references(() => categories.id, { onDelete: "cascade" }),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

export const userSettings = sqliteTable("user_settings", {
  userId: text("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  dashboardWidgets: text("dashboard_widgets")
    .notNull()
    .default('["balance","monthly","chart","recent","goals","forecast","anomalies"]'),
  anomalyThreshold: integer("anomaly_threshold").notNull().default(30),
  currencyUnit: text("currency_unit", { enum: ["toman", "rial"] })
    .notNull()
    .default("toman"),
  appearanceMood: text("appearance_mood", {
    enum: [
      "joojo",
      "neutral",
      "feminine",
      "masculine",
      "ocean",
      "sunset",
      "forest",
      "minimal",
      "cozy",
    ],
  })
    .notNull()
    .default("neutral"),
  accentColor: text("accent_color").notNull().default("emerald"),
  visibleNav: text("visible_nav"),
  /** Ordered hrefs for bottom mobile tabs (up to 4) */
  mobileNav: text("mobile_nav"),
  locale: text("locale", { enum: ["fa", "en"] }).notNull().default("fa"),
  gender: text("gender", { enum: ["male", "female"] }),
  /** JSON map of page hero customizations: { [heroKey]: { hidden?, fileId? } } */
  pageHeroes: text("page_heroes"),
  /** JSON health goals: sleepHours, calories, protein, carbs, fat, waterMl */
  healthTargets: text("health_targets"),
  smsIngestToken: text("sms_ingest_token"),
  onboardingCompleted: integer("onboarding_completed", { mode: "boolean" })
    .notNull()
    .default(false),
});

/** Bank SMS / AI suggestions waiting for user confirmation */
export const pendingBankImports = sqliteTable("pending_bank_imports", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  rawText: text("raw_text").notNull(),
  sender: text("sender"),
  suggestedType: text("suggested_type", { enum: ["income", "expense"] }),
  suggestedAmount: integer("suggested_amount"),
  suggestedTitle: text("suggested_title"),
  suggestedDate: text("suggested_date"),
  suggestedAccountId: text("suggested_account_id"),
  suggestedCategoryId: text("suggested_category_id"),
  confidence: integer("confidence").notNull().default(50),
  status: text("status", {
    enum: ["pending", "confirmed", "rejected"],
  })
    .notNull()
    .default("pending"),
  parseSource: text("parse_source").notNull().default("heuristic"),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

export const recurringTransactions = sqliteTable("recurring_transactions", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  accountId: text("account_id")
    .notNull()
    .references(() => accounts.id, { onDelete: "cascade" }),
  categoryId: text("category_id").references(() => categories.id, {
    onDelete: "set null",
  }),
  type: text("type", { enum: ["income", "expense"] }).notNull(),
  amount: integer("amount").notNull(),
  description: text("description"),
  frequency: text("frequency", {
    enum: ["daily", "weekly", "monthly", "yearly"],
  }).notNull(),
  nextRunDate: integer("next_run_date", { mode: "timestamp" }).notNull(),
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

export const assets = sqliteTable("assets", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  type: text("type", {
    enum: ["gold", "stock", "crypto", "property", "currency", "other"],
  }).notNull(),
  quantity: integer("quantity").notNull().default(1),
  unitPrice: integer("unit_price").notNull(),
  purchasePrice: integer("purchase_price"),
  purchaseDate: integer("purchase_date", { mode: "timestamp" }),
  notes: text("notes"),
  color: text("color").notNull().default("#f59e0b"),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

export const assetPriceHistory = sqliteTable("asset_price_history", {
  id: text("id").primaryKey(),
  assetId: text("asset_id")
    .notNull()
    .references(() => assets.id, { onDelete: "cascade" }),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  unitPrice: integer("unit_price").notNull(),
  recordedAt: integer("recorded_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

export const todos = sqliteTable("todos", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description"),
  area: text("area", {
    enum: ["work", "personal", "health", "home", "other"],
  })
    .notNull()
    .default("personal"),
  priority: text("priority", { enum: ["low", "medium", "high"] })
    .notNull()
    .default("medium"),
  status: text("status", { enum: ["active", "done"] })
    .notNull()
    .default("active"),
  dueDate: integer("due_date", { mode: "timestamp" }),
  completedAt: integer("completed_at", { mode: "timestamp" }),
  /** JSON checklist: [{ id, title, done }] */
  checklist: text("checklist"),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

export const routines = sqliteTable("routines", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description"),
  frequency: text("frequency", { enum: ["daily", "weekly", "monthly"] })
    .notNull()
    .default("daily"),
  weeklyDays: text("weekly_days"),
  timeOfDay: text("time_of_day"),
  color: text("color").notNull().default("#8b5cf6"),
  icon: text("icon").notNull().default("sunrise"),
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

export const routineCompletions = sqliteTable("routine_completions", {
  id: text("id").primaryKey(),
  routineId: text("routine_id")
    .notNull()
    .references(() => routines.id, { onDelete: "cascade" }),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  completedDate: text("completed_date").notNull(),
  note: text("note"),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

export const usersRelations = relations(users, ({ many }) => ({
  accounts: many(accounts),
  categories: many(categories),
  transactions: many(transactions),
  transfers: many(transfers),
  budgets: many(budgets),
  debts: many(debts),
}));

export const accountsRelations = relations(accounts, ({ one, many }) => ({
  user: one(users, { fields: [accounts.userId], references: [users.id] }),
  transactions: many(transactions),
}));

export const categoriesRelations = relations(categories, ({ one, many }) => ({
  user: one(users, { fields: [categories.userId], references: [users.id] }),
  transactions: many(transactions),
  budgets: many(budgets),
}));

export const transactionsRelations = relations(transactions, ({ one }) => ({
  user: one(users, { fields: [transactions.userId], references: [users.id] }),
  account: one(accounts, {
    fields: [transactions.accountId],
    references: [accounts.id],
  }),
  category: one(categories, {
    fields: [transactions.categoryId],
    references: [categories.id],
  }),
}));

export const debtsRelations = relations(debts, ({ one, many }) => ({
  user: one(users, { fields: [debts.userId], references: [users.id] }),
  payments: many(debtPayments),
}));

export type User = typeof users.$inferSelect;
export type Account = typeof accounts.$inferSelect;
export type Category = typeof categories.$inferSelect;
export type Transaction = typeof transactions.$inferSelect;
export type Transfer = typeof transfers.$inferSelect;
export type Budget = typeof budgets.$inferSelect;
export type Debt = typeof debts.$inferSelect;
export type DebtPayment = typeof debtPayments.$inferSelect;
export type Goal = typeof goals.$inferSelect;
export type GoalContribution = typeof goalContributions.$inferSelect;
export type CategoryRule = typeof categoryRules.$inferSelect;
export type UserSettings = typeof userSettings.$inferSelect;
export type RecurringTransaction = typeof recurringTransactions.$inferSelect;
export type Asset = typeof assets.$inferSelect;
export type Todo = typeof todos.$inferSelect;
export type Routine = typeof routines.$inferSelect;

// --- NUTRITION & CALORIES ---
export const meals = sqliteTable("meals", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  mealType: text("meal_type", { enum: ["breakfast", "lunch", "dinner", "snack"] }).notNull(),
  date: text("date").notNull(),
  name: text("name").notNull(),
  calories: integer("calories").notNull().default(0),
  protein: integer("protein").notNull().default(0),
  carbs: integer("carbs").notNull().default(0),
  fat: integer("fat").notNull().default(0),
  note: text("note"),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

export const waterLogs = sqliteTable("water_logs", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  date: text("date").notNull(),
  amountMl: integer("amount_ml").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

// --- FITNESS & BODY ---
export const workouts = sqliteTable("workouts", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  type: text("type", { enum: ["strength", "cardio", "walk", "flexibility", "other"] }).notNull(),
  durationMinutes: integer("duration_minutes").notNull(),
  caloriesBurned: integer("calories_burned").notNull().default(0),
  date: text("date").notNull(),
  notes: text("notes"),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

export const bodyMetrics = sqliteTable("body_metrics", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  date: text("date").notNull(),
  weightKg: integer("weight_kg").notNull(),
  bodyFat: integer("body_fat"),
  note: text("note"),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

// --- GROWTH, BOOKS & COURSES ---
export const books = sqliteTable("books", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  author: text("author").notNull(),
  totalPages: integer("total_pages").notNull(),
  currentPage: integer("current_page").notNull().default(0),
  status: text("status", { enum: ["want_to_read", "reading", "completed"] })
    .notNull()
    .default("reading"),
  rating: integer("rating"),
  category: text("category").notNull().default("توسعه فردی"),
  notes: text("notes"),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

export const courses = sqliteTable("courses", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  platform: text("platform").notNull().default("Online"),
  totalLessons: integer("total_lessons").notNull(),
  completedLessons: integer("completed_lessons").notNull().default(0),
  status: text("status", { enum: ["in_progress", "completed"] })
    .notNull()
    .default("in_progress"),
  notes: text("notes"),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

// --- FOCUS & POMODORO ---
export const focusSessions = sqliteTable("focus_sessions", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  taskName: text("task_name").notNull(),
  durationMinutes: integer("duration_minutes").notNull().default(25),
  category: text("category", { enum: ["work", "study", "coding", "personal"] }).notNull().default("work"),
  date: text("date").notNull(),
  todoId: text("todo_id").references(() => todos.id, { onDelete: "set null" }),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

// --- DAILY JOURNAL & MOOD ---
export const dailyJournals = sqliteTable("daily_journals", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  date: text("date").notNull(),
  mood: text("mood", { enum: ["great", "good", "neutral", "tired", "bad"] }).notNull().default("good"),
  gratitude: text("gratitude"),
  highlights: text("highlights"),
  notes: text("notes"),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

// --- VEHICLE & MAINTENANCE ---
export const vehicleServices = sqliteTable("vehicle_services", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  vehicleName: text("vehicle_name").notNull(),
  serviceType: text("service_type", {
    enum: ["oil_change", "filter", "brake_pads", "insurance", "inspection", "tires", "other"],
  }).notNull(),
  currentMileage: integer("current_mileage").notNull().default(0),
  nextDueMileage: integer("next_due_mileage"),
  serviceDate: text("service_date").notNull(),
  nextDueDate: text("next_due_date"),
  cost: integer("cost").notNull().default(0),
  notes: text("notes"),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

// --- CYCLE / PERIOD TRACKING ---
export const cycleSettings = sqliteTable("cycle_settings", {
  userId: text("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  avgCycleLength: integer("avg_cycle_length").notNull().default(28),
  avgPeriodLength: integer("avg_period_length").notNull().default(5),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

export const cycleEntries = sqliteTable("cycle_entries", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  date: text("date").notNull(),
  kind: text("kind", {
    enum: ["period_start", "period_end", "symptom", "note"],
  }).notNull(),
  symptoms: text("symptoms"),
  flow: text("flow", { enum: ["light", "medium", "heavy", "spotting"] }),
  notes: text("notes"),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

// --- GROUPS & SHARED MOOD ---
export const groups = sqliteTable("groups", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  inviteCode: text("invite_code").notNull().unique(),
  ownerId: text("owner_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

export const groupMembers = sqliteTable("group_members", {
  id: text("id").primaryKey(),
  groupId: text("group_id")
    .notNull()
    .references(() => groups.id, { onDelete: "cascade" }),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  role: text("role", { enum: ["owner", "member"] }).notNull().default("member"),
  joinedAt: integer("joined_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

export const groupMoodShares = sqliteTable("group_mood_shares", {
  id: text("id").primaryKey(),
  groupId: text("group_id")
    .notNull()
    .references(() => groups.id, { onDelete: "cascade" }),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  mood: text("mood", {
    enum: ["great", "good", "neutral", "tired", "bad"],
  }).notNull(),
  note: text("note"),
  date: text("date").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

export const groupShoppingItems = sqliteTable("group_shopping_items", {
  id: text("id").primaryKey(),
  groupId: text("group_id")
    .notNull()
    .references(() => groups.id, { onDelete: "cascade" }),
  createdBy: text("created_by")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  qty: text("qty"),
  done: integer("done", { mode: "boolean" }).notNull().default(false),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

export const groupTasks = sqliteTable("group_tasks", {
  id: text("id").primaryKey(),
  groupId: text("group_id")
    .notNull()
    .references(() => groups.id, { onDelete: "cascade" }),
  createdBy: text("created_by")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  done: integer("done", { mode: "boolean" }).notNull().default(false),
  assigneeName: text("assignee_name"),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

export const groupExpenses = sqliteTable("group_expenses", {
  id: text("id").primaryKey(),
  groupId: text("group_id")
    .notNull()
    .references(() => groups.id, { onDelete: "cascade" }),
  createdBy: text("created_by")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  amount: integer("amount").notNull(),
  category: text("category").notNull().default("عمومی"),
  date: text("date").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

/** Group petty cash (تنخواه) — monthly float with manager + receipted spends */
export const groupPettyCash = sqliteTable("group_petty_cash", {
  id: text("id").primaryKey(),
  groupId: text("group_id")
    .notNull()
    .references(() => groups.id, { onDelete: "cascade" }),
  managerUserId: text("manager_user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  year: integer("year").notNull(),
  month: integer("month").notNull(),
  monthlyBudget: integer("monthly_budget").notNull().default(0),
  title: text("title").notNull().default("تنخواه"),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

export const groupPettyCashItems = sqliteTable("group_petty_cash_items", {
  id: text("id").primaryKey(),
  pettyCashId: text("petty_cash_id")
    .notNull()
    .references(() => groupPettyCash.id, { onDelete: "cascade" }),
  groupId: text("group_id")
    .notNull()
    .references(() => groups.id, { onDelete: "cascade" }),
  createdBy: text("created_by")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  amount: integer("amount").notNull(),
  date: text("date").notNull(),
  notes: text("notes"),
  receiptPath: text("receipt_path"),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

export const weeklyInsights = sqliteTable("weekly_insights", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  weekStart: text("week_start").notNull(),
  locale: text("locale", { enum: ["fa", "en"] }).notNull().default("fa"),
  content: text("content").notNull(),
  suggestionsJson: text("suggestions_json"),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

export const sleepLogs = sqliteTable("sleep_logs", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  date: text("date").notNull(),
  bedtime: text("bedtime"),
  wakeTime: text("wake_time"),
  hours: integer("hours"),
  quality: integer("quality").notNull().default(3),
  energy: integer("energy").notNull().default(3),
  notes: text("notes"),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

export const medications = sqliteTable("medications", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  dose: text("dose"),
  schedule: text("schedule", {
    enum: ["daily", "twice_daily", "as_needed", "weekly"],
  })
    .notNull()
    .default("daily"),
  reminderHour: integer("reminder_hour").notNull().default(9),
  active: integer("active", { mode: "boolean" }).notNull().default(true),
  notes: text("notes"),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

export const medicationLogs = sqliteTable("medication_logs", {
  id: text("id").primaryKey(),
  medicationId: text("medication_id")
    .notNull()
    .references(() => medications.id, { onDelete: "cascade" }),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  date: text("date").notNull(),
  taken: integer("taken", { mode: "boolean" }).notNull().default(true),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

export const trips = sqliteTable("trips", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  place: text("place"),
  startDate: text("start_date").notNull(),
  endDate: text("end_date"),
  budget: integer("budget").notNull().default(0),
  notes: text("notes"),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

export const tripExpenses = sqliteTable("trip_expenses", {
  id: text("id").primaryKey(),
  tripId: text("trip_id")
    .notNull()
    .references(() => trips.id, { onDelete: "cascade" }),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  amount: integer("amount").notNull(),
  category: text("category").notNull().default("سایر"),
  date: text("date").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

export const habits = sqliteTable("habits", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  color: text("color").notNull().default("#10b981"),
  /** Cue / trigger text e.g. "بعد از صبحانه" */
  cue: text("cue"),
  /** Preferred time slot label e.g. morning/evening or HH:mm */
  timeOfDay: text("time_of_day"),
  active: integer("active", { mode: "boolean" }).notNull().default(true),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

export const habitCompletions = sqliteTable("habit_completions", {
  id: text("id").primaryKey(),
  habitId: text("habit_id")
    .notNull()
    .references(() => habits.id, { onDelete: "cascade" }),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  date: text("date").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

export type Meal = typeof meals.$inferSelect;
export type WaterLog = typeof waterLogs.$inferSelect;
export type Workout = typeof workouts.$inferSelect;
export type BodyMetric = typeof bodyMetrics.$inferSelect;
export type Book = typeof books.$inferSelect;
export type Course = typeof courses.$inferSelect;
export type FocusSession = typeof focusSessions.$inferSelect;
export type DailyJournal = typeof dailyJournals.$inferSelect;
export type VehicleService = typeof vehicleServices.$inferSelect;
export type CycleEntry = typeof cycleEntries.$inferSelect;
export type Group = typeof groups.$inferSelect;
export type GroupMoodShare = typeof groupMoodShares.$inferSelect;
export type SleepLog = typeof sleepLogs.$inferSelect;
export type Medication = typeof medications.$inferSelect;
export type Trip = typeof trips.$inferSelect;
export type Habit = typeof habits.$inferSelect;



export const periodRecords = sqliteTable("period_records", {
  id: text("id").primaryKey(), userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  startDate: text("start_date").notNull(), endDate: text("end_date"), notes: text("notes"), legacyStartId: text("legacy_start_id"),
  archived: integer("archived", { mode: "boolean" }).notNull().default(false), createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
}, table => [uniqueIndex("period_records_user_start").on(table.userId, table.startDate)]);
export const cycleDailyLogs = sqliteTable("cycle_daily_logs", {
  id: text("id").primaryKey(), userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  date: text("date").notNull(), flow: text("flow").notNull().default("none"), pain: integer("pain").notNull().default(0),
  mood: text("mood").notNull().default("neutral"), symptoms: text("symptoms").notNull().default("[]"), notes: text("notes"),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
}, table => [uniqueIndex("cycle_daily_logs_user_date").on(table.userId, table.date)]);
export const selfCareItems = sqliteTable("self_care_items", {
  id: text("id").primaryKey(), userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  title: text("title").notNull(), description: text("description"), category: text("category").notNull().default("personal"),
  timeOfDay: text("time_of_day").notNull().default("anytime"), weekdays: text("weekdays").notNull().default("[0,1,2,3,4,5,6]"),
  targetValue: real("target_value").notNull().default(1), unit: text("unit").notNull().default("بار"),
  archived: integer("archived", { mode: "boolean" }).notNull().default(false), createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
});
export const selfCareLogs = sqliteTable("self_care_logs", {
  id: text("id").primaryKey(), userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  itemId: text("item_id").notNull().references(() => selfCareItems.id, { onDelete: "cascade" }), date: text("date").notNull(),
  value: real("value").notNull().default(0), targetValue: real("target_value").notNull(), titleSnapshot: text("title_snapshot").notNull(), unitSnapshot: text("unit_snapshot").notNull(),
  notes: text("notes"), updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
}, table => [uniqueIndex("self_care_logs_item_date").on(table.itemId, table.date)]);
