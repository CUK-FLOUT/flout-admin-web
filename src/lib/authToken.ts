const ACCESS_TOKEN_KEY = "flout_admin_access_token";

/**
 * localStorage에 저장된 운영자 액세스 토큰을 가져옵니다.
 * 저장된 토큰이 없으면 null을 반환합니다.
 */
export function getAccessToken(): string | null {
  return localStorage.getItem(ACCESS_TOKEN_KEY);
}

/**
 * 운영자 액세스 토큰을 localStorage에 저장합니다.
 */
export function setAccessToken(token: string): void {
  localStorage.setItem(ACCESS_TOKEN_KEY, token);
}

/**
 * 저장된 운영자 액세스 토큰을 삭제합니다. 로그아웃 시 사용합니다.
 */
export function clearAccessToken(): void {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
}

/**
 * 액세스 토큰 존재 여부로 운영자 로그인 상태를 확인합니다.
 */
export function isAuthenticated(): boolean {
  return Boolean(getAccessToken());
}
