// API 명세가 제공되지 않아 임의의 서버 주소·토큰 저장 방식을 넣지 않았습니다.
// 기존 src/api/client.ts를 사용해 아래 함수 본문만 실제 API 호출로 교체하세요.
export type LoginInput = { email: string; password: string };
export type SignupInput = {
  email: string;
  password: string;
  name: string;
  termsAgreed: boolean;
  privacyAgreed: boolean;
};

export async function loginAdmin(_input: LoginInput): Promise<void> {
  void _input;
  throw new Error("운영자 로그인 API를 연결해 주세요.");
}

export async function signupAdmin(_input: SignupInput): Promise<void> {
  void _input;
  throw new Error("운영자 회원가입 API를 연결해 주세요.");
}

export function startGoogleLogin(): void {
  throw new Error("Google OAuth 시작 주소를 연결해 주세요.");
}
