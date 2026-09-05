import { useEffect, useRef, useState } from "react";
import { Camera, ScanLine, Sparkles, CheckCircle2, X, Image as ImageIcon } from "lucide-react";
import { Modal } from "./Modal";
import { scanReceipt, type ScannedReceipt } from "@/lib/ocr";
import { getIcon } from "@/lib/icons";
import type { Category } from "@/lib/api";
import { formatMoney } from "@/lib/format";
 
export interface ConfirmedReceipt {
  store: string;
  total: number;
  categoryId: string;
  date: string;
}
 
interface Props {
  open: boolean;
  onClose: () => void;
  categories: Category[];
  onConfirm: (r: ConfirmedReceipt) => void;
}
 
export function ReceiptScanner({ open, onClose, categories, onConfirm }: Props) {
  const [stage, setStage] = useState<"upload" | "scanning" | "result">("upload");
  const [receipt, setReceipt] = useState<ScannedReceipt | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
 
  // editable fields
  const [store, setStore] = useState("");
  const [total, setTotal] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [date, setDate] = useState("");
  const [error, setError] = useState("");
 
  const fileRef = useRef<HTMLInputElement>(null);
 
  useEffect(() => {
    if (!open) {
      setStage("upload");
      setReceipt(null);
      setPreviewUrl(null);
      setStore("");
      setTotal("");
      setCategoryId("");
      setDate("");
      setError("");
    }
  }, [open]);
 
  function handleFile(file: File | undefined) {
    if (!file) return;
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(URL.createObjectURL(file));
    startScan();
  }
 
  function startScan() {
    setStage("scanning");
    scanReceipt().then((r) => {
      setReceipt(r);
      setStore(r.store);
      setTotal(String(r.total));
      setDate(r.date);
      const matched = categories.find((c) => c.title === r.suggestedCategoryName);
      setCategoryId(matched ? matched.id : categories[0]?.id ?? "");
      setError("");
      setStage("result");
    });
  }
 
  function confirm() {
    const amt = parseFloat(total.replace(",", "."));
    if (!Number.isFinite(amt) || amt <= 0) {
      setError("Введите корректную сумму больше нуля");
      return;
    }
    if (!categoryId) {
      setError("Выберите категорию");
      return;
    }
    if (!date) {
      setError("Укажите дату");
      return;
    }
    onConfirm({ store: store.trim() || "Чек", total: amt, categoryId, date });
    onClose();
  }
 
  return (
    <Modal open={open} onClose={onClose} title="Распознать чек по фото">
      {stage === "upload" && (
        <div className="space-y-4">
          <div
            onClick={() => fileRef.current?.click()}
            className="relative cursor-pointer border-2 border-dashed border-slate-700 hover:border-emerald-500/60 rounded-2xl py-12 flex flex-col items-center gap-3 transition-colors group bg-slate-800/30"
          >
            <div className="w-16 h-16 rounded-2xl bg-slate-800 group-hover:bg-emerald-500/10 flex items-center justify-center transition-colors">
              <ImageIcon className="text-slate-400 group-hover:text-emerald-400" size={28} />
            </div>
            <p className="text-sm text-slate-300 font-medium">Загрузите фото чека</p>
            <p className="text-xs text-slate-500">Нажмите, чтобы выбрать файл</p>
          </div>
 
          <button
            onClick={() => fileRef.current?.click()}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-medium transition-colors"
          >
            <Camera size={20} /> Сделать снимок / выбрать фото
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(e) => handleFile(e.target.files?.[0])}
          />
        </div>
      )}
 
      {stage === "scanning" && (
        <div className="py-8 flex flex-col items-center gap-6">
          <div className="relative w-48 h-64 rounded-2xl overflow-hidden border border-slate-700 bg-slate-800">
            {previewUrl ? (
              <img src={previewUrl} alt="чек" className="w-full h-full object-cover opacity-60" />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-slate-700 to-slate-800" />
            )}
            <div className="absolute left-0 right-0 h-0.5 bg-emerald-400 shadow-[0_0_12px_2px] shadow-emerald-400/70 animate-[scanLine_1.6s_ease-in-out_infinite]" />
            <div className="absolute inset-0 bg-gradient-to-b from-emerald-500/5 via-transparent to-emerald-500/5" />
          </div>
          <div className="flex flex-col items-center gap-2">
            <div className="flex items-center gap-2 text-emerald-400">
              <ScanLine className="animate-pulse" size={20} />
              <Sparkles size={18} />
            </div>
            <p className="text-sm font-medium text-slate-200">ИИ анализирует чек…</p>
            <p className="text-xs text-slate-500">Распознаём дату, сумму и магазин</p>
          </div>
        </div>
      )}
 
      {stage === "result" && receipt && (
        <div className="space-y-5">
          <div className="flex items-center gap-2 text-emerald-400 animate-slideDown">
            <CheckCircle2 size={20} />
            <span className="text-sm font-medium">Чек распознан — проверьте данные</span>
          </div>
 
          {previewUrl && (
            <img src={previewUrl} alt="чек" className="w-full h-32 object-cover rounded-xl border border-slate-700" />
          )}
 
          <div className="space-y-4">
            <Field label="Магазин">
              <input
                type="text"
                value={store}
                onChange={(e) => setStore(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-emerald-500"
              />
            </Field>
 
            <Field label="Сумма">
              <div className="relative">
                <input
                  type="number"
                  inputMode="decimal"
                  value={total}
                  onChange={(e) => { setTotal(e.target.value); setError(""); }}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-lg font-semibold text-white focus:outline-none focus:border-emerald-500"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500">₽</span>
              </div>
            </Field>
 
            <Field label="Дата чека">
              <input
                type="date"
                value={date}
                onChange={(e) => { setDate(e.target.value); setError(""); }}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-emerald-500"
              />
            </Field>
 
            <Field label={`Категория ${receipt.suggestedCategoryName ? `(ИИ предложил: ${receipt.suggestedCategoryName})` : ""}`}>
              <div className="flex flex-wrap gap-2">
                {categories.map((c) => {
                  const Icon = getIcon(c.icon);
                  const active = c.id === categoryId;
                  const suggested = c.title === receipt.suggestedCategoryName;
                  return (
                    <button
                      key={c.id}
                      onClick={() => { setCategoryId(c.id); setError(""); }}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                        active
                          ? "border-emerald-500 bg-emerald-500/15 text-white"
                          : "border-slate-700 text-slate-300 hover:border-slate-500"
                      }`}
                    >
                      <Icon size={14} style={{ color: c.color }} />
                      {c.title}
                      {suggested && <Sparkles size={12} className="text-emerald-400" />}
                    </button>
                  );
                })}
              </div>
            </Field>
          </div>
 
          {error && <p className="text-sm text-rose-400">{error}</p>}
 
          <div className="flex gap-3">
            <button
              onClick={() => setStage("upload")}
              className="flex-1 py-3 rounded-xl border border-slate-700 text-slate-300 hover:bg-slate-800 font-medium transition-colors"
            >
              <X size={16} className="inline mr-1" /> Переснять
            </button>
            <button
              onClick={confirm}
              className="flex-[2] py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold transition-colors"
            >
              Всё верно, внести
            </button>
          </div>
        </div>
      )}
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