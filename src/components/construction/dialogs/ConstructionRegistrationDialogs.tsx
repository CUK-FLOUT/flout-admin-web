import Dialog from "../../support/SupportDialog";
import {
  constructionInput,
  constructionPrimary,
  constructionSecondary,
} from "../styles";
import { Row, fit } from "./ConstructionDialogShared";
import type { ConstructionDialogProps } from "./ConstructionDialogShared";

export default function ConstructionRegistrationDialogs({
  kind,
  candidate,
  candidates,
  busy,
  error,
  onClose,
  onConfirm,
  onCandidate,
}: ConstructionDialogProps) {
  const alert = error ? (
    <p role="alert" className="text-sm leading-[21px] text-[#a53632]">
      {error}
    </p>
  ) : null;

  if (kind === "register" || kind === "register-support") {
    const specific = kind === "register-support";

    return (
      <Dialog
        title={
          specific
            ? "지원 승인 신청 시공 등록 " + (candidate?.id || "")
            : "승인 대상 등록"
        }
        width={specific ? "max-w-[680px]" : "max-w-[520px]"}
        height={specific ? "min-h-[341px]" : "min-h-[338px]"}
        onClose={onClose}
        className={fit + " rounded-xl"}
      >
        {!specific && (
          <>
            <p className="text-sm leading-[21px] text-[#64748b]">
              시공에 아직 연결되지 않은 승인 신청을 선택합니다.
            </p>
            <select
              aria-label="승인 신청 선택"
              value={candidate?.id || ""}
              onChange={(e) => onCandidate(e.target.value)}
              className={constructionInput + " h-10 px-[15px] text-sm"}
            >
              {!candidate && (
                <option value="">등록 가능한 승인 신청이 없습니다.</option>
              )}
              {candidates
                .filter((c) => c.eligible)
                .map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.id + " · " + c.resident + " · 미등록"}
                  </option>
                ))}
            </select>
          </>
        )}
        {candidate && (
          <dl className="flex flex-col gap-3">
            {specific ? (
              <>
                <Row label="대상 신청">
                  {candidate.id + " · " + candidate.resident + " · 미등록"}
                </Row>
                <Row label="지원 / 동의">
                  {(candidate.eligible ? "지원 승인 / " : "검토 필요 / ") +
                    candidate.consent}
                </Row>
                <Row label="시설">{candidate.facility}</Row>
                <Row label="주민 시공 희망">{candidate.preferred}</Row>
              </>
            ) : (
              <>
                <Row label="지원 결과">승인</Row>
                <Row label="시설 / 주소">
                  {candidate.facility + " · " + candidate.address}
                </Row>
                <Row label="동의 필요 여부">{candidate.consent}</Row>
              </>
            )}
          </dl>
        )}
        <p
          className={
            (specific ? "text-sm leading-[21px]" : "text-xs leading-[18px]") +
            " text-[#64748b]"
          }
        >
          {specific
            ? "검토 중·미승인 또는 필요한 동의 미확인 신청은 등록 대상에서 제외됩니다."
            : "지원 승인·필요 동의 확인 후 등록 가능합니다."}
        </p>
        {alert}
        {specific ? (
          <>
            <button
              disabled={!candidate?.eligible || busy}
              onClick={onConfirm}
              className={constructionPrimary}
            >
              시공 대상 등록
            </button>
            <button onClick={onClose} className={constructionSecondary}>
              취소
            </button>
          </>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            <button onClick={onClose} className={constructionSecondary}>
              취소
            </button>
            <button
              disabled={!candidate?.eligible || busy}
              onClick={onConfirm}
              className={constructionPrimary}
            >
              시공 대상 등록
            </button>
          </div>
        )}
      </Dialog>
    );
  }

  return null;
}
