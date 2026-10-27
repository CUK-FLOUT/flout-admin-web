import { useEffect, useRef } from "react";
import type { ReactNode } from "react";
import { inspectionFocus } from "../inspection/styles";
type Props = { title: string; onClose: () => void; children: ReactNode; size: "small" | "region" | "address" | "actions"; rounded?: boolean };
const widths = {small:"max-w-[480px]",region:"max-w-[520px]",address:"max-w-[560px]",actions:"max-w-[580px]"};
export default function ResultDialog({title,onClose,children,size,rounded}:Props) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = `result-dialog-${size}`;
  useEffect(() => {
    const dialog=ref.current;
    const opener=document.activeElement instanceof HTMLElement ? document.activeElement : null;
    dialog?.showModal();
    return () => { if (dialog?.open) dialog.close(); if(opener?.isConnected) opener.focus(); };
  },[]);
  return <dialog ref={ref} aria-labelledby={titleId} onCancel={e=>{e.preventDefault();onClose();}}
    onClick={e=>{if(e.target!==e.currentTarget)return;const r=e.currentTarget.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)onClose();}}
    className={`fixed inset-0 m-auto w-[calc(100vw_-_32px)] ${widths[size]} max-h-[calc(100dvh_-_32px)] overflow-y-auto border border-[#c8d0d7] bg-white p-[23px] text-[#202b36] backdrop:bg-black/30 ${size === "region" || size === "actions" || rounded ? "rounded-xl" : "rounded-lg"} ${size === "address" ? "h-[696px]" : ""} font-[family-name:Inter,Pretendard,sans-serif] ${inspectionFocus} [&_button:enabled]:cursor-pointer`}>
    <div className={`flex flex-col ${size === "address" ? "gap-5" : "gap-3"}`}>
      <div className={`flex items-start justify-between ${size === "address" ? "h-[30px]" : ""}`}>
        <h2 id={titleId} className={size === "address" ? "font-[family-name:Pretendard,sans-serif] text-[22px] font-bold leading-[33px]" : "text-base font-bold leading-6"}>{title}</h2>
        {size === "address" && <button type="button" aria-label="주소 검색 닫기" onClick={onClose} className="text-2xl leading-9 text-[#596672]">×</button>}
      </div>
      {children}
    </div>
  </dialog>;
}
