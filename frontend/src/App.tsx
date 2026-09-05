import { useEffect, useState, useCallback } from "react";
import { Home, History, PieChart, Tags, Wallet, AlertTriangle, Target, CreditCard } from "lucide-react";
import type { Category, Transaction, TxType, Goal, CreditCard as CardType } from "@/lib/api";
import {
  getAllCategories, getAllTransactions, putCategory, deleteCategory,
  putTransaction, deleteTransaction, seedIfEmpty,
  getAllGoals, putGoal, deleteGoal,
  getAllCards, putCard, deleteCard, distributeSavings as apiDistribute,
} from "@/lib/api";
import { HomeView } from "@/views/HomeView";
import { HistoryView } from "@/views/HistoryView";
import { AnalyticsView } from "@/views/AnalyticsView";
import { CategoriesView } from "@/views/CategoriesView";
import { GoalsView } from "@/views/GoalsView";
import { CardsView } from "@/views/CardsView";
import { Modal } from "@/components/Modal";
import { TransactionForm } from "@/components/TransactionForm";
import { CategoryForm } from "@/components/CategoryForm";
import { GoalForm } from "@/components/GoalForm";
import { CreditCardForm } from "@/components/CreditCardForm";
import { DistributeSavingsModal } from "@/components/DistributeSavingsModal";
import { ReceiptScanner, type ConfirmedReceipt } from "@/components/ReceiptScanner";
import { getSettings, saveSettings } from "@/lib/settings";
import { getOptionalSpentThisMonth, getMonthIncome, getMandatoryLimitTotal, computeSavings } from "@/lib/savings";

type Tab = "home" | "history" | "analytics" | "categories" | "goals" | "cards";

