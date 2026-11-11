import { useEffect, useId, useRef, useState } from "react";
import type { EditableConstructionStatus } from "../../pages/Construction/types";
import chevron from "../../assets/construction/chevron.svg";

const options: EditableConstructionStatus[] = ["예정", "진행", "완료"];

export default function ConstructionStatusSelect({
  value,
  disabled,
  onChange,
}: {
  value: EditableConstructionStatus | "";
  disabled: boolean;
  onChange: (value: EditableConstructionStatus) => void;
}) {
  const [open, setOpen] = useState(false),
    [active, setActive] = useState(0);
  const ref = useRef<HTMLDivElement>(null),
    button = useRef<HTMLButtonElement>(null);
  const id = useId();

  useEffect(() => {
    if (!open) return;
    const close = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };

    window.addEventListener("pointerdown", close);

    return () => window.removeEventListener("pointerdown", close);
  }, [open]);
  function choose(index: number) {
    onChange(options[index]);
    setOpen(false);
    button.current?.focus();
  }

  return (
    <div ref={ref} className="relative min-w-0">
      <button
        ref={button}
        type="button"
        role="combobox"
        aria-label="시공 상태 변경"
        aria-expanded={open}
        aria-controls={id}
        aria-haspopup="listbox"
        aria-activedescendant={open ? id + "-" + active : undefined}
        disabled={disabled}
        onClick={() => {
          setActive(
            Math.max(0, options.indexOf(value as EditableConstructionStatus)),
          );
          setOpen((v) => !v);
        }}
        onBlur={(e) => {
          if (!ref.current?.contains(e.relatedTarget as Node)) setOpen(false);
        }}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            setOpen(false);
            e.stopPropagation();
          }

          if (["ArrowDown", "ArrowUp", "Home", "End"].includes(e.key)) {
            e.preventDefault();
            setOpen(true);
            setActive((index) =>
              e.key === "Home"
                ? 0
                : e.key === "End"
                  ? 2
                  : (index + (e.key === "ArrowDown" ? 1 : -1) + 3) % 3,
            );
          }

          if (open && ["Enter", " "].includes(e.key)) {
            e.preventDefault();
            choose(active);
          }

          if (e.key === "Tab") setOpen(false);
        }}
        className="flex h-[46px] w-full min-w-0 items-center justify-between gap-1 rounded-md border border-[#234f73] bg-white px-[11px] text-left text-[15px] leading-[21px] disabled:border-[#c8d0d7] disabled:bg-[#f4f5f6]"
      >
        <span
          className={
            "truncate " + (value ? "text-[#202b36]" : "text-[#7b8894]")
          }
        >
          {value || "시공 상태를 변경해주세요"}
        </span>
        <img src={chevron} alt="" width={18} height={18} className="shrink-0" />
      </button>
      {open && (
        <div
          id={id}
          role="listbox"
          aria-label="시공 상태"
          className="absolute top-[calc(100%_+_4px)] left-0 z-30 w-full min-w-[184px] overflow-hidden rounded-md border border-[#c8d0d7] bg-white p-px shadow-[0_4px_12px_rgba(0,0,0,0.08)]"
        >
          <p className="flex h-[46px] items-center border-b border-[#c8d0d7] bg-[#f4f5f6] px-3 text-[15px] leading-[21px]">
            시공 상태를 변경해주세요
          </p>
          {options.map((option, index) => (
            <div
              key={option}
              id={id + "-" + index}
              role="option"
              aria-selected={value === option}
              onMouseDown={(e) => e.preventDefault()}
              onPointerMove={() => setActive(index)}
              onClick={() => choose(index)}
              className={
                "flex h-[46px] cursor-pointer items-center border-b border-[#c8d0d7] px-3 text-[15px] leading-[21px] last:border-0 " +
                (active === index ? "bg-[#f4f5f6]" : "")
              }
            >
              {option}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
