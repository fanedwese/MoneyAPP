// src/views/DebtsView.tsx
import { useState } from 'react';
import { UserPlus, Check, X, Trash2, Pencil } from 'lucide-react';
import { formatMoney } from '@/lib/format';

interface Debt {
  id: string;
  name: string;
  type: 'i_owe' | 'owe_me';
  amount: number;
  due_date: string | null;
  description?: string | null;
  is_settled: 0 | 1;
  settled_at?: string | null;
}

interface Props {
  debts: Debt[];
  onAdd: (d: Omit<Debt, 'id'>) => void;
  onDelete: (id: string) => void;
  onSettle: (id: string) => void;
  onPartialPay: (id: string, amount: number) => void;
}

export function DebtsView({ debts, onAdd, onDelete, onSettle, onPartialPay }: Props) {
  const [showForm, setShowForm] = useState(false);
  const [contactName, setContactName] = useState('');
  const [type, setType] = useState<'owe_me' | 'i_owe'>('owe_me');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');
  
  const [partialPayModal, setPartialPayModal] = useState<{
    open: boolean;
    debtId: string | null;
    currentAmount: number;
    debtName: string;
  }>({
    open: false,
    debtId: null,
    currentAmount: 0,
    debtName: ''
  });
  const [partialAmount, setPartialAmount] = useState('');

  const handleSubmit = () => {
    if (!contactName.trim() || !amount) return;
    onAdd({
      name: contactName.trim(),
      type,
      amount: parseFloat(amount),
      description: description.trim() || null,
      due_date: dueDate || null,
      is_settled: 0,
      settled_at: null
    });
    setContactName('');
    setAmount('');
    setDescription('');
    setDueDate('');
    setShowForm(false);
  };

  const totalOwedToMe = debts
    .filter(d => d.type === 'owe_me' && d.is_settled === 0)
    .reduce((sum, d) => sum + d.amount, 0);

  const totalIOwe = debts
    .filter(d => d.type === 'i_owe' && d.is_settled === 0)
    .reduce((sum, d) => sum + d.amount, 0);

  // Логируем для отладки
  console.log('DebtsView получил долги:', debts);

  return (
    <div className="space-y-4">
      {/* Сводка */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-4">
          <p className="text-xs text-emerald-400/70">Мне должны</p>
          <p className="text-2xl font-bold text-emerald-400">+{formatMoney(totalOwedToMe)}</p>
        </div>
        <div className="bg-rose-500/10 border border-rose-500/20 rounded-2xl p-4">
          <p className="text-xs text-rose-400/70">Я должен</p>
          <p className="text-2xl font-bold text-rose-400">-{formatMoney(totalIOwe)}</p>
        </div>
      </div>

      {/* Кнопка добавления */}
      <button
        onClick={() => setShowForm(true)}
        className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 border border-slate-700 transition-colors"
      >
        <UserPlus size={18} className="text-slate-400" />
        <span className="text-sm font-medium text-slate-300">Добавить долг</span>
      </button>

      {/* Список долгов */}
      <div className="space-y-2">
        {debts.length === 0 ? (
          <div className="text-center py-12 text-slate-500 text-sm">Нет долгов. Отлично! 🎉</div>
        ) : (
          debts.map((debt) => (
            <div
              key={debt.id}
              className={`flex items-center gap-3 rounded-2xl border px-4 py-3 transition-all ${
                debt.is_settled === 1
                  ? 'border-slate-700/30 bg-slate-800/30 opacity-50'
                  : 'border-slate-700 hover:border-slate-600'
              }`}
            >
              <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${
                debt.type === 'owe_me' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'
              }`}>
                {debt.type === 'owe_me' ? '←' : '→'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">
                  {debt.name}
                  {debt.is_settled === 1 && <span className="ml-2 text-xs text-slate-500">(закрыт)</span>}
                </p>
                {debt.description && <p className="text-xs text-slate-500 truncate">{debt.description}</p>}
                {debt.due_date && (
                  <p className="text-xs text-slate-500">До {new Date(debt.due_date).toLocaleDateString('ru-RU')}</p>
                )}
                {debt.is_settled === 1 && debt.settled_at && (
                  <p className="text-xs text-slate-500">
                    Закрыт: {new Date(debt.settled_at).toLocaleDateString('ru-RU')}
                  </p>
                )}
              </div>
              <div className="text-right">
                <p className={`text-sm font-semibold ${
                  debt.type === 'owe_me' ? 'text-emerald-400' : 'text-rose-400'
                }`}>
                  {debt.type === 'owe_me' ? '+' : '−'}{formatMoney(debt.amount)}
                </p>
              </div>
              {/* КНОПКИ ДЕЙСТВИЙ - МУСОРКА ВСЕГДА ВИДНА */}
              <div className="flex gap-1">
                {debt.is_settled === 0 && (
                  <>
                    <button
                      onClick={() => {
                        setPartialPayModal({
                          open: true,
                          debtId: debt.id,
                          currentAmount: debt.amount,
                          debtName: debt.name
                        });
                        setPartialAmount('');
                      }}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-sky-400 hover:bg-slate-800 transition-colors"
                      title="Частичное погашение"
                    >
                      <Pencil size={16} />
                    </button>
                    <button
                      onClick={() => onSettle(debt.id)}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-emerald-400 hover:bg-slate-800 transition-colors"
                      title="Закрыть долг"
                    >
                      <Check size={16} />
                    </button>
                  </>
                )}
                {/* Мусорка всегда видна */}
               <button
				  onClick={() => onDelete(debt.id)}
				  className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-slate-800 transition-colors"
				  title="Удалить"
				>
				  <Trash2 size={16} />
				</button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Модалка добавления */}
      {showForm && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center">
          <div className="bg-slate-900 rounded-2xl border border-slate-700 p-6 w-full max-w-md mx-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-white">Новый долг</h3>
              <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-white">
                <X size={20} />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs text-slate-400">Кто</label>
                <input
                  type="text"
                  placeholder="Имя человека"
                  value={contactName}
                  onChange={(e) => setContactName(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setType('owe_me')}
                  className={`py-2 rounded-xl text-sm font-medium transition-colors ${
                    type === 'owe_me' ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  Мне должны
                </button>
                <button
                  onClick={() => setType('i_owe')}
                  className={`py-2 rounded-xl text-sm font-medium transition-colors ${
                    type === 'i_owe' ? 'bg-rose-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  Я должен
                </button>
              </div>

              <div>
                <label className="text-xs text-slate-400">Сумма</label>
                <input
                  type="number"
                  placeholder="0"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
                />
              </div>

              <div>
                <label className="text-xs text-slate-400">Описание (опционально)</label>
                <input
                  type="text"
                  placeholder="За что долг"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
                />
              </div>

              <div>
                <label className="text-xs text-slate-400">Срок (опционально)</label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-sky-500"
                />
              </div>

              <button
                onClick={handleSubmit}
                className="w-full py-3 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-medium transition-colors"
              >
                Добавить долг
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Модалка частичного погашения */}
      {partialPayModal.open && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center">
          <div className="bg-slate-900 rounded-2xl border border-slate-700 p-6 w-full max-w-md mx-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-white">Частичное погашение</h3>
              <button 
                onClick={() => setPartialPayModal({ ...partialPayModal, open: false })}
                className="text-slate-400 hover:text-white"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="space-y-3">
              <p className="text-sm text-slate-300">
                Долг: <span className="font-semibold text-white">{partialPayModal.debtName}</span>
              </p>
              <p className="text-sm text-slate-400">
                Остаток: <span className="font-semibold text-white">{formatMoney(partialPayModal.currentAmount)}</span>
              </p>
              
              <div>
                <label className="text-xs text-slate-400">Сумма погашения</label>
                <input
                  type="number"
                  placeholder="0"
                  value={partialAmount}
                  onChange={(e) => setPartialAmount(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
                />
              </div>
              
              <div className="flex gap-3">
                <button
                  onClick={() => setPartialPayModal({ ...partialPayModal, open: false })}
                  className="flex-1 py-2.5 rounded-xl border border-slate-700 text-slate-300 hover:bg-slate-800 transition-colors"
                >
                  Отмена
                </button>
                <button
                  onClick={() => {
                    const amount = parseFloat(partialAmount);
                    if (!amount || amount <= 0) {
                      alert('Введите сумму больше нуля');
                      return;
                    }
                    if (amount > partialPayModal.currentAmount) {
                      alert('Сумма погашения не может превышать остаток долга');
                      return;
                    }
                    onPartialPay(partialPayModal.debtId!, amount);
                    setPartialPayModal({ ...partialPayModal, open: false });
                    setPartialAmount('');
                  }}
                  className="flex-1 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-medium transition-colors"
                >
                  Погасить
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}