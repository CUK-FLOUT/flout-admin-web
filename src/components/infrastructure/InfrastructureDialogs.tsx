import type {
  InfrastructureDialogKind,
  InfrastructureIssue,
} from "../../pages/Infrastructure/types";
import InfrastructureDialog from "./InfrastructureDialog";
import { infrastructurePrimary, infrastructureSecondary } from "./styles";

type Props = {
  kind: InfrastructureDialogKind;
  issue: InfrastructureIssue;
  onClose: () => void;
  onConfirm: () => void;
  error?: string;
  busy?: boolean;
};
export default function InfrastructureDialogs({
  kind,
  issue: a,
  onClose,
  onConfirm,
  error,
  busy,
}: Props) {
  if (kind === "complete-confirm")
    return (
      <InfrastructureDialog
        title="조치완료 처리할까요?"
        width="max-w-[480px]"
        height="min-h-[198px]"
        onClose={onClose}
        titleClassName="leading-9"
        className="[&>div]:gap-4!"
      >
        <div className="-mt-2 text-sm leading-[21px]">
          <p>{a.code + " · " + a.location}</p>
          <p>완료 처리 후 상태가 조치완료로 변경되어 목록에 반영됩니다.</p>
        </div>
        {error && (
          <p role="alert" className="text-sm text-[#a53632]">
            {error}
          </p>
        )}
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={onClose}
            className={
              infrastructureSecondary +
              " h-11 border-[#234f73] text-base text-[#234f73]"
            }
          >
            취소
          </button>
          <button
            disabled={busy}
            onClick={onConfirm}
            className={infrastructurePrimary + " h-11 text-base"}
          >
            조치완료 처리
          </button>
        </div>
      </InfrastructureDialog>
    );
  if (kind === "status-saved")
    return (
      <InfrastructureDialog
        title={
          a.status +
          (a.status === "검토 대기" ? "로" : "으로") +
          " 저장했습니다."
        }
        width="max-w-[520px]"
        height="min-h-[229px]"
        onClose={onClose}
      >
        <p className="text-sm leading-[21px]">
          주민 신청 상세에도 동일한 점검 상태를 표시합니다.
        </p>
        <dl className="flex flex-col gap-3">
          {[
            ["검토대상", a.target],
            ["설치 장소", a.location],
          ].map(([label, value]) => (
            <div
              key={label}
              className="flex justify-between gap-3 text-[13px] leading-[22px]"
            >
              <dt>{label}</dt>
              <dd className="text-right">{value}</dd>
            </div>
          ))}
        </dl>
        <button
          onClick={onClose}
          className={infrastructurePrimary + " h-11 text-base leading-6"}
        >
          확인
        </button>
      </InfrastructureDialog>
    );
  if (kind === "requirements-saved")
    return (
      <InfrastructureDialog
        title="점검 필요사항을 등록했습니다."
        width="max-w-[480px]"
        height="min-h-[223px]"
        onClose={onClose}
      >
        <p className="text-sm leading-[21px] text-[#64748b]">
          지도와 공공시설 검토 상세에 표시됩니다.
        </p>
        <dl className="flex flex-col gap-3 text-sm leading-[21px]">
          <div className="grid grid-cols-[116px_1fr] gap-3">
            <dt className="text-[13px] text-[#64748b]">검토 대상</dt>
            <dd>{a.code + " · " + a.target}</dd>
          </div>
          <div className="grid grid-cols-[116px_1fr] gap-3">
            <dt className="text-[13px] text-[#64748b]">필요사항</dt>
            <dd>{a.requirements}</dd>
          </div>
        </dl>
        <button onClick={onClose} className={infrastructurePrimary}>
          확인
        </button>
      </InfrastructureDialog>
    );
  if (kind === "registered")
    return (
      <InfrastructureDialog
        title="지역 문제를 등록했습니다."
        width="max-w-[480px]"
        height="min-h-[178px]"
        onClose={onClose}
      >
        <p className="text-sm leading-[21px] text-[#64748b]">
          {a.code + " · " + a.location}
          <br />
          검토 대기로 등록했습니다. 새 항목을 목록과 지도에서 확인하세요.
        </p>
        <button onClick={onConfirm} className={infrastructurePrimary}>
          목록에서 확인
        </button>
      </InfrastructureDialog>
    );
  if (kind !== "summary") return null;

  return (
    <InfrastructureDialog
      title={a.code + " · " + a.kind + " 확인"}
      width="max-w-[680px]"
      height="min-h-[306px]"
      onClose={onClose}
    >
      <div className="text-sm leading-[21px]">
        <p>{a.status}</p>
        <p>문제 위치: {a.location}</p>
        <p>등록 출처: {a.source}</p>
        <p>
          관련 주민 신청:{" "}
          {a.related.length ? a.related.map((r) => r.id).join(" · ") : "없음"}
        </p>
        <p>문제 내용: {a.description}</p>
      </div>
      <dl className="grid grid-cols-[80px_1fr] gap-3 text-sm leading-[21px]">
        <dt className="font-bold">문제 유형</dt>
        <dd>{a.kind}</dd>
      </dl>
      <p className="text-sm leading-[21px] text-[#64748b]">
        등록된 지역 문제입니다. 공공시설 점검 필요사항·행정 검토·조치 결과는 이
        지역 문제를 기준으로 관리합니다.
      </p>
      <button onClick={onClose} className={infrastructureSecondary}>
        닫기
      </button>
    </InfrastructureDialog>
  );
}
