import Dialog from "../../support/SupportDialog";
import {
  displayDate,
  sameInstallation,
} from "../../../pages/Construction/model";
import {
  constructionPrimary,
  constructionSecondary,
} from "../styles";
import { Row, fit } from "./ConstructionDialogShared";
import type { DetailConstructionDialogProps } from "./ConstructionDialogShared";

export default function ConstructionStatusDialogs({
  kind,
  application: a,
  draft,
  target,
  busy,
  error,
  onClose,
  onConfirm,
  onInstall,
}: DetailConstructionDialogProps) {
  const name = a.id + " · " + a.resident;
  const schedule = displayDate(a.date) + (a.time ? " · " + a.time : "");
  const alert = error ? (
    <p role="alert" className="text-sm leading-[21px] text-[#a53632]">
      {error}
    </p>
  ) : null;

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

  if (kind === "status-confirm") {
    const missingResult =
      target === "완료" && (!a.published || !sameInstallation(draft, a));

    return (
      <Dialog
        title={"시공 상태 " + target}
        width="max-w-[580px]"
        height={target === "완료" ? "min-h-[310px]" : "min-h-[289px]"}
        onClose={onClose}
        className={fit + " rounded-xl"}
      >
        <dl className="flex flex-col gap-3">
          <Row label="신청">{name}</Row>
          <Row label="설치 시설">{a.facility}</Row>
          <Row label="확정 시공">{schedule}</Row>
          <Row label="변경 상태">{target}</Row>
        </dl>
        <p className="text-sm leading-[21px] text-[#64748b]">
          {target === "완료"
            ? missingResult
              ? "설치 결과·완료 사진을 등록한 후 완료로 저장합니다. 이 신청은 진행 중이고 결과가 아직 없어 완료 저장이 비활성화됩니다."
              : "공개된 설치 결과와 완료 사진을 확인한 후 완료로 저장합니다."
            : "변경된 시공 상태는 주민의 시공 진행상태에도 표시됩니다."}
        </p>
        {alert}
        <div className="grid grid-cols-2 gap-2">
          <button onClick={onClose} className={constructionSecondary}>
            취소
          </button>
          <button
            disabled={busy}
            onClick={missingResult ? onInstall : onConfirm}
            className={constructionPrimary}
          >
            {missingResult ? "설치 결과 등록" : "시공 상태 저장"}
          </button>
        </div>
      </Dialog>
    );
  }

  if (kind === "status-saved" || kind === "overall-saved") {
    const whole = kind === "overall-saved",
      completed = a.status === "완료";

    return (
      <Dialog
        title={
          whole
            ? "시공이 전체 완료되었습니다."
            : "시공 " +
              a.status +
              (a.status === "예정" || a.status === "진행" ? "으로" : "로") +
              " 저장했습니다."
        }
        width="max-w-[520px]"
        height={completed && !whole ? "min-h-[318px]" : "min-h-[297px]"}
        onClose={onClose}
        titleClassName={whole || completed ? "text-[#27654d]" : ""}
        className={fit}
      >
        {!whole && !completed && (
          <p className="text-sm leading-[21px]">
            주민 신청 상세에도 동일한 점검 상태를 표시합니다.
          </p>
        )}
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
          <Row right label="변경 상태" success={whole || completed}>
            {a.status}
          </Row>
        </dl>
        {(whole || completed) && (
          <p className="text-sm leading-[21px]">
            {whole
              ? "설치 결과·사진과 전체 완료 상태가 주민 시공 상세에 표시됩니다."
              : "설치 결과·완료 사진이 등록되었습니다. 최종 설치 결과를 확인한 뒤 전체 완료로 처리해 주세요."}
          </p>
        )}
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
