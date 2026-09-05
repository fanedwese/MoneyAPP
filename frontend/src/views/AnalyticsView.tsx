import { useMemo, useState } from "react";
import { PieChart as PieIcon, BarChart3, X, ArrowLeft, AlertTriangle } from "lucide-react";
import type { Category, Transaction } from "@/lib/db";
import { formatMoney, safeNum, formatShortDate } from "@/lib/format";
import { getIcon } from "@/lib/icons";
import { paceWarningMap } from "@/lib/budget";

type Period = "week" | "month" | "year";

interface Props {
  categories: Category[];
  transactions: Transaction[];
}

export function AnalyticsView({ categories, transactions }: Props) {
  const [period, setPeriod] = useState<Period>("month");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const catMap = useMemo(() => Object.fromEntries(categories.map((c) => [c.id, c])), [categories]);
  const warnings = useMemo(() => paceWarningMap(categories, transactions), [categories, transactions]);

  const inPeriod = useMemo(() => {
    const now = new Date();
    const start = new Date(now);
    if (period === "week") start.setDate(now.getDate() - 7);
    else if (period === "month") start.setMonth(now.getMonth(), 1);
    else start.setFullYear(now.getFullYear(), 0, 1);
    const startISO = start.toISOString().slice(0, 10);
    return transactions.filter((t) => t.date >= startISO);
  }, [transactions, period]);

  const expensesByCat = useMemo(() => {
    const map = new Map<string, number>();
    for (const t of inPeriod) {
      if (t.type !== "expense" || !t.category_id) continue;
      map.set(t.category_id, (map.get(t.category_id) ?? 0) + safeNum(t.amount));
    }
    return [...map.entries()]
      .map(([id, total]) => ({ id, total, cat: catMap[id] }))
      .filter((x) => x.cat)
      .sort((a, b) => b.total - a.total);
  }, [inPeriod, catMap]);

  const totalExpense = expensesByCat.reduce((s, x) => s + x.total, 0);
  const totalIncome = inPeriod.filter((t) => t.type === "income").reduce((s, t) => s + safeNum(t.amount), 0);

  const selectedCatTxns = useMemo(() => {
    if (!selectedCategory) return [];
    return inPeriod
      .filter((t) => t.type === "expense" && t.category_id === selectedCategory)
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [inPeriod, selectedCategory]);

  return (
    <div className="space-y-5">
      {/* Period switcher */}
      <div className="flex gap-2">
        {(["week", "month", "year"] as const).map((p) => (
          <button
            key={p}
            onClick={() => { setPeriod(p); setSelectedCategory(null); }}
            className={`flex-1 py-2 rounded-lg text-xs font-medium transition-colors ${
              period === p ? "bg-slate-800 text-white border border-slate-700" : "text-slate-400 hover:text-slate-200"
            }`}
          >
            {p === "week" ? "Неделя" : p === "month" ? "Месяц" : "Год"}
          </button>
        ))}
      </div>

      {/* Donut */}
      <div className="rounded-2xl bg-slate-900 border border-slate-800 p-5">
        <div className="flex items-center gap-2 mb-4">
          <PieIcon size={18} className="text-emerald-400" />
          <h3 className="text-sm font-semibold text-white">Расходы по категориям</h3>
        </div>

        {expensesByCat.length === 0 ? (
          <div className="py-12 text-center text-slate-500 text-sm">Нет расходов за период</div>
        ) : (
          <div className="flex flex-col sm:flex-row items-center gap-6">
            <Donut data={expensesByCat.map((x) => ({ value: x.total, color: x.cat.color, id: x.id }))} total={totalExpense} onSlice={(id) => setSelectedCategory(id)} />
            <div className="flex-1 w-full space-y-2">
              {expensesByCat.map((x) => {
                const pct = totalExpense > 0 ? (x.total / totalExpense) * 100 : 0;
                const Icon = getIcon(x.cat.icon);
                const warn = warnings.get(x.id);
                return (
                  <button
                    key={x.id}
                    onClick={() => setSelectedCategory(x.id)}
                    className={`w-full flex items-center gap-3 rounded-lg px-2 py-2 transition-colors text-left ${
                      warn ? "bg-rose-500/10 hover:bg-rose-500/20" : "hover:bg-slate-800"
                    }`}
                  >
                    <Icon size={16} style={{ color: x.cat.color }} />
                    <span className={`flex-1 text-sm truncate ${warn ? "text-rose-200" : "text-slate-200"}`}>{x.cat.name}</span>
                    {warn && <AlertTriangle size={14} className="text-rose-400 shrink-0" />}
                    <span className="text-xs text-slate-500">{pct.toFixed(0)}%</span>
                    <span className="text-sm font-medium text-white w-20 text-right">{formatMoney(x.total)}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Bar chart */}
      <div className="rounded-2xl bg-slate-900 border border-slate-800 p-5">
        <div className="flex items-center gap-2 mb-4">
          <BarChart3 size={18} className="text-sky-400" />
          <h3 className="text-sm font-semibold text-white">Доходы vs Расходы</h3>
        </div>
        <BarChart income={totalIncome} expense={totalExpense} />
      </div>

      {/* Click-through detail */}
      {selectedCategory && catMap[selectedCategory] && (
        <div className="rounded-2xl bg-slate-900 border border-slate-800 p-5 animate-slideDown">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              {(() => { const Icon = getIcon(catMap[selectedCategory].icon); return <Icon size={18} style={{ color: catMap[selectedCategory].color }} />; })()}
              <h3 className="text-sm font-semibold text-white">{catMap[selectedCategory].name}</h3>
            </div>
            <button onClick={() => setSelectedCategory(null)} className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800">
              <X size={16} />
            </button>
          </div>
          {selectedCatTxns.length === 0 ? (
            <p className="text-sm text-slate-500">Нет операций</p>
          ) : (
            <div className="space-y-2">
              {selectedCatTxns.map((t) => (
                <div key={t.id} className="flex items-center justify-between py-2 border-b border-slate-800 last:border-0">
                  <div>
                    <p className="text-sm text-white">{t.comment || formatShortDate(t.date)}</p>
                    <p className="text-xs text-slate-500">{formatShortDate(t.date)}</p>
                  </div>
                  <span className="text-sm font-medium text-rose-400">−{formatMoney(safeNum(t.amount))}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Donut({ data, total, onSlice }: { data: { value: number; color: string; id: string }[]; total: number; onSlice: (id: string) => void }) {
  const size = 180;
  const r = 70;
  const cx = size / 2;
  const cy = size / 2;
  const circumference = 2 * Math.PI * r;
  let offset = 0;

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="#1e293b" strokeWidth={22} />
        {total > 0 && data.map((d) => {
          const len = (d.value / total) * circumference;
          const seg = (
            <circle
              key={d.id}
              cx={cx} cy={cy} r={r}
              fill="none"
              stroke={d.color}
              strokeWidth={22}
              strokeDasharray={`${len} ${circumference - len}`}
              strokeDashoffset={-offset}
              className="cursor-pointer transition-opacity hover:opacity-80"
              onClick={() => onSlice(d.id)}
            />
          );
          offset += len;
          return seg;
        })}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-xs text-slate-500">Всего</span>
        <span className="text-base font-bold text-white">{formatMoney(total)}</span>
      </div>
    </div>
  );
}

function BarChart({ income, expense }: { income: number; expense: number }) {
  const max = Math.max(safeNum(income), safeNum(expense), 1);
  return (
    <div className="flex items-end justify-center gap-8 h-44 pt-4">
      <Bar label="Доходы" value={income} max={max} color="bg-emerald-500" text="text-emerald-400" />
      <Bar label="Расходы" value={expense} max={max} color="bg-rose-500" text="text-rose-400" />
    </div>
  );
}

function Bar({ label, value, max, color, text }: { label: string; value: number; max: number; color: string; text: string }) {
  const h = Math.max(4, (safeNum(value) / max) * 140);
  return (
    <div className="flex flex-col items-center gap-2">
      <span className={`text-xs font-semibold ${text}`}>{formatMoney(value)}</span>
      <div className="w-16 rounded-t-lg transition-all" style={{ height: h, backgroundColor: undefined }}>
        <div className={`w-full h-full rounded-t-lg ${color}`} />
      </div>
      <span className="text-xs text-slate-400">{label}</span>
    </div>
  );
}
