import { useState, useEffect } from "react";
import { Lock, UserPlus, LogIn, KeyRound } from "lucide-react";
import type { UserSession } from "@/lib/auth";
import { loginLocalUser, registerLocalUser, resetLocalPassword } from "@/lib/auth";

type AuthMode = "login" | "register" | "reset";

interface AuthModalProps {
  onSuccess: (session: UserSession) => void;
}

export function AuthModal({ onSuccess }: AuthModalProps) {
  const [mode, setMode] = useState<AuthMode>("login");
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [securityQuestion, setSecurityQuestion] = useState("");
  const [securityAnswer, setSecurityAnswer] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [foundQuestion, setFoundQuestion] = useState<string>("");


	useEffect(() => {
	  const fetchQuestion = async () => {
		if (mode === "reset" && login.trim().length >= 2) {
		  try {
			const { findUserByLogin } = await import("../lib/db");
			const user = await findUserByLogin(login);
			if (user && user.security_question) {
			  setFoundQuestion(user.security_question);
			} else {
			  setFoundQuestion("Пользователь не найден");
			}
		  } catch (e) {
			setFoundQuestion("");
		  }
		} else {
		  setFoundQuestion("");
		}
	  };
	  fetchQuestion();
	}, [login, mode]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      let session: UserSession;
      if (mode === "login") {
        session = await loginLocalUser(login, password);
      } else if (mode === "register") {
        session = await registerLocalUser(login, password, securityQuestion, securityAnswer);
      } else {
        session = await resetLocalPassword(login, securityAnswer, newPassword);
      }
      onSuccess(session);
    } catch (err: any) {
      setError(`Детали: ${err?.message || JSON.stringify(err) || String(err)}`);
    } finally {
      setLoading(false);
    }
  }

  function switchMode(next: AuthMode) {
    setMode(next);
    setError(null);
    setPassword("");
    setNewPassword("");
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/95 backdrop-blur-sm p-4">
      <div className="w-full max-w-md bg-slate-900 border border-slate-700/60 rounded-2xl shadow-2xl shadow-black/50">
        <div className="px-6 pt-6 pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center">
              <Lock className="text-white" size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">MoneyApp</h2>
              <p className="text-xs text-slate-400">Локальный профиль на этом компьютере</p>
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <ModeTab active={mode === "login"} onClick={() => switchMode("login")} icon={LogIn} label="Вход" />
            <ModeTab active={mode === "register"} onClick={() => switchMode("register")} icon={UserPlus} label="Регистрация" />
            <ModeTab active={mode === "reset"} onClick={() => switchMode("reset")} icon={KeyRound} label="Сброс" />
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <Field label="Логин">
            <input
              type="text"
              value={login}
              onChange={(e) => setLogin(e.target.value)}
              autoComplete="username"
              required
              className="w-full px-3 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
              placeholder="Ваш логин"
            />
          </Field>

          {mode !== "reset" && (
            <Field label="Пароль">
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete={mode === "login" ? "current-password" : "new-password"}
                required
                minLength={4}
                className="w-full px-3 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                placeholder="Минимум 4 символа"
              />
            </Field>
          )}

          {mode === "register" && (
            <>
              <Field label="Контрольный вопрос">
                <input
                  type="text"
                  value={securityQuestion}
                  onChange={(e) => setSecurityQuestion(e.target.value)}
                  required
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                  placeholder="Например: имя первого питомца"
                />
              </Field>
              <Field label="Ответ (для сброса пароля)">
                <input
                  type="text"
                  value={securityAnswer}
                  onChange={(e) => setSecurityAnswer(e.target.value)}
                  required
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                  placeholder="Ваш ответ"
                />
              </Field>
            </>
          )}

          {mode === "reset" && (
            <>
              <Field label={foundQuestion ? `Контрольный вопрос: "${foundQuestion}"` : "Ответ на контрольный вопрос"}>
                <input
                  type="text"
                  value={securityAnswer}
                  onChange={(e) => setSecurityAnswer(e.target.value)}
                  required
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                  placeholder="Ответ, указанный при регистрации"
                />
              </Field>
              <Field label="Новый пароль">
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  autoComplete="new-password"
                  required
                  minLength={4}
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                  placeholder="Минимум 4 символа"
                />
              </Field>
            </>
          )}

          {error && (
            <p className="text-sm text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-xl px-3 py-2">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 text-white font-semibold transition-colors"
          >
            {loading ? "Подождите…" : mode === "login" ? "Войти" : mode === "register" ? "Создать профиль" : "Сбросить пароль"}
          </button>
        </form>
      </div>
    </div>
  );
}

function ModeTab({
  active,
  onClick,
  icon: Icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: typeof LogIn;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium transition-colors ${
        active ? "bg-slate-800 text-white" : "text-slate-500 hover:text-slate-300"
      }`}
    >
      <Icon size={14} /> {label}
    </button>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-xs font-medium text-slate-400">{label}</span>
      {children}
    </label>
  );
}
