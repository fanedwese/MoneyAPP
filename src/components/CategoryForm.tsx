import { useEffect, useState } from "react";
import { Modal } from "./Modal";
import { ICONS, ICON_KEYS, COLOR_OPTIONS, getIcon } from "@/lib/icons";
import type { Category } from "@/lib/db";

interface Props {
  open: boolean;
  onClose: () => void;
  editing?: Category | null;
  onSave: (c: Omit<Category, "id" | "created_at"> & { id?: string }) => void;
}

export function CategoryForm({ open, onClose, editing, onSave }: Props) {
  const [name, setName] = useState("");
  const [icon, setIcon] = useState("wallet");
  const [color, setColor] = useState(COLOR_OPTIONS[0]);
  const [isMandatory, setIsMandatory] = useState(false);
  const [budgetLimit, setBudgetLimit] = useState("");
  const [dueDay, setDueDay] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) {
      setName(editing?.name ?? "");
      setIcon(editing?.icon ?? "wallet");
      setColor(editing?.color ?? COLOR_OPTIONS[0]);
      setIsMandatory(editing?.is_mandatory ?? false);
      setBudgetLimit(editing?.budget_limit ? String(editing.budget_limit) : "");
      setDueDay(editing?.due_day ? String(editing.due_day) : "");
      setError("");
    }
  }, [open, editing]);

  function submit() {
    if (!name.trim()) { setError("Введите название категории"); return; }
    const limit = budgetLimit ? parseFloat(budgetLimit.replace(",", ".")) : null;
    if (isMandatory && (!Number.isFinite(limit) || (limit ?? 0) <= 0)) {
      setError("Для обязательной категории укажите лимит больше нуля");
      return;
    }
    let dueDayVal: number | null = null;
    if (isMandatory && dueDay) {
      const dd = parseInt(dueDay, 10);
      if (Number.isFinite(dd) && dd >= 1 && dd <= 31) dueDayVal = dd;
    }
    onSave({
      id: editing?.id,
      name: name.trim(),
      icon,
      color,
      is_mandatory: isMandatory,
      budget_limit: limit,
      due_day: dueDayVal,
    });
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} title={editing ? "Редактировать категорию" : "Новая категория"}>
      <div className="space-y-5">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: color + "22" }}>
            {(() => { const Icon = getIcon(icon); return <Icon size={24} style={{ color }} />; })()}
          </div>
          <input
            type="text"
            value={name}
            onChange={(e) => { setName(e.target.value); setError(""); }}
            placeholder="Название категории"
            className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500"
          />
        </div>

        <div>
          <label className="text-xs font-medium text-slate-400 uppercase tracking-wide">Иконка</label>
          <div className="mt-2 grid grid-cols-8 gap-2 max-h-36 overflow-y-auto pr-1">
            {ICON_KEYS.map((k) => {
              const Icon = ICONS[k];
              const active = k === icon;
              return (
                <button
                  key={k}
                  onClick={() => setIcon(k)}
                  className={`aspect-square rounded-lg flex items-center justify-center border transition-colors ${
                    active ? "border-emerald-500 bg-emerald-500/10" : "border-slate-700 hover:border-slate-500"
                  }`}
                >
                  <Icon size={18} className="text-slate-300" />
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <label className="text-xs font-medium text-slate-400 uppercase tracking-wide">Цвет</label>
          <div className="mt-2 flex flex-wrap gap-2">
            {COLOR_OPTIONS.map((c) => (
              <button
                key={c}
                onClick={() => setColor(c)}
                className={`w-8 h-8 rounded-full border-2 transition-transform ${c === color ? "border-white scale-110" : "border-transparent"}`}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
        </div>

        <label className="flex items-center justify-between cursor-pointer">
          <div>
            <p className="text-sm font-medium text-white">Обязательный платёж</p>
            <p className="text-xs text-slate-500">Ежемесячный платёж по графику</p>
          </div>
          <button
            type="button"
            onClick={() => { setIsMandatory((v) => !v); setError(""); }}
            className={`relative w-12 h-7 rounded-full transition-colors ${isMandatory ? "bg-emerald-600" : "bg-slate-700"}`}
          >
            <span className={`absolute top-1 w-5 h-5 rounded-full bg-white transition-all ${isMandatory ? "left-6" : "left-1"}`} />
          </button>
        </label>

        <div>
          <label className="text-xs font-medium text-slate-400 uppercase tracking-wide">
            Ежемесячный лимит {isMandatory && <span className="text-rose-400">*</span>}
          </label>
          <div className="relative mt-1.5">
            <input
              type="number"
              inputMode="decimal"
              value={budgetLimit}
              onChange={(e) => { setBudgetLimit(e.target.value); setError(""); }}
              placeholder={isMandatory ? "Обязательно для обязательных" : "Необязательно"}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500"
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500">₽/мес</span>
          </div>
        </div>

        {isMandatory && (
          <div>
            <label className="text-xs font-medium text-slate-400 uppercase tracking-wide">День списания</label>
            <div className="relative mt-1.5">
              <input
                type="number"
                inputMode="numeric"
                min={1}
                max={31}
                value={dueDay}
                onChange={(e) => setDueDay(e.target.value)}
                placeholder="Например, 15"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 text-xs">1-31</span>
            </div>
            <p className="text-xs text-slate-500 mt-1">Число месяца, когда списывается платёж</p>
          </div>
        )}

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
