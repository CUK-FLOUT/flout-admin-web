import type { ReactNode } from "react";

export default function SupportDialogRow({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="grid grid-cols-[minmax(0,156px)_minmax(0,1fr)] gap-3 max-[500px]:grid-cols-[minmax(0,120px)_minmax(0,1fr)]">
      <dt className="break-keep text-[13px] leading-5 text-[#64748b]">
        {label}
      </dt>
      <dd className="min-w-0 whitespace-pre-line break-words text-sm leading-[21px]">
        {children}
      </dd>
    </div>
  );
}
