
import Database from "@tauri-apps/plugin-sql";
import { join, executableDir } from "@tauri-apps/api/path";
import { getCurrentUserId } from "./session";

export interface Category {
  id: string;
  name: string;
  icon: string;
  color: string;
  is_mandatory: boolean;
  budget_limit: number | null;
  due_day: number | null;
  created_at: string;
}

export type TxType = "expense" | "income";

export interface Transaction {
  id: string;
  type: TxType;
  amount: number;
  category_id: string | null;
  source?: string | null;
  date: string;
  comment?: string | null;
  payment_method?: "debit" | "card";
  card_id?: string | null;
  goal_id?: string | null;
  created_at: string;
  credit_due_date?: string | null;
  receipt_image?: string | null;
}

export interface Goal {
  id: string;
  name: string;
  target: number;
  saved: number;
  deadline: string | null;
  color: string;
  created_at: string;
}

export interface CreditCard {
  id: string;
  name: string;
  limit: number;
  grace_days: number;
  statement_day: number;
  created_at: string;
}

export interface PersonalDebt {
  id: string;
  name: string;
  type: 'i_owe' | 'owe_me';
  amount: number;
  due_date: string | null;
  description: string | null;
  is_settled: 0 | 1;
  settled_at: string | null;
}

export interface LocalUser {
  id: string;
  login: string;
  password_hash: string;
  security_question: string;
  security_answer_hash: string;
  created_at: string;
}

let dbPromise: Promise<Database> | null = null;

function uid(): string {
  return crypto.randomUUID();
}

function requireUserId(): string {
  const id = getCurrentUserId();
  if (!id) throw new Error("Сессия не активна");
  return id;
}

async function getDb(): Promise<Database> {
  if (dbPromise) return dbPromise;
  dbPromise = (async () => {
    // Исправляем синтаксис Tauri v2 на чистый URL подключения!
    const db = await Database.load("sqlite:finance.db");
    await initSchema(db);
    return db;
  })();
  return dbPromise;
}

