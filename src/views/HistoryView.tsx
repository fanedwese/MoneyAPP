import { useMemo, useState, useRef, useEffect } from "react";
import { 
  Pencil, Trash2, ArrowUpCircle, ArrowDownCircle, 
  Search, AlertTriangle, CreditCard, 
  X, Calendar, DollarSign, Filter, SlidersHorizontal,
  ChevronLeft, ChevronRight
} from "lucide-react";
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
  // --- Состояния ---
  const [filter, setFilter] = useState<"all" | "expense" | "income">("all");
  const [query, setQuery] = useState("");
  const [amountMin, setAmountMin] = useState<string>("");
  const [amountMax, setAmountMax] = useState<string>("");
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");
  const [showFilters, setShowFilters] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);
  const calendarRef = useRef<HTMLDivElement>(null);

  // --- Состояния для календаря ---
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());

  const catMap = useMemo(() => Object.fromEntries(categories.map((c) => [c.id, c])), [categories]);
  const cardMap = useMemo(() => Object.fromEntries(cards.map((c) => [c.id, c])), [cards]);
  const warnings = useMemo(() => paceWarningMap(categories, transactions), [categories, transactions]);

  // --- Закрытие календаря по клику вне ---
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (calendarRef.current && !calendarRef.current.contains(event.target as Node)) {
        setShowCalendar(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // --- Фильтрация ---
  const filtered = useMemo(() => {
    return [...transactions]
      .filter((t) => filter === "all" || t.type === filter)
      .filter((t) => {
        if (query) {
          const q = query.toLowerCase();
          const cat = t.category_id ? catMap[t.category_id]?.name ?? "" : "";
          const matchText =
            cat.toLowerCase().includes(q) ||
            (t.source ?? "").toLowerCase().includes(q) ||
            (t.comment ?? "").toLowerCase().includes(q);
          if (!matchText) return false;
        }
        return true;
      })
      .filter((t) => {
        const amount = safeNum(t.amount);
        const min = amountMin === "" ? -Infinity : parseFloat(amountMin);
        const max = amountMax === "" ? Infinity : parseFloat(amountMax);
        return amount >= min && amount <= max;
      })
      .filter((t) => {
        const txDate = new Date(t.date);
        const from = dateFrom ? new Date(dateFrom) : null;
        const to = dateTo ? new Date(dateTo) : null;
        if (from && txDate < from) return false;
        if (to) {
          const endOfDay = new Date(to);
          endOfDay.setHours(23, 59, 59, 999);
          if (txDate > endOfDay) return false;
        }
        return true;
      })
      .sort((a, b) => b.date.localeCompare(a.date) || b.created_at.localeCompare(a.created_at));
  }, [transactions, filter, query, amountMin, amountMax, dateFrom, dateTo, catMap]);

  const grouped = useMemo(() => {
    const map = new Map<string, Transaction[]>();
    for (const t of filtered) {
      const arr = map.get(t.date) ?? [];
      arr.push(t);
      map.set(t.date, arr);
    }
    return [...map.entries()];
  }, [filtered]);

  // --- Подсчёт активных фильтров ---
  const activeFiltersCount = [
    query, amountMin, amountMax, dateFrom, dateTo
  ].filter(f => f !== "").length;

  // --- Сброс всех фильтров ---
  const resetFilters = () => {
    setQuery("");
    setAmountMin("");
    setAmountMax("");
    setDateFrom("");
    setDateTo("");
    setFilter("all");
  };

  // --- Функции календаря ---
  const getDaysInMonth = (month: number, year: number) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (month: number, year: number) => {
    const day = new Date(year, month, 1).getDay();
    return day === 0 ? 6 : day - 1;
  };

  const handleDateSelect = (day: number) => {
    const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    if (!dateFrom || (dateFrom && dateTo)) {
      // Если не выбрана "от" или выбран полный период — начинаем новый
      setDateFrom(dateStr);
      setDateTo("");
    } else {
      // Если выбрана только "от" — ставим "до"
      if (dateStr < dateFrom) {
        setDateTo(dateFrom);
        setDateFrom(dateStr);
      } else {
        setDateTo(dateStr);
      }
    }
    setShowCalendar(false);
  };

  const formatDateDisplay = (date: string) => {
    if (!date) return "";
    const d = new Date(date);
    return d.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const getDateRangeDisplay = () => {
    if (dateFrom && dateTo) {
      return `${formatDateDisplay(dateFrom)} — ${formatDateDisplay(dateTo)}`;
    } else if (dateFrom) {
      return `С ${formatDateDisplay(dateFrom)}`;
    } else if (dateTo) {
      return `По ${formatDateDisplay(dateTo)}`;
    }
    return "Выберите период";
  };

  // --- Отрисовка календаря (вынесена в отдельную функцию) ---
  const renderCalendar = () => {
    if (!showCalendar) return null;
    
    return (
      <div 
        ref={calendarRef}
        className="fixed z-[9999] w-72 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl p-4"
        style={{
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          boxShadow: '0 20px 60px rgba(0,0,0,0.9)',
          maxWidth: '90vw'
        }}
      >
        {/* Затемнение фона */}
        <div 
          className="fixed inset-0 -z-10 bg-black/50"
          onClick={() => setShowCalendar(false)}
        />
        
        {/* Заголовок календаря */}
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => {
              if (currentMonth === 0) {
                setCurrentMonth(11);
                setCurrentYear(currentYear - 1);
              } else {
                setCurrentMonth(currentMonth - 1);
              }
            }}
            className="p-1 hover:bg-slate-800 rounded-lg transition-colors"
          >
            <ChevronLeft size={18} className="text-slate-400" />
          </button>
          <span className="text-sm font-medium text-white">
            {new Date(currentYear, currentMonth).toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' })}
          </span>
          <button
            onClick={() => {
              if (currentMonth === 11) {
                setCurrentMonth(0);
                setCurrentYear(currentYear + 1);
              } else {
                setCurrentMonth(currentMonth + 1);
              }
            }}
            className="p-1 hover:bg-slate-800 rounded-lg transition-colors"
          >
            <ChevronRight size={18} className="text-slate-400" />
          </button>
        </div>

        {/* Дни недели */}
        <div className="grid grid-cols-7 gap-1 mb-2">
          {["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"].map((day) => (
            <div key={day} className="text-center text-xs text-slate-500 py-1">
              {day}
            </div>
          ))}
        </div>

        {/* Дни месяца */}
        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: getFirstDayOfMonth(currentMonth, currentYear) }, (_, i) => (
            <div key={`empty-${i}`} className="aspect-square" />
          ))}
          {Array.from({ length: getDaysInMonth(currentMonth, currentYear) }, (_, i) => {
            const day = i + 1;
            const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const isSelectedFrom = dateFrom === dateStr;
            const isSelectedTo = dateTo === dateStr;
            const isInRange = dateFrom && dateTo && dateStr > dateFrom && dateStr < dateTo;
            const isToday = new Date().toISOString().split('T')[0] === dateStr;
            
            return (
              <button
                key={day}
                onClick={() => handleDateSelect(day)}
                className={`aspect-square rounded-xl text-sm transition-all relative ${
                  isSelectedFrom || isSelectedTo
                    ? "bg-sky-500 text-white"
                    : isInRange
                    ? "bg-sky-500/20 text-white"
                    : isToday
                    ? "border border-sky-500/50 text-sky-400"
                    : "text-slate-300 hover:bg-slate-800"
                }`}
              >
                {day}
              </button>
            );
          })}
        </div>

        {/* Быстрые периоды */}
        <div className="flex gap-2 mt-4 pt-3 border-t border-slate-800">
          {[
            { label: "Сегодня", days: 0 },
            { label: "Неделя", days: 7 },
            { label: "Месяц", days: 30 },
            { label: "Квартал", days: 90 },
          ].map((period) => (
            <button
              key={period.label}
              onClick={() => {
                const end = new Date();
                const start = new Date();
                start.setDate(end.getDate() - period.days);
                setDateFrom(start.toISOString().split('T')[0]);
                setDateTo(end.toISOString().split('T')[0]);
                setShowCalendar(false);
              }}
              className="flex-1 py-1.5 text-xs text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
            >
              {period.label}
            </button>
          ))}
        </div>

        {/* Кнопка закрытия */}
        <button
          onClick={() => setShowCalendar(false)}
          className="w-full mt-3 py-2 text-xs text-slate-500 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
        >
          ✕ Закрыть
        </button>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Предупреждения о превышении бюджета */}
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

      {/* --- ПОИСК --- */}
      <div className="relative">
        {/* Основная строка поиска */}
        <div className="flex items-center gap-2 bg-slate-900/80 backdrop-blur-sm rounded-2xl border border-slate-700/50 hover:border-slate-600 transition-all focus-within:border-sky-500/50 focus-within:ring-2 focus-within:ring-sky-500/20">
          <Search size={18} className="ml-4 text-slate-500 flex-shrink-0" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Поиск по категориям, источникам, комментариям..."
            className="w-full bg-transparent py-3.5 text-sm text-white placeholder-slate-500 focus:outline-none"
          />
          
          {activeFiltersCount > 0 && (
            <span className="flex items-center gap-1 px-2 py-1 mr-1 rounded-full bg-sky-500/20 text-sky-400 text-xs font-medium">
              <Filter size={12} />
              {activeFiltersCount}
            </span>
          )}

          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`p-2 mr-2 rounded-xl transition-all ${
              showFilters || activeFiltersCount > 0 
                ? "bg-sky-500/20 text-sky-400" 
                : "text-slate-500 hover:text-slate-300 hover:bg-slate-800"
            }`}
          >
            <SlidersHorizontal size={18} />
          </button>
        </div>

        {/* Расширенные фильтры - УБИРАЕМ overflow-hidden */}
        <div className={`mt-3 transition-all duration-300 ${
          showFilters ? "opacity-100 max-h-[800px]" : "opacity-0 max-h-0 pointer-events-none"
        }`}>
          <div className="bg-slate-900/50 backdrop-blur-sm rounded-2xl border border-slate-700/50 p-4 space-y-4">
            
            {/* Быстрые фильтры по типу */}
            <div className="flex gap-2">
              {(["all", "expense", "income"] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`flex-1 py-2 rounded-xl text-xs font-medium transition-all ${
                    filter === f 
                      ? "bg-slate-700 text-white shadow-lg" 
                      : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
                  }`}
                >
                  {f === "all" ? "Все" : f === "expense" ? "Расходы" : "Доходы"}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {/* Сумма от/до */}
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <DollarSign size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type="number"
                    placeholder="От"
                    value={amountMin}
                    onChange={(e) => setAmountMin(e.target.value)}
                    className="w-full bg-slate-800/50 border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-sky-500/50"
                  />
                </div>
                <div className="relative flex-1">
                  <DollarSign size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type="number"
                    placeholder="До"
                    value={amountMax}
                    onChange={(e) => setAmountMax(e.target.value)}
                    className="w-full bg-slate-800/50 border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-sky-500/50"
                  />
                </div>
              </div>

              {/* Календарь */}
              <div className="relative md:col-span-2">
                <button
                  onClick={() => setShowCalendar(true)}
                  className={`w-full flex items-center gap-2 bg-slate-800/50 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white transition-all ${
                    dateFrom || dateTo ? "border-sky-500/50" : ""
                  } hover:border-slate-600`}
                >
                  <Calendar size={16} className="text-slate-400 flex-shrink-0" />
                  <span className={`flex-1 text-left ${(dateFrom || dateTo) ? "text-white" : "text-slate-500"}`}>
                    {getDateRangeDisplay()}
                  </span>
                  {(dateFrom || dateTo) && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setDateFrom("");
                        setDateTo("");
                      }}
                      className="p-1 rounded-lg hover:bg-slate-700"
                    >
                      <X size={14} className="text-slate-400" />
                    </button>
                  )}
                </button>
              </div>
            </div>

            {/* Кнопки управления */}
            <div className="flex justify-between items-center pt-1">
              <span className="text-xs text-slate-500">
                {filtered.length} операций найдено
              </span>
              <button
                onClick={resetFilters}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs text-slate-400 hover:text-white hover:bg-slate-800 transition-all"
              >
                <X size={14} />
                Сбросить всё
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* --- КАЛЕНДАРЬ (рендерится отдельно, поверх всего) --- */}
      {renderCalendar()}

      {/* --- СПИСОК ОПЕРАЦИЙ --- */}
      {grouped.length === 0 ? (
        <div className="py-20 text-center">
          <div className="text-5xl mb-4">🔍</div>
          <p className="text-slate-400 text-sm">Ничего не найдено</p>
          <p className="text-slate-500 text-xs mt-1">Попробуйте изменить параметры поиска</p>
        </div>
      ) : (
        <div className="space-y-5">
          {grouped.map(([date, items]) => (
            <div key={date}>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-2 px-1">
                {formatFullDate(date)}
              </p>
              <div className="space-y-2">
                {items.map((t) => {
                  const cat = t.category_id ? catMap[t.category_id] : null;
                  const Icon = cat ? getIcon(cat.icon) : t.type === "income" ? ArrowUpCircle : ArrowDownCircle;
                  const isIncome = t.type === "income";
                  const card = t.card_id ? cardMap[t.card_id] : null;
                  const isOver = !isIncome && cat && warnings.has(cat.id);
                  return (
                    <div 
                      key={t.id} 
                      className={`group flex items-center gap-3 rounded-2xl border px-4 py-3 transition-all ${
                        isOver 
                          ? "bg-rose-500/5 border-rose-500/30 hover:border-rose-500/50" 
                          : "bg-slate-900 border-slate-800 hover:border-slate-700"
                      }`}
                    >
                      <div 
                        className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0"
                        style={{ backgroundColor: (cat?.color ?? (isIncome ? "#22c55e" : "#ef4444")) + "22" }}
                      >
                        <Icon size={18} style={{ color: cat?.color ?? (isIncome ? "#22c55e" : "#ef4444") }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white truncate">
                          {isIncome ? t.source : cat?.name ?? "Без категории"}
                        </p>
                        <p className="text-xs text-slate-500 truncate flex items-center gap-1">
                          {t.comment && <span>{t.comment}</span>}
                          {t.comment && card && <span className="text-slate-600">·</span>}
                          {card && (
                            <span className="text-sky-400/80 flex items-center gap-0.5">
                              <CreditCard size={10} />
                              {card.name}
                            </span>
                          )}
                          {!t.comment && !card && t.date.split("-").reverse().join(".")}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <span className={`text-sm font-semibold ${isIncome ? "text-emerald-400" : "text-rose-400"}`}>
                          {isIncome ? "+" : "−"}{formatMoney(safeNum(t.amount))}
                        </span>
                        <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button 
                            onClick={() => onEdit(t)} 
                            className="p-1.5 rounded-lg text-slate-500 hover:text-sky-400 hover:bg-slate-800 transition-colors" 
                            aria-label="Редактировать"
                          >
                            <Pencil size={14} />
                          </button>
                          <button 
                            onClick={() => onDelete(t)} 
                            className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-slate-800 transition-colors" 
                            aria-label="Удалить"
                          >
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