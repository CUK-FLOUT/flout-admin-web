import { useEffect, useId, useRef, useState } from "react";
import { ChevronDown, LogOut } from "lucide-react";
import { logoutAdmin } from "../../api/auth";
import profile from "../../assets/layout/profile.png";

export default function ProfileMenu({ name }: { name: string }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const container = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const item = useRef<HTMLButtonElement>(null);
  const mounted = useRef(false);
  const submitting = useRef(false);
  const id = useId();

  useEffect(() => {
    mounted.current = true;

    return () => {
      mounted.current = false;
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    item.current?.focus();
    const outside = (event: PointerEvent) => {
      if (submitting.current) return;
      if (
        event.target instanceof Node &&
        !container.current?.contains(event.target)
      )
        setOpen(false);
    };

    document.addEventListener("pointerdown", outside);

    return () => {
      document.removeEventListener("pointerdown", outside);
    };
  }, [open]);

  async function logout() {
    if (submitting.current) return;
    submitting.current = true;
    setBusy(true);
    setError("");
    try {
      await logoutAdmin();
      if (mounted.current) setOpen(false);
    } catch (error) {
      if (mounted.current)
        setError(
          error instanceof Error
            ? error.message
            : "로그아웃하지 못했습니다. 다시 시도해 주세요.",
        );
    } finally {
      submitting.current = false;
      if (mounted.current) setBusy(false);
    }
  }

  return (
    <div
      ref={container}
      className="relative shrink-0"
      onKeyDown={(event) => {
        if (!open) return;
        if (event.key === "Escape") {
          event.preventDefault();
          event.stopPropagation();
          if (submitting.current) return;
          setOpen(false);
          trigger.current?.focus();
        } else if (["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) {
          event.preventDefault();
          event.stopPropagation();
          item.current?.focus();
        }
      }}
      onBlur={(event) => {
        if (!submitting.current && !event.currentTarget.contains(event.relatedTarget))
          setOpen(false);
      }}
    >
      <button
        ref={trigger}
        type="button"
        aria-label={`${name} 계정 메뉴`}
        aria-haspopup="menu"
        aria-disabled={busy}
        aria-expanded={open}
        aria-controls={open ? id : undefined}
        onClick={() => {
          if (!submitting.current) setOpen((value) => !value);
        }}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown" || event.key === "ArrowUp") {
            event.preventDefault();
            setOpen(true);
          }
        }}
        className="flex cursor-pointer items-center gap-3 rounded-md focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#234f73]"
      >
        <span className="grid h-9 w-9 place-items-center rounded-full bg-[#f4f5f6]">
          <img src={profile} alt="" width={24} height={24} />
        </span>
        <span>{name}</span>
        <ChevronDown aria-hidden="true" size={14} />
      </button>
      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-[220px] max-w-[calc(100vw-32px)] rounded-lg border border-[#c8d0d7] bg-white p-1 shadow-md">
          <div id={id} role="menu" aria-label="계정 메뉴" aria-busy={busy}>
            <button
              ref={item}
              type="button"
              role="menuitem"
              aria-disabled={busy}
              onClick={() => void logout()}
              className="flex min-h-11 w-full cursor-pointer items-center gap-2 rounded-md px-3 text-left text-sm hover:bg-[#f4f5f6] focus:bg-[#f4f5f6] focus:outline-none aria-disabled:cursor-wait aria-disabled:text-[#596672]"
            >
              <LogOut aria-hidden="true" size={16} />
              {busy ? "로그아웃 중…" : "로그아웃"}
            </button>
          </div>
          {error && (
            <p
              role="alert"
              className="px-3 py-2 text-xs leading-5 text-[#a53632]"
            >
              {error}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
