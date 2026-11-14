import ResultDialog from "./ResultDialog";
import { resultPrimary, resultSecondary } from "./styles";

type Props = {
  busy: boolean;
  onClose: () => void;
  onPublish: () => void;
  onEdit: () => void;
};

export default function FacilityWarning({
  busy,
  onClose,
  onPublish,
  onEdit,
}: Props) {
  return (
    <ResultDialog
      size="small"
      title={
        <span className="flex items-center gap-[10px]">
          <span
            aria-hidden="true"
            className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#234f73] text-[13px] leading-4 text-white"
          >
            i
          </span>
          지원시설이 확인되지 않았어요
        </span>
      }
      onClose={() => {
        if (!busy) onClose();
      }}
    >
      <div className="mt-1 flex flex-col gap-4 text-sm leading-[21px]">
        <p>
          권장 예방조치에서 지원사업과 연결할 시설명이 확인되지 않았습니다.
          <br />
          시설명을 추가하지 않으면 관련 지원사업 신청이 제한될 수 있습니다.
        </p>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            disabled={busy}
            className={`${resultSecondary} min-h-11`}
            onClick={onPublish}
          >
            그대로 공개
          </button>
          <button
            type="button"
            disabled={busy}
            className={`${resultPrimary} min-h-11`}
            onClick={onEdit}
          >
            시설명 추가하기
          </button>
        </div>
      </div>
    </ResultDialog>
  );
}
