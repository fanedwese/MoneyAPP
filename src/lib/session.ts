const SESSION_KEY = "moneyapp_session";

export interface UserSession {
  userId: string;
  login: string;
}

export function getSession(): UserSession | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as UserSession;
    if (!parsed?.userId || !parsed?.login) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function setSession(session: UserSession): void {
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export function clearSession(): void {
  localStorage.removeItem(SESSION_KEY);
}

export function getCurrentUserId(): string | null {
  return getSession()?.userId ?? null;
}
