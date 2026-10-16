import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
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
  onboardingCompleted: integer("onboarding_completed", { mode: "boolean" })
    .notNull()
    .default(false),
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

export type Meal = typeof meals.$inferSelect;
export type WaterLog = typeof waterLogs.$inferSelect;
export type Workout = typeof workouts.$inferSelect;
export type BodyMetric = typeof bodyMetrics.$inferSelect;
export type Book = typeof books.$inferSelect;
export type Course = typeof courses.$inferSelect;
export type FocusSession = typeof focusSessions.$inferSelect;
export type DailyJournal = typeof dailyJournals.$inferSelect;
export type VehicleService = typeof vehicleServices.$inferSelect;

