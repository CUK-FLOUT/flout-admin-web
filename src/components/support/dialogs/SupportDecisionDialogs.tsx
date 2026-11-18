import SupportDialog from "../SupportDialog";
import type { SupportDialogProps } from "./types";
import { approvalIssue } from "../../../pages/Support/model";
import { supportInput, supportPrimary, supportSecondary } from "../styles";
import Row from "./SupportDialogRow";

type Props = Pick<
  SupportDialogProps,
  | "kind"
  | "application"
  | "draft"
  | "reason"
  | "error"
  | "busy"
  | "onClose"
  | "onConfirm"
  | "onReason"
>;

export default function SupportDecisionDialogs({
  kind,
  application: a,
  draft = a.review,
  reason = "",
  error,
  busy = false,
  onClose,
  onConfirm,
  onReason,
}: Props) {
  const issue = approvalIssue(a, draft);

  if (kind === "approve")
    return (
      <SupportDialog
        title="지원을 승인할까요?"
        width="max-w-[480px]"
        height="min-h-[198px]"
        onClose={onClose}
        titleClassName="leading-9"
      >
        <div className="-mt-1 text-sm leading-[21px]">
          <p>{a.id + " · " + a.resident + "님의 신청"}</p>
          <p>승인 확정 시 주민에게 결과가 공개되며 시공 연계가 시작됩니다.</p>
        </div>
        {(issue || error) && (
          <p role="alert" className="text-sm leading-[21px] text-[#a53632]">
            {issue || error}
          </p>
        )}
        <div className="mt-1 grid grid-cols-2 gap-3">
          <button
            onClick={onClose}
            className={
              supportSecondary +
              " h-11 border-[#234f73] text-base text-[#234f73]"
            }
          >
            취소
          </button>
          <button
            disabled={busy || !!issue}
            onClick={onConfirm}
            className={supportPrimary + " h-11 rounded-md text-base"}
          >
            지원 승인
          </button>
        </div>
      </SupportDialog>
    );
  if (kind === "reject")
    return (
      <SupportDialog
        title={a.id + " · 미승인 처리"}
        width="max-w-[480px]"
        height="min-h-[209px]"
        onClose={onClose}
        titleClassName="text-[#a53632]"
        className="pb-[19px]"
      >
        <p className="text-sm leading-[21px]">
          주민에게 안내할 미승인 사유를 입력해 주세요.
        </p>
        <input
          autoFocus
          aria-label="미승인 사유"
          value={reason}
          onChange={(e) => onReason?.(e.target.value)}
          placeholder="검토 결과 안내 입력"
          className={supportInput + " h-10 border-[#234f73] px-[15px] text-sm"}
        />
        {error && (
          <p role="alert" className="text-sm text-[#a53632]">
            {error}
          </p>
        )}
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={onClose}
            className={
              supportSecondary + " h-11 border-[#234f73] text-[#234f73]"
            }
          >
            취소
          </button>
          <button
            onClick={onConfirm}
            disabled={busy || !reason.trim()}
            className={supportPrimary + " h-11 rounded-md"}
          >
            안내 입력 후 저장
          </button>
        </div>
      </SupportDialog>
    );
  if (kind === "review-check")
    return (
      <SupportDialog
        title={a.id + " · 검토 확인사항"}
        width="max-w-[680px]"
        height="min-h-[355px]"
        onClose={onClose}
        className="rounded-xl"
      >
        <dl className="flex flex-col gap-3">
          <Row label="신청">
            {a.id + " · " + a.resident + " · " + a.ownership}
          </Row>
          <Row label="주민 신청 조치">{a.request}</Row>
          <Row label="자격·서류">
            {draft.checks.every(Boolean) ? "☑ 검토 완료" : "확인 필요"}
          </Row>
          <Row label="동의 필요 여부 / 서류 제출 여부">
            {draft.consentRequired + " / " + draft.consentSubmission}
          </Row>
          <Row label="승인 지원 범위">{draft.scope || "입력 필요"}</Row>
        </dl>
        <p
          role={error || issue ? "alert" : undefined}
          className={
            "text-sm leading-[21px] " +
            (error || issue ? "text-[#a53632]" : "text-[#64748b]")
          }
        >
          {error ||
            issue ||
            "자격·서류·주민 제출 동의 자료를 확인한 뒤 승인 결과를 저장합니다."}
        </p>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={onConfirm}
            disabled={busy || !!issue}
            className={supportPrimary}
          >
            지원 승인 저장
          </button>
          <button
            disabled={busy}
            onClick={onClose}
            className={supportSecondary}
          >
            취소
          </button>
        </div>
      </SupportDialog>
    );

  return null;
}
