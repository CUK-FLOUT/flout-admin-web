import { useState } from "react";
import type { FormEvent } from "react";
import { useNavigate } from "react-router-dom";

import AuthLayout from "../../components/layout/AuthLayout";
import { loginAdmin, startGoogleLogin } from "../../api/auth";

import { AuthField, PasswordField, primaryButtonClass } from "./AuthFields";

export default function AdminLogin() {
  const navigate = useNavigate();

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (busy) return;

    const data = new FormData(event.currentTarget);

    setBusy(true);
    setError("");

    try {
      await loginAdmin({
        email: String(data.get("email")).trim(),
        password: String(data.get("password")),
      });

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
        <span aria-hidden="true">G</span>
        Google 계정으로 로그인
      </button>
    </AuthLayout>
  );
}
