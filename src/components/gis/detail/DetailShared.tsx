import type { ReactNode } from "react";

export function SectionTitle({
  icon,
  children,
}: {
  icon: string;
  children: ReactNode;
}) {
  return (
    <h3 className="mb-[9px] flex items-center gap-2 text-[15px] font-bold leading-5">
      <img src={icon} alt="" width={16} height={16} />
      {children}
    </h3>
  );
}

export function InfoRow({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="grid grid-cols-[112px_minmax(0,1fr)] items-start gap-3 text-[13px] leading-[19px]">
      <dt>{label}</dt>
      <dd className="min-w-0 break-keep [overflow-wrap:anywhere]">
        {children}
      </dd>
    </div>
  );
}
