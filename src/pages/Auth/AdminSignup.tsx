import { useRef, useState } from "react";
import type { FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import AuthLayout from "../../components/layout/AuthLayout";
import { signupAdmin } from "../../api/auth";
import {
  AuthField,
  PasswordField,
  primaryButtonClass,
  linkClass,
} from "./AuthFields";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PASSWORD_PATTERN =
  /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]{8,}$/;

/**
 * 운영자 회원가입 페이지입니다.
 * 이메일/비밀번호 형식, 비밀번호 확인, 필수 약관 동의를 검증한 뒤 회원가입 API를 호출합니다.
 */
export default function AdminSignup() {
  const navigate = useNavigate();
  const dialog = useRef<HTMLDialogElement>(null);
  const [document, setDocument] = useState<"terms" | "privacy">("terms");
  const [terms, setTerms] = useState(false);
  const [privacy, setPrivacy] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  /**
   * 약관/개인정보 처리방침 다이얼로그를 엽니다.
   */
  function openDocument(type: "terms" | "privacy") {
    setDocument(type);
    dialog.current?.showModal();
  }

  /**
   * 회원가입 폼 제출을 처리합니다. 이메일/비밀번호 형식, 비밀번호 확인,
   * 이름, 필수 약관 동의를 검증한 뒤 회원가입 API를 호출합니다.
   */
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setError("");
    const data = new FormData(event.currentTarget);
    const email = String(data.get("email")).trim();
    if (!EMAIL_PATTERN.test(email)) {
      setError("올바른 이메일 형식을 입력해 주세요.");
      return;
    }
    const password = String(data.get("password"));
    if (!PASSWORD_PATTERN.test(password)) {
      setError("비밀번호는 영문과 숫자를 포함해 8자 이상이어야 합니다.");
      return;
    }
    if (password !== String(data.get("confirmPassword"))) {
      setError("비밀번호와 비밀번호 확인이 일치하지 않습니다.");
      event.currentTarget
        .querySelector<HTMLInputElement>("#signup-confirm")
        ?.focus();
      return;
    }
    const name = String(data.get("name")).trim();
    if (!name) {
      setError("이름을 입력해 주세요.");
      return;
    }
    if (!terms || !privacy) {
      setError("필수 동의 항목을 확인해 주세요.");
      return;
    }
    setBusy(true);
    try {
      await signupAdmin({
        email,
        password,
        name,
        termsAgreed: terms,
        privacyAgreed: privacy,
      });
      navigate("/login", { replace: true, state: { registered: true } });
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "회원가입하지 못했습니다. 다시 시도해 주세요.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthLayout variant="signup">
      <h2 className="text-[30px] font-bold leading-10">운영자 회원가입</h2>
      <p className="mb-4 mt-4 break-keep text-[15px] leading-[23px] text-[#64748b]">
        업무 시스템에서 사용할 계정을 만들어 주세요.
      </p>
      <form onSubmit={submit} className="space-y-4" aria-busy={busy}>
        <AuthField
          label="이메일"
          id="signup-email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="업무용 이메일을 입력해 주세요"
          required
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <PasswordField
            label="비밀번호"
            id="signup-password"
            name="password"
            autoComplete="new-password"
            placeholder="비밀번호 입력"
            required
          />
          <PasswordField
            label="비밀번호 확인"
            id="signup-confirm"
            name="confirmPassword"
            autoComplete="new-password"
            placeholder="비밀번호 다시 입력"
            required
          />
        </div>
        <AuthField
          label="이름"
          id="signup-name"
          name="name"
          autoComplete="name"
          placeholder="이름을 입력해 주세요"
          required
        />
        <fieldset className="space-y-[10px]">
          <legend className="mb-[10px] text-sm font-bold leading-5">
            서비스 이용 동의
          </legend>
          {(
            [
              {
                key: "terms",
                label: "이용약관 동의 (필수)",
                checked: terms,
                set: setTerms,
              },
              {
                key: "privacy",
                label: "개인정보 수집 및 이용 동의 (필수)",
                checked: privacy,
                set: setPrivacy,
              },
            ] as const
          ).map((item) => (
            <div
              key={item.key}
              className="flex items-center justify-between gap-3"
            >
              <label className="flex min-h-6 cursor-pointer items-center gap-[10px] text-[13px] leading-5 text-[#43515e]">
                <input
                  type="checkbox"
                  name={item.key}
                  checked={item.checked}
                  onChange={(event) => item.set(event.target.checked)}
                  required
                  className="h-5 w-5 shrink-0 cursor-pointer accent-[#234f73]"
                />
                {item.label}
              </label>
              <button
                type="button"
                onClick={() => openDocument(item.key)}
                aria-label={`${item.label} 내용 보기`}
                className="shrink-0 cursor-pointer text-xs text-[#234f73] underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-[#234f73]"
              >
                보기
              </button>
            </div>
          ))}
        </fieldset>
        {error && (
          <p role="alert" className="text-[13px] leading-5 text-[#a53632]">
            {error}
          </p>
        )}
        <button
          type="submit"
          disabled={busy || !terms || !privacy}
          className={primaryButtonClass}
        >
          {busy ? "가입 처리 중…" : "회원가입"}
        </button>
      </form>
      <p className="mt-4 flex flex-wrap items-center justify-center gap-2 text-[13px] leading-[22px] text-[#64748b]">
        이미 계정이 있으신가요?
        <Link to="/login" className={linkClass}>
          로그인
        </Link>
      </p>
      <dialog
        ref={dialog}
        aria-labelledby="agreement-title"
        className="fixed inset-0 m-auto max-h-[80dvh] w-[calc(100%_-_40px)] max-w-lg overflow-auto rounded-xl border border-[#cbd5e1] bg-white p-6 text-[#202b36] backdrop:bg-black/40"
      >
        <h3 id="agreement-title" className="text-lg font-bold">
          {document === "terms" ? "이용약관" : "개인정보 수집 및 이용"}
        </h3>
        <p className="my-6 text-sm leading-6 text-[#43515e]">
          실제 약관 본문을 아직 연결하지 않았습니다. 운영 서비스에 사용할 약관을
          이 영역에 연결해 주세요.
        </p>
        <button
          type="button"
          onClick={() => dialog.current?.close()}
          className={primaryButtonClass}
        >
          닫기
        </button>
      </dialog>
    </AuthLayout>
  );
}
