import { useLayoutEffect, useRef } from "react";
import type { ChangeEvent } from "react";
import type {
  Category,
  Feedback,
  ResultContent,
} from "../../pages/InspectionResults/types";
import ResultImage from "./ResultImage";
import { resultInput, resultSecondary } from "./styles";

export function GrowingTextarea({
  label,
  value,
  onChange,
  readOnly = false,
  minHeight = 45,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  readOnly?: boolean;
  minHeight?: number;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);

  useLayoutEffect(() => {
    const el = ref.current;

    if (!el) return;
    const resize = () => {
      el.style.height = "0px";
      el.style.height = `${Math.max(minHeight, el.scrollHeight + 2)}px`;
    };

    resize();
    let width = 0;
    const observer = new ResizeObserver((entries) => {
      const nextWidth = entries[0]?.contentRect.width;

      if (nextWidth !== undefined && nextWidth !== width) {
        width = nextWidth;
        resize();
      }
    });

    observer.observe(el);

    return () => observer.disconnect();
  }, [value, minHeight]);

  return (
    <textarea
      ref={ref}
      aria-label={label}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      readOnly={readOnly}
      rows={1}
      style={{ minHeight }}
      className={`${resultInput} resize-none overflow-hidden`}
    />
  );
}

export default function ResultFeedback({
  category,
  index,
  feedback,
  readOnly,
  onChange,
  onPhoto,
  editingPublished,
}: {
  category: Category;
  index: number;
  feedback: Feedback;
  readOnly: boolean;
  onChange: (feedback: Feedback) => void;
  onPhoto: (event: ChangeEvent<HTMLInputElement>, category: Category) => void;
  editingPublished: boolean;
}) {
  const update = (field: keyof Feedback, value: string) =>
    onChange({ ...feedback, [field]: value });

  return (
    <section
      aria-label={`${category} 상세 입력`}
      className="flex flex-col gap-2 rounded-md border border-[#cbd5e1] p-[11px]"
    >
      <h3 className="text-base font-bold leading-6">
        {String(index + 1).padStart(2, "0")} {category}
      </h3>
      <label
        className="text-sm font-bold leading-[21px]"
        htmlFor={`feedback-${index}-title`}
      >
        전문가 의견 제목
      </label>
      <input
        id={`feedback-${index}-title`}
        aria-label={`${category} 전문가 의견 제목`}
        value={feedback.title}
        onChange={(e) => update("title", e.target.value)}
        readOnly={readOnly}
        className={`${resultInput} h-[45px]`}
      />
      <p className="text-sm font-bold leading-[21px]">전문가 의견</p>
      <GrowingTextarea
        label={`${category} 전문가 의견`}
        value={feedback.opinion}
        onChange={(value) => update("opinion", value)}
        readOnly={readOnly}
        minHeight={category === "출입구" ? 66 : 45}
      />
      <p className="text-sm font-bold leading-[21px]">현장 확인 내용</p>
      <GrowingTextarea
        label={`${category} 현장 확인 내용`}
        value={feedback.findings}
        onChange={(value) => update("findings", value)}
        readOnly={readOnly}
        minHeight={category === "출입구" ? 66 : 45}
      />
      {editingPublished && (
        <label
          className={`${resultSecondary} relative w-[132px] cursor-pointer overflow-hidden`}
        >
          사진 재첨부
          <input
            aria-label={`${category} 사진 재첨부`}
            type="file"
            accept="image/jpeg,image/png"
            multiple
            onChange={(e) => onPhoto(e, category)}
            className="absolute inset-0 cursor-pointer opacity-0"
          />
        </label>
      )}
    </section>
  );
}

export function ResidentPreview({ content }: { content: ResultContent }) {
  return (
    <aside
      aria-label="주민 공개 미리보기"
      className="flex flex-col gap-3 rounded-xl border border-[#cbd5e1] bg-white p-[15px] text-sm leading-[21px]"
    >
      <h2 className="font-bold">
        주민 공개 미리보기{" "}
        <span className="ml-2 rounded-full border border-[#234f73] bg-[#eef3f7] px-3 py-1 text-xs font-normal text-[#234f73]">
          공개된 결과
        </span>
      </h2>
      <h3 className="text-lg font-bold leading-[27px]">현장점검 결과 · 요약</h3>
      <p>
        확인된 취약지점{" "}
        {content.selected
          .map((c, i) => `${String(i + 1).padStart(2, "0")} ${c}`)
          .join(" · ")}
      </p>
      <p className="font-bold">전문가 의견</p>
      <p>{content.summary}</p>
      {content.selected.map((category, i) => (
        <section
          key={category}
          className="flex flex-col gap-2 rounded-md border border-[#cbd5e1] p-3"
        >
          <h4 className="font-bold">
            취약지점 상세 · {String(i + 1).padStart(2, "0")} {category}
          </h4>
          {content.photos
            .filter((p) => p.category === category)
            .map((p) => (
              <ResultImage
                key={p.id}
                source={p.src}
                alt={`현장점검 사진 · ${category}`}
                className="h-[140px] w-full rounded-md object-cover"
              />
            ))}
          <p className="font-bold">전문가 의견</p>
          <p className="font-bold">{content.details[category].title}</p>
          <p>{content.details[category].opinion}</p>
          <p className="font-bold">현장 확인 내용</p>
          <p className="whitespace-pre-wrap">
            {content.details[category].findings}
          </p>
        </section>
      ))}
      {content.photos
        .filter((p) => p.category === null)
        .map((p) => (
          <ResultImage
            key={p.id}
            source={p.src}
            alt={p.name}
            className="h-[140px] w-full rounded-md object-cover"
          />
        ))}
      <h3 className="font-bold">전문가 권장 예방조치</h3>
      <ol className="space-y-2">
        {content.actions.map((text, i) => (
          <li key={i}>
            {i + 1}. {text}
          </li>
        ))}
      </ol>
      <h3 className="font-bold">관련 지원사업</h3>
      <p className="text-[#64748b]">
        지원 대상과 범위는 행정 검토 후 확정됩니다.
      </p>
      <p className="border-t border-[#cbd5e1] pt-3">
        결과 공개 시 주민에게 알림
      </p>
      <p className="text-xs text-[#64748b]">
        취약지점 · 설명 · 사진 · 권장조치만 공개합니다.
      </p>
    </aside>
  );
}
