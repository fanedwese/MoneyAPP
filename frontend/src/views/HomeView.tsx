import { useMemo, useState } from "react";
import {
  TrendingUp, ShieldCheck, Wallet, PiggyBank, Plus, Camera,
  ArrowUpCircle, ArrowDownCircle, Settings2, Calendar, CreditCard as CreditCardIcon,
  AlertTriangle, CheckCircle2, ArrowRight, type LucideIcon,
} from "lucide-react";
import type { Category, Transaction, CreditCard } from "@/lib/db";
import { formatMoney, safeNum } from "@/lib/format";
import {
  getMonthIncome, getMandatoryLimitTotal, getOptionalSpentThisMonth, computeSavings,
} from "@/lib/savings";
import { getUpcomingPayments } from "@/lib/budget";
import { getCardDebt } from "@/lib/cards";
import { getIcon } from "@/lib/icons";

interface Props {
  categories: Category[];
  transactions: Transaction[];
  cards: CreditCard[];
  savingsRate: number;
  onSavingsRateChange: (rate: number) => void;
  onAddExpense: () => void;
  onAddIncome: () => void;
  onScanReceipt: () => void;
  onDistributeSavings: () => void;
  onGoToCards: () => void;
}

export function HomeView({
  categories, transactions, cards, savingsRate, onSavingsRateChange,
  onAddExpense, onAddIncome, onScanReceipt, onDistributeSavings, onGoToCards,
}: Props) {
  const income = useMemo(() => getMonthIncome(transactions), [transactions]);
  const mandatory = useMemo(() => getMandatoryLimitTotal(categories), [categories]);
  const optionalSpent = useMemo(() => getOptionalSpentThisMonth(transactions, categories), [transactions, categories]);
  const balance = safeNum(income) - safeNum(mandatory) - optionalSpent;
  const savings = useMemo(
    () => computeSavings(income, mandatory, optionalSpent, savingsRate),
    [income, mandatory, optionalSpent, savingsRate],
  );

  const upcoming = useMemo(() => getUpcomingPayments(categories), [categories]);
  const cardDebts = useMemo(
    () => cards.map((c) => ({ card: c, info: getCardDebt(c, transactions) })),
    [cards, transactions],
  );

  const [rateOpen, setRateOpen] = useState(false);
  const [rateInput, setRateInput] = useState(String(savingsRate));

  function applyRate() {
    let v = parseFloat(rateInput.replace(",", "."));
    if (!Number.isFinite(v)) v = 10;
    v = Math.max(0, Math.min(100, Math.round(v)));
    onSavingsRateChange(v);
    setRateInput(String(v));
    setRateOpen(false);
  }

  const recent = useMemo(
    () => [...transactions]
      .filter((t) => !t.card_id || t.type === "expense")
      .sort((a, b) => b.date.localeCompare(a.date) || b.created_at.localeCompare(a.created_at))
      .slice(0, 5),
    [transactions],
  );

  const catMap = useMemo(() => Object.fromEntries(categories.map((c) => [c.id, c])), [categories]);
  const cardMap = useMemo(() => Object.fromEntries(cards.map((c) => [c.id, c])), [cards]);

  return (
    <div className="space-y-5">
      {/* Balance hero */}
      <div className="rounded-3xl bg-gradient-to-br from-emerald-600 via-emerald-700 to-teal-800 p-6 shadow-xl shadow-emerald-900/30 relative overflow-hidden">
        <div className="absolute -right-8 -top-8 w-40 h-40 rounded-full bg-white/10" />
        <div className="absolute -right-16 top-12 w-40 h-40 rounded-full bg-white/5" />
        <div className="relative">
          <p className="text-emerald-100/80 text-sm font-medium">Свободный баланс месяца</p>
          <p className="text-4xl font-bold text-white mt-1 tracking-tight">{formatMoney(balance)}</p>
          <p className="text-emerald-100/70 text-xs mt-2">Доходы минус обязательные и обычные расходы</p>
        </div>
      </div>

      {/* 4 stat cards */}
      <div className="grid grid-cols-2 gap-3">
        <StatCard icon={TrendingUp} label="Доходы (месяц)" value={formatMoney(income)} tint="text-emerald-400" bg="bg-emerald-500/10" />
        <StatCard icon={ShieldCheck} label="Обязательные" value={formatMoney(mandatory)} tint="text-amber-400" bg="bg-amber-500/10" />
        <StatCard icon={Wallet} label="Баланс" value={formatMoney(balance)} tint={balance >= 0 ? "text-sky-400" : "text-rose-400"} bg="bg-sky-500/10" />
        <StatCard icon={PiggyBank} label="Умные накопления" value={formatMoney(savings.amount)} tint="text-violet-400" bg="bg-violet-500/10" />
      </div>

      {/* Savings advisor with rate control + distribute button */}
      <div className="rounded-2xl bg-violet-500/10 border border-violet-500/20 px-4 py-3">
        <div className="flex items-start gap-3">
          <PiggyBank className="text-violet-400 shrink-0 mt-0.5" size={18} />
          <div className="flex-1 min-w-0">
            <p className="text-sm text-violet-200">{savings.advice}</p>
            <div className="flex flex-wrap items-center gap-3 mt-2">
              <button
                onClick={() => { setRateInput(String(savingsRate)); setRateOpen((v) => !v); }}
                className="inline-flex items-center gap-1.5 text-xs text-violet-300 hover:text-violet-200 font-medium transition-colors"
              >
                <Settings2 size={13} /> Процент: {savingsRate}%
              </button>
              {savings.amount > 0 && (
                <button
                  onClick={onDistributeSavings}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-violet-200 bg-violet-600/30 hover:bg-violet-600/50 px-2.5 py-1 rounded-lg transition-colors"
                >
                  <ArrowRight size={13} /> Распределить в цели
                </button>
              )}
            </div>
          </div>
        </div>
        {rateOpen && (
          <div className="mt-3 flex items-center gap-2 animate-slideDown">
            <div className="relative flex-1">
              <input
                type="number"
                inputMode="decimal"
                min={0}
                max={100}
                value={rateInput}
                onChange={(e) => setRateInput(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-violet-500"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm">%</span>
            </div>
            <button
              onClick={applyRate}
              className="px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium transition-colors"
            >
              ОК
            </button>
          </div>
        )}
      </div>

      {/* Upcoming payments */}
      {upcoming.length > 0 && (
        <div className="rounded-2xl bg-slate-900 border border-slate-800 p-4">
          <div className="flex items-center gap-2 mb-3">
            <Calendar size={16} className="text-amber-400" />
            <h3 className="text-sm font-semibold text-white">Ближайшие платежи</h3>
          </div>
          <div className="space-y-2">
            {upcoming.map((p) => {
              const Icon = getIcon(p.category.icon);
              return (
                <div key={p.category.id} className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: p.category.color + "22" }}>
                    <Icon size={16} style={{ color: p.category.color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">{p.category.name}</p>
                    <p className="text-xs text-slate-500">
                      {p.daysUntil === 0 ? "Сегодня" : p.daysUntil === 1 ? "Завтра" : `Через ${p.daysUntil} дн.`}
                    </p>
                  </div>
                  <span className="text-sm font-semibold text-amber-400">{formatMoney(p.amount)}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Credit cards widget */}
      {cards.length > 0 && (
        <div className="rounded-2xl bg-slate-900 border border-slate-800 p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <CreditCardIcon size={16} className="text-sky-400" />
              <h3 className="text-sm font-semibold text-white">Мои кредитные карты</h3>
            </div>
            <button onClick={onGoToCards} className="text-xs text-sky-400 hover:text-sky-300 font-medium">
              Все карты
            </button>
          </div>
          <div className="space-y-3">
            {cardDebts.map(({ card, info }) => {
              const urgency = info.hasDebt && info.daysLeft <= 7 ? "danger" : info.hasDebt && info.daysLeft <= 14 ? "warn" : "ok";
              return (
                <div key={card.id} className="rounded-xl bg-slate-800/50 border border-slate-700/50 p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-white truncate">{card.name}</span>
                    <span className={`text-xs font-semibold ${
                      urgency === "danger" ? "text-rose-400" : urgency === "warn" ? "text-amber-400" : "text-sky-400"
                    }`}>
                      {!info.hasDebt ? "Долга нет" : `${info.daysLeft} дн. без %`}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500">Долг: <span className={info.hasDebt ? "text-rose-400 font-semibold" : "text-emerald-400 font-semibold"}>{formatMoney(info.debt)}</span></span>
                    <span className="text-slate-500">Доступно: <span className="text-white font-semibold">{formatMoney(info.available)}</span></span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Quick actions */}
      <div className="grid grid-cols-3 gap-3">
        <ActionBtn onClick={onAddExpense} icon={ArrowDownCircle} label="Расход" tint="bg-rose-600 hover:bg-rose-500" />
        <ActionBtn onClick={onScanReceipt} icon={Camera} label="Сканировать" tint="bg-slate-800 hover:bg-slate-700 border border-slate-700" />
        <ActionBtn onClick={onAddIncome} icon={ArrowUpCircle} label="Доход" tint="bg-emerald-600 hover:bg-emerald-500" />
      </div>

      {/* Recent */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-white">Последние операции</h2>
        </div>
        {recent.length === 0 ? (
          <EmptyHint onAdd={onAddExpense} />
        ) : (
          <div className="space-y-2">
            {recent.map((t) => {
              const cat = t.category_id ? catMap[t.category_id] : null;
              const Icon = cat ? getIcon(cat.icon) : TrendingUp;
              const isIncome = t.type === "income";
              const card = t.card_id ? cardMap[t.card_id] : null;
              return (
                <div key={t.id} className="flex items-center gap-3 rounded-xl bg-slate-900 border border-slate-800 px-3 py-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: (cat?.color ?? "#22c55e") + "22" }}>
                    <Icon size={18} style={{ color: cat?.color ?? "#22c55e" }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">{isIncome ? t.source : cat?.name ?? "Расход"}</p>
                    <p className="text-xs text-slate-500 truncate">
                      {t.comment || t.date.split("-").reverse().join(".")}
                      {card && <span className="text-sky-500"> · {card.name}</span>}
                    </p>
                  </div>
                  <span className={`text-sm font-semibold ${isIncome ? "text-emerald-400" : "text-rose-400"}`}>
                    {isIncome ? "+" : "−"}{formatMoney(safeNum(t.amount))}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, tint, bg }: { icon: LucideIcon; label: string; value: string; tint: string; bg: string }) {
  return (
    <div className="rounded-2xl bg-slate-900 border border-slate-800 p-4">
      <div className={`w-9 h-9 rounded-xl ${bg} flex items-center justify-center mb-2`}>
        <Icon size={18} className={tint} />
      </div>
      <p className="text-xs text-slate-400">{label}</p>
      <p className="text-lg font-bold text-white mt-0.5">{value}</p>
    </div>
  );
}

function ActionBtn({ onClick, icon: Icon, label, tint }: { onClick: () => void; icon: LucideIcon; label: string; tint: string }) {
  return (
    <button onClick={onClick} className={`flex flex-col items-center gap-1.5 py-3.5 rounded-xl ${tint} text-white font-medium transition-colors`}>
      <Icon size={20} />
      <span className="text-xs">{label}</span>
    </button>
  );
}

function EmptyHint({ onAdd }: { onAdd: () => void }) {
  return (
    <button onClick={onAdd} className="w-full rounded-xl border-2 border-dashed border-slate-700 py-8 flex flex-col items-center gap-2 text-slate-500 hover:border-slate-600 transition-colors">
      <Plus size={22} />
      <span className="text-sm">Добавьте первую операцию</span>
    </button>
  );
}
