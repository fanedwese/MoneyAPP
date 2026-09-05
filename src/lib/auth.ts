import {
  createUser,
  findUserByLogin,
  updateUserPassword,
  seedIfEmpty,
} from "./db";
import { clearSession, setSession, type UserSession } from "./session";

export type { UserSession } from "./session";
export { getSession, clearSession as logoutLocalUser } from "./session";

async function hashText(text: string): Promise<string> {
  const data = new TextEncoder().encode(text.trim().toLowerCase());
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function registerLocalUser(
  login: string,
  password: string,
  securityQuestion: string,
  securityAnswer: string,
): Promise<UserSession> {
  const normalizedLogin = login.trim().toLowerCase();
  if (normalizedLogin.length < 2) throw new Error("Логин слишком короткий");
  if (password.length < 4) throw new Error("Пароль — минимум 4 символа");
  if (!securityQuestion.trim()) throw new Error("Укажите контрольный вопрос");
  if (!securityAnswer.trim()) throw new Error("Укажите ответ на контрольный вопрос");

  const existing = await findUserByLogin(normalizedLogin);
  if (existing) throw new Error("Такой логин уже занят");

  const passwordHash = await hashText(password);
  const answerHash = await hashText(securityAnswer);
  const user = await createUser(normalizedLogin, passwordHash, securityQuestion, answerHash);

  const session: UserSession = { userId: user.id, login: user.login };
  setSession(session);
  // await seedIfEmpty();
  return session;
}

export async function loginLocalUser(login: string, password: string): Promise<UserSession> {
  const normalizedLogin = login.trim().toLowerCase();
  const user = await findUserByLogin(normalizedLogin);
  if (!user) throw new Error("Неверный логин или пароль");

  const passwordHash = await hashText(password);
  if (passwordHash !== user.password_hash) throw new Error("Неверный логин или пароль");

  const session: UserSession = { userId: user.id, login: user.login };
  setSession(session);
  await seedIfEmpty();
  return session;
}

export async function resetLocalPassword(
  login: string,
  securityAnswer: string,
  newPassword: string,
): Promise<UserSession> {
  const normalizedLogin = login.trim().toLowerCase();
  const user = await findUserByLogin(normalizedLogin);
  if (!user) throw new Error("Пользователь не найден");

  const answerHash = await hashText(securityAnswer);
  if (answerHash !== user.security_answer_hash) throw new Error("Неверный ответ на контрольный вопрос");
  if (newPassword.length < 4) throw new Error("Новый пароль — минимум 4 символа");

  const passwordHash = await hashText(newPassword);
  await updateUserPassword(user.id, passwordHash);

  const session: UserSession = { userId: user.id, login: user.login };
  setSession(session);
  return session;
}
