import type { Category, Transaction } from "./api";
import { isSameMonth, safeNum } from "./format";

export interface SavingsResult {
  amount: number;
  advice: string;
}

/**
 * Smart savings advisor.
 *
 * 1. Target savings for the month = income * savingsRate (e.g. 10%).
 * 2. Free cash right now = income - mandatory limits - optional spending this month
 *    (only debit/cash spending counts; credit card purchases are bank money).
 * 3. Recommended portion = (monthly target / days in month) * days already passed.
 * 4. If free cash covers the recommended portion -> "You're saving, safe to stash X".
 *    Otherwise -> "Money is tight, don't save yet".
 */
export function computeSavings(
  incomeMonth: number,
  mandatoryLimitTotal: number,
  optionalSpentThisMonth: number,
  savingsRate: number,
): SavingsResult {
  const income = safeNum(incomeMonth);
  const mandatory = safeNum(mandatoryLimitTotal);
  const optionalSpent = safeNum(optionalSpentThisMonth);
  const rate = Math.max(0, Math.min(100, safeNum(savingsRate))) / 100;

  const freeNow = income - mandatory - optionalSpent;

  const now = new Date();
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const daysPassed = now.getDate();

  const targetSavings = income * rate;
  const recommended = daysInMonth > 0 ? (targetSavings / daysInMonth) * daysPassed : 0;

  if (freeNow > 0 && recommended > 0 && freeNow >= recommended) {
    return {
      amount: Math.round(recommended),
      advice: `Ты экономишь! Можно безопасно отложить ${Math.round(recommended).toLocaleString("ru-RU")} ₽ в копилку.`,
    };
  }

  return {
    amount: 0,
    advice: "Свободных денег мало, пока не откладывай.",
  };
}

/** Month income, excluding credit card repayments (which are money movements, not income). */
export function getMonthIncome(txs: Transaction[]): number {
  return txs
    .filter((t) => t.type === "income" && isSameMonth(t.date) && !t.credit_card_id)
    .reduce((s, t) => s + safeNum(t.amount), 0);
}

export function getMandatoryLimitTotal(cats: Category[]): number {
  return cats
    .filter((c) => c.is_mandatory)
    .reduce((s, c) => s + safeNum(c.budget_limit), 0);
}

/**
 * Optional (non-mandatory) spending this month — only debit/cash expenses
 * (credit card purchases don't reduce free cash, they create debt).
 */
export function getOptionalSpentThisMonth(txs: Transaction[], cats: Category[]): number {
  const mandatoryIds = new Set(cats.filter((c) => c.is_mandatory).map((c) => c.id));
  return txs
    .filter(
      (t) =>
        t.type === "expense" &&
        isSameMonth(t.date) &&
        t.category_id &&
        !mandatoryIds.has(t.category_id) &&
        t.payment_method !== "card",
    )
    .reduce((s, t) => s + safeNum(t.amount), 0);
}
