import Dialog from "../../support/SupportDialog";
import { displayDate } from "../../../pages/Construction/model";
import { constructionPrimary } from "../styles";
import { Row, fit } from "./ConstructionDialogShared";
import type { DetailConstructionDialogProps } from "./ConstructionDialogShared";

export default function ConstructionStatusDialogs({
  kind,
  application: a,
  onClose,
}: DetailConstructionDialogProps) {
  const name = (a.receiptNo || a.id) + " · " + a.resident;
  const schedule = displayDate(a.date) + (a.time ? " · " + a.time : "");

  if (kind === "registered" || kind === "registered-support") {
    const specific = kind === "registered-support";

    return (
      <Dialog
        title={
          specific
            ? "시공 대상으로 등록 " + a.id
            : "시공 대상으로 등록했습니다."
        }
        width={specific ? "max-w-[520px]" : "max-w-[480px]"}
        height={specific ? "min-h-[259px]" : "min-h-[223px]"}
        onClose={onClose}
        className={fit + " rounded-xl"}
      >
        {specific && (
          <p className="text-base font-bold leading-6">
            시공 대상으로 등록했습니다.
          </p>
        )}
        <p className="text-sm leading-[21px] text-[#64748b]">
          {specific
            ? "희망 일정과 주민 요청사항을 참고해 시공 일정을 확정하세요."
            : "등록 후 시공 담당자와 날짜·시간을 배정합니다."}
        </p>
        <dl className="flex flex-col gap-3">
          <Row label={specific ? "신청" : "접수번호"}>{name}</Row>
          <Row label={specific ? "시설" : "시공 단계"}>
            {specific ? a.facility : "일정 미등록"}
          </Row>
        </dl>
        <button onClick={onClose} className={constructionPrimary}>
          확인
        </button>
      </Dialog>
    );
  }

  if (kind === "schedule-saved" || kind === "draft-saved") {
    const temporary = kind === "draft-saved";

    return (
      <Dialog
        title={
          temporary
            ? "설치 결과 초안을 저장했습니다."
            : "시공 일정을 저장했습니다."
        }
        width="max-w-[480px]"
        height={temporary ? "min-h-[244px]" : "min-h-[223px]"}
        onClose={onClose}
        className={fit + " rounded-xl"}
      >
        <p className="text-sm leading-[21px] text-[#64748b]">
          {temporary
            ? "진행 중 상태는 초안으로 저장됩니다. 시공 완료 및 결과 확인 후 주민에게 공개합니다."
            : "주민 시공 정보에 일정이 표시되고 일정 알림이 제공됩니다."}
        </p>
        <dl className="flex flex-col gap-3">
          <Row label="접수번호">{name}</Row>
          <Row label={temporary ? "공개 상태" : "시공 일정"}>
            {temporary ? "초안 · 미공개" : schedule}
          </Row>
        </dl>
        <button onClick={onClose} className={constructionPrimary}>
          확인
        </button>
      </Dialog>
    );
  }

  if (kind === "overall-saved") {
    return (
      <Dialog
        title="시공이 전체 완료되었습니다."
        width="max-w-[520px]"
        height="min-h-[297px]"
        onClose={onClose}
        titleClassName="text-[#27654d]"
        className={fit}
      >
        <dl className="flex flex-col gap-3">
          <Row right label="신청">
            {name}
          </Row>
          <Row right label="설치 시설">
            {a.facility}
          </Row>
          <Row right label="확정 시공">
            {schedule}
          </Row>
          <Row right label="변경 상태" success>
            {a.status}
          </Row>
        </dl>
        <p className="text-sm leading-[21px]">
          설치 결과·사진과 전체 완료 상태가 주민 시공 상세에 표시됩니다.
        </p>
        <button
          onClick={onClose}
          className={
            constructionPrimary + " h-11 rounded-md text-base leading-6"
          }
        >
          확인
        </button>
      </Dialog>
    );
  }

  return null;
}
