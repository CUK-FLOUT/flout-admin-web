import { useState } from "react";
import type { FormEvent } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import AuthLayout from "../../components/layout/AuthLayout";
import { loginAdmin, startGoogleLogin } from "../../api/auth";
import { setAccessToken } from "../../lib/authToken";
import {
  AuthField,
  PasswordField,
  primaryButtonClass,
  linkClass,
} from "./AuthFields";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * 운영자 로그인 페이지입니다.
 * 이메일/비밀번호 형식을 검증하고 로그인 성공 시 토큰을 저장한 뒤 대시보드로 이동합니다.
 */
export default function AdminLogin() {
  const navigate = useNavigate();
  const location = useLocation();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const registered = location.state?.registered === true;

  /**
   * 로그인 폼 제출을 처리합니다. 형식 검증 후 로그인 API를 호출하고
   * 성공 시 액세스 토큰을 저장한 뒤 대시보드로 이동합니다.
   */
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setError("");
    const data = new FormData(event.currentTarget);
    const email = String(data.get("email")).trim();
    const password = String(data.get("password"));
    if (!EMAIL_PATTERN.test(email)) {
      setError("올바른 이메일 형식을 입력해 주세요.");
      return;
    }
    setBusy(true);
    try {
      const { accessToken } = await loginAdmin({ email, password });
      setAccessToken(accessToken);
      navigate("/", { replace: true });
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "로그인하지 못했습니다. 다시 시도해 주세요.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthLayout>
      <h2 className="text-[30px] font-bold leading-10">운영자 로그인</h2>
      <p className="mb-5 mt-4 break-keep text-[15px] leading-[23px] text-[#64748b]">
        등록된 운영자 계정으로 로그인해 주세요.
      </p>
      {registered && (
        <p role="status" className="mb-5 text-sm leading-[22px] text-[#27654d]">
          회원가입이 완료되었습니다. 로그인해 주세요.
        </p>
      )}
      <form onSubmit={submit} className="space-y-5" aria-busy={busy}>
        <AuthField
          label="이메일"
          id="login-email"
          name="email"
          type="email"
          autoComplete="username"
          placeholder="이메일을 입력해 주세요"
          required
        />
        <PasswordField
          label="비밀번호"
          id="login-password"
          name="password"
          autoComplete="current-password"
          placeholder="비밀번호를 입력해 주세요"
          required
        />
        {error && (
          <p role="alert" className="text-[13px] leading-5 text-[#a53632]">
            {error}
          </p>
        )}
        <button type="submit" disabled={busy} className={primaryButtonClass}>
          {busy ? "로그인 중…" : "로그인"}
        </button>
      </form>
      <div className="my-5 flex items-center gap-3 text-xs leading-5 text-[#64748b]">
        <span className="h-px flex-1 bg-[#cbd5e1]" />
        <span>또는</span>
        <span className="h-px flex-1 bg-[#cbd5e1]" />
      </div>
      <button
        type="button"
        disabled={busy}
        onClick={() => {
          try {
            startGoogleLogin();
          } catch (cause) {
            setError(
              cause instanceof Error
                ? cause.message
                : "Google 로그인에 실패했습니다.",
            );
          }
        }}
        className="flex min-h-[52px] w-full cursor-pointer items-center justify-center gap-2 rounded-md border border-[#cbd5e1] bg-white px-4 text-sm font-medium hover:bg-[#f4f5f6] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#234f73] disabled:cursor-not-allowed disabled:opacity-50"
      >
        <span aria-hidden="true">G</span>Google 계정으로 로그인
      </button>
      <p className="mt-5 flex flex-wrap items-center justify-center gap-2 text-[13px] leading-[22px] text-[#64748b]">
        운영자 계정이 없으신가요?
        <Link to="/signup" className={linkClass}>
          회원가입
        </Link>
      </p>
    </AuthLayout>
  );
}
