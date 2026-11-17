import { useState } from "react";
import type { ResultContent } from "../../pages/InspectionResults/types";
import ResultDialog from "./ResultDialog";
import { resultInput, resultPrimary } from "./styles";

export default function ResultActionsForm({
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
    ...Array.from(
      { length: Math.max(1, 4 - content.actions.length) },
      () => "",
    ),
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
