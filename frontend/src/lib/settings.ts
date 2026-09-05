// App-level settings persisted in localStorage (simple user preferences,
// not transactional data — that lives in IndexedDB).

const KEY = "moneyapp_settings";

export interface Settings {
  savingsRate: number; // percent of income to save, 0..100, default 10
}

const DEFAULTS: Settings = { savingsRate: 10 };

export function getSettings(): Settings {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...DEFAULTS };
    const parsed = JSON.parse(raw) as Partial<Settings>;
    return {
      savingsRate: typeof parsed.savingsRate === "number" && Number.isFinite(parsed.savingsRate) ? parsed.savingsRate : DEFAULTS.savingsRate,
    };
  } catch {
    return { ...DEFAULTS };
  }
}

export function saveSettings(s: Settings): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    // ignore quota / privacy errors
  }
}

export function getSavingsRate(): number {
  return getSettings().savingsRate;
}
