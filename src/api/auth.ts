import { apiClient } from "./client";

export type LoginInput = { email: string; password: string };
export type SignupInput = {
  email: string;
  password: string;
  name: string;
  termsAgreed: boolean;
  privacyAgreed: boolean;
};

export type AuthResponse = {
  accessToken: string;
};

/**
 * 운영자 로그인 API(POST /admin/auth/login)를 호출합니다.
 * 성공 시 서버가 발급한 액세스 토큰이 포함된 응답을 반환합니다.
 */
export async function loginAdmin(input: LoginInput): Promise<AuthResponse> {
  const { data } = await apiClient.post<AuthResponse>(
    "/admin/auth/login",
    input,
  );
  return data;
}

/**
 * 운영자 회원가입 API(POST /admin/auth/signup)를 호출합니다.
 * 성공 시 서버가 발급한 액세스 토큰이 포함된 응답을 반환합니다.
 */
export async function signupAdmin(input: SignupInput): Promise<AuthResponse> {
  const { data } = await apiClient.post<AuthResponse>(
    "/admin/auth/signup",
    input,
  );
  return data;
}

/**
 * Google OAuth 로그인 플로우를 시작합니다.
 * 백엔드의 Google OAuth 진입 엔드포인트로 브라우저를 이동시킵니다.
 */
export function startGoogleLogin(): void {
  const baseUrl = import.meta.env.VITE_API_BASE_URL ?? "";
  window.location.href = `${baseUrl}/admin/auth/google`;
}
