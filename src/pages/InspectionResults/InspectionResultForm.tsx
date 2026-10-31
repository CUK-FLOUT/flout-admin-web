import ResultFeedback, {
  GrowingTextarea,
} from "../../components/inspection-results/ResultFeedback";
import {
  DocumentIcon,
  MemoIcon,
} from "../../components/inspection-results/ResultIcons";
import {
  resultInput,
  resultPrimary,
  resultSecondary,
} from "../../components/inspection-results/styles";
import { inspectionCheckbox } from "../../components/inspection/styles";
import { categories } from "./types";
import check from "../../assets/inspection-results/check.svg";
import routeIcon from "../../assets/inspection-results/route.svg";
import type useInspectionResultEditor from "./useInspectionResultEditor";

type Props = {
  editor: ReturnType<typeof useInspectionResultEditor>;
};

export default function InspectionResultForm({ editor }: Props) {
  const {
    content,
    draft,
    readOnly,
    editingPublished,
    expanded,
    busy,
    toggleCategory,
    update,
    setDialog,
    upload,
    persist,
  } = editor;

  return (
        <section
          aria-labelledby="result-editor-title"
          className={`flex min-w-0 flex-col gap-3 rounded-xl border border-[#cbd5e1] bg-white p-[15px] ${expanded ? "min-h-[1581px]" : "min-h-[816px]"}`}
        >
          <h2
            id="result-editor-title"
            className="flex h-6 items-center gap-2 text-lg font-semibold leading-6 text-[#1e2835]"
          >
            <DocumentIcon />
            전문가 점검 결과 입력
          </h2>
          <fieldset
            disabled={busy}
            className="flex w-[calc(100%_-_8px)] min-w-0 flex-col gap-3"
          >
            <p className="text-sm font-bold leading-[21px]">
              {expanded
                ? "확인된 취약지점 · 해당 유형 모두 선택 (복수 선택 · 1곳 이상)"
                : "확인된 취약지점 (복수 선택)"}
            </p>
            <div
              role="group"
              aria-label="확인된 취약지점"
              className="grid grid-cols-4 gap-2 max-sm:grid-cols-2"
            >
              {categories.map((category) => (
                <button
                  type="button"
                  key={category}
                  aria-disabled={readOnly}
                  tabIndex={readOnly ? -1 : 0}
                  aria-pressed={content.selected.includes(category)}
                  onClick={() => {
                    if (!readOnly) toggleCategory(category);
                  }}
                  className={`${content.selected.includes(category) ? resultPrimary : resultSecondary} min-w-0 px-2`}
                >
                  {category}
                </button>
              ))}
            </div>
            <p className="text-sm font-bold leading-[21px]">
              결과 요약 · 전문가 의견
            </p>
            <GrowingTextarea
              label="결과 요약 · 전문가 의견"
              value={content.summary}
              onChange={(value) => update("summary", value)}
              readOnly={readOnly}
            />
            {content.selected.map((category, index) => (
              <ResultFeedback
                key={category}
                category={category}
                index={index}
                feedback={content.details[category]}
                readOnly={readOnly}
                editingPublished={editingPublished}
                onChange={(feedback) =>
                  update("details", { ...draft.details, [category]: feedback })
                }
                onPhoto={(event, type) => {
                  void upload(event, type);
                }}
              />
            ))}
            {!content.selected.length && (
              <p role="status" className="text-sm text-[#64748b]">
                취약지점을 1개 이상 선택해 주세요.
              </p>
            )}
            <section aria-label="권장 예방조치" className="flex flex-col gap-2">
              <div className="flex min-h-10 items-center justify-between gap-2">
                <h3 className="flex items-center gap-2 text-sm font-bold leading-[21px]">
                  <img src={check} alt="" width={18} height={18} />
                  권장 예방조치
                </h3>
                {!readOnly && (
                  <button
                    type="button"
                    onClick={() => setDialog("actions")}
                    className={`${resultSecondary} w-[144px]`}
                  >
                    + 조치 추가
                  </button>
                )}
              </div>
              <ol className="flex flex-col gap-2">
                {content.actions.map((action, index) => (
                  <li
                    key={index}
                    className="flex min-h-10 items-center gap-1 rounded-md border border-[#cbd5e1] px-[15px] py-2 text-sm leading-[21px]"
                  >
                    <span className="shrink-0">{index + 1}.</span>
                    <span>{action}</span>
                  </li>
                ))}
              </ol>
            </section>
            <h3 className="flex items-center gap-2 text-sm font-bold leading-[21px]">
              <img src={routeIcon} alt="" width={18} height={18} />
              문제 유형 · 후속 처리 경로
            </h3>
            <div
              role="group"
              aria-label="후속 처리 경로"
              className="flex flex-wrap gap-3"
            >
              {(["개별 주택", "지역·공공"] as const).map((value) => (
                <button
                  type="button"
                  key={value}
                  aria-pressed={content.route === value}
                  aria-disabled={readOnly}
                  tabIndex={readOnly ? -1 : 0}
                  onClick={() => {
                    if (!readOnly) update("route", value);
                  }}
                  className={`${content.route === value ? resultPrimary : resultSecondary} w-[176px] max-sm:flex-1`}
                >
                  {value}
                </button>
              ))}
              {content.route === "지역·공공" && !readOnly && (
                <button
                  type="button"
                  onClick={() => setDialog("region")}
                  className={`${resultPrimary} w-[176px]`}
                >
                  지역 문제 등록
                </button>
              )}
            </div>
            <label className="flex min-h-10 items-center gap-2 max-sm:flex-col max-sm:items-start">
              <span className="flex w-[168px] shrink-0 items-center gap-2 text-sm font-bold leading-[21px]">
                <MemoIcon />
                내부 메모 · 주민 비공개
              </span>
              <input
                aria-label="내부 메모 · 주민 비공개"
                value={content.memo}
                onChange={(e) => update("memo", e.target.value)}
                readOnly={readOnly}
                className={`${resultInput} h-10 flex-1 px-[15px] py-0`}
              />
            </label>
            {editingPublished && (
              <>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={draft.notify}
                    onChange={(e) => update("notify", e.target.checked)}
                    className={inspectionCheckbox}
                  />
                  결과 공개 시 주민에게 알림
                </label>
                <div className="flex gap-3">
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => persist(false)}
                    className={`${resultSecondary} w-[144px]`}
                  >
                    임시 저장
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => persist(true)}
                    className={`${resultPrimary} w-[228px]`}
                  >
                    수정 결과 재공개
                  </button>
                </div>
              </>
            )}
          </fieldset>
        </section>
  );
}
