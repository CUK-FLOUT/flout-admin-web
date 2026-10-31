import { useEffect, useId, useRef, useState } from "react";
import chevron from "../../assets/support/chevron.svg";

type Props = {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
  className?: string;
  disabled?: boolean;
  review?: boolean;
};
export default function SupportSelect({
  label,
  value,
  options,
  onChange,
  className = "",
  disabled = false,
  review = false,
}: Props) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const id = useId();

  useEffect(() => {
    if (!open) return;
    const outside = (event: PointerEvent) => {
      if (!ref.current?.contains(event.target as Node)) setOpen(false);
    };

    window.addEventListener("pointerdown", outside);

    return () => window.removeEventListener("pointerdown", outside);
  }, [open]);
  function choose(index: number) {
    onChange(options[index]);
    setOpen(false);
    button.current?.focus();
  }

  return (
    <div ref={ref} className={"relative min-w-0 " + className}>
      <button
        ref={button}
        type="button"
        role="combobox"
        aria-label={label}
        aria-haspopup="listbox"
        aria-controls={id}
        aria-expanded={open}
        aria-activedescendant={open ? id + "-" + active : undefined}
        disabled={disabled}
        onClick={() => {
          setActive(Math.max(0, options.indexOf(value)));
          setOpen((v) => !v);
        }}
        onBlur={(event) => {
          if (
            !event.currentTarget.parentElement?.contains(
              event.relatedTarget as Node,
            )
          )
            setOpen(false);
        }}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            setOpen(false);
            event.stopPropagation();
          }

          if (["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) {
            event.preventDefault();
            setOpen(true);
            setActive((index) =>
              event.key === "Home"
                ? 0
                : event.key === "End"
                  ? options.length - 1
                  : (index +
                      (event.key === "ArrowDown" ? 1 : -1) +
                      options.length) %
                    options.length,
            );
          }

          if (open && (event.key === "Enter" || event.key === " ")) {
            event.preventDefault();
            choose(active);
          }

          if (event.key === "Tab") setOpen(false);
        }}
        className={
          "flex w-full items-center justify-between gap-2 rounded-md border border-[#c8d0d7] bg-white px-[14px] text-left font-normal text-[#202b36] disabled:cursor-default disabled:bg-[#f8fafc] " +
          (review ? "h-[42px] text-[13px]" : "h-12 text-sm")
        }
      >
        <span className="truncate">{value}</span>
        <img src={chevron} alt="" width={16} height={16} className="shrink-0" />
      </button>
      {open && (
        <div
          id={id}
          role="listbox"
          aria-label={label}
          className={
            "absolute top-[calc(100%_+_4px)] left-0 z-30 max-h-[232px] w-full overflow-y-auto rounded-md border border-[#c8d0d7] bg-white shadow-[0_4px_12px_rgba(0,0,0,0.08)] " +
            (review ? "min-w-[240px] max-[600px]:min-w-0" : "")
          }
        >
          {options.map((option, index) => (
            <div
              key={option}
              id={id + "-" + index}
              role="option"
              aria-selected={value === option}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => choose(index)}
              onPointerMove={() => setActive(index)}
              className={
                "flex min-h-[46px] cursor-pointer items-center border-b border-[#c8d0d7] px-3 py-2 text-[15px] font-medium leading-[22px] last:border-0 " +
                (active === index || value === option
                  ? "bg-[#f4f5f6]"
                  : "bg-white")
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
