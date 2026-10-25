import { useState } from "react";
import type { InputHTMLAttributes } from "react";
import eye from "../../assets/login/eye.png";

type Props = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  id: string;
};

const inputClass =
  "h-[52px] w-full min-w-0 rounded-md border border-[#cbd5e1] bg-white px-4 text-sm text-[#202b36] placeholder:text-[#64748b] focus:border-[#234f73] focus:outline-2 focus:outline-offset-2 focus:outline-[#75a7cd]";

export function AuthField({ label, id, ...props }: Props) {
  return (
    <div className="flex min-w-0 flex-col gap-[10px]">
      <label htmlFor={id} className="text-sm font-bold leading-5">
        {label}
      </label>

      <input {...props} id={id} className={inputClass} />
    </div>
  );
}

export function PasswordField({ label, id, ...props }: Omit<Props, "type">) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="flex min-w-0 flex-col gap-[10px]">
      <label htmlFor={id} className="text-sm font-bold leading-5">
        {label}
      </label>

      <div className="relative">
        <input
          {...props}
          id={id}
          type={visible ? "text" : "password"}
          className={`${inputClass} pr-14`}
        />

        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-pressed={visible}
          aria-label={`${label} ${visible ? "숨기기" : "보기"}`}
          className="absolute right-1 top-1 grid h-11 w-11 cursor-pointer place-items-center rounded focus-visible:outline-2 focus-visible:outline-[#234f73]"
        >
          <img src={eye} alt="" width={20} height={20} className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}

export const primaryButtonClass =
  "flex min-h-[52px] w-full cursor-pointer items-center justify-center rounded-md bg-[#234f73] px-4 py-3 text-sm font-bold leading-[22px] text-white transition-colors hover:bg-[#183b58] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#234f73] disabled:cursor-not-allowed disabled:opacity-50";
