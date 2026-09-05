import { useMemo, useState } from "react";
import { Plus, Pencil, Trash2, CreditCard as CreditCardIcon, Wallet, ArrowUpCircle, AlertTriangle, CheckCircle2 } from "lucide-react";
import type { CreditCard, Transaction } from "@/lib/db";
import { formatMoney, safeNum } from "@/lib/format";
import { getCardDebt } from "@/lib/cards";
import { Modal } from "@/components/Modal";

interface Props {
  cards: CreditCard[];
  transactions: Transaction[];
  onAdd: () => void;
  onEdit: (c: CreditCard) => void;
  onDelete: (c: CreditCard) => void;
  onRepay: (cardId: string, amount: number) => void;
}

export function CardsView({ cards, transactions, onAdd, onEdit, onDelete, onRepay }: Props) {
  const [repayCard, setRepayCard] = useState<CreditCard | null>(null);
  const [repayAmount, setRepayAmount] = useState("");
  const [repayError, setRepayError] = useState("");

  const debtInfos = useMemo(
    () => cards.map((c) => ({ card: c, info: getCardDebt(c, transactions) })),
    [cards, transactions],
  );

  function confirmRepay() {
    if (!repayCard) return;
    const amt = parseFloat(repayAmount.replace(",", "."));
    if (!Number.isFinite(amt) || amt <= 0) {
      setRepayError("Введите сумму больше нуля");
      return;
    }
    onRepay(repayCard.id, amt);
    setRepayCard(null);
    setRepayAmount("");
    setRepayError("");
  }

  return (
    <div className="space-y-4">
      <button
        onClick={onAdd}
        className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-medium transition-colors"
      >
        <Plus size={20} /> Добавить кредитную карту
      </button>

      {cards.length === 0 ? (
        <div className="py-16 flex flex-col items-center gap-3 text-slate-500">
          <CreditCardIcon size={36} />
          <p className="text-sm">Кредитных карт пока нет</p>
          <p className="text-xs text-slate-600">Добавьте карту, чтобы контролировать долг и грейс-период</p>
        </div>
      ) : (
        <div className="space-y-4">
          {debtInfos.map(({ card, info }) => {
            const urgency = info.hasDebt && info.daysLeft <= 7 ? "danger" : info.hasDebt && info.daysLeft <= 14 ? "warn" : "ok";
            const limitPct = card.limit > 0 ? Math.min(100, (info.debt / safeNum(card.limit)) * 100) : 0;

            return (
              <div key={card.id} className="rounded-2xl bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700 p-5 relative overflow-hidden">
                <div className="absolute -right-6 -top-6 w-28 h-28 rounded-full bg-white/5" />

                <div className="relative flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-xl bg-slate-700/50 flex items-center justify-center">
                      <CreditCardIcon size={22} className="text-slate-300" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-white">{card.name}</h3>
                      <p className="text-xs text-slate-500">Лимит {formatMoney(card.limit)} · {card.grace_days} дней без %</p>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => onEdit(card)} className="p-1.5 rounded-lg text-slate-500 hover:text-sky-400 hover:bg-slate-800 transition-colors" aria-label="Редактировать">
                      <Pencil size={14} />
                    </button>
                    <button onClick={() => onDelete(card)} className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-slate-800 transition-colors" aria-label="Удалить">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                <div className="relative grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <p className="text-xs text-slate-500">Текущий долг</p>
                    <p className={`text-xl font-bold ${info.hasDebt ? "text-rose-400" : "text-emerald-400"}`}>
                      {formatMoney(info.debt)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Доступно</p>
                    <p className="text-xl font-bold text-white">{formatMoney(info.available)}</p>
                  </div>
                </div>

                <div className="relative h-2 rounded-full bg-slate-700 overflow-hidden mb-4">
                  <div
                    className={`h-full rounded-full transition-all ${urgency === "danger" ? "bg-rose-500" : urgency === "warn" ? "bg-amber-500" : "bg-sky-500"}`}
                    style={{ width: `${limitPct}%` }}
                  />
                </div>

                <div className="relative flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {!info.hasDebt ? (
                      <span className="flex items-center gap-1.5 text-sm text-emerald-400 font-medium">
                        <CheckCircle2 size={16} /> Долга нет
                      </span>
                    ) : (
                      <span className={`flex items-center gap-1.5 text-sm font-semibold ${
                        urgency === "danger" ? "text-rose-400" : urgency === "warn" ? "text-amber-400" : "text-sky-400"
                      }`}>
                        {urgency === "danger" ? <AlertTriangle size={16} /> : null}
                        Осталось {info.daysLeft} дн. без %
                      </span>
                    )}
                  </div>
                  {info.hasDebt && (
                    <button
                      onClick={() => { setRepayCard(card); setRepayAmount(String(info.debt)); setRepayError(""); }}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition-colors"
                    >
                      <ArrowUpCircle size={14} /> Погасить долг
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Repayment modal */}
      <Modal open={!!repayCard} onClose={() => setRepayCard(null)} title="Погасить долг" maxWidth="max-w-sm">
        {repayCard && (
          <div className="space-y-4">
            <div className="rounded-xl bg-slate-800/60 border border-slate-700 p-4">
              <p className="text-xs text-slate-400">Карта</p>
              <p className="text-sm font-semibold text-white">{repayCard.name}</p>
              <p className="text-xs text-slate-500 mt-2">Сумма спишется с дебетового баланса и уменьшит долг по карте.</p>
            </div>

            <div>
              <label className="text-xs font-medium text-slate-400 uppercase tracking-wide">Сумма погашения</label>
              <div className="relative mt-1.5">
                <input
                  type="number"
                  inputMode="decimal"
                  value={repayAmount}
                  onChange={(e) => { setRepayAmount(e.target.value); setRepayError(""); }}
                  autoFocus
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-lg font-semibold text-white focus:outline-none focus:border-emerald-500"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500">₽</span>
              </div>
            </div>

            {repayError && <p className="text-sm text-rose-400">{repayError}</p>}

            <button
              onClick={confirmRepay}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold transition-colors"
            >
              <Wallet size={18} /> Погасить долг
            </button>
          </div>
        )}
      </Modal>
    </div>
  );
}
