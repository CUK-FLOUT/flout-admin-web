import axios from "axios";
import { authClient } from "./authTransport";
import { getSession, parseSession, setSession } from "../auth/session";
import type { AdminSession } from "../auth/session";
import { requestGoogleIdToken } from "../auth/google";

export type LoginInput = { email: string; password: string };
export interface AuthResponse {
  isSuccess: boolean;
  status: number;
  code: string;
  message: string;
  result: AdminSession | null;
  timeStamp: string;
}

export class AuthenticationError extends Error {
  readonly status?: number;
  readonly code?: string;

  constructor(message: string, status?: number, code?: string) {
    super(message);
    this.name = "AuthenticationError";
    this.status = status;
    this.code = code;
  }
}

function authenticationError(error: unknown): Error {
  if (axios.isAxiosError(error)) {
    const data: unknown = error.response?.data;
    const body =
      data && typeof data === "object"
        ? (data as Record<string, unknown>)
        : null;
    const message =
      typeof body?.message === "string" && body.message.trim()
        ? body.message
        : error.response
          ? "인증 요청에 실패했습니다. 다시 시도해 주세요."
          : "인증 서버에 연결할 수 없습니다. 잠시 후 다시 시도해 주세요.";

    return new AuthenticationError(
      message,
      error.response?.status,
      typeof body?.code === "string" ? body.code : undefined,
    );
  }

  return error instanceof Error
    ? error
    : new Error("인증 요청에 실패했습니다.");
}

async function requestAuthentication(
  path: string,
  input: LoginInput | { idToken: string } | { refreshToken: string },
  signal?: AbortSignal,
) {
  try {
    const { data } = await authClient.post<AuthResponse>(path, input, {
      signal,
    });

    if (data.isSuccess !== true)
      throw new AuthenticationError(
        data.message || "인증 요청에 실패했습니다.",
        data.status,
        data.code,
      );
    const next = parseSession(data.result);

    if (
      Date.parse(next.expiresAt) <= Date.now() ||
      Date.parse(next.refreshExpiresAt) <= Date.now()
    ) {
      throw new Error("만료된 인증 정보입니다. 다시 로그인해 주세요.");
    }

    return next;
  } catch (error) {
    throw authenticationError(error);
  }
}

export async function loginAdmin(
  input: LoginInput,
  signal?: AbortSignal,
): Promise<void> {
  const email = input.email.trim();

  if (!email || !input.password.trim())
    throw new Error("이메일과 비밀번호를 입력해 주세요.");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    throw new Error("올바른 이메일 형식으로 입력해 주세요.");
  if (email.length > 100 || input.password.length > 64)
    throw new Error("이메일은 100자, 비밀번호는 64자 이내로 입력해 주세요.");
  const next = await requestAuthentication(
    "/api/auth/admin/login",
    { email, password: input.password },
    signal,
  );

  if (!signal?.aborted) setSession(next);
}

export async function startGoogleLogin(signal?: AbortSignal): Promise<void> {
  const idToken = await requestGoogleIdToken(signal);
  const next = await requestAuthentication(
    "/api/auth/admin/google",
    { idToken },
    signal,
  );

  if (!signal?.aborted) setSession(next);
}

let refreshFlight: {
  session: AdminSession;
  promise: Promise<AdminSession>;
} | null = null;

export function refreshSession(): Promise<AdminSession> {
  const previous = getSession();

  if (!previous || Date.parse(previous.refreshExpiresAt) <= Date.now()) {
    setSession(null);

    return Promise.reject(
      new Error("인증이 만료되었습니다. 다시 로그인해 주세요."),
    );
  }

  if (refreshFlight?.session === previous) return refreshFlight.promise;
  const promise = requestAuthentication("/api/auth/refresh", {
    refreshToken: previous.refreshToken,
  })
    .then((next) => {
      if (getSession() !== previous)
        throw new Error("인증 정보가 변경되었습니다. 다시 시도해 주세요.");
      if (next.refreshToken === previous.refreshToken)
        throw new Error(
          "새로운 인증 토큰을 받지 못했습니다. 다시 로그인해 주세요.",
        );
      setSession(next, true);

      return next;
    })
    .catch((error: unknown) => {
      const invalidSession =
        !(error instanceof AuthenticationError) ||
        error.status === 401 ||
        error.code === "USER_401_4";

      if (getSession() === previous && invalidSession) setSession(null);
      throw error;
    })
    .finally(() => {
      if (refreshFlight?.promise === promise) refreshFlight = null;
    });

  refreshFlight = { session: previous, promise };

  return promise;
}
