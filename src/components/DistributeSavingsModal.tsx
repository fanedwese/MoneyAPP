import { useEffect, useState } from "react";
import { Modal } from "./Modal";
import { Target, ArrowRight } from "lucide-react";
import type { Goal } from "@/lib/db";
import { formatMoney, safeNum } from "@/lib/format";

interface Props {
  open: boolean;
  onClose: () => void;
  amount: number;
  goals: Goal[];
  onDistribute: (goalId: string, amount: number) => void;
}

export function DistributeSavingsModal({ open, onClose, amount, goals, onDistribute }: Props) {
  const [goalId, setGoalId] = useState("");
  const [customAmount, setCustomAmount] = useState("");

  useEffect(() => {
    if (open) {
      setGoalId(goals[0]?.id ?? "");
      setCustomAmount(String(amount > 0 ? amount : 0));
    }
  }, [open, amount, goals]);

  function confirm() {
    const amt = parseFloat(customAmount.replace(",", "."));
    if (!Number.isFinite(amt) || amt <= 0) return;
    if (!goalId) return;
    onDistribute(goalId, amt);
    onClose();
  }

  const amt = safeNum(parseFloat(customAmount.replace(",", ".")));

  return (
    <Modal open={open} onClose={onClose} title="Распределить в цели" maxWidth="max-w-md">
      <div className="space-y-4">
        {amount > 0 && (
          <div className="rounded-xl bg-violet-500/10 border border-violet-500/20 px-4 py-3">
            <p className="text-sm text-violet-200">
              Доступно к отложению: <span className="font-bold">{formatMoney(amount)}</span>
            </p>
          </div>
        )}

        {goals.length === 0 ? (
          <div className="py-8 text-center">
            <Target size={32} className="mx-auto text-slate-600 mb-2" />
            <p className="text-sm text-slate-400">У вас пока нет целей.</p>
            <p className="text-xs text-slate-500 mt-1">Создайте цель во вкладке «Цели», чтобы распределять накопления.</p>
          </div>
        ) : (
          <>
            <div>
              <label className="text-xs font-medium text-slate-400 uppercase tracking-wide">Выберите цель</label>
              <div className="mt-2 space-y-2">
                {goals.map((g) => {
                  const pct = g.target > 0 ? Math.min(100, (safeNum(g.saved) / g.target) * 100) : 0;
                  const active = g.id === goalId;
                  return (
                    <button
                      key={g.id}
                      onClick={() => setGoalId(g.id)}
                      className={`w-full text-left rounded-xl border p-3 transition-colors ${
                        active ? "border-emerald-500 bg-emerald-500/10" : "border-slate-700 hover:border-slate-500"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-sm font-medium text-white flex items-center gap-2">
                          <span className="w-3 h-3 rounded-full" style={{ backgroundColor: g.color }} />
                          {g.name}
                        </span>
                        <span className="text-xs text-slate-400">{pct.toFixed(0)}%</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-slate-700 overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: g.color }} />
                      </div>
                      <p className="text-xs text-slate-500 mt-1">{formatMoney(g.saved)} из {formatMoney(g.target)}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-slate-400 uppercase tracking-wide">Сумма перевода</label>
              <div className="relative mt-1.5">
                <input
                  type="number"
                  inputMode="decimal"
                  value={customAmount}
                  onChange={(e) => setCustomAmount(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-lg font-semibold text-white focus:outline-none focus:border-emerald-500"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500">₽</span>
              </div>
            </div>

            <button
              onClick={confirm}
              disabled={!goalId || amt <= 0}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold transition-colors"
            >
              Отложить в копилку <ArrowRight size={18} />
            </button>
          </>
        )}
      </div>
    </Modal>
  );
}
