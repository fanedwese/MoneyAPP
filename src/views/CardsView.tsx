import { useMemo, useState } from "react";
import { Plus, Pencil, Trash2, CreditCard as CreditCardIcon, Wallet, ArrowUpCircle, AlertTriangle, CheckCircle2 } from "lucide-react";
import type { CreditCard, Transaction, updateTransactionExtra, putTransaction } from "@/lib/db";
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
  const [selectedDueDate, setSelectedDueDate] = useState<string | null>(null);
  
  const cardDeadlines = useMemo(() => {
    if (!repayCard) return [];
    
    // 1. Собираем все расходы по карте, у которых есть дедлайны
    const rawExpenses = transactions.filter((t: any) => {
      const isCardMatch = t.card_id && repayCard.id && String(t.card_id).toLowerCase() === String(repayCard.id).toLowerCase();
      const isExpense = t.type === "expense";
      const dueDateVal = t.creditDueDate || t.credit_due_date;
      return isCardMatch && isExpense && dueDateVal && String(dueDateVal).trim() !== "";
    });

    // 2. Группируем расходы по датам дедлайна
    const groups: { [date: string]: { date: string; total: number; ids: string[] } } = {};
    let totalCreditExpenses = 0;

    for (const tx of rawExpenses) {
      const dateKey = tx.credit_due_date || "";
      if (!groups[dateKey]) {
        groups[dateKey] = { date: dateKey, total: 0, ids: [] };
      }
      groups[dateKey].total += tx.amount;
      groups[dateKey].ids.push(tx.id);
      totalCreditExpenses += tx.amount;
    }

    // 3. Считаем, сколько ВСЕГО денег ты уже закинул на эту кредитку (все income по ней)
    const totalRepayments = transactions
      .filter((t: any) => t.card_id && repayCard.id && String(t.card_id).toLowerCase() === String(repayCard.id).toLowerCase() && t.type === "income")
      .reduce((sum: number, t: any) => sum + t.amount, 0);

    // 4. Распределяем общую сумму твоих пополнений по периодам (от старых к новым),
    // чтобы плашки в модалке показывали РЕАЛЬНЫЙ ОСТАТОК долга, а не мертвую сумму чека!
    const sortedGroups = Object.values(groups).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    let dynamicRepayPool = totalRepayments;

    for (const group of sortedGroups) {
      if (dynamicRepayPool <= 0) break;

      if (dynamicRepayPool >= group.total) {
        dynamicRepayPool -= group.total;
        group.total = 0; // Этот период уже полностью покрыт твоими прошлыми закидонами по 500р
      } else {
        group.total -= dynamicRepayPool; // Уменьшаем плашку на сумму закинутых денег!
        dynamicRepayPool = 0;
      }
    }

    // Возвращаем только те периоды, где остался реальный долг > 0
    return sortedGroups.filter(g => g.total > 0);
  }, [repayCard, transactions]);

  const debtInfos = useMemo(() => {
    return cards.map((c) => {
      const info = getCardDebt(c, transactions);

      // ВЫВОДИМ В КОНСОЛЬ ВООБЩЕ ВСЕ ОПЕРАЦИИ КАРТЫ, ЧТОБЫ УВИДЕТЬ ИХ НАСТОЯЩИЕ ИМЕНА ПОЛЕЙ
      const allCardTx = transactions.filter((t: any) => {
        return (t.card_id && String(t.card_id).toLowerCase() === String(c.id).toLowerCase()) ||
               (t.account_id && String(t.account_id).toLowerCase() === String(c.id).toLowerCase());
      });
      console.log(`[ПОЛНЫЙ ЛОГ ${c.name}] Все транзакции карты из базы в памяти:`, typeof allCardTx === 'object' ? JSON.parse(JSON.stringify(allCardTx)) : allCardTx);

      const cardTx = transactions.filter((t: any) => {
        const isCardMatch = (t.card_id && String(t.card_id).toLowerCase() === String(c.id).toLowerCase()) ||
                            (t.account_id && String(t.account_id).toLowerCase() === String(c.id).toLowerCase());
        const isExpense = t.type === "expense";
        
        const dueDateVal = t.creditDueDate || t.credit_due_date;
        const hasDue = dueDateVal && String(dueDateVal).trim() !== "";
        
        return isCardMatch && isExpense && hasDue;
      });

      // НАШИ ЖУЧКИ-ОТЛАДЧИКИ:
      console.log(`[ОТЛАДКА ${c.name}] Посчитанный долг (info.debt):`, info.debt);
      console.log(`[ОТЛАДКА ${c.name}] Сколько транзакций нашел фильтр (cardTx.length):`, cardTx.length);
      if (cardTx.length > 0) {
        console.log(`[ОТЛАДКА ${c.name}] Первая найденная транзакция в массиве:`, cardTx[0]);
      }

      let daysLeft = 0;
      let nextDeadline = null;
      let calculatedUrgency = "normal";

      // Делаем условие более гибким: если фильтр нашел транзакции, считаем дни в любом случае!
      if (cardTx.length > 0) {
        const sortedTx = [...cardTx].sort((a: any, b: any) => {
          const aDue = a.creditDueDate || a.credit_due_date || "";
          const bDue = b.creditDueDate || b.credit_due_date || "";
          return new Date(aDue).getTime() - new Date(bDue).getTime();
        });
        
        const firstTx = sortedTx[0];
        const nextDeadlineStr = firstTx ? firstTx.credit_due_date : null; 
        
        if (nextDeadlineStr) {
          const today = new Date();
          today.setHours(0, 0, 0, 0); 
          
          const deadlineDate = new Date(nextDeadlineStr);
          deadlineDate.setHours(0, 0, 0, 0);
          
          const diffTime = deadlineDate.getTime() - today.getTime();
          daysLeft = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          if (daysLeft < 0) daysLeft = 0;

          nextDeadline = nextDeadlineStr.split("-").reverse().join("."); 
          calculatedUrgency = daysLeft <= 7 ? "danger" : daysLeft <= 14 ? "warn" : "normal";
        }
      } else if (info.debt > 0) {
        daysLeft = 30; 
        calculatedUrgency = "normal";
      }

      info.daysLeft = daysLeft;
      (info as any).nextDeadline = nextDeadline;
      (info as any).customUrgency = calculatedUrgency;

      return { card: c, info };
    });
  }, [cards, transactions]);

  const confirmRepay = async () => {
    if (!repayCard || !repayAmount) return;
    const amt = parseFloat(repayAmount);
    if (isNaN(amt) || amt <= 0) return;

    try {
      onRepay(repayCard.id, amt);

      setRepayCard(null); 
      setRepayAmount("");
      setSelectedDueDate(null);
      if (typeof setRepayError === "function") setRepayError("");
    } catch (e) {
      console.error("Критическая ошибка при закрытии периода кредитки:", e);
    }
};

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
            const urgency = info.daysLeft <= 7 ? "danger" : info.daysLeft <= 14 ? "warn" : "normal";
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
                        {info.debt <= 0 ? (
                          <span className="flex items-center gap-1.5 text-sm text-emerald-400 font-medium">
                            <CheckCircle2 size={16} /> Долга нет
                          </span>
                        ) : (
                          <span className={`flex items-center gap-1.5 text-sm font-semibold ${
                            (info as any).customUrgency === "danger" ? "text-rose-400" : (info as any).customUrgency === "warn" ? "text-amber-400" : "text-emerald-400"
                          }`}>
                            {(info as any).customUrgency === "danger" ? <AlertTriangle size={16} /> : null}
                            {(info as any).nextDeadline ? (
                              <>Вернуть до {(info as any).nextDeadline} (Осталось {info.daysLeft} дн.)</>
                            ) : (
                              <>Осталось {info.daysLeft} дн. без %</>
                            )}
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

                <div className="space-y-1.5 max-h-36 overflow-y-auto mb-3 pr-1">
                  {cardDeadlines.map((group: any) => {
                    const fmtDue = group.date.split("-").reverse().join(".");
                    const isSelected = selectedDueDate === group.date;
                    return (
                      <div
                        key={group.date}
                        onClick={() => { setSelectedDueDate(group.date); setRepayAmount(String(group.total)); }}
                        className={`p-2 rounded-lg border text-left cursor-pointer text-xs flex justify-between items-center transition-all ${
                          isSelected ? "bg-emerald-500/10 border-emerald-500" : "bg-slate-800 border-slate-700 hover:border-slate-600"
                        }`}
                      >
                        <span className="font-medium text-white">{group.total.toLocaleString()} ₽</span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-900 text-amber-400">До {fmtDue}</span>
                      </div>
                    );
                  })}
                  <div
                    onClick={() => { setSelectedDueDate(null); setRepayAmount(""); }}
                    className={`p-2 rounded-lg border text-left cursor-pointer text-xs transition-all ${
                      selectedDueDate === null ? "bg-emerald-500/10 border-emerald-500" : "bg-slate-800 border-slate-700 hover:border-slate-600"
                    }`}
                  >
                    <span className="text-slate-400">Внести произвольную сумму</span>
                  </div>
                </div>

                {/* ВОЗВРАЩАЕМ ПОЛЕ ВВОДА СУММЫ НА ЭКРАН */}
                <div className="mb-4 text-left">
                  <label className="text-xs font-medium text-slate-400 uppercase tracking-wide">Сумма погашения</label>
                  <div className="relative mt-1.5">
                    <input
                      type="number"
                      value={repayAmount}
                      onChange={(e) => { 
                        setSelectedDueDate(null); 
                        setRepayAmount(e.target.value); 
                        if (typeof setRepayError === "function") setRepayError(""); 
                      }}
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-lg font-semibold text-white focus:outline-none focus:border-emerald-500 transition-colors"
                      placeholder="0.00"
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
