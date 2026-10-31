import type { PriorityApplication } from "../../pages/Priority/mockData";
import emptyDocument from "../../assets/priority/empty-document.svg";
import emptySearch from "../../assets/priority/empty-search.svg";

type Props = {
  application?: PriorityApplication;
  searchEmpty: boolean;
  memo: string;
  onMemo: (value: string) => void;
  ordering: boolean;
  onDesignate: () => void;
  onOrder: () => void;
};

export default function PriorityDetail({
  application,
  searchEmpty,
  memo,
  onMemo,
  ordering,
  onDesignate,
  onOrder,
}: Props) {
  if (!application) {
    return (
      <section
        aria-label="신청 상세"
        className="flex min-h-[631px] flex-col rounded-md border border-[#cbd5e1] bg-white p-5 xl:h-full xl:min-h-0"
      >
        <h2 className="text-base font-bold leading-6">신청 상세</h2>
        <div className="flex flex-1 flex-col items-center justify-center text-center">
          <img
            src={searchEmpty ? emptySearch : emptyDocument}
            alt=""
            width={56}
            height={56}
          />
          <h3 className="mt-5 text-sm font-bold leading-[22px]">
            선택된 신청이 없습니다
          </h3>
          <p className="mt-4 text-[13px] leading-[21px] text-[#7b828a]">
            목록에서 신청을 선택하면
            <br />
            상세 정보와 선정 근거를 확인할 수 있습니다.
          </p>
        </div>
      </section>
    );
  }

  // Figma: 1391:7669 (기본) / 1391:8006 (순서 변경).
  // 고정 높이로 내용을 자르지 않고 원본의 기준 높이를 최소 높이로 사용합니다.
  const sources = [
    `AI 취약도 ${application.risk}`,
    `주민 과거 침수 경험 ${application.floodExperience}`,
    `주민 점검 요청 사유: ${application.reason}`,
    `인근 신청 ${application.nearby}건 함께 검토`,
  ];

  return (
    <section
      aria-label={`${application.id} 우선점검 신청 상세`}
      data-figma-node={ordering ? "1391:8006" : "1391:7669"}
      className={`flex w-full self-start flex-col gap-4 overflow-y-auto rounded-md border-[0.75px] border-[#cbd5e1] bg-white p-5 xl:h-full xl:min-h-0 ${ordering ? "max-xl:min-h-[583px]" : "max-xl:min-h-[631px]"}`}
    >
      <h2
        data-priority-section="title"
        className="flex min-h-10 shrink-0 items-center break-keep text-lg font-bold leading-6"
      >
        {application.id} · {application.resident}님의 신청
      </h2>

      <dl
        data-priority-section="basic"
        className="min-h-[62px] shrink-0 space-y-[6px] text-[13px] leading-[22px]"
      >
        <div className="flex gap-3">
          <dt className="w-[116px] shrink-0">주소</dt>
          <dd className="min-w-0 flex-1 text-right text-sm font-medium">
            {application.address}
          </dd>
        </div>
        <div className="flex gap-3">
          <dt className="w-[116px] shrink-0">점검 필요도</dt>
          <dd className="flex-1 text-right text-sm font-medium">
            우선점검 권장
          </dd>
        </div>
      </dl>

      <section
        data-priority-section="sources"
        className={`shrink-0 ${ordering ? "min-h-[150px]" : "min-h-[171px]"}`}
      >
        <h3 className="mb-2 text-sm font-bold leading-[21px]">
          시급성 참고 · 입력 출처
        </h3>
        <ul className="space-y-1">
          {sources.map((source, index) => (
            <li
              key={source}
              className="flex min-h-6 items-center gap-[9px] text-sm leading-[21px]"
            >
              <span
                aria-hidden="true"
                className="grid h-4 w-4 shrink-0 place-items-center rounded-full bg-[#234f73] text-[11px] leading-[17px] text-white"
              >
                ✓
              </span>
              <span
                className={
                  index === 0 && application.risk === "높음"
                    ? "text-[#a53632]"
                    : ""
                }
              >
                {source}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <div
        data-priority-section="memo"
        className={`shrink-0 ${ordering ? "min-h-[71px]" : "min-h-[89px]"}`}
      >
        <label
          htmlFor="priority-memo"
          className="mb-2 flex h-[21px] items-center gap-2 text-sm font-bold leading-[21px]"
        >
          <span
            aria-hidden="true"
            className="relative h-[18px] w-[18px] shrink-0 rounded-[3px] border-[1.5px] border-[#234f73]"
          >
            <span className="absolute left-px top-[2px] h-[1.5px] w-[10px] rounded-[0.75px] bg-[#234f73]" />
            <span className="absolute left-px top-[6px] h-[1.5px] w-[10px] rounded-[0.75px] bg-[#234f73]" />
            <span className="absolute left-px top-[10px] h-[1.5px] w-[7px] rounded-[0.75px] bg-[#234f73]" />
          </span>
          담당자 선정 메모
        </label>
        <input
          id="priority-memo"
          value={memo}
          onChange={(event) => onMemo(event.target.value)}
          className="block h-[42px] w-full rounded-md border border-[#c8d0d7] bg-white px-[14px] text-[13px] leading-[21px] focus:outline-2 focus:outline-[#234f73]"
        />
      </div>

      <div
        data-priority-section="actions"
        className="flex min-h-[110px] shrink-0 flex-col items-start gap-2 text-sm font-bold leading-[22px]"
      >
        <button
          type="button"
          onClick={onDesignate}
          disabled={application.designated}
          className={`flex w-full shrink-0 items-center justify-center gap-2 rounded-md bg-[#234f73] px-4 text-white hover:bg-[#183b58] disabled:cursor-not-allowed disabled:bg-[#eef3f7] disabled:text-[#64748b] ${ordering ? "h-[42px]" : "h-10"}`}
        >
          <span aria-hidden="true" className="text-[15px]">
            ✓
          </span>
          {application.designated ? "우선점검 지정 완료" : "우선점검 대상 지정"}
        </button>
        <button
          type="button"
          onClick={onOrder}
          className={`flex w-full shrink-0 items-center justify-center gap-2 rounded-md border border-[#234f73] bg-white px-4 hover:bg-[#eef3f7] ${ordering ? "h-[43px]" : "h-10"}`}
        >
          <span aria-hidden="true" className="text-[15px]">
            ⇄
          </span>
          {ordering ? "선정 순서 저장" : "선정 순서 변경"}
        </button>
      </div>
    </section>
  );
}
