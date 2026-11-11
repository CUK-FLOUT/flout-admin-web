import { useEffect, useId, useRef, useState } from "react";
import type { KeyboardEvent } from "react";
import { createPortal } from "react-dom";

export type FilterOption = { value: string; label: string };

type Props = {
  label: string;
  id?: string;
  value: string;
  options: FilterOption[];
  className?: string;
  disabled?: boolean;
  onChange: (value: string) => void;
};
export default function FilterSelect({
  label,
  id: triggerId,
  value,
  options,
  className = "",
  disabled = false,
  onChange,
}: Props) {
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const id = useId();
  const menu = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({
    left: 0,
    top: 0,
    width: 0,
    maxHeight: 185,
  });
  const expanded = open && !disabled;
  const selected = options.findIndex((option) => option.value === value);
  const activeIndex = Math.min(active, Math.max(0, options.length - 1));

  function placeMenu() {
    const rect = trigger.current?.getBoundingClientRect();

    if (!rect) return;
    const below = window.innerHeight - rect.bottom - 12;
    const above = rect.top - 12;
    const height = Math.min(185, options.length * 46 + 2);
    const flip = below < height && above > below;
    const maxHeight = Math.max(0, Math.min(height, flip ? above : below));
    const width = Math.min(rect.width, window.innerWidth - 16);

    setPosition({
      width,
      maxHeight,
      left: Math.max(8, Math.min(rect.left, window.innerWidth - width - 8)),
      top: flip ? rect.top - maxHeight - 4 : rect.bottom + 4,
    });
  }

  useEffect(() => {
    if (!expanded) return;
    menu.current
      ?.querySelector<HTMLElement>(`[data-index="${activeIndex}"]`)
      ?.scrollIntoView({ block: "nearest" });
  }, [expanded, activeIndex]);

  useEffect(() => {
    if (!expanded) return;
    const outside = (event: PointerEvent) => {
      if (
        !root.current?.contains(event.target as Node) &&
        !menu.current?.contains(event.target as Node)
      )
        setOpen(false);
    };

    document.addEventListener("pointerdown", outside);
    const close = () => setOpen(false);

    window.addEventListener("resize", close);
    const scroll = (event: Event) => {
      if (!menu.current?.contains(event.target as Node)) close();
    };

    window.addEventListener("scroll", scroll, true);

    return () => {
      document.removeEventListener("pointerdown", outside);
      window.removeEventListener("resize", close);
      window.removeEventListener("scroll", scroll, true);
    };
  }, [expanded]);

  function choose(index: number) {
    if (disabled || !options[index]) return;
    onChange(options[index].value);
    setOpen(false);
    trigger.current?.focus();
  }

  function nextActiveIndex(key: string, currentIndex: number) {
    if (key === "Home") return 0;
    if (key === "End") return options.length - 1;
    if (!expanded) return Math.max(0, selected);
    const direction = key === "ArrowDown" ? 1 : -1;

    return (currentIndex + direction + options.length) % options.length;
  }

  function handleKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (disabled || !options.length) return;
    if (event.key === "Escape") {
      setOpen(false);
      event.stopPropagation();
    }

    if (["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) {
      event.preventDefault();
      placeMenu();
      setOpen(true);
      setActive((index) => nextActiveIndex(event.key, index));
    }

    if (expanded && ["Enter", " "].includes(event.key)) {
      event.preventDefault();
      choose(activeIndex);
    }

    if (event.key === "Tab") setOpen(false);
  }

  return (
    <div
      ref={root}
      className={`relative min-w-0 shrink-0 ${expanded ? "z-50" : "z-20"} ${className}`}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node))
          setOpen(false);
      }}
    >
      <button
        ref={trigger}
        id={triggerId}
        type="button"
        disabled={disabled || !options.length}
        role="combobox"
        aria-label={label}
        aria-haspopup="listbox"
        aria-expanded={expanded}
        aria-controls={expanded ? id : undefined}
        aria-activedescendant={expanded ? `${id}-${activeIndex}` : undefined}
        className="flex h-[46px] w-full cursor-pointer items-center justify-between gap-2 rounded-md border border-[#c8d0d7] bg-white px-3 text-left disabled:bg-[#f4f5f6] text-[15px] font-medium leading-[21px] tracking-[-.09px] text-[#202b36] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#234f73]"
        onClick={() => {
          placeMenu();
          setActive(Math.max(0, selected));
          setOpen((v) => !v);
        }}
        onKeyDown={handleKeyDown}
      >
        <span>
          {options.find((option) => option.value === value)?.label || value}
        </span>
        <span
          aria-hidden="true"
          className="text-[14px] leading-[19px] tracking-[-.084px]"
        >
          ▾
        </span>
      </button>
      {expanded &&
        createPortal(
          <div
            ref={menu}
            style={position}
            id={id}
            role="listbox"
            aria-label={label}
            className="fixed z-[1000] overflow-y-auto rounded-md border border-[#c8d0d7] bg-white shadow-[0_4px_12px_rgba(0,0,0,0.08)]"
          >
            {options.map((option, index) => (
              <div
                key={option.value}
                id={`${id}-${index}`}
                role="option"
                data-index={index}
                aria-selected={value === option.value}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => choose(index)}
                onPointerMove={() => setActive(index)}
                className={`flex h-[46px] cursor-pointer items-center border-b border-[#c8d0d7] px-3 text-[15px] font-medium leading-[21px] text-[#202b36] last:border-0 ${activeIndex === index || value === option.value ? "bg-[#f4f5f6]" : "bg-white"}`}
              >
                {option.label}
              </div>
            ))}
          </div>,
          document.body,
        )}
    </div>
  );
}
