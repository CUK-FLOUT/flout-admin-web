import { useState } from "react";
import type { FormEvent } from "react";
import type { InspectionApplication } from "../../pages/Inspection/types";
import type {
  RegionIssue,
  ResultContent,
} from "../../pages/InspectionResults/types";
import { resultFeedbacks } from "../../pages/InspectionResults/apiContent";
import ResultDialog from "./ResultDialog";
import { GrowingTextarea } from "./ResultFeedback";
import { resultInput, resultPrimary, resultSecondary } from "./styles";

export type ResultRegionFormProps = {
  application: Pick<InspectionApplication, "address">;
  content: ResultContent;
  busy?: boolean;
  readOnly?: boolean;
  onClose: () => void;
  onRegion: (
    issue: Omit<RegionIssue, "id" | "source" | "status" | "applicationId">,
  ) => Promise<boolean>;
};

export default function ResultRegionForm({
  application: a,
  onClose,
  onRegion,
  busy = false,
  readOnly = false,
  content,
}: ResultRegionFormProps) {
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

  // 늦게 도착한 결과를 반영하되 일반 재렌더링에서는 작성 중인 입력을 유지한다.
  if (initializedContent !== content) {
    setInitializedContent(content);
    setDescription(content.summary);
    setFindings(
      resultFeedbacks(content)
        .map(({ feedback }) => feedback.findings)
        .filter(Boolean)
        .join("\n"),
    );
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

      if (!registered)
        setError(
          "등록할 수 없는 상태입니다. 점검 결과의 공개 여부와 처리 상태를 확인해 주세요.",
        );
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
          if (!busy) onClose();
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
                onClick={() => onClose()}
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
