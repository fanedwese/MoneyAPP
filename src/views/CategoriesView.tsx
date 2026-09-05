import { useMemo, useState } from "react";
import { Plus, Pencil, Trash2, ShieldCheck, Wallet, Calendar } from "lucide-react";
import type { Category } from "@/lib/db";
import { formatMoney, safeNum } from "@/lib/format";
import { getIcon } from "@/lib/icons";

interface Props {
  categories: Category[];
  onAdd: () => void;
  onEdit: (c: Category) => void;
  onDelete: (c: Category) => void;
}

export function CategoriesView({ categories, onAdd, onEdit, onDelete }: Props) {
  const [tab, setTab] = useState<"all" | "mandatory" | "custom">("all");

  const filtered = useMemo(() => {
    if (tab === "mandatory") return categories.filter((c) => c.is_mandatory);
    if (tab === "custom") return categories.filter((c) => !c.is_mandatory);
    return categories;
  }, [categories, tab]);

  return (
    <div className="space-y-4">
      <button
        onClick={onAdd}
        className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-medium transition-colors"
      >
        <Plus size={20} /> Создать категорию
      </button>

      <div className="flex gap-2">
        {(["all", "mandatory", "custom"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-2 rounded-lg text-xs font-medium transition-colors ${
              tab === t ? "bg-slate-800 text-white border border-slate-700" : "text-slate-400 hover:text-slate-200"
            }`}
          >
            {t === "all" ? "Все" : t === "mandatory" ? "Обязательные" : "Обычные"}
          </button>
        ))}
      </div>

      <div className="space-y-2">
        {filtered.map((c) => {
          const Icon = getIcon(c.icon);
          return (
            <div key={c.id} className="flex items-center gap-3 rounded-xl bg-slate-900 border border-slate-800 px-3 py-3">
              <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: c.color + "22" }}>
                <Icon size={20} style={{ color: c.color }} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-white truncate">{c.name}</p>
                  {c.is_mandatory && (
                    <span className="flex items-center gap-1 text-[10px] font-medium text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded">
                      <ShieldCheck size={10} /> Обяз.
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  {c.budget_limit ? (
                    <span className="text-xs text-slate-500">Лимит: {formatMoney(safeNum(c.budget_limit))}/мес</span>
                  ) : (
                    <span className="text-xs text-slate-600">Без лимита</span>
                  )}
                  {c.is_mandatory && c.due_day && (
                    <span className="flex items-center gap-1 text-[10px] font-medium text-sky-400 bg-sky-500/10 px-1.5 py-0.5 rounded">
                      <Calendar size={10} /> {c.due_day} числа
                    </span>
                  )}
                </div>
              </div>
              <div className="flex gap-1">
                <button onClick={() => onEdit(c)} className="p-1.5 rounded-lg text-slate-500 hover:text-sky-400 hover:bg-slate-800 transition-colors" aria-label="Редактировать">
                  <Pencil size={14} />
                </button>
                <button onClick={() => onDelete(c)} className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-slate-800 transition-colors" aria-label="Удалить">
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          );
        })}
        {filtered.length === 0 && (
          <div className="py-12 flex flex-col items-center gap-2 text-slate-500">
            <Wallet size={28} />
            <p className="text-sm">Категорий нет</p>
          </div>
        )}
      </div>
    </div>
  );
}
