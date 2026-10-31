import { useState } from "react";
import type { FormEvent } from "react";
import { useNavigate } from "react-router-dom";

import { loginAdmin, startGoogleLogin } from "../../api/auth";
import AuthLayout from "../../components/layout/AuthLayout";

import { AuthField, PasswordField, primaryButtonClass } from "./AuthFields";

const LOGIN_ERROR_MESSAGE = "로그인하지 못했습니다. 다시 시도해 주세요.";

const GOOGLE_ERROR_MESSAGE = "Google 로그인에 실패했습니다.";

function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  return fallback;
}

export default function AdminLogin() {
  const navigate = useNavigate();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isSubmitting) return;

    const formData = new FormData(event.currentTarget);

    const email = formData.get("email");
    const password = formData.get("password");

    if (
      typeof email !== "string" ||
      typeof password !== "string" ||
      !email.trim() ||
      !password
    ) {
      setErrorMessage("이메일과 비밀번호를 입력해 주세요.");

      return;
    }

    setIsSubmitting(true);
    setErrorMessage("");

    try {
      await loginAdmin({
        email: email.trim(),
        password,
      });

      navigate("/", { replace: true });
    } catch (error) {
      setErrorMessage(getErrorMessage(error, LOGIN_ERROR_MESSAGE));
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleGoogleLogin() {
    if (isSubmitting) return;

    setErrorMessage("");

    try {
      startGoogleLogin();
    } catch (error) {
      setErrorMessage(getErrorMessage(error, GOOGLE_ERROR_MESSAGE));
    }
  }

  return (
    <AuthLayout>
      <h2 className="text-[30px] font-bold leading-10">운영자 로그인</h2>

      <p className="mb-5 mt-4 break-keep text-[15px] leading-[23px] text-[#64748b]">
        등록된 운영자 계정으로 로그인해 주세요.
      </p>

      <form
        onSubmit={handleSubmit}
        className="space-y-5"
        aria-busy={isSubmitting}
      >
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

        {errorMessage && (
          <p role="alert" className="text-[13px] leading-5 text-[#a53632]">
            {errorMessage}
          </p>
        )}

        <button
          type="submit"
          disabled={isSubmitting}
          className={primaryButtonClass}
        >
          {isSubmitting ? "로그인 중…" : "로그인"}
        </button>
      </form>

      <div className="my-5 flex items-center gap-3 text-xs leading-5 text-[#64748b]">
        <span className="h-px flex-1 bg-[#cbd5e1]" />
        <span>또는</span>
        <span className="h-px flex-1 bg-[#cbd5e1]" />
      </div>

      <button
        type="button"
        disabled={isSubmitting}
        onClick={handleGoogleLogin}
        className="flex min-h-[52px] w-full cursor-pointer items-center justify-center gap-2 rounded-md border border-[#cbd5e1] bg-white px-4 text-sm font-medium hover:bg-[#f4f5f6] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#234f73] disabled:cursor-not-allowed disabled:opacity-50"
      >
        <span aria-hidden="true">G</span>
        Google 계정으로 로그인
      </button>
    </AuthLayout>
  );
}
