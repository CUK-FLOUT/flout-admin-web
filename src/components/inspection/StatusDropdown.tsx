import { useEffect, useRef, useState } from "react";
import type { EditableStatus } from "../../pages/Inspection/mockData";
import { inspectionStatuses } from "../../pages/Inspection/mockData";
type Props = {value: EditableStatus; onChange: (status: EditableStatus) => void};
export default function StatusDropdown({value, onChange}: Props) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!open) return;
    const closeOutside = (event: PointerEvent) => { if (!root.current?.contains(event.target as Node)) setOpen(false); };
    document.addEventListener("pointerdown", closeOutside);
    root.current?.querySelector<HTMLButtonElement>(`[data-status="${value}"]`)?.focus();
    return () => document.removeEventListener("pointerdown", closeOutside);
  }, [open, value]);
  function close() { setOpen(false); trigger.current?.focus(); }
  return <div ref={root} className="relative min-w-0 flex-1"
    onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false); }}
    onKeyDown={event => {
      if (event.key === "Escape") { event.stopPropagation(); close(); }
      if (["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) {
        event.preventDefault();
        if (!open) { setOpen(true); return; }
        const options = Array.from(root.current?.querySelectorAll<HTMLButtonElement>('[role="option"]') || []);
        const current = options.indexOf(document.activeElement as HTMLButtonElement);
        const index = event.key === "Home" ? 0 : event.key === "End" ? options.length - 1
          : (current + (event.key === "ArrowDown" ? 1 : -1) + options.length) % options.length;
        options[index]?.focus();
      }
    }}>
    <button type="button" ref={trigger} id="inspection-status" aria-label="점검 상태" aria-haspopup="listbox" aria-expanded={open} aria-controls="inspection-status-options"
      onClick={() => setOpen(!open)} className="flex h-10 w-full items-center justify-between rounded-md border border-[#c8d0d7] bg-white px-3 text-[13px] font-medium leading-[22px]">
      {value}<span aria-hidden="true" className="text-xs font-bold">⌄</span>
    </button>
    {open && <div id="inspection-status-options" role="listbox" aria-label="점검 상태 선택" className="absolute left-0 top-[44px] z-20 h-[108px] w-full overflow-hidden rounded-md border border-[#c8d0d7] bg-white shadow-[0_4px_12px_rgba(20,38,56,.14)]">
      {inspectionStatuses.map(status => <button key={status} type="button" role="option" aria-selected={status === value} data-status={status}
        onClick={() => { onChange(status); close(); }} className={`flex h-9 w-full items-center px-3 text-left text-[13px] font-medium hover:bg-[#eef3f7] focus:bg-[#eef3f7] ${status === value ? "bg-[#eef3f7] text-[#234f73]" : "text-[#202b36]"}`}>{status}</button>)}
    </div>}
  </div>;
}
