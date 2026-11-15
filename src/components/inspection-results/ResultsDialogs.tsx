import { resultFeedbacks } from "../../pages/InspectionResults/apiContent";
import { useState } from "react";
import type { FormEvent } from "react";
import type { InspectionApplication } from "../../pages/Inspection/types";
import type {
  RegionIssue,
  ResultContent,
  ResultsDialogKind,
} from "../../pages/InspectionResults/types";
import ResultDialog from "./ResultDialog";
import { GrowingTextarea } from "./ResultFeedback";
import { resultInput, resultPrimary, resultSecondary } from "./styles";

type Props = {
  kind: ResultsDialogKind;
  busy?: boolean;
  readOnly?: boolean;
  application: InspectionApplication;
  content: ResultContent;
  setDialog: (kind: ResultsDialogKind | null) => void;
  onActions: (actions: string[]) => void;
  onRegion: (
    issue: Omit<RegionIssue, "id" | "source" | "status" | "applicationId">,
  ) => Promise<boolean>;
};
function ActionsForm({
  content,
  onClose,
  onActions,
}: {
  content: ResultContent;
  onClose: () => void;
  onActions: (actions: string[]) => void;
}) {
  const [actions, setActions] = useState(() => [
    ...content.actions,
    ...(Array(Math.max(1, 4 - content.actions.length)).fill("") as string[]),
  ]);
  const [error, setError] = useState("");

  return (
    <ResultDialog size="actions" title="권장조치 목록 편집" onClose={onClose}>
      <p className="text-sm leading-[21px] text-[#64748b]">
        한 결과에 여러 조치를 등록할 수 있습니다. 설치시설과 행동 안내를 구분해
        작성하세요.
      </p>
      {actions.map((action, index) => (
        <input
          key={index}
          aria-label={`권장조치 ${index + 1}`}
          value={action}
          placeholder="추가 조치 입력"
          onChange={(e) =>
            setActions((values) =>
              values.map((v, i) => (i === index ? e.target.value : v)),
            )
          }
          className={`${resultInput} h-10 px-[15px] py-0`}
        />
      ))}
      {error && (
        <p role="alert" className="text-sm text-[#a53632]">
          {error}
        </p>
      )}
      <button
        type="button"
        className={resultPrimary}
        onClick={() => {
          const next = actions.map((s) => s.trim()).filter(Boolean);

          if (!next.length) {
            setError("권장조치를 1개 이상 입력해 주세요.");

            return;
          }

          onActions(next);
        }}
      >
        목록에 반영
      </button>
    </ResultDialog>
  );
}

function RegionForm({
  application: a,
  setDialog,
  onRegion,
  busy = false,
  readOnly = false,
  content,
}: Props) {
  const location = a.address;
  const [type, setType] = useState("반복 침수");
  const [description, setDescription] = useState(content.summary);
  const [findings, setFindings] = useState(
    resultFeedbacks(content)
      .map(({ feedback }) => feedback.findings)
      .filter(Boolean)
      .join("\n"),
  );

  const [initializedContent, setInitializedContent] = useState(content);

  if (initializedContent !== content) {
    setInitializedContent(content);
    setDescription(content.summary);
    setFindings(resultFeedbacks(content).map(({ feedback }) => feedback.findings).filter(Boolean).join("\n"));
  }

  const [error, setError] = useState("");

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    if (readOnly) {
      setError("공개된 점검 결과에서는 지역 문제를 등록할 수 없습니다.");

      return;
    }

    if (!location.trim() || !description.trim() || !findings.trim()) {
      setError("위치, 문제 내용, 현장 확인 내용을 모두 입력해 주세요.");

      return;
    }

    setError("");
    try {
      const registered = await onRegion({
        location: location.trim(),
        postcode: "",
        kind: type,
        description: description.trim(),
        findings: findings.trim(),
      });

      if (!registered) setError("등록할 수 없는 상태입니다. 점검 결과의 공개 여부와 처리 상태를 확인해 주세요.");
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "지역 문제를 등록하지 못했습니다.",
      );
    }
  }

  return (
    <>
      <ResultDialog
        size="region"
        title="지역·공공 문제 등록"
        showClose
        closeDisabled={busy}
        onClose={() => {
          if (!busy) setDialog(null);
        }}
      >
        <form onSubmit={submit} className="flex flex-col gap-3">
          <fieldset disabled={busy || readOnly} className="contents">
            <label
              htmlFor="region-location"
              className="text-sm font-bold leading-[21px]"
            >
              위치
            </label>
            <input
              id="region-location"
              readOnly
              value={location}
              className={`${resultInput} h-10 px-[15px] py-0`}
            />
            <p className="text-sm font-bold leading-[21px]">문제 유형</p>
            <div
              className="grid grid-cols-2 gap-2"
              role="group"
              aria-label="지역 문제 유형"
            >
              {[
                "반복 침수",
                "하수 역류",
                "도로 배수 불량",
                "빗물받이 막힘",
              ].map((value) => (
                <button
                  key={value}
                  type="button"
                  aria-pressed={type === value}
                  onClick={() => setType(value)}
                  className={type === value ? resultPrimary : resultSecondary}
                >
                  {value}
                </button>
              ))}
            </div>
            <label
              htmlFor="region-description"
              className="text-sm font-bold leading-[21px]"
            >
              문제 내용
            </label>
            <input
              id="region-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className={`${resultInput} h-10 px-[15px] py-0`}
            />
            <p className="text-sm font-bold leading-[21px]">현장 확인 내용</p>
            <GrowingTextarea
              label="지역 문제 현장 확인 내용"
              value={findings}
              onChange={setFindings}
              minHeight={62}
            />
            {error && (
              <p role="alert" className="text-sm leading-[21px] text-[#a53632]">
                {error}
              </p>
            )}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setDialog(null)}
                className={`${resultSecondary} flex-1`}
              >
                취소
              </button>
              <button
                type="submit"
                disabled={
                  !location.trim() || !description.trim() || !findings.trim()
                }
                className={`${resultPrimary} flex-1`}
              >
                지역 문제 등록
              </button>
            </div>
          </fieldset>
        </form>
      </ResultDialog>

    </>
  );
}

export default function ResultsDialogs(props: Props) {
  const { kind, application: a, content, setDialog, onActions } = props;
  const close = () => setDialog(null);

  if (kind === "region")
    return <RegionForm {...props} />;
  if (kind === "actions")
    return (
      <ActionsForm content={content} onClose={close} onActions={onActions} />
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
