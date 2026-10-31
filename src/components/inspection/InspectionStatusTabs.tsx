import { inspectionStatuses } from "../../pages/Inspection/mockData";

type Props = {
  stage: string;
  onSwitchTab: (stage: string) => void;
};

export default function InspectionStatusTabs({ stage, onSwitchTab }: Props) {
  return (
    <div
      role="tablist"
      aria-label="점검 상태별 목록"
      className="flex min-h-10 shrink-0 gap-2 overflow-x-auto"
    >
      {["전체", "배정 대기", ...inspectionStatuses].map(
        (tab, index, tabs) => (
          <button
            type="button"
            key={tab}
            role="tab"
            aria-selected={stage === tab}
            tabIndex={stage === tab ? 0 : -1}
            aria-controls="inspection-list"
            onKeyDown={(event) => {
              if (
                !["ArrowRight", "ArrowLeft", "Home", "End"].includes(
                  event.key,
                )
              )
                return;
              event.preventDefault();
              const next =
                event.key === "Home"
                  ? 0
                  : event.key === "End"
                    ? tabs.length - 1
                    : (index +
                        (event.key === "ArrowRight" ? 1 : -1) +
                        tabs.length) %
                      tabs.length;

              onSwitchTab(tabs[next]);
              (
                event.currentTarget.parentElement?.children[
                  next
                ] as HTMLButtonElement
              )?.focus();
            }}
            onClick={() => onSwitchTab(tab)}
            className={`h-10 shrink-0 rounded-md border px-4 text-sm font-bold leading-5 ${tab === "배정 대기" ? "w-[104px]" : "w-[92px]"} ${stage === tab ? "border-[#234f73] bg-[#234f73] text-white" : "border-[#c8d0d7] bg-white"}`}
          >
            {tab}
          </button>
        ),
      )}
    </div>
  );
}
