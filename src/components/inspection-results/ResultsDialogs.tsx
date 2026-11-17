import type { InspectionApplication } from "../../pages/Inspection/types";
import type {
  ResultContent,
  ResultsDialogKind,
} from "../../pages/InspectionResults/types";
import ResultDialog from "./ResultDialog";
import ResultActionsForm from "./ResultActionsForm";
import ResultRegionForm from "./ResultRegionForm";
import type { ResultRegionFormProps } from "./ResultRegionForm";
import { resultPrimary } from "./styles";

type Props = {
  kind: ResultsDialogKind;
  busy?: boolean;
  readOnly?: boolean;
  application: InspectionApplication;
  content: ResultContent;
  setDialog: (kind: ResultsDialogKind | null) => void;
  onActions: (actions: string[]) => void;
  onRegion: ResultRegionFormProps["onRegion"];
};
export default function ResultsDialogs(props: Props) {
  const { kind, application: a, content, setDialog, onActions } = props;
  const close = () => setDialog(null);

  if (kind === "region")
    return (
      <ResultRegionForm
        application={a}
        content={content}
        busy={props.busy}
        readOnly={props.readOnly}
        onClose={close}
        onRegion={props.onRegion}
      />
    );
  if (kind === "actions")
    return (
      <ResultActionsForm
        content={content}
        onClose={close}
        onActions={onActions}
      />
    );
  const published = kind === "published" || kind === "republished";
  const republished = kind === "republished";
  const title = published
    ? republished
      ? "수정 결과를 저장·공개했습니다."
      : "결과를 저장·공개했습니다."
    : kind === "region-saved"
      ? "지역 문제를 등록했습니다."
      : "임시저장되었습니다.";

  return (
    <ResultDialog
      size="small"
      title={title}
      onClose={close}
      rounded={republished}
    >
      {republished && (
        <p className="text-sm leading-[21px] text-[#64748b]">
          주민에게 수정된 점검 결과와 권장조치를 제공합니다. 지원 신청은 주민이
          제출한 뒤 별도로 접수됩니다.
        </p>
      )}
      {published ? (
        <dl className="flex flex-col gap-3 text-sm leading-[22px]">
          {[
            ["접수번호", `${a.id} · ${a.resident}`],
            ["점검 상태", "완료 · 결과 공개"],
            ["지원 상태", "미신청"],
          ].map(([label, value]) => (
            <div
              key={label}
              className={`flex ${republished ? "gap-3" : "justify-between"}`}
            >
              <dt
                className={`text-[13px] ${republished ? "w-[116px] shrink-0 leading-5 text-[#64748b]" : ""}`}
              >
                {label}
              </dt>
              <dd
                className={`${republished ? "leading-[21px]" : "text-right"} ${label === "점검 상태" ? "text-[#27654d]" : ""}`}
              >
                {value}
              </dd>
            </div>
          ))}
        </dl>
      ) : (
        <p className="text-sm leading-[21px]">
          {kind === "region-saved" ? (
            "지역 문제 목록과 지도에 반영됩니다. 개별 주택 지원·시공 신청은 별도 절차로 진행합니다."
          ) : (
            <>
              입력한 점검 결과와 사진이 임시저장되었습니다.
              <br />
              주민에게는 아직 공개되지 않습니다.
            </>
          )}
        </p>
      )}
      <button
        type="button"
        onClick={close}
        className={`${resultPrimary} ${republished ? "h-10" : "h-11 text-base leading-6"}`}
      >
        확인
      </button>
    </ResultDialog>
  );
}
