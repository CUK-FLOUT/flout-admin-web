import type { ReactNode } from "react";

export default function SupportDialogRow({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="grid grid-cols-[116px_minmax(0,1fr)] gap-3 max-[500px]:grid-cols-[95px_minmax(0,1fr)]">
      <dt className="text-[13px] leading-5 text-[#64748b]">{label}</dt>
      <dd className="whitespace-pre-line text-sm leading-[21px]">{children}</dd>
    </div>
  );
}
