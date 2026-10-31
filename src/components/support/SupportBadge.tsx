import type { SupportStatus } from "../../pages/Support/types";

const styles = {
  "검토 중": "border-[#865a16] bg-[#faf4e8] text-[#865a16]",
  승인: "border-[#27654d] bg-[#edf5f0] text-[#27654d]",
  미승인: "border-[#a53632] bg-[#faefed] text-[#a53632]",
};

export default function SupportBadge({ status }: { status: SupportStatus }) {
  return (
    <span
      className={
        "inline-flex h-7 min-w-[58px] items-center justify-center rounded-lg border px-2 text-xs font-bold leading-[18px] " +
        styles[status]
      }
    >
      {status}
    </span>
  );
}
