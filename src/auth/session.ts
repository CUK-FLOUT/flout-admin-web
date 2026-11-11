export interface AdminSession {
  accessToken: string;
  tokenType: string;
  expiresIn: number;
  expiresAt: string;
  userId: number;
  email: string;
  name: string;
  role: "ADMIN";
  requiresConsent: false;
  refreshToken: string;
  refreshExpiresIn: number;
  refreshExpiresAt: string;
}

const STORAGE_KEY = "flout.admin.session";
const listeners = new Set<() => void>();

export function parseSession(value: unknown): AdminSession {
  if (!value || typeof value !== "object")
    throw new Error("인증 응답이 올바르지 않습니다.");
  const record = value as Record<string, unknown>;

  if (record.role !== "ADMIN")
    throw new Error("관리자 계정만 로그인할 수 있습니다.");
  if (record.requiresConsent !== false)
    throw new Error("운영자 인증 응답의 동의 상태가 올바르지 않습니다.");
  for (const key of [
    "accessToken",
    "refreshToken",
    "email",
    "name",
    "expiresAt",
    "refreshExpiresAt",
  ]) {
    if (typeof record[key] !== "string" || !record[key].trim())
      throw new Error("인증 응답이 올바르지 않습니다.");
  }

  if (
    record.tokenType !== "Bearer" ||
    !Number.isSafeInteger(record.userId) ||
    typeof record.expiresIn !== "number" ||
    !Number.isFinite(record.expiresIn) ||
    record.expiresIn <= 0 ||
    typeof record.refreshExpiresIn !== "number" ||
    !Number.isFinite(record.refreshExpiresIn) ||
    record.refreshExpiresIn <= 0 ||
    !Number.isFinite(Date.parse(record.expiresAt as string)) ||
    !Number.isFinite(Date.parse(record.refreshExpiresAt as string))
  ) {
    throw new Error("인증 응답이 올바르지 않습니다.");
  }

  return record as unknown as AdminSession;
}

function restoreSession(): AdminSession | null {
  try {
    const stored = sessionStorage.getItem(STORAGE_KEY);

    if (!stored) return null;
    const restored = parseSession(JSON.parse(stored));

    if (Date.parse(restored.refreshExpiresAt) <= Date.now())
      throw new Error("expired");

    return restored;
  } catch {
    try {
      sessionStorage.removeItem(STORAGE_KEY);
    } catch {
      /* Storage may be unavailable. */
    }

    return null;
  }
}

let session = restoreSession();
let generation = 0;

export function getSessionGeneration() {
  return generation;
}

export function getSession() {
  return session;
}

export function subscribeSession(listener: () => void) {
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
}

export function setSession(next: AdminSession | null, rotation = false) {
  if (next) {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      throw new Error("브라우저의 세션 저장을 허용한 뒤 다시 로그인해 주세요.");
    }
  } else {
    try {
      sessionStorage.removeItem(STORAGE_KEY);
    } catch {
      /* The in-memory session is still cleared. */
    }
  }

  if (!rotation) generation += 1;
  session = next;
  listeners.forEach((listener) => listener());
}

export function isAccessValid(
  value: AdminSession | null,
): value is AdminSession {
  return (
    value !== null &&
    Date.parse(value.expiresAt) > Date.now() &&
    Date.parse(value.refreshExpiresAt) > Date.now()
  );
}
