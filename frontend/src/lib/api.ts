// API layer — talks to Go backend at http://localhost:8080/api
// All CRUD functions return Promises, matching the old db.ts signatures
// but with renamed fields that match the backend models.

export interface Category {
  id: string;
  title: string;
  icon: string;
  color: string;
  is_mandatory: boolean;
  budget_limit: number | null;
  payment_day: number | null;
}

export type TxType = "expense" | "income";

export interface Transaction {
  id: string;
  type: TxType;
  amount: number;
  category_id: string | null;
  source: string | null;
  date: string;
  comment: string | null;
  payment_method: "debit" | "card";
  credit_card_id: string | null;
  goal_id: string | null;
  created_at: string;
}

export interface Goal {
  id: string;
  title: string;
  target_amount: number;
  current_amount: number;
  deadline: string | null;
  color: string;
}

export interface CreditCard {
  id: string;
  name: string;
  limit: number;
  balance: number;
  grace_days: number;
  statement_day: number;
}

const BASE = "http://localhost:8080/api";

async function apiGet<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`);
  if (!res.ok) throw new Error(`GET ${path}: ${res.status}`);
  return res.json();
}

async function apiPost<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`POST ${path}: ${res.status}`);
  return res.json();
}

async function apiPut<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`PUT ${path}: ${res.status}`);
  return res.json();
}

async function apiDelete(path: string): Promise<void> {
  const res = await fetch(`${BASE}${path}`, { method: "DELETE" });
  if (!res.ok) throw new Error(`DELETE ${path}: ${res.status}`);
}

// ── Categories ───────────────────────────────────────────

export async function getAllCategories(): Promise<Category[]> {
  return apiGet<Category[]>("/categories");
}

export async function putCategory(c: Category): Promise<void> {
  if (c.id) {
    await apiPut(`/categories/${c.id}`, c);
  } else {
    await apiPost("/categories", c);
  }
}

export async function deleteCategory(id: string): Promise<void> {
  await apiDelete(`/categories/${id}`);
}

// ── Transactions ─────────────────────────────────────────

export async function getAllTransactions(): Promise<Transaction[]> {
  return apiGet<Transaction[]>("/transactions");
}

export async function putTransaction(t: Transaction): Promise<void> {
  if (t.id) {
    await apiPut(`/transactions/${t.id}`, t);
  } else {
    await apiPost("/transactions", t);
  }
}

export async function deleteTransaction(id: string): Promise<void> {
  await apiDelete(`/transactions/${id}`);
}

// ── Goals ────────────────────────────────────────────────

export async function getAllGoals(): Promise<Goal[]> {
  return apiGet<Goal[]>("/goals");
}

export async function putGoal(g: Goal): Promise<void> {
  if (g.id) {
    await apiPut(`/goals/${g.id}`, g);
  } else {
    await apiPost("/goals", g);
  }
}

export async function deleteGoal(id: string): Promise<void> {
  await apiDelete(`/goals/${id}`);
}

// ── Credit Cards ─────────────────────────────────────────

export async function getAllCards(): Promise<CreditCard[]> {
  return apiGet<CreditCard[]>("/cards");
}

export async function putCard(c: CreditCard): Promise<void> {
  if (c.id) {
    await apiPut(`/cards/${c.id}`, c);
  } else {
    await apiPost("/cards", c);
  }
}

export async function deleteCard(id: string): Promise<void> {
  await apiDelete(`/cards/${c.id}`);
}

// ── Distribute savings ───────────────────────────────────

export async function distributeSavings(goalId: string, amount: number): Promise<void> {
  await apiPost("/savings/distribute", { goal_id: goalId, amount });
}

// ── Seed (no-op — backend auto-seeds on startup) ─────────

export async function seedIfEmpty(): Promise<void> {
  // The Go backend seeds default categories automatically on first run.
}

export const SEED_CATEGORIES: Omit<Category, "id">[] = [];
