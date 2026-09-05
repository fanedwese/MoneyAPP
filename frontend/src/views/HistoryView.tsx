import { useMemo, useState } from "react";
import { Pencil, Trash2, ArrowUpCircle, ArrowDownCircle, Search, AlertTriangle, CreditCard } from "lucide-react";
import type { Category, Transaction, CreditCard as CardType } from "@/lib/db";
import { formatMoney, formatFullDate, safeNum } from "@/lib/format";
import { getIcon } from "@/lib/icons";
import { paceWarningMap } from "@/lib/budget";

interface Props {
  categories: Category[];
  transactions: Transaction[];
  cards: CardType[];
  onEdit: (t: Transaction) => void;
  onDelete: (t: Transaction) => void;
}

export function HistoryView({ categories, transactions, cards, onEdit, onDelete }: Props) {
  const [filter, setFilter] = useState<"all" | "expense" | "income">("all");
  const [query, setQuery] = useState("");

  const catMap = useMemo(() => Object.fromEntries(categories.map((c) => [c.id, c])), [categories]);
  const cardMap = useMemo(() => Object.fromEntries(cards.map((c) => [c.id, c])), [cards]);
  const warnings = useMemo(() => paceWarningMap(categories, transactions), [categories, transactions]);

  const filtered = useMemo(() => {
    return [...transactions]
      .filter((t) => filter === "all" || t.type === filter)
      .filter((t) => {
        if (!query) return true;
        const q = query.toLowerCase();
        const cat = t.category_id ? catMap[t.category_id]?.name ?? "" : "";
        return (
          cat.toLowerCase().includes(q) ||
          (t.source ?? "").toLowerCase().includes(q) ||
          (t.comment ?? "").toLowerCase().includes(q)
        );
      })
      .sort((a, b) => b.date.localeCompare(a.date) || b.created_at.localeCompare(a.created_at));
  }, [transactions, filter, query, catMap]);

  const grouped = useMemo(() => {
    const map = new Map<string, Transaction[]>();
    for (const t of filtered) {
      const arr = map.get(t.date) ?? [];
      arr.push(t);
      map.set(t.date, arr);
    }
    return [...map.entries()];
  }, [filtered]);

  return (
    <div className="space-y-4">
      {/* Pace warnings */}
      {warnings.size > 0 && (
        <div className="space-y-2">
          {[...warnings.values()].map((w) => {
            const cat = catMap[w.categoryId];
            if (!cat) return null;
            const Icon = getIcon(cat.icon);
            return (
              <div key={w.categoryId} className="flex items-start gap-3 rounded-xl bg-rose-500/10 border border-rose-500/30 px-3 py-3 animate-slideDown">
                <AlertTriangle className="text-rose-400 shrink-0 mt-0.5" size={18} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <Icon size={14} style={{ color: cat.color }} />
                    <p className="text-sm font-medium text-rose-200">{cat.name}</p>
                  </div>
                  <p className="text-xs text-rose-300/80 mt-0.5">Превышение темпа трат! Рекомендуется снизить расходы по этой категории</p>
                  <p className="text-xs text-slate-400 mt-1">Потрачено {formatMoney(w.spent)} из {formatMoney(w.limit)} ({w.spentPct.toFixed(0)}%) — прошло {w.timePct.toFixed(0)}% месяца</p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="flex gap-2">
        {(["all", "expense", "income"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`flex-1 py-2 rounded-lg text-xs font-medium transition-colors ${
              filter === f ? "bg-slate-800 text-white border border-slate-700" : "text-slate-400 hover:text-slate-200"
            }`}
          >
            {f === "all" ? "Все" : f === "expense" ? "Расходы" : "Доходы"}
          </button>
        ))}
      </div>

      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Поиск по операциям…"
          className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-4 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-slate-600"
        />
      </div>

      {grouped.length === 0 ? (
        <div className="py-16 text-center text-slate-500 text-sm">Операций не найдено</div>
      ) : (
        <div className="space-y-5">
          {grouped.map(([date, items]) => (
            <div key={date}>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2 px-1">{formatFullDate(date)}</p>
              <div className="space-y-2">
                {items.map((t) => {
                  const cat = t.category_id ? catMap[t.category_id] : null;
                  const Icon = cat ? getIcon(cat.icon) : t.type === "income" ? ArrowUpCircle : ArrowDownCircle;
                  const isIncome = t.type === "income";
                  const card = t.card_id ? cardMap[t.card_id] : null;
                  const isOver = !isIncome && cat && warnings.has(cat.id);
                  return (
                    <div key={t.id} className={`group flex items-center gap-3 rounded-xl border px-3 py-3 transition-colors ${
                      isOver ? "bg-rose-500/5 border-rose-500/30" : "bg-slate-900 border-slate-800 hover:border-slate-700"
                    }`}>
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: (cat?.color ?? (isIncome ? "#22c55e" : "#ef4444")) + "22" }}>
                        <Icon size={18} style={{ color: cat?.color ?? (isIncome ? "#22c55e" : "#ef4444") }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white truncate">{isIncome ? t.source : cat?.name ?? "Расход"}</p>
                        <p className="text-xs text-slate-500 truncate">
                          {t.comment || ""}
                          {t.comment && card && " · "}
                          {card && <span className="text-sky-500"><CreditCard size={10} className="inline mr-0.5" />{card.name}</span>}
                          {!t.comment && !card && t.date.split("-").reverse().join(".")}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <span className={`text-sm font-semibold ${isIncome ? "text-emerald-400" : "text-rose-400"}`}>
                          {isIncome ? "+" : "−"}{formatMoney(safeNum(t.amount))}
                        </span>
                        <div className="flex gap-1">
                          <button onClick={() => onEdit(t)} className="p-1.5 rounded-lg text-slate-500 hover:text-sky-400 hover:bg-slate-800 transition-colors" aria-label="Редактировать">
                            <Pencil size={14} />
                          </button>
                          <button onClick={() => onDelete(t)} className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-slate-800 transition-colors" aria-label="Удалить">
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
