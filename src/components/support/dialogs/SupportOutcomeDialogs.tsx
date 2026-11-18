import SupportDialog from "../SupportDialog";
import type { SupportDialogProps } from "./types";
import { Link } from "react-router-dom";
import { consentLabel } from "../../../pages/Support/model";
import SupportBadge from "../SupportBadge";
import { supportPrimary, supportSecondary } from "../styles";
import Row from "./SupportDialogRow";

type Props = Pick<
  SupportDialogProps,
  "kind" | "application" | "busy" | "onClose" | "onRegister"
>;

export default function SupportOutcomeDialogs({
  kind,
  application: a,
  busy = false,
  onClose,
  onRegister,
}: Props) {
  const isOwner = a.ownership === "소유자";

  if (kind === "approved")
    return (
      <SupportDialog
        title={"지원 승인 저장 후 " + a.id}
        width="max-w-[680px]"
        height="min-h-[344px]"
        onClose={onClose}
        className="rounded-xl"
      >
        <p className="text-base font-bold leading-6">
          지원 승인 · 주민에게 결과 공개
        </p>
        <dl className="flex flex-col gap-3">
          <Row label="신청">{a.id + " · " + a.resident}</Row>
          <Row label="지원 시설">{a.request}</Row>
          <Row label="동의 상태">{consentLabel(a)}</Row>
        </dl>
        <p className="text-sm leading-[21px] text-[#64748b]">
          승인된 신청의 시공 일정과 진행 상황은 시공 관리에서 확인할 수
          있습니다.
        </p>
        <button onClick={onRegister} className={supportPrimary}>
          시공 관리에서 확인
        </button>
        <button disabled={busy} onClick={onClose} className={supportSecondary}>
          닫기
        </button>
      </SupportDialog>
    );
  if (kind === "rejected")
    return (
      <SupportDialog
        title={"지원 미승인 저장 " + a.id}
        width="max-w-[520px]"
        height="min-h-[280px]"
        onClose={onClose}
        className="rounded-xl"
      >
        <p className="text-base font-bold leading-6">
          지원 미승인 · 주민에게 결과 공개
        </p>
        <p className="text-sm leading-[21px] text-[#64748b]">
          담당자가 입력한 검토 안내가 주민 지원 상세에 표시됩니다. 시공 대상으로
          연계되지 않습니다.
        </p>
        <dl className="flex flex-col gap-3">
          <Row label="신청">{a.id + " · " + a.resident}</Row>
          <Row label="검토 결과">지원 미승인</Row>
        </dl>
        <button disabled={busy} onClick={onClose} className={supportPrimary}>
          확인
        </button>
      </SupportDialog>
    );
  if (kind === "review-saved")
    return (
      <SupportDialog
        title={
          isOwner ? a.id + " · 검토 내용 저장" : "검토 내용을 저장했습니다."
        }
        width={isOwner ? "max-w-[400px]" : "max-w-[480px]"}
        height={isOwner ? "min-h-[244px]" : "min-h-[256px]"}
        onClose={onClose}
        className="rounded-xl"
      >
        {!isOwner && (
          <p className="text-sm leading-[21px] text-[#64748b]">
            지원 결과는 검토 완료 후 별도로 저장합니다.
          </p>
        )}
        <dl className="flex flex-col gap-3">
          {!isOwner && <Row label="접수번호">{a.id + " · " + a.resident}</Row>}
          <Row label="지원 상태">지원 검토 중</Row>
          <Row label={isOwner ? "남은 검토" : "남은 확인"}>
            자격·필요자료·동의 필요 여부
          </Row>
        </dl>
        {isOwner && (
          <p className="text-sm leading-[21px] text-[#64748b]">
            검토 결과를 확정한 뒤 주민 지원 상세에 안내합니다. 현재 승인·시공
            등록 전 단계입니다.
          </p>
        )}
        <button disabled={busy} onClick={onClose} className={supportPrimary}>
          확인
        </button>
      </SupportDialog>
    );
  if (kind === "approved-view" || kind === "rejected-view") {
    const approved = a.status === "승인";
    const hasResidentNotice = !approved && a.rejectionReason.trim().length > 0;

    return (
      <SupportDialog
        title={a.id + " · " + a.resident + "님의 신청"}
        width="max-w-[580px]"
        height="min-h-[594px]"
        onClose={onClose}
        className="rounded-xl p-[15px]"
      >
        <button
          onClick={onClose}
          className={
            supportSecondary + " absolute top-[15px] right-[15px] w-[72px]"
          }
        >
          닫기
        </button>
        <div className="mt-3 flex items-center justify-between gap-3">
          <h3 className="font-bold">지원 정보</h3>
          <SupportBadge status={a.status} />
        </div>
        <dl className="flex flex-col gap-3">
          <Row label="주소">{a.address + " · " + a.housing}</Row>
          <Row label={approved ? "지원 시설" : "요청 조치"}>{a.request}</Row>
          {approved ? (
            <>
              <Row label="지원 범위">{a.review.scope}</Row>
              <Row label="임대인 동의">{consentLabel(a)}</Row>
              <Row label="시공 연계">시공 관리에서 확인</Row>
            </>
          ) : (
            <>
              <Row label="검토 결과">미승인</Row>
              {hasResidentNotice && (
                <Row label="주민 안내 내용">{a.rejectionReason}</Row>
              )}
            </>
          )}
        </dl>
        {(approved || hasResidentNotice) && (
          <p className="text-xs leading-[18px] text-[#64748b]">
            {approved
              ? "지원 결과와 동의서 제출 여부는 주민 화면에도 표시됩니다."
              : "검토 안내문은 행정 담당자가 입력한 내용입니다."}
          </p>
        )}
        {approved && (
          <Link to="/construction" className={supportSecondary}>
            시공 관리에서 확인
          </Link>
        )}
      </SupportDialog>
    );
  }

  return null;
}
