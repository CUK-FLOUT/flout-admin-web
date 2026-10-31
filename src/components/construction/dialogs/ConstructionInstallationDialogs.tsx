import { useRef } from "react";

import Dialog from "../../support/SupportDialog";
import {
  displayDate,
  installationIssue,
} from "../../../pages/Construction/model";
import ConstructionBadge from "../ConstructionBadge";
import ConstructionImage from "../ConstructionImage";
import {
  constructionInput,
  constructionPrimary,
  constructionSecondary,
} from "../styles";
import { Row, fit } from "./ConstructionDialogShared";
import type { DetailConstructionDialogProps } from "./ConstructionDialogShared";

export default function ConstructionInstallationDialogs({
  kind,
  application: a,
  draft,
  checked,
  error,
  busy,
  onClose,
  onConfirm,
  onPublishedReview,
  onDraftSave,
  onChange,
  onChecked,
  onUpload,
}: DetailConstructionDialogProps) {
  const file = useRef<HTMLInputElement>(null);
  const name = a.id + " · " + a.resident;
  const alert = error ? (
    <p role="alert" className="text-sm leading-[21px] text-[#a53632]">
      {error}
    </p>
  ) : null;

  if (kind === "installation") {
    const issue = installationIssue(draft);

    return (
      <Dialog
        title={"설치 결과 등록 " + a.id}
        width="max-w-[580px]"
        height="min-h-[502px]"
        onClose={onClose}
        className={fit + " rounded-xl"}
      >
        <dl className="flex flex-col gap-3">
          <Row label="시공 신청">{name}</Row>
          <Row label="지원·설치 시설">{a.facility}</Row>
          <Row label="설치 완료일">
            <input
              aria-label="설치 완료일"
              type="date"
              value={draft.completionDate}
              onChange={(e) =>
                onChange({
                  ...draft,
                  completionDate: e.target.value,
                  verified: false,
                })
              }
              className={constructionInput + " h-10 px-[15px] text-sm"}
            />
          </Row>
        </dl>
        <label className="contents">
          <span className="text-sm font-bold leading-[21px]">
            주민에게 공개할 설치 결과
          </span>
          <textarea
            aria-label="주민에게 공개할 설치 결과"
            value={draft.note}
            onChange={(e) =>
              onChange({ ...draft, note: e.target.value, verified: false })
            }
            className={
              constructionInput +
              " h-[45px] min-h-[45px] resize-y bg-[#f4f5f6] p-[11px] text-sm leading-[21px]"
            }
          />
        </label>
        <p className="text-sm font-bold leading-[21px]">완료 사진</p>
        <button
          type="button"
          disabled={busy}
          onClick={() => file.current?.click()}
          className={constructionSecondary + " min-w-0 truncate px-4 text-left"}
          title={draft.photos.map((p) => p.name).join(", ")}
        >
          {busy
            ? "사진 저장 중…"
            : draft.photos.length
              ? draft.photos.map((p) => p.name).join(", ") + " · 사진 첨부"
              : "사진 첨부"}
        </button>
        <input
          ref={file}
          aria-label="설치 결과 완료 사진 파일"
          type="file"
          accept="image/jpeg,image/png"
          multiple
          className="sr-only"
          onChange={(e) => {
            onUpload(Array.from(e.target.files || []));
            e.target.value = "";
          }}
        />
        <label className="flex items-center gap-2 text-sm font-bold leading-[21px]">
          <input
            type="checkbox"
            aria-label="설치 내용·사진 확인 완료"
            checked={draft.verified}
            onChange={(e) => onChange({ ...draft, verified: e.target.checked })}
            className="size-[18px] shrink-0 accent-[#234f73]"
          />
          설치 내용·사진 확인 완료
        </label>
        {alert ||
          (issue && (
            <p className="text-xs leading-[18px] text-[#64748b]">{issue}</p>
          ))}
        <button
          onClick={onConfirm}
          disabled={!!issue || busy}
          className={constructionPrimary}
        >
          시공 완료·설치 결과 공개
        </button>
        <div className="grid grid-cols-2 gap-2">
          <button
            disabled={busy}
            onClick={onDraftSave}
            className={constructionSecondary}
          >
            설치 결과 임시 저장
          </button>
          <button onClick={onClose} className={constructionSecondary}>
            취소
          </button>
        </div>
      </Dialog>
    );
  }

  if (kind === "published") {
    return (
      <Dialog
        title={"시공 완료 설치 결과 공개 " + a.id}
        width="max-w-[580px]"
        height="min-h-[404px]"
        onClose={onClose}
        className={fit + " rounded-xl"}
      >
        <dl className="flex flex-col gap-3">
          <Row label="신청">{name}</Row>
          <Row label="현재 처리 상태">시공 완료</Row>
          <Row label="설치 시설">{a.facility}</Row>
          <Row label="설치 완료일">
            {displayDate(a.published?.completionDate || "")}
          </Row>
          <Row label="설치 결과">{a.published?.note}</Row>
        </dl>
        <p className="text-sm leading-[21px] text-[#64748b]">
          설치 완료 사진 · 주민 시공 상세에 공개
        </p>
        <p className="text-xs leading-[18px] text-[#64748b]">
          전체 완료는 최종 결과 확인 후 처리합니다.
        </p>
        <button onClick={onPublishedReview} className={constructionPrimary}>
          최종 결과 확인·전체 완료
        </button>
        <button onClick={onClose} className={constructionSecondary}>
          닫기
        </button>
      </Dialog>
    );
  }

  const reviewing = kind === "completion-review";

  return (
    <Dialog
      title={name + "님의 신청"}
      width="max-w-[580px]"
      height="min-h-[594px]"
      onClose={onClose}
      className={fit + " rounded-xl p-[15px]!"}
      titleClassName="flex min-h-10 items-center pr-[84px]"
    >
      <button
        onClick={onClose}
        className={
          constructionSecondary + " absolute top-[15px] right-[15px] w-[72px]"
        }
      >
        닫기
      </button>
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-base font-bold leading-6">시공 정보</h3>
        <ConstructionBadge status={a.status} />
      </div>
      <dl className="flex flex-col gap-3">
        <Row label="주소">{a.address}</Row>
        <Row label="설치 시설">{a.facility}</Row>
        <Row label="설치 완료일">
          {displayDate(a.published?.completionDate || "")}
        </Row>
        <Row label="시공 상태">{a.status}</Row>
        <Row label="설치 결과">
          {a.published?.note || "설치 결과와 사진이 등록되었습니다."}
        </Row>
        {!reviewing && <Row label="최종 처리">설치 결과 확인 · 전체 완료</Row>}
      </dl>
      {a.published?.photos.length ? (
        <div className="flex gap-2 overflow-x-auto">
          {a.published.photos.map((photo) => (
            <ConstructionImage
              key={photo.id}
              source={photo.src}
              alt={"공개된 완료사진 " + photo.name}
              className="h-[88px] w-[160px] shrink-0 rounded-md object-cover"
            />
          ))}
        </div>
      ) : null}
      {reviewing ? (
        <>
          <label className="flex items-center gap-2 text-sm font-bold leading-[21px]">
            <input
              type="checkbox"
              aria-label="설치 결과·조치 내용 확인"
              checked={checked}
              onChange={(e) => onChecked(e.target.checked)}
              className="size-[18px] shrink-0 accent-[#234f73]"
            />
            설치 결과·조치 내용 확인
          </label>
          {alert}
          <button
            disabled={!checked || busy}
            onClick={onConfirm}
            className={constructionPrimary}
          >
            결과 확인·전체 완료
          </button>
          <p className="text-xs leading-[18px] text-[#64748b]">
            선택한 {a.id} 신청에만 적용됩니다.
          </p>
        </>
      ) : (
        <p className="text-xs leading-[18px] text-[#64748b]">
          주민에게 설치 결과와 완료 알림 제공
        </p>
      )}
    </Dialog>
  );
}