async function initSchema(db: Database): Promise<void> {
  await db.execute(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      login TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      security_question TEXT NOT NULL,
      security_answer_hash TEXT NOT NULL,
      created_at TEXT NOT NULL
    )
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS categories (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      name TEXT NOT NULL,
      icon TEXT NOT NULL,
      color TEXT NOT NULL,
      is_mandatory INTEGER NOT NULL DEFAULT 0,
      budget_limit REAL,
      due_day INTEGER,
      created_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS credit_cards (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      name TEXT NOT NULL,
      "limit" REAL NOT NULL DEFAULT 0,
      grace_days INTEGER NOT NULL DEFAULT 55,
      statement_day INTEGER NOT NULL DEFAULT 10,
      created_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS financial_goals (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      name TEXT NOT NULL,
      target REAL NOT NULL,
      saved REAL NOT NULL DEFAULT 0,
      deadline TEXT,
      color TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS transactions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      type TEXT NOT NULL CHECK(type IN ('expense','income')),
      amount REAL NOT NULL,
      category_id TEXT,
      source TEXT,
      date TEXT NOT NULL,
      comment TEXT,
      payment_method TEXT DEFAULT 'debit',
      card_id TEXT,
      goal_id TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL,
      FOREIGN KEY (card_id) REFERENCES credit_cards(id) ON DELETE SET NULL,
      FOREIGN KEY (goal_id) REFERENCES financial_goals(id) ON DELETE SET NULL
    )
  `);
  

  await db.execute("CREATE INDEX IF NOT EXISTS idx_categories_user ON categories(user_id)");
  await db.execute("CREATE INDEX IF NOT EXISTS idx_transactions_user ON transactions(user_id)");
  await db.execute("CREATE INDEX IF NOT EXISTS idx_goals_user ON financial_goals(user_id)");
  await db.execute("CREATE INDEX IF NOT EXISTS idx_cards_user ON credit_cards(user_id)");
  try {
    await db.execute("ALTER TABLE transactions ADD COLUMN credit_due_date TEXT;");
  } catch (e) { /* Уже есть */ }

  try {
    await db.execute("ALTER TABLE transactions ADD COLUMN receipt_image TEXT;");
  } catch (e) { /* Уже есть */ }

  try {
	await db.execute(`
	  CREATE TABLE IF NOT EXISTS personal_debts (
		id TEXT PRIMARY KEY,
		user_id TEXT NOT NULL,
		name TEXT NOT NULL,
		type TEXT NOT NULL,
		amount REAL NOT NULL,
		due_date TEXT,
		description TEXT,
		is_settled INTEGER DEFAULT 0,
		settled_at TEXT,  -- 👈 ДОБАВЛЯЕМ ЭТУ СТРОКУ
		created_at TEXT DEFAULT CURRENT_TIMESTAMP,
		FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
	  );
	`);
  } catch (e) { console.error("Ошибка миграции долгов:", e); }
}


function rowToCategory(row: Record<string, unknown>): Category {
  return {
    id: String(row.id),
    name: String(row.name),
    icon: String(row.icon),
    color: String(row.color),
    is_mandatory: Boolean(row.is_mandatory),
    budget_limit: row.budget_limit != null ? Number(row.budget_limit) : null,
    due_day: row.due_day != null ? Number(row.due_day) : null,
    created_at: String(row.created_at),
  };
}

function rowToTransaction(row: Record<string, unknown>): Transaction {
  return {
    id: String(row.id),
    type: row.type as TxType,
    amount: Number(row.amount),
    category_id: row.category_id != null ? String(row.category_id) : null,
    source: row.source != null ? String(row.source) : null,
    date: String(row.date),
    comment: row.comment != null ? String(row.comment) : null,
    payment_method: (row.payment_method as "debit" | "card") ?? "debit",
    card_id: row.card_id != null ? String(row.card_id) : null,
    goal_id: row.goal_id != null ? String(row.goal_id) : null,
    created_at: String(row.created_at),
	credit_due_date: row.credit_due_date !== null ? String(row.credit_due_date) : null,
    receipt_image: row.receipt_image !== null ? String(row.receipt_image) : null,
  };
}

function rowToGoal(row: Record<string, unknown>): Goal {
  return {
    id: String(row.id),
    name: String(row.name),
    target: Number(row.target),
    saved: Number(row.saved),
    deadline: row.deadline != null ? String(row.deadline) : null,
    color: String(row.color),
    created_at: String(row.created_at),
  };
}

function rowToCard(row: Record<string, unknown>): CreditCard {
  return {
    id: String(row.id),
    name: String(row.name),
    limit: Number(row.limit),
    grace_days: Number(row.grace_days),
    statement_day: Number(row.statement_day),
    created_at: String(row.created_at),
  };
}

function rowToUser(row: Record<string, unknown>): LocalUser {
  return {
    id: String(row.id),
    login: String(row.login),
    password_hash: String(row.password_hash),
    security_question: String(row.security_question),
    security_answer_hash: String(row.security_answer_hash),
    created_at: String(row.created_at),
  };
}

// ----- Users (auth) -----
export async function findUserByLogin(login: string): Promise<LocalUser | null> {
  const db = await getDb();
  const rows = await db.select<Record<string, unknown>[]>(
    "SELECT * FROM users WHERE login = ? LIMIT 1",
    [login.trim().toLowerCase()],
  );
  return rows[0] ? rowToUser(rows[0]) : null;
}

export async function createUser(
  login: string,
  passwordHash: string,
  securityQuestion: string,
  securityAnswerHash: string,
): Promise<LocalUser> {
  const db = await getDb();
  const user: LocalUser = {
    id: uid(),
    login: login.trim().toLowerCase(),
    password_hash: passwordHash,
    security_question: securityQuestion.trim(),
    security_answer_hash: securityAnswerHash,
    created_at: new Date().toISOString(),
  };
  await db.execute(
    `INSERT INTO users (id, login, password_hash, security_question, security_answer_hash, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [user.id, user.login, user.password_hash, user.security_question, user.security_answer_hash, user.created_at],
  );
  return user;
}

export async function ensureUserExists(): Promise<void> {
  const db = await getDb();
  const userId = getCurrentUserId();
  if (!userId) {
    console.warn('⚠️ Нет активной сессии');
    return;
  }
  
  const rows = await db.select<Record<string, unknown>[]>(
    "SELECT id FROM users WHERE id = ?",
    [userId]
  );
  
  if (rows.length === 0) {
    console.log('👤 Создаём пользователя в БД:', userId);
    await db.execute(
      `INSERT INTO users (id, login, password_hash, security_question, security_answer_hash, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [userId, 'default', 'default', 'default', 'default', new Date().toISOString()]
    );
  }
}

export async function updateUserPassword(userId: string, passwordHash: string): Promise<void> {
  const db = await getDb();
  await db.execute("UPDATE users SET password_hash = ? WHERE id = ?", [passwordHash, userId]);
}

// ----- Categories -----
export async function getAllCategories(): Promise<Category[]> {
  const db = await getDb();
  const userId = requireUserId();
  const rows = await db.select<Record<string, unknown>[]>(
    "SELECT * FROM categories WHERE user_id = ? ORDER BY created_at",
    [userId],
  );
  return rows.map(rowToCategory);
}

export async function putCategory(c: Category): Promise<void> {
  const db = await getDb();
  const userId = requireUserId();
  await db.execute(
    `INSERT INTO categories (id, user_id, name, icon, color, is_mandatory, budget_limit, due_day, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       name = excluded.name,
       icon = excluded.icon,
       color = excluded.color,
       is_mandatory = excluded.is_mandatory,
       budget_limit = excluded.budget_limit,
       due_day = excluded.due_day`,
    [
      c.id,
      userId,
      c.name,
      c.icon,
      c.color,
      c.is_mandatory ? 1 : 0,
      c.budget_limit,
      c.due_day,
      c.created_at,
    ],
  );
}

export async function deleteCategory(id: string): Promise<void> {
  const db = await getDb();
  const userId = requireUserId();
  await db.execute("DELETE FROM categories WHERE id = ? AND user_id = ?", [id, userId]);
}

// ----- Transactions -----
export async function getAllTransactions(): Promise<Transaction[]> {
  const db = await getDb();
  const userId = requireUserId();
  const rows = await db.select<Record<string, unknown>[]>(
    "SELECT * FROM transactions WHERE user_id = ? ORDER BY date DESC, created_at DESC",
    [userId],
  );
  return rows.map(rowToTransaction);
}

export async function putTransaction(t: Transaction): Promise<void> {
  const db = await getDb();
  const userId = requireUserId();
  await db.execute(
    `INSERT INTO transactions 
    (id, user_id, type, amount, category_id, source, date, comment, payment_method, card_id, goal_id, credit_due_date, receipt_image, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      type = excluded.type,
      amount = excluded.amount,
      category_id = excluded.category_id,
      source = excluded.source,
      date = excluded.date,
      comment = excluded.comment,
      payment_method = excluded.payment_method,
      card_id = excluded.card_id,
      goal_id = excluded.goal_id,
      credit_due_date = excluded.credit_due_date,
      receipt_image = excluded.receipt_image`,
    [
      t.id,
      userId,
      t.type,
      t.amount,
      t.category_id,
      t.source ?? null,
      t.date,
      t.comment ?? null,
      t.payment_method ?? "debit",
      t.card_id ?? null,
      t.goal_id ?? null,
      t.credit_due_date ?? null, // Добавили точный дедлайн в массив данных
      t.receipt_image ?? null,    // Добавили картинку чека в массив данных
      t.created_at,
    ]
  );
}

export async function deleteTransaction(id: string): Promise<void> {
  const db = await getDb();
  const userId = requireUserId();
  await db.execute("DELETE FROM transactions WHERE id = ? AND user_id = ?", [id, userId]);
}

// ----- Goals -----
export async function getAllGoals(): Promise<Goal[]> {
  const db = await getDb();
  const userId = requireUserId();
  const rows = await db.select<Record<string, unknown>[]>(
    "SELECT * FROM financial_goals WHERE user_id = ? ORDER BY created_at",
    [userId],
  );
  return rows.map(rowToGoal);
}

export async function putGoal(g: Goal): Promise<void> {
  const db = await getDb();
  const userId = requireUserId();
  await db.execute(
    `INSERT INTO financial_goals (id, user_id, name, target, saved, deadline, color, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       name = excluded.name,
       target = excluded.target,
       saved = excluded.saved,
       deadline = excluded.deadline,
       color = excluded.color`,
    [g.id, userId, g.name, g.target, g.saved, g.deadline, g.color, g.created_at],
  );
}

export async function addProgressToGoal(id: string, amount: number): Promise<void> {
  const db = await getDb();
  const userId = requireUserId();
  
  await db.execute(
    "UPDATE financial_goals SET saved = saved + ? WHERE id = ? AND user_id = ?",
    [amount, id, userId]
  );
}

export async function deleteGoal(id: string): Promise<void> {
  const db = await getDb();
  const userId = requireUserId();
  await db.execute("DELETE FROM financial_goals WHERE id = ? AND user_id = ?", [id, userId]);
}

// ----- Credit cards -----
export async function getAllCards(): Promise<CreditCard[]> {
  const db = await getDb();
  const userId = requireUserId();
  const rows = await db.select<Record<string, unknown>[]>(
    'SELECT * FROM credit_cards WHERE user_id = ? ORDER BY created_at',
    [userId],
  );
  return rows.map(rowToCard);
}

export async function updateTransactionExtra(id: string, dueDate: string | null, receiptImg: string | null): Promise<void> {
  const db = await getDb();
  const userId = requireUserId();
  await db.execute(
    "UPDATE transactions SET credit_due_date = ?, receipt_image = ? WHERE id = ? AND user_id = ?",
    [dueDate, receiptImg, id, userId]
  );
}

// Получить активные дедлайны по кредиткам для виджета на Главной
export async function getActiveCreditDeadlines(): Promise<any[]> {
  const db = await getDb();
  const userId = requireUserId();
  // Выбираем только расходы по кредиткам, где есть дедлайн, и цепляем имя карты из credit_cards
  return await db.select(`
    SELECT t.id, t.amount, t.credit_due_date, c.name as card_name, t.comment
    FROM transactions t
    JOIN credit_cards c ON t.card_id = c.id
    WHERE t.user_id = ? AND t.type = 'expense' AND t.payment_method = 'card' AND t.credit_due_date IS NOT NULL AND t.credit_due_date != ''
    ORDER BY t.credit_due_date ASC
  `, [userId]);
}


// --- ФУНКЦИИ ДЛЯ РАБОТЫ С ДОЛГАМИ ФИЗЛИЦ ---

// Добавить новый долг
export async function addPersonalDebt(
  name: string, 
  type: 'i_owe' | 'owe_me', 
  amount: number, 
  dueDate?: string, 
  description?: string
): Promise<void> {
  const db = await getDb();
  const userId = requireUserId();
  const id = crypto.randomUUID();
  await db.execute(
    "INSERT INTO personal_debts (id, user_id, name, type, amount, due_date, description, is_settled, settled_at) VALUES (?, ?, ?, ?, ?, ?, ?, 0, NULL)",
    [id, userId, name, type, amount, dueDate || null, description || null]
  );
}

// Получить активные (незакрытые) долги физлиц
export async function getActivePersonalDebts(): Promise<any[]> {
  const db = await getDb();
  const userId = requireUserId();
  return await db.select(
    "SELECT * FROM personal_debts WHERE user_id = ? AND is_settled = 0 ORDER BY due_date ASC",
    [userId]
  );
}

// Закрыть долг (отметить как выплаченный)
export async function settlePersonalDebt(id: string): Promise<void> {
  const db = await getDb();
  await db.execute("UPDATE personal_debts SET is_settled = 1 WHERE id = ?", [id]);
}

export async function putCard(c: CreditCard): Promise<void> {
  const db = await getDb();
  const userId = requireUserId();
  await db.execute(
    `INSERT INTO credit_cards (id, user_id, name, "limit", grace_days, statement_day, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       name = excluded.name,
       "limit" = excluded."limit",
       grace_days = excluded.grace_days,
       statement_day = excluded.statement_day`,
    [c.id, userId, c.name, c.limit, c.grace_days, c.statement_day, c.created_at],
  );
}

export async function deleteCard(id: string): Promise<void> {
  const db = await getDb();
  const userId = requireUserId();
  await db.execute("DELETE FROM credit_cards WHERE id = ? AND user_id = ?", [id, userId]);
}

// ----- Seed data -----
export const SEED_CATEGORIES: Omit<Category, "id" | "created_at">[] = [
  { name: "Кредиты", icon: "landmark", color: "#ef4444", is_mandatory: true, budget_limit: 15000, due_day: 5 },
  { name: "Ипотека", icon: "building", color: "#a855f7", is_mandatory: true, budget_limit: 35000, due_day: 1 },
  { name: "Подписки", icon: "repeat", color: "#06b6d4", is_mandatory: true, budget_limit: 2000, due_day: 15 },
  { name: "Еда", icon: "utensils", color: "#22c55e", is_mandatory: false, budget_limit: null, due_day: null },
  { name: "Машина", icon: "car", color: "#3b82f6", is_mandatory: false, budget_limit: null, due_day: null },
  { name: "Бензин", icon: "fuel", color: "#14b8a6", is_mandatory: false, budget_limit: null, due_day: null },
];

export async function seedIfEmpty(): Promise<void> {
  const existing = await getAllCategories();
  if (existing.length > 0) return;
  const now = new Date().toISOString();
  for (const c of SEED_CATEGORIES) {
    await putCategory({ ...c, id: uid(), created_at: now });
  }
}

// --- ФУНКЦИИ ДЛЯ РАБОТЫ С ДОЛГАМИ (ИСПРАВЛЕННЫЕ) ---

export async function getAllDebts(): Promise<PersonalDebt[]> {
  const db = await getDb();
  const userId = requireUserId();
  const rows = await db.select<Record<string, unknown>[]>(
    "SELECT id, name, type, amount, due_date, description, is_settled, settled_at FROM personal_debts WHERE user_id = ? ORDER BY created_at DESC",
    [userId]
  );
  return rows.map(rowToPersonalDebt);
}

function rowToPersonalDebt(row: Record<string, unknown>): PersonalDebt {
  return {
    id: String(row.id),
    name: String(row.name),
    type: row.type as 'i_owe' | 'owe_me',
    amount: Number(row.amount),
    due_date: row.due_date ? String(row.due_date) : null,
    description: row.description ? String(row.description) : null,
    is_settled: Number(row.is_settled) as 0 | 1,
    settled_at: row.settled_at ? String(row.settled_at) : null,
  };
}

export async function putDebt(debt: PersonalDebt): Promise<void> {
  const db = await getDb();
  const userId = requireUserId();
  await db.execute(
    `INSERT INTO personal_debts (id, user_id, name, type, amount, due_date, description, is_settled, settled_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       name = excluded.name,
       type = excluded.type,
       amount = excluded.amount,
       due_date = excluded.due_date,
       description = excluded.description,
       is_settled = excluded.is_settled,
       settled_at = excluded.settled_at`,
    [
      debt.id,
      userId,
      debt.name,
      debt.type,
      debt.amount,
      debt.due_date || null,
      debt.description || null,
      debt.is_settled || 0,
      debt.settled_at || null,
    ]
  );
}

export async function deleteDebt(id: string): Promise<void> {
  const db = await getDb();
  const userId = requireUserId();
  await db.execute("DELETE FROM personal_debts WHERE id = ? AND user_id = ?", [id, userId]);
}

export async function settleDebt(id: string): Promise<void> {
  const db = await getDb();
  const userId = requireUserId();
  const now = new Date().toISOString();
  console.log('🔧 settleDebt:', { id, userId, now });
  await db.execute(
    "UPDATE personal_debts SET is_settled = 1, settled_at = ? WHERE id = ? AND user_id = ?",
    [now, id, userId]
  );
  console.log('✅ settleDebt выполнен');
}