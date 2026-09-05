import type { Category, Transaction } from "./api";
import { safeNum, isSameMonth } from "./format";

export interface PaceWarning {
  categoryId: string;
  spent: number;
  limit: number;
  spentPct: number; // % of limit spent
  timePct: number; // % of month elapsed
  overspend: boolean; // spending faster than time
  message: string;
}

/**
 * Compare spending pace vs. time elapsed for non-mandatory categories that
 * have a budget_limit. If spentPct > timePct by a meaningful margin, flag it.
 */
export function checkPaceWarnings(categories: Category[], transactions: Transaction[]): PaceWarning[] {
  const now = new Date();
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const dayOfMonth = now.getDate();
  const timePct = (dayOfMonth / daysInMonth) * 100;

  const warnings: PaceWarning[] = [];

  for (const c of categories) {
    if (c.is_mandatory) continue;
    const limit = safeNum(c.budget_limit);
    if (limit <= 0) continue;

    const spent = transactions
      .filter((t) => t.type === "expense" && t.category_id === c.id && isSameMonth(t.date))
      .reduce((s, t) => s + safeNum(t.amount), 0);

    if (spent <= 0) continue;

    const spentPct = (spent / limit) * 100;

    // Overspend if spending pace exceeds time pace by 15+ points
    if (spentPct > timePct + 15) {
      warnings.push({
        categoryId: c.id,
        spent: Math.round(spent),
        limit: Math.round(limit),
        spentPct,
        timePct,
        overspend: true,
        message: "Превышение темпа трат! Рекомендуется снизить расходы по этой категории",
      });
    }
  }

  return warnings;
}

/** Map of categoryId -> warning for quick lookup. */
export function paceWarningMap(categories: Category[], transactions: Transaction[]): Map<string, PaceWarning> {
  return new Map(checkPaceWarnings(categories, transactions).map((w) => [w.categoryId, w]));
}

export interface UpcomingPayment {
  category: Category;
  dueDate: Date;
  daysUntil: number;
  amount: number;
}

/**
 * Scan mandatory categories and find payments due in the next 7 days.
 */
export function getUpcomingPayments(categories: Category[]): UpcomingPayment[] {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const result: UpcomingPayment[] = [];

  for (const c of categories) {
    if (!c.is_mandatory || !c.payment_day) continue;
    const amount = safeNum(c.budget_limit);

    // This month's due date
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const dueDay = Math.min(c.payment_day, daysInMonth);
    let due = new Date(now.getFullYear(), now.getMonth(), dueDay);

    // If already passed this month, use next month
    if (due < now) {
      const nextDaysInMonth = new Date(now.getFullYear(), now.getMonth() + 2, 0).getDate();
      due = new Date(now.getFullYear(), now.getMonth() + 1, Math.min(c.payment_day, nextDaysInMonth));
    }

    const daysUntil = Math.round((due.getTime() - now.getTime()) / 86400000);
    if (daysUntil >= 0 && daysUntil <= 7) {
      result.push({ category: c, dueDate: due, daysUntil, amount });
    }
  }

  return result.sort((a, b) => a.daysUntil - b.daysUntil);
}
