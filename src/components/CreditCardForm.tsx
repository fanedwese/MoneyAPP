import { useEffect, useState } from "react";
import { Modal } from "./Modal";
import type { CreditCard } from "@/lib/db";

interface Props {
  open: boolean;
  onClose: () => void;
  editing?: CreditCard | null;
  onSave: (c: Omit<CreditCard, "id" | "created_at"> & { id?: string }) => void;
}

export function CreditCardForm({ open, onClose, editing, onSave }: Props) {
  const [name, setName] = useState("");
  const [limit, setLimit] = useState("");
  const [graceDays, setGraceDays] = useState("55");
  const [statementDay, setStatementDay] = useState("10");
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) {
      setName(editing?.name ?? "");
      setLimit(editing ? String(editing.limit) : "");
      setGraceDays(editing ? String(editing.grace_days) : "55");
      setStatementDay(editing ? String(editing.statement_day) : "10");
      setError("");
    }
  }, [open, editing]);

  function submit() {
    if (!name.trim()) { setError("Введите название карты"); return; }
    const lim = parseFloat(limit.replace(",", "."));
    if (!Number.isFinite(lim) || lim <= 0) { setError("Введите кредитный лимит больше нуля"); return; }
    const grace = parseInt(graceDays, 10);
    if (!Number.isFinite(grace) || grace < 1) { setError("Длительность беспроцентного периода должна быть больше 0"); return; }
    const stmt = parseInt(statementDay, 10);
    if (!Number.isFinite(stmt) || stmt < 1 || stmt > 31) { setError("День выписки — число от 1 до 31"); return; }
    onSave({
      id: editing?.id,
      name: name.trim(),
      limit: lim,
      grace_days: grace,
      statement_day: stmt,
    });
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} title={editing ? "Редактировать карту" : "Добавить кредитную карту"}>
      <div className="space-y-4">
        <Field label="Название карты">
          <input
            type="text"
            value={name}
            onChange={(e) => { setName(e.target.value); setError(""); }}
            placeholder="Тинькофф Платинум, Сбер Кредитка…"
            className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500"
          />
        </Field>

        <Field label="Кредитный лимит">
          <div className="relative">
            <input
              type="number"
              inputMode="decimal"
              value={limit}
              onChange={(e) => { setLimit(e.target.value); setError(""); }}
              placeholder="0"
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-lg font-semibold text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500"
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500">₽</span>
          </div>
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Беспроцентный период">
            <div className="relative">
              <input
                type="number"
                inputMode="numeric"
                value={graceDays}
                onChange={(e) => setGraceDays(e.target.value)}
                placeholder="55"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-emerald-500"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm">дн</span>
            </div>
          </Field>

          <Field label="День выписки">
            <div className="relative">
              <input
                type="number"
                inputMode="numeric"
                min={1}
                max={31}
                value={statementDay}
                onChange={(e) => setStatementDay(e.target.value)}
                placeholder="10"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-emerald-500"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 text-xs">1-31</span>
            </div>
          </Field>
        </div>

        <div className="rounded-xl bg-slate-800/50 border border-slate-700/50 px-4 py-3 text-xs text-slate-400">
          Покупки с карты не списываются из основного баланса, но увеличивают долг.
          Алгоритм автоматически считает дату возврата без процентов.
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
