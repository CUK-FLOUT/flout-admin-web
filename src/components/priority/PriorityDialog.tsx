import { useEffect, useRef } from "react";
import type { ReactNode } from "react";

type Props = {
  title: string;
  children: ReactNode;
  onClose: () => void;
  wide?: boolean;
};
export default function PriorityDialog({
  title,
  children,
  onClose,
  wide = false,
}: Props) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;

    dialog?.showModal();

    return () => {
      if (dialog?.open) dialog.close();
    };
  }, []);

  return (
    <dialog
      style={{ fontFamily: "Inter, Pretendard, sans-serif" }}
      ref={ref}
      aria-labelledby="priority-dialog-title"
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          const box = e.currentTarget.getBoundingClientRect();

          if (
            e.clientX < box.left ||
            e.clientX > box.right ||
            e.clientY < box.top ||
            e.clientY > box.bottom
          )
            onClose();
        }
      }}
      className={`fixed inset-0 m-auto max-h-[calc(100dvh_-_32px)] w-[calc(100%_-_32px)] overflow-y-auto rounded-lg border border-[#c8d0d7] bg-white p-6 text-[#202b36] shadow-[0_20px_50px_rgba(15,23,42,.18)] backdrop:bg-black/30 ${wide ? "max-w-[784px]" : "max-w-[480px]"}`}
    >
      <h2 id="priority-dialog-title" className="text-base font-bold leading-9">
        {title}
      </h2>
      {children}
    </dialog>
  );
}
