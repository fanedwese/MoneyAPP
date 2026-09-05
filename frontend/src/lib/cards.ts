import type { CreditCard, Transaction } from "./api";
import { safeNum, isSameMonth } from "./format";

export interface CardDebtInfo {
  debt: number;
  available: number;
  daysLeft: number;
  dueDate: string; // YYYY-MM-DD — grace period end
  hasDebt: boolean;
}

/**
 * Calculate the grace-period end date for a purchase made on `purchaseDateISO`.
 * Rule: the billing cycle starts on `statement_day` each month. A purchase
 * made after this month's statement day falls into next month's cycle.
 * Grace end = next statement day + grace_days.
 */
export function graceEndDate(card: CreditCard, purchaseDateISO: string): Date {
  const purchase = new Date(purchaseDateISO + "T00:00:00");
  const stmt = safeNum(card.statement_day) || 1;
  const grace = safeNum(card.grace_days) || 55;

  // This month's statement date
  const thisStmt = new Date(purchase.getFullYear(), purchase.getMonth(), stmt);

  // Next statement date (start of the cycle that includes this purchase's bill)
  let nextStmt: Date;
  if (purchase.getDate() >= stmt) {
    // after this month's statement — next month
    nextStmt = new Date(purchase.getFullYear(), purchase.getMonth() + 1, stmt);
  } else {
    // before this month's statement — same month
    nextStmt = thisStmt;
  }

  // Grace end = next statement + grace days
  const end = new Date(nextStmt);
  end.setDate(end.getDate() + grace);
  return end;
}

/**
 * Debt = sum of all card expenses in the current billing cycle that have not
 * been repaid. We approximate: all card expenses this month minus repayments
 * (income transactions with card_id) this month. Each card's cycle is its
 * statement_day; we count expenses from the last statement day forward.
 */
export function getCardDebt(card: CreditCard, transactions: Transaction[]): CardDebtInfo {
  const limit = safeNum(card.limit);
  const now = new Date();
  const stmt = safeNum(card.statement_day) || 1;

  // Current cycle start: this month's statement day, or last month's if we're before it.
  let cycleStart: Date;
  if (now.getDate() >= stmt) {
    cycleStart = new Date(now.getFullYear(), now.getMonth(), stmt);
  } else {
    cycleStart = new Date(now.getFullYear(), now.getMonth() - 1, stmt);
  }
  const cycleStartISO = toISO(cycleStart);

  const cardTxs = transactions.filter(
    (t) => t.credit_card_id === card.id && t.date >= cycleStartISO,
  );

  const spent = cardTxs
    .filter((t) => t.type === "expense")
    .reduce((s, t) => s + safeNum(t.amount), 0);
  const repaid = cardTxs
    .filter((t) => t.type === "income")
    .reduce((s, t) => s + safeNum(t.amount), 0);

  const debt = Math.max(0, spent - repaid);
  const available = Math.max(0, limit - debt);

  // Days left = grace end for the most recent purchase minus today.
  // If there's debt, find the earliest purchase in the cycle to compute the
  // soonest due date (worst case). Use the cycle's grace end.
  const cycleGraceEnd = new Date(cycleStart);
  // cycle covers purchases from cycleStart to next statement; grace end = next stmt + grace
  const nextStmt = new Date(cycleStart);
  nextStmt.setMonth(nextStmt.getMonth() + 1);
  const due = new Date(nextStmt);
  due.setDate(due.getDate() + (safeNum(card.grace_days) || 55));

  const daysLeft = Math.max(0, Math.ceil((due.getTime() - now.getTime()) / 86400000));

  return {
    debt: Math.round(debt),
    available: Math.round(available),
    daysLeft,
    dueDate: toISO(due),
    hasDebt: debt > 0,
  };
}

/** Total debt across all credit cards (for balance display). */
export function getTotalCardDebt(cards: CreditCard[], transactions: Transaction[]): number {
  return cards.reduce((s, c) => s + getCardDebt(c, transactions).debt, 0);
}

function toISO(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export { isSameMonth };
