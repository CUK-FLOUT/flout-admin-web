import SupportDialog from "../SupportDialog";
import type { SupportDialogProps } from "./types";
import { inspectionFor } from "../../../pages/Support/model";
import ResultImage from "../../inspection-results/ResultImage";
import { supportSecondary } from "../styles";
import Row from "./SupportDialogRow";

type Props = Pick<SupportDialogProps, "application" | "busy" | "onClose">;

export default function SupportInspectionDialog({
  application: a,
  busy = false,
  onClose,
}: Props) {
  const isOwner = a.ownership === "소유자";
  const result = inspectionFor(a);

  return (
    <SupportDialog
      title={
        a.id +
        (a.inspectionPublished
          ? isOwner
            ? " · 공개된 점검 결과"
            : " · 공개된 전문가 점검 결과"
          : " · 점검 결과")
      }
      width={isOwner ? "max-w-[448px]" : "max-w-[580px]"}
      height={isOwner ? "min-h-[625px]" : "min-h-[318px]"}
      onClose={onClose}
      className="rounded-xl"
    >
      {isOwner && (
        <>
          <span className="w-fit rounded-full border border-[#234f73] bg-[#eef3f7] px-4 py-1 text-xs text-[#234f73]">
            {a.inspectionPublished ? "점검 완료·결과 공개" : "결과 공개 전"}
          </span>
          <h3 className="text-2xl font-bold leading-9">우리 집 맞춤 예방안</h3>
        </>
      )}
      <dl className="flex flex-col gap-3">
        <Row label="취약지점">{result.selected.join(" · ")}</Row>
        {!isOwner && result.summary && (
          <Row label="점검 설명">{result.summary}</Row>
        )}
      </dl>
      {isOwner && (
        <>
          {result.summary && (
            <p className="text-sm leading-[21px]">{result.summary}</p>
          )}
          <div className="flex gap-2">
            {result.photos.slice(0, 2).map((p) => (
              <ResultImage
                key={p.id}
                source={p.src}
                alt={"현장사진 " + p.name}
                className="h-20 min-w-0 flex-1 rounded-md object-cover"
              />
            ))}
          </div>
          <h3 className="text-sm font-bold leading-[21px]">
            전문가 권장 예방조치
          </h3>
        </>
      )}
      <div>
        {isOwner ? (
          <ol className="text-sm leading-[21px]">
            {result.actions.map((action, i) => (
              <li key={action}>
                {i + 1}. {action}
              </li>
            ))}
          </ol>
        ) : (
          <Row label="권장 예방조치">
            <ol>
              {result.actions.map((action, i) => (
                <li key={action}>
                  {i + 1}. {action}
                </li>
              ))}
            </ol>
          </Row>
        )}
      </div>
      {isOwner ? (
        <>
          <h3 className="text-sm font-bold">관련 지원사업</h3>
          <p className="text-sm leading-[21px] text-[#64748b]">
            지원 대상과 범위는 행정 검토 후 확정됩니다.
          </p>
          <hr className="border-[#cbd5e1]" />
          <p className="text-sm">
            {a.inspectionPublished
              ? "결과 공개 완료 · 주민에게 제공된 동일 내용"
              : "결과 공개 전"}
          </p>
          <p className="text-xs leading-[18px] text-[#64748b]">
            권장조치 목록 공개 · 후속 처리 분류·내부 메모 비공개
          </p>
        </>
      ) : (
        result.photos.length > 0 && (
          <p className="text-[13px] leading-5 text-[#64748b]">
            현장사진 {result.photos.length}개 · 주민에게 공개된 동일 자료
          </p>
        )
      )}
      <button disabled={busy} onClick={onClose} className={supportSecondary}>
        닫기
      </button>
    </SupportDialog>
  );
}
