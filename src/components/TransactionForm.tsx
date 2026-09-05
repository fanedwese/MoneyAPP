import { useState } from "react";
import { Modal } from "./Modal";
import { getIcon } from "@/lib/icons";
import { CreditCard, Wallet } from "lucide-react";
import type { Category, CreditCard as CardType, Transaction, TxType } from "@/lib/db";
import { todayISO } from "@/lib/format";

interface Props {
  open: boolean;
  onClose: () => void;
  type: TxType;
  categories: Category[];
  cards: CardType[];
  editing?: Transaction | null;
  onSave: (t: Omit<Transaction, "id" | "created_at"> & { id?: string }) => void;
}

export function TransactionForm({ open, onClose, type, categories, cards, editing, onSave }: Props) {
  const [amount, setAmount] = useState(editing ? String(editing.amount) : "");
  const [categoryId, setCategoryId] = useState(editing?.category_id ?? categories[0]?.id ?? "");
  const [date, setDate] = useState(editing?.date ?? todayISO());
  const [comment, setComment] = useState(editing?.comment ?? "");
  const [source, setSource] = useState(editing?.source ?? "");
  const [paymentMethod, setPaymentMethod] = useState<"debit" | "card">(editing?.payment_method ?? "debit");
  const [cardId, setCardId] = useState(editing?.card_id ?? cards[0]?.id ?? "");
  const [creditDueDate, setCreditDueDate] = useState(editing?.credit_due_date ?? new Date().toISOString().slice(0, 10));
  const [error, setError] = useState("");

  const isIncome = type === "income";

  function submit() {
    const amt = parseFloat(amount.replace(",", "."));
    if (!Number.isFinite(amt) || amt <= 0) {
      setError("Введите корректную сумму больше нуля");
      return;
    }
    if (!isIncome && !categoryId) {
      setError("Выберите категорию");
      return;
    }
    if (!isIncome && paymentMethod === "card" && !cardId) {
      setError("Выберите кредитную карту");
      return;
    }
    const txData = {
      id: editing?.id,
      type,
      amount: amt,
      category_id: isIncome ? null : categoryId,
      source: isIncome ? source || "Доход" : null,
      date,
      comment: comment || null,
      credit_due_date: !isIncome && paymentMethod === "card" ? creditDueDate : null,
      payment_method: isIncome ? "debit" : paymentMethod,
      card_id: isIncome ? null : paymentMethod === "card" ? cardId : null,
      account_id: isIncome ? source : paymentMethod === "card" ? cardId : null,
    };

    console.log("=== ОБЪЕКТ ОТПРАВКИ В SQLite ===", txData);
    
    onSave(txData);
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} title={editing ? "Редактировать операцию" : isIncome ? "Добавить доход" : "Добавить расход"}>
      <div className="space-y-4">
        <Field label="Сумма">
          <div className="relative">
            <input
              type="number"
              inputMode="decimal"
              value={amount}
              onChange={(e) => { setAmount(e.target.value); setError(""); }}
              placeholder="0"
              autoFocus
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-lg font-semibold text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500"
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500">₽</span>
          </div>
        </Field>

        {!isIncome && (
          <Field label="Категория">
            <div className="grid grid-cols-2 gap-2 max-h-44 overflow-y-auto pr-1">
              {categories.map((c) => {
                const Icon = getIcon(c.icon);
                const active = c.id === categoryId;
                return (
                  <button
                    key={c.id}
                    onClick={() => { setCategoryId(c.id); setError(""); }}
                    className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm transition-colors ${
                      active ? "border-emerald-500 bg-emerald-500/10 text-white" : "border-slate-700 text-slate-300 hover:border-slate-500"
                    }`}
                  >
                    <Icon size={16} style={{ color: c.color }} />
                    <span className="truncate">{c.name}</span>
                  </button>
                );
              })}
            </div>
          </Field>
        )}

        {!isIncome && (
          <Field label="Способ оплаты">
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => { setPaymentMethod("debit"); setError(""); }}
                className={`flex items-center justify-center gap-2 py-2.5 rounded-xl border text-sm transition-colors ${
                  paymentMethod === "debit" ? "border-emerald-500 bg-emerald-500/10 text-white" : "border-slate-700 text-slate-300 hover:border-slate-500"
                }`}
              >
                <Wallet size={16} /> Дебет/наличные
              </button>
              <button
                onClick={() => {
                setPaymentMethod("card");
                setError("");
                if (cards.length > 0 && !cardId) {
                  setCardId(cards[0].id);
                }
                if (!creditDueDate) {
                  const targetDate = new Date();
                  targetDate.setDate(targetDate.getDate() + 30);
                  setCreditDueDate(targetDate.toISOString().slice(0, 10));
                }
				}}
                disabled={cards.length === 0}
                className={`flex items-center justify-center gap-2 py-2.5 rounded-xl border text-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                  paymentMethod === "card" ? "border-sky-500 bg-sky-500/10 text-white" : "border-slate-700 text-slate-300 hover:border-slate-500"
                }`}
              >
                <CreditCard size={16} /> Кредитная карта
              </button>
            </div>
            {paymentMethod === "card" && cards.length > 0 && (
              <select
                value={cardId}
                onChange={(e) => setCardId(e.target.value)}
                className="mt-2 w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-sky-500"
              >
                {cards.map((c) => (
                  <option key={c.id} value={c.id}>{c.name} — лимит {c.limit.toLocaleString("ru-RU")} ₽</option>
                ))}
              </select>
            )}
            {paymentMethod === "card" && cards.length === 0 && (
              <p className="mt-2 text-xs text-slate-500">Добавьте кредитную карту во вкладке «Карты»</p>
            )}
          </Field>
        )}
		
      {!isIncome && paymentMethod === "card" && cards.length > 0 && (
        <Field label="Дата возврата долга (Дедлайн)">
          <input
            type="date"
            value={creditDueDate}
            onChange={(e) => {
              console.log("Дата в календаре изменена на:", e.target.value);
              setCreditDueDate(e.target.value);
            }}
            className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-emerald-500 transition-colors"
          />
          <p className="mt-1.5 text-xs text-slate-500">
            Выбрано: {creditDueDate || "Не указано (будет null)"}
          </p>
        </Field>
      )}

        {isIncome && (
          <Field label="Источник">
            <input
              type="text"
              value={source}
              onChange={(e) => setSource(e.target.value)}
              placeholder="Зарплата, фриланс…"
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500"
            />
          </Field>
        )}

        <Field label="Дата">
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-emerald-500"
          />
        </Field>

        <Field label="Комментарий">
          <input
            type="text"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Необязательно"
            className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500"
          />
        </Field>

        {error && <p className="text-sm text-rose-400">{error}</p>}

        <button
          onClick={submit}
          className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold transition-colors"
        >
          Сохранить
        </button>
      </div>
    </Modal>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-slate-400 uppercase tracking-wide">{label}</label>
      {children}
    </div>
  );
}
