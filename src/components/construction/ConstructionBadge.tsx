import type { ConstructionStatus } from "../../pages/Construction/types";

const colors: Record<ConstructionStatus, string> = {
  "일정 미등록": "border-[#c8d0d7] bg-[#f4f5f6] text-[#596672]",
  예정: "border-[#a53632] bg-[#faefed] text-[#a53632]",
  진행: "border-[#865a16] bg-[#faf4e8] text-[#865a16]",
  완료: "border-[#4a7799] bg-[#eaf4fb] text-[#234f73]",
  "전체 완료": "border-[#27654d] bg-[#edf5f0] text-[#27654d]",
};

export default function ConstructionBadge({
  status,
}: {
  status: ConstructionStatus;
}) {
  return (
    <span
      className={
        "inline-flex h-7 min-w-[72px] items-center justify-center rounded-lg border px-2 text-xs font-bold leading-[18px] " +
        colors[status]
      }
    >
      {status}
    </span>
  );
}
