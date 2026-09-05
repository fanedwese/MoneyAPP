import { useMemo } from "react";
import { Plus, Pencil, Trash2, Target, TrendingUp, Calendar } from "lucide-react";
import type { Goal } from "@/lib/db";
import { formatMoney, safeNum, formatFullDate } from "@/lib/format";

interface Props {
  goals: Goal[];
  onAdd: () => void;
  onEdit: (g: Goal) => void;
  onDelete: (g: Goal) => void;
  onAddProgress: (g: Goal) => void;
}

export function GoalsView({ goals, onAdd, onEdit, onDelete, onAddProgress }: Props) {
  const sorted = useMemo(
    () => [...goals].sort((a, b) => b.created_at.localeCompare(a.created_at)),
    [goals],
  );

  return (
    <div className="space-y-4">
      <button
        onClick={onAdd}
        className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-medium transition-colors"
      >
        <Plus size={20} /> Создать цель
      </button>

      {sorted.length === 0 ? (
        <div className="py-16 flex flex-col items-center gap-3 text-slate-500">
          <Target size={36} />
          <p className="text-sm">Целей пока нет</p>
          <p className="text-xs text-slate-600">Создайте цель и начните копить на мечту</p>
        </div>
      ) : (
        <div className="space-y-3">
          {sorted.map((g) => {
            const pct = g.target > 0 ? Math.min(100, (safeNum(g.saved) / g.target) * 100) : 0;
            const remaining = Math.max(0, safeNum(g.target) - safeNum(g.saved));
            const done = safeNum(g.saved) >= safeNum(g.target);

            let daysLeft: number | null = null;
            if (g.deadline) {
              const now = new Date();
              now.setHours(0, 0, 0, 0);
              const dl = new Date(g.deadline + "T00:00:00");
              daysLeft = Math.round((dl.getTime() - now.getTime()) / 86400000);
            }

            return (
              <div key={g.id} className="rounded-2xl bg-slate-900 border border-slate-800 p-4">
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="w-4 h-4 rounded-full shrink-0" style={{ backgroundColor: g.color }} />
                    <h3 className="text-sm font-semibold text-white truncate">{g.name}</h3>
                    {done && <span className="text-[10px] font-medium text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">Готово</span>}
                  </div>
                  <div className="flex gap-1 shrink-0">
					<button 
					  onClick={() => onAddProgress(g)} 
					  className="p-1.5 rounded-lg text-emerald-500 hover:text-emerald-400 hover:bg-slate-800 transition-colors" 
					  title="Пополнить цель"
					>
					  <Plus size={14} />
					</button>
                    <button onClick={() => onEdit(g)} className="p-1.5 rounded-lg text-slate-500 hover:text-sky-400 hover:bg-slate-800 transition-colors" aria-label="Редактировать">
                      <Pencil size={14} />
                    </button>
                    <button onClick={() => onDelete(g)} className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-slate-800 transition-colors" aria-label="Удалить">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                <div className="flex items-end justify-between mb-2">
                  <div>
                    <p className="text-2xl font-bold text-white">{formatMoney(g.saved)}</p>
                    <p className="text-xs text-slate-500">из {formatMoney(g.target)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold" style={{ color: g.color }}>{pct.toFixed(0)}%</p>
                    <p className="text-xs text-slate-500">осталось {formatMoney(remaining)}</p>
                  </div>
                </div>

                <div className="h-2.5 rounded-full bg-slate-800 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{ width: `${pct}%`, backgroundColor: g.color }}
                  />
                </div>

                <div className="flex items-center gap-4 mt-3 text-xs text-slate-500">
                  {g.deadline && (
                    <span className={`flex items-center gap-1 ${daysLeft !== null && daysLeft < 0 ? "text-rose-400" : ""}`}>
                      <Calendar size={12} />
                      {daysLeft === null
                        ? formatFullDate(g.deadline)
                        : daysLeft < 0
                          ? `Просрочено на ${Math.abs(daysLeft)} дн.`
                          : daysLeft === 0
                            ? "Дедлайн сегодня"
                            : `${daysLeft} дн. до дедлайна`}
                    </span>
                  )}
                  {!done && g.deadline && daysLeft !== null && daysLeft > 0 && remaining > 0 && (
                    <span className="flex items-center gap-1 text-slate-600">
                      <TrendingUp size={12} />
                      {formatMoney(Math.ceil(remaining / daysLeft))}/дн
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
