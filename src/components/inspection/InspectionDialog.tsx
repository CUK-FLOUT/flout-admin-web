import { useEffect, useRef } from "react";
import type { ReactNode } from "react";
import type {
  EditableStatus,
  InspectionApplication,
} from "../../pages/Inspection/types";
import { formatDate } from "../../pages/Inspection/formatDate";
import { inspectionFocus } from "./styles";

export type InspectionDialogState =
  "confirm" | "status-saved" | "assignment-saved";
type Props = {
  kind: InspectionDialogState;
  application: InspectionApplication;
  targetStatus: EditableStatus;
  busy: boolean;
  onClose: () => void;
  onConfirm: () => void;
};
function Row({
  label,
  children,
  confirmation,
}: {
  label: string;
  children: ReactNode;
  confirmation: boolean;
}) {
  return (
    <div
      className={`flex items-start ${confirmation ? "gap-3" : "justify-between"}`}
    >
      <dt
        className={`shrink-0 text-[13px] ${confirmation ? "w-[116px] leading-5 text-[#64748b]" : "w-1/2 leading-[22px]"}`}
      >
        {label}
      </dt>
      <dd
        className={`min-w-0 flex-1 text-sm ${confirmation ? "leading-[21px]" : "text-right leading-[22px]"}`}
      >
        {children}
      </dd>
    </div>
  );
}

export default function InspectionDialog({
  kind,
  application: a,
  targetStatus,
  onClose,
  onConfirm,
  busy,
}: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  const blocked = busy;
  const confirmation = kind === "confirm";
  const assignment = kind === "assignment-saved";
  const title = confirmation
    ? `점검 상태 ${targetStatus}`
    : assignment
      ? "방문 일정이 저장되었습니다."
      : `점검 ${targetStatus}${targetStatus === "완료" ? "로" : "으로"} 저장했습니다.`;

  useEffect(() => {
    const dialog = ref.current;
    const opener =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;

    dialog?.showModal();

    return () => {
      if (dialog?.open) dialog.close();
      opener?.focus();
    };
  }, []);

  return (
    <dialog
      ref={ref}
      aria-labelledby="inspection-dialog-title"
      aria-describedby="inspection-dialog-description"
      onCancel={(event) => {
        event.preventDefault();
        if (!busy) onClose();
      }}
      onClick={(event) => {
        if (event.target !== event.currentTarget) return;
        const box = event.currentTarget.getBoundingClientRect();

        if (
          event.clientX < box.left ||
          event.clientX > box.right ||
          event.clientY < box.top ||
          event.clientY > box.bottom
        )
          if (!busy) onClose();
      }}
      className={`font-[family-name:Inter,Pretendard,sans-serif] w-[calc(100vw_-_32px)] ${confirmation ? "max-w-[580px]" : assignment ? "max-w-[480px]" : "max-w-[520px]"} ${inspectionFocus} fixed inset-0 m-auto max-h-[calc(100dvh-32px)] overflow-y-auto border border-[#c8d0d7] bg-white p-[23px] text-[#202b36] backdrop:bg-black/30 ${confirmation ? "rounded-xl" : "rounded-lg"}`}
    >
      <div className="flex flex-col gap-3">
        <h2
          id="inspection-dialog-title"
          className="text-base font-bold leading-6"
        >
          {title}
        </h2>
        {!confirmation && (
          <p
            id="inspection-dialog-description"
            className="text-sm leading-[21px]"
          >
            {assignment
              ? "점검 담당자와 확정 방문 일정이 저장되었습니다. 알림은 발송되지 않습니다."
              : targetStatus === "완료"
                ? "현장점검이 끝났다면 점검상태를 등록해주세요"
                : "주민 신청 상세에도 동일한 점검 상태를 표시합니다."}
          </p>
        )}
        <dl className="flex flex-col gap-3">
          <Row
            confirmation={confirmation}
            label={confirmation ? "신청" : "접수번호"}
          >
            {a.id}
            {(confirmation || assignment) && ` · ${a.resident}`}
          </Row>
          {confirmation ? (
            <>
              <Row confirmation={confirmation} label="확정 방문">
                {a.visitDate && a.visitTime
                  ? `${formatDate(a.visitDate)} · ${a.visitTime} · ${a.assignee}`
                  : "확정 일정은 서버에서 확인합니다."}
              </Row>
              <Row confirmation={confirmation} label="변경 상태">
                {targetStatus}
              </Row>
            </>
          ) : (
            <>
              <Row
                confirmation={confirmation}
                label={assignment ? "점검 상태" : "처리 상태"}
              >
                {assignment ? a.status : `점검 ${targetStatus}`}
              </Row>
              {assignment && (
                <>
                  <Row confirmation={confirmation} label="확정 일정">
                    {formatDate(a.visitDate)} · {a.visitTime}
                  </Row>
                  <Row confirmation={confirmation} label="담당자">
                    {a.assignee}
                  </Row>
                </>
              )}
            </>
          )}
        </dl>
        {confirmation && (
          <p
            id="inspection-dialog-description"
            className={`text-sm leading-[21px] text-[#64748b] ${blocked ? "min-h-[42px]" : ""}`}
          >
            {blocked
              ? "점검 상태를 저장하는 중입니다."
              : "예정 → 진행 → 완료 순서로 변경합니다. 결과 공개는 완료 저장 후 진행해 주세요."}
          </p>
        )}
        {confirmation ? (
          <div className="flex gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={onClose}
              className="h-10 flex-1 rounded-md border border-[#c8d0d7] bg-white px-4 text-sm font-bold"
            >
              취소
            </button>
            <button
              type="button"
              disabled={blocked}
              onClick={onConfirm}
              className="h-10 flex-1 rounded-md bg-[#234f73] px-4 text-sm font-bold text-white disabled:border disabled:border-[#cbd5e1] disabled:bg-[#f1f5f9] disabled:text-[#94a3b8]"
            >
              {busy ? "저장 중…" : "점검 상태 저장"}
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={onClose}
            className="h-11 rounded-md bg-[#234f73] px-4 text-base font-bold leading-6 text-white"
          >
            확인
          </button>
        )}
      </div>
    </dialog>
  );
}
