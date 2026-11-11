import axios from "axios";
import type { InternalAxiosRequestConfig } from "axios";
import { refreshSession } from "./auth";
import {
  getSession,
  getSessionGeneration,
  isAccessValid,
  setSession,
} from "../auth/session";

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  timeout: 10000,
  headers: { "Content-Type": "application/json" },
});

type AuthRequest = InternalAxiosRequestConfig & {
  authRetried?: boolean;
  sessionUserId?: number;
  sessionGeneration?: number;
};

function isAuthenticationRequest(url = "") {
  return /\/api\/auth\/(?:admin\/(?:login|google)|refresh)(?:[?#]|$)/.test(url);
}

apiClient.interceptors.request.use(async (config: AuthRequest) => {
  if (isAuthenticationRequest(config.url)) {
    config.headers.delete("Authorization");

    return config;
  }

  if (
    config.authRetried &&
    config.sessionGeneration !== getSessionGeneration()
  ) {
    throw new Error("인증 정보가 변경되었습니다. 다시 시도해 주세요.");
  }

  let session = getSession();

  if (session && !isAccessValid(session)) session = await refreshSession();
  if (session) {
    config.headers.set("Authorization", `Bearer ${session.accessToken}`);
    config.sessionUserId = session.userId;
    config.sessionGeneration = getSessionGeneration();
  } else {
    config.headers.delete("Authorization");
  }

  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  async (error: unknown) => {
    if (
      !axios.isAxiosError(error) ||
      error.response?.status !== 401 ||
      !error.config
    )
      throw error;
    const config = error.config as AuthRequest;

    if (isAuthenticationRequest(config.url)) throw error;
    const session = getSession();

    if (
      !session ||
      config.sessionUserId !== session.userId ||
      config.sessionGeneration !== getSessionGeneration()
    )
      throw error;
    if (config.authRetried) {
      if (
        config.headers.get("Authorization") === `Bearer ${session.accessToken}`
      )
        setSession(null);
      throw error;
    }

    config.authRetried = true;
    const usedCurrentToken =
      config.headers.get("Authorization") === `Bearer ${session.accessToken}`;
    const next =
      !usedCurrentToken && isAccessValid(session)
        ? session
        : await refreshSession();

    config.headers.set("Authorization", `Bearer ${next.accessToken}`);

    return apiClient(config);
  },
);
