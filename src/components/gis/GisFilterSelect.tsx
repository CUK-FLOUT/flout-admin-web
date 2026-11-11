import { useEffect, useId, useRef, useState } from "react";
import type { KeyboardEvent } from "react";

type Props = {
  label: string;
  placeholder: string;
  value: string;
  options: string[];
  className: string;
  onChange: (value: string) => void;
};
export default function GisFilterSelect({
  label,
  placeholder,
  value,
  options,
  className,
  onChange,
}: Props) {
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const id = useId();
  const values = ["", ...options];

  useEffect(() => {
    if (!open) return;
    const outside = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };

    document.addEventListener("pointerdown", outside);

    return () => document.removeEventListener("pointerdown", outside);
  }, [open]);

  function choose(index: number) {
    onChange(values[index]);
    setOpen(false);
    trigger.current?.focus();
  }

  function nextActiveIndex(key: string, currentIndex: number) {
    if (key === "Home") return 0;
    if (key === "End") return values.length - 1;
    if (!open) return Math.max(0, values.indexOf(value));
    const direction = key === "ArrowDown" ? 1 : -1;

    return (currentIndex + direction + values.length) % values.length;
  }

  function handleKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (event.key === "Escape") {
      setOpen(false);
      event.stopPropagation();
    }

    if (["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) {
      event.preventDefault();
      setOpen(true);
      setActive((index) => nextActiveIndex(event.key, index));
    }

    if (open && ["Enter", " "].includes(event.key)) {
      event.preventDefault();
      choose(active);
    }

    if (event.key === "Tab") setOpen(false);
  }

  return (
    <div
      ref={root}
      className={`relative shrink-0 ${open ? "z-50" : "z-20"} ${className}`}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node))
          setOpen(false);
      }}
    >
      <button
        ref={trigger}
        type="button"
        role="combobox"
        aria-label={label}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? id : undefined}
        aria-activedescendant={open ? `${id}-${active}` : undefined}
        className="flex h-[46px] w-full cursor-pointer items-center justify-between gap-2 rounded-md border border-[#c8d0d7] bg-white px-3 text-left text-[15px] font-medium leading-[21px] tracking-[-.09px] text-[#202b36] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#234f73]"
        onClick={() => {
          setActive(Math.max(0, values.indexOf(value)));
          setOpen((v) => !v);
        }}
        onKeyDown={handleKeyDown}
      >
        <span>{value || placeholder}</span>
        <span
          aria-hidden="true"
          className="text-[14px] leading-[19px] tracking-[-.084px]"
        >
          ▾
        </span>
      </button>
      {open && (
        <div
          id={id}
          role="listbox"
          aria-label={label}
          className="absolute left-0 top-[calc(100%_+_4px)] z-50 max-h-[185px] w-full overflow-y-auto rounded-md border border-[#c8d0d7] bg-white shadow-[0_4px_12px_rgba(0,0,0,0.08)]"
        >
          {values.map((option, index) => (
            <div
              key={option}
              id={`${id}-${index}`}
              role="option"
              aria-selected={value === option}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => choose(index)}
              onPointerMove={() => setActive(index)}
              className={`flex h-[46px] cursor-pointer items-center border-b border-[#c8d0d7] px-3 text-[15px] font-medium leading-[21px] text-[#202b36] last:border-0 ${active === index || value === option ? "bg-[#f4f5f6]" : "bg-white"}`}
            >
              {option || placeholder}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
