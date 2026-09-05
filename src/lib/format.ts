export function formatMoney(n: number | null | undefined): string {
  const v = Number(n);
  if (!Number.isFinite(v)) return "0 ₽";
  return v.toLocaleString("ru-RU", { maximumFractionDigits: 0 }) + " ₽";
}

export function safeNum(n: number | null | undefined): number {
  const v = Number(n);
  return Number.isFinite(v) ? v : 0;
}

export function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

export function monthKey(d = new Date()): string {
  return d.toISOString().slice(0, 7);
}

export function isSameMonth(dateISO: string, ref = new Date()): boolean {
  return dateISO.slice(0, 7) === monthKey(ref);
}

export function daysLeftInMonth(d = new Date()): number {
  const last = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  return Math.max(0, last - d.getDate());
}

export function formatShortDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("ru-RU", { day: "numeric", month: "short" });
}

export function formatFullDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" });
}
