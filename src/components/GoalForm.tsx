import { useEffect, useState } from "react";
import { Modal } from "./Modal";
import { COLOR_OPTIONS } from "@/lib/icons";
import type { Goal } from "@/lib/db";
import { todayISO } from "@/lib/format";

interface Props {
  open: boolean;
  onClose: () => void;
  editing?: Goal | null;
  onSave: (g: Omit<Goal, "id" | "created_at"> & { id?: string }) => void;
}

export function GoalForm({ open, onClose, editing, onSave }: Props) {
  const [name, setName] = useState("");
  const [target, setTarget] = useState("");
  const [saved, setSaved] = useState("");
  const [deadline, setDeadline] = useState("");
  const [color, setColor] = useState(COLOR_OPTIONS[8]);
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) {
      setName(editing?.name ?? "");
      setTarget(editing ? String(editing.target) : "");
      setSaved(editing ? String(editing.saved) : "");
      setDeadline(editing?.deadline ?? "");
      setColor(editing?.color ?? COLOR_OPTIONS[8]);
      setError("");
    }
  }, [open, editing]);

  function submit() {
    if (!name.trim()) { setError("Введите название цели"); return; }
    const t = parseFloat(target.replace(",", "."));
    if (!Number.isFinite(t) || t <= 0) { setError("Введите целевую сумму больше нуля"); return; }
    const s = parseFloat(saved.replace(",", ".")) || 0;
    onSave({
      id: editing?.id,
      name: name.trim(),
      target: t,
      saved: Math.max(0, s),
      deadline: deadline || null,
      color,
    });
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} title={editing ? "Редактировать цель" : "Новая цель"}>
      <div className="space-y-4">
        <Field label="Название мечты">
          <input
            type="text"
            value={name}
            onChange={(e) => { setName(e.target.value); setError(""); }}
            placeholder="Новый телефон, отпуск…"
            className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500"
          />
        </Field>

        <Field label="Целевая сумма">
          <div className="relative">
            <input
              type="number"
              inputMode="decimal"
              value={target}
              onChange={(e) => { setTarget(e.target.value); setError(""); }}
              placeholder="0"
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-lg font-semibold text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500"
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500">₽</span>
          </div>
        </Field>

        <Field label="Уже накоплено">
          <div className="relative">
            <input
              type="number"
              inputMode="decimal"
              value={saved}
              onChange={(e) => setSaved(e.target.value)}
              placeholder="0"
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500"
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500">₽</span>
          </div>
        </Field>

        <Field label="Срок (дедлайн)">
          <input
            type="date"
            value={deadline}
            min={todayISO()}
            onChange={(e) => setDeadline(e.target.value)}
            className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-emerald-500"
          />
        </Field>

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
