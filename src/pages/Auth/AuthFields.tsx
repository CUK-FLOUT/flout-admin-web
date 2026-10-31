import { useState } from "react";
import type { InputHTMLAttributes, ReactNode } from "react";

import eye from "../../assets/login/eye.png";

type AuthFieldProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  id: string;
};

type PasswordFieldProps = Omit<AuthFieldProps, "type">;

type FieldContainerProps = {
  id: string;
  label: string;
  children: ReactNode;
};

const inputClass =
  "h-[52px] w-full min-w-0 rounded-md border border-[#cbd5e1] bg-white px-4 text-sm text-[#202b36] placeholder:text-[#64748b] focus:border-[#234f73] focus:outline-2 focus:outline-offset-2 focus:outline-[#75a7cd]";

export const primaryButtonClass =
  "flex min-h-[52px] w-full cursor-pointer items-center justify-center rounded-md bg-[#234f73] px-4 py-3 text-sm font-bold leading-[22px] text-white transition-colors hover:bg-[#183b58] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#234f73] disabled:cursor-not-allowed disabled:opacity-50";

function FieldContainer({ id, label, children }: FieldContainerProps) {
  return (
    <div className="flex min-w-0 flex-col gap-[10px]">
      <label htmlFor={id} className="text-sm font-bold leading-5">
        {label}
      </label>

      {children}
    </div>
  );
}

export function AuthField({
  label,
  id,
  className,
  ...inputProps
}: AuthFieldProps) {
  return (
    <FieldContainer id={id} label={label}>
      <input
        {...inputProps}
        id={id}
        className={[inputClass, className].filter(Boolean).join(" ")}
      />
    </FieldContainer>
  );
}

export function PasswordField({
  label,
  id,
  className,
  disabled,
  ...inputProps
}: PasswordFieldProps) {
  const [isVisible, setIsVisible] = useState(false);

  function toggleVisibility() {
    setIsVisible((previous) => !previous);
  }

  return (
    <FieldContainer id={id} label={label}>
      <div className="relative">
        <input
          {...inputProps}
          id={id}
          type={isVisible ? "text" : "password"}
          disabled={disabled}
          className={[inputClass, "pr-14", className].filter(Boolean).join(" ")}
        />

        <button
          type="button"
          disabled={disabled}
          onClick={toggleVisibility}
          aria-pressed={isVisible}
          aria-label={`${label} ${isVisible ? "숨기기" : "보기"}`}
          className="absolute right-1 top-1 grid h-11 w-11 cursor-pointer place-items-center rounded focus-visible:outline-2 focus-visible:outline-[#234f73] disabled:cursor-not-allowed disabled:opacity-50"
        >
          <img src={eye} alt="" width={20} height={20} className="h-5 w-5" />
        </button>
      </div>
    </FieldContainer>
  );
}