export default function App() {
  const [tab, setTab] = useState<Tab>("home");
  const [categories, setCategories] = useState<Category[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [cards, setCards] = useState<CardType[]>([]);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savingsRate, setSavingsRate] = useState(10);

  const [txModal, setTxModal] = useState<{ open: boolean; type: TxType; editing: Transaction | null }>({ open: false, type: "expense", editing: null });
  const [catModal, setCatModal] = useState<{ open: boolean; editing: Category | null }>({ open: false, editing: null });
  const [goalModal, setGoalModal] = useState<{ open: boolean; editing: Goal | null }>({ open: false, editing: null });
  const [cardModal, setCardModal] = useState<{ open: boolean; editing: CardType | null }>({ open: false, editing: null });
  const [scannerOpen, setScannerOpen] = useState(false);
  const [distributeOpen, setDistributeOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ kind: "tx" | "cat" | "goal" | "card"; item: Transaction | Category | Goal | CardType } | null>(null);

  const refresh = useCallback(async () => {
    try {
      const [cats, txs, gs, cs] = await Promise.all([
        getAllCategories(), getAllTransactions(), getAllGoals(), getAllCards(),
      ]);
      setCategories(cats);
      setTransactions(txs);
      setGoals(gs);
      setCards(cs);
      setError(null);
    } catch (e) {
      setError("Не удалось подключиться к серверу. Убедитесь, что бэкенд запущен на http://localhost:8080");
    }
  }, []);

  useEffect(() => {
    (async () => {
      await seedIfEmpty();
      await refresh();
      setSavingsRate(getSettings().savingsRate);
      setReady(true);
    })();
  }, [refresh]);

  function changeSavingsRate(rate: number) {
    setSavingsRate(rate);
    saveSettings({ savingsRate: rate });
  }

  function openAddExpense() { setTxModal({ open: true, type: "expense", editing: null }); }
  function openAddIncome() { setTxModal({ open: true, type: "income", editing: null }); }
  function openEditTx(t: Transaction) { setTxModal({ open: true, type: t.type, editing: t }); }

  async function saveTx(t: Omit<Transaction, "id" | "created_at"> & { id?: string }) {
    if (t.id) {
      const existing = transactions.find((x) => x.id === t.id);
      const updated: Transaction = { ...existing, ...t, id: t.id } as Transaction;
      await putTransaction(updated);
    } else {
      const newTx: Transaction = {
        ...t,
        id: crypto.randomUUID(),
        created_at: new Date().toISOString(),
      } as Transaction;
      await putTransaction(newTx);
    }
    await refresh();
    setTxModal({ open: false, type: "expense", editing: null });
  }

  async function confirmDeleteTx(t: Transaction) {
    await deleteTransaction(t.id);
    await refresh();
    setDeleteTarget(null);
  }

  function openAddCat() { setCatModal({ open: true, editing: null }); }
  function openEditCat(c: Category) { setCatModal({ open: true, editing: c }); }

  async function saveCat(c: Omit<Category, "id"> & { id?: string }) {
    if (c.id) {
      const existing = categories.find((x) => x.id === c.id);
      const updated: Category = { ...existing, ...c, id: c.id } as Category;
      await putCategory(updated);
    } else {
      await putCategory({ ...c, id: crypto.randomUUID() } as Category);
    }
    await refresh();
    setCatModal({ open: false, editing: null });
  }

  async function confirmDeleteCat(c: Category) {
    await deleteCategory(c.id);
    await refresh();
    setDeleteTarget(null);
  }

  function openAddGoal() { setGoalModal({ open: true, editing: null }); }
  function openEditGoal(g: Goal) { setGoalModal({ open: true, editing: g }); }

  async function saveGoal(g: Omit<Goal, "id"> & { id?: string }) {
    if (g.id) {
      const existing = goals.find((x) => x.id === g.id);
      const updated: Goal = { ...existing, ...g, id: g.id } as Goal;
      await putGoal(updated);
    } else {
      await putGoal({ ...g, id: crypto.randomUUID() } as Goal);
    }
    await refresh();
    setGoalModal({ open: false, editing: null });
  }

  async function confirmDeleteGoal(g: Goal) {
    await deleteGoal(g.id);
    await refresh();
    setDeleteTarget(null);
  }

  function openAddCard() { setCardModal({ open: true, editing: null }); }
  function openEditCard(c: CardType) { setCardModal({ open: true, editing: c }); }

  async function saveCard(c: Omit<CardType, "id"> & { id?: string }) {
    if (c.id) {
      const existing = cards.find((x) => x.id === c.id);
      const updated: CardType = { ...existing, ...c, id: c.id } as CardType;
      await putCard(updated);
    } else {
      await putCard({ ...c, id: crypto.randomUUID() } as CardType);
    }
    await refresh();
    setCardModal({ open: false, editing: null });
  }

  async function confirmDeleteCard(c: CardType) {
    await deleteCard(c.id);
    await refresh();
    setDeleteTarget(null);
  }

  async function distributeSavings(goalId: string, amount: number) {
    await apiDistribute(goalId, amount);
    await refresh();
  }

  async function repayCard(cardId: string, amount: number) {
    if (amount <= 0) return;
    const card = cards.find((c) => c.id === cardId);
    if (!card) return;
    const today = new Date().toISOString().slice(0, 10);
    const repayTx: Transaction = {
      id: crypto.randomUUID(),
      type: "income",
      amount,
      category_id: null,
      source: `Погашение долга: ${card.name}`,
      date: today,
      comment: "Погашение кредитки",
      payment_method: "debit",
      credit_card_id: cardId,
      goal_id: null,
      created_at: new Date().toISOString(),
    };
    await putTransaction(repayTx);
    await refresh();
  }

  async function handleScanConfirm(r: ConfirmedReceipt) {
    const newTx: Transaction = {
      id: crypto.randomUUID(),
      type: "expense",
      amount: r.total,
      category_id: r.categoryId,
      source: null,
      date: r.date,
      comment: r.store,
      payment_method: "debit",
      credit_card_id: null,
      goal_id: null,
      created_at: new Date().toISOString(),
    };
    await putTransaction(newTx);
    await refresh();
    setTab("history");
  }

  const savingsAmount = (() => {
    const income = getMonthIncome(transactions);
    const mandatory = getMandatoryLimitTotal(categories);
    const optional = getOptionalSpentThisMonth(transactions, categories);
    return computeSavings(income, mandatory, optional, savingsRate).amount;
  })();

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-emerald-600 flex items-center justify-center animate-pulse">
            <Wallet className="text-white" size={24} />
          </div>
          <p className="text-slate-400 text-sm">Загрузка…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      {error && (
        <div className="sticky top-0 z-50 bg-rose-600/90 text-white text-sm px-4 py-2 text-center">
          {error}
        </div>
      )}
      <div className="mx-auto max-w-2xl lg:max-w-5xl lg:flex lg:gap-6 lg:px-6 lg:py-6">
        <aside className="hidden lg:flex flex-col w-56 shrink-0 sticky top-6 self-start gap-1">
          <div className="flex items-center gap-2 px-3 py-4 mb-2">
            <div className="w-9 h-9 rounded-xl bg-emerald-600 flex items-center justify-center">
              <Wallet className="text-white" size={18} />
            </div>
            <span className="font-bold text-white">MoneyApp</span>
          </div>
          <NavBtn icon={Home} label="Главная" active={tab === "home"} onClick={() => setTab("home")} />
          <NavBtn icon={History} label="История" active={tab === "history"} onClick={() => setTab("history")} />
          <NavBtn icon={PieChart} label="Аналитика" active={tab === "analytics"} onClick={() => setTab("analytics")} />
          <NavBtn icon={Target} label="Цели" active={tab === "goals"} onClick={() => setTab("goals")} />
          <NavBtn icon={CreditCard} label="Карты" active={tab === "cards"} onClick={() => setTab("cards")} />
          <NavBtn icon={Tags} label="Категории" active={tab === "categories"} onClick={() => setTab("categories")} />
        </aside>

        <main className="flex-1 min-h-screen lg:min-h-0 pb-24 lg:pb-6">
          <header className="lg:hidden sticky top-0 z-30 bg-slate-950/90 backdrop-blur border-b border-slate-900 px-4 py-3 flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center">
              <Wallet className="text-white" size={16} />
            </div>
            <span className="font-bold text-white">MoneyApp</span>
          </header>

          <div className="p-4 lg:p-0">
            <h1 className="text-xl font-bold text-white mb-4 lg:mt-2">{TITLES[tab]}</h1>
            {tab === "home" && (
              <HomeView
                categories={categories}
                transactions={transactions}
                cards={cards}
                savingsRate={savingsRate}
                onSavingsRateChange={changeSavingsRate}
                onAddExpense={openAddExpense}
                onAddIncome={openAddIncome}
                onScanReceipt={() => setScannerOpen(true)}
                onDistributeSavings={() => setDistributeOpen(true)}
                onGoToCards={() => setTab("cards")}
              />
            )}
            {tab === "history" && (
              <HistoryView
                categories={categories}
                transactions={transactions}
                cards={cards}
                onEdit={openEditTx}
                onDelete={(t) => setDeleteTarget({ kind: "tx", item: t })}
              />
            )}
            {tab === "analytics" && <AnalyticsView categories={categories} transactions={transactions} />}
            {tab === "goals" && (
              <GoalsView
                goals={goals}
                onAdd={openAddGoal}
                onEdit={openEditGoal}
                onDelete={(g) => setDeleteTarget({ kind: "goal", item: g })}
              />
            )}
            {tab === "cards" && (
              <CardsView
                cards={cards}
                transactions={transactions}
                onAdd={openAddCard}
                onEdit={openEditCard}
                onDelete={(c) => setDeleteTarget({ kind: "card", item: c })}
                onRepay={repayCard}
              />
            )}
            {tab === "categories" && (
              <CategoriesView
                categories={categories}
                onAdd={openAddCat}
                onEdit={openEditCat}
                onDelete={(c) => setDeleteTarget({ kind: "cat", item: c })}
              />
            )}
          </div>
        </main>
      </div>

      <nav className="lg:hidden fixed bottom-0 inset-x-0 z-30 bg-slate-950/95 backdrop-blur border-t border-slate-800">
        <div className="flex">
          <BottomNav icon={Home} label="Главная" active={tab === "home"} onClick={() => setTab("home")} />
          <BottomNav icon={History} label="История" active={tab === "history"} onClick={() => setTab("history")} />
          <BottomNav icon={Target} label="Цели" active={tab === "goals"} onClick={() => setTab("goals")} />
          <BottomNav icon={CreditCard} label="Карты" active={tab === "cards"} onClick={() => setTab("cards")} />
          <BottomNav icon={PieChart} label="Анализ" active={tab === "analytics"} onClick={() => setTab("analytics")} />
        </div>
      </nav>

      <TransactionForm
        open={txModal.open}
        type={txModal.type}
        categories={categories}
        cards={cards}
        editing={txModal.editing}
        onClose={() => setTxModal({ open: false, type: "expense", editing: null })}
        onSave={saveTx}
      />
      <CategoryForm
        open={catModal.open}
        editing={catModal.editing}
        onClose={() => setCatModal({ open: false, editing: null })}
        onSave={saveCat}
      />
      <GoalForm
        open={goalModal.open}
        editing={goalModal.editing}
        onClose={() => setGoalModal({ open: false, editing: null })}
        onSave={saveGoal}
      />
      <CreditCardForm
        open={cardModal.open}
        editing={cardModal.editing}
        onClose={() => setCardModal({ open: false, editing: null })}
        onSave={saveCard}
      />
      <DistributeSavingsModal
        open={distributeOpen}
        onClose={() => setDistributeOpen(false)}
        amount={savingsAmount}
        goals={goals}
        onDistribute={distributeSavings}
      />
      <ReceiptScanner
        open={scannerOpen}
        categories={categories}
        onClose={() => setScannerOpen(false)}
        onConfirm={handleScanConfirm}
      />

      <Modal open={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Удалить?" maxWidth="max-w-sm">
        <div className="space-y-4">
          <div className="flex items-start gap-3 rounded-xl bg-rose-500/10 border border-rose-500/20 p-4">
            <AlertTriangle className="text-rose-400 shrink-0 mt-0.5" size={20} />
            <p className="text-sm text-rose-200">
              {deleteTarget?.kind === "cat"
                ? "Удалить категорию? Операции в этой категории останутся, но потеряют привязку."
                : deleteTarget?.kind === "goal"
                  ? "Удалить цель? Накопления останутся в истории операций."
                  : deleteTarget?.kind === "card"
                    ? "Удалить кредитную карту? Операции по карте останутся в истории."
                    : "Удалить эту операцию? Действие нельзя отменить."}
            </p>
          </div>
          <div className="flex gap-3">
            <button onClick={() => setDeleteTarget(null)} className="flex-1 py-3 rounded-xl border border-slate-700 text-slate-300 hover:bg-slate-800 font-medium transition-colors">
              Отмена
            </button>
            <button
              onClick={() => {
                if (!deleteTarget) return;
                if (deleteTarget.kind === "tx") confirmDeleteTx(deleteTarget.item as Transaction);
                else if (deleteTarget.kind === "cat") confirmDeleteCat(deleteTarget.item as Category);
                else if (deleteTarget.kind === "goal") confirmDeleteGoal(deleteTarget.item as Goal);
                else if (deleteTarget.kind === "card") confirmDeleteCard(deleteTarget.item as CardType);
              }}
              className="flex-1 py-3 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-semibold transition-colors"
            >
              Удалить
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

const TITLES: Record<Tab, string> = {
  home: "Главная",
  history: "История операций",
  analytics: "Аналитика",
  goals: "Цели — Отложить на мечту",
  cards: "Мои кредитные карты",
  categories: "Управление категориями",
};

function NavBtn({ icon: Icon, label, active, onClick }: { icon: typeof Home; label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
        active ? "bg-slate-800 text-white" : "text-slate-400 hover:text-slate-200 hover:bg-slate-900"
      }`}
    >
      <Icon size={18} /> {label}
    </button>
  );
}

function BottomNav({ icon: Icon, label, active, onClick }: { icon: typeof Home; label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 flex flex-col items-center gap-1 py-3 transition-colors ${active ? "text-emerald-400" : "text-slate-500"}`}
    >
      <Icon size={20} />
      <span className="text-[10px] font-medium">{label}</span>
    </button>
  );
}
