import { useEffect, useId, useRef } from "react";
import type { ReactNode } from "react";
import { supportFocus } from "./styles";
type Props = { title: string; width: string; height: string; onClose: () => void; children: ReactNode; titleClassName?: string; className?: string };
export default function SupportDialog({title, width, height, onClose, children, titleClassName = "", className = ""}: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  const id = useId();
  useEffect(() => {
    const dialog = ref.current;
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    dialog?.showModal();
    return () => { if (dialog?.open) dialog.close(); if (opener?.isConnected) opener.focus(); };
  }, []);
  return <dialog ref={ref} aria-labelledby={id} onCancel={e => { e.preventDefault(); onClose(); }}
    onClick={e => { if (e.target !== e.currentTarget) return; const rect = e.currentTarget.getBoundingClientRect(); if (e.clientX < rect.left || e.clientX > rect.right || e.clientY < rect.top || e.clientY > rect.bottom) onClose(); }}
    className={"fixed inset-0 m-auto w-[calc(100vw_-_32px)] max-h-[calc(100dvh_-_32px)] overflow-y-auto rounded-lg border border-[#c8d0d7] bg-white p-[23px] font-[family-name:Inter,Pretendard,sans-serif] text-[#202b36] backdrop:bg-black/30 [&_button:enabled]:cursor-pointer " + width + " " + height + " " + supportFocus + " " + className}>
    <div className="flex flex-col gap-3"><h2 id={id} className={"text-base font-bold leading-6 " + titleClassName}>{title}</h2>{children}</div>
  </dialog>;
}
