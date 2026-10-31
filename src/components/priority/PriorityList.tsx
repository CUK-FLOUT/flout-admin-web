import type { PriorityApplication } from "../../pages/Priority/mockData";
import highDot from "../../assets/priority/risk-high.svg";
import warningDot from "../../assets/priority/risk-warning.svg";
import lowDot from "../../assets/priority/risk-low.svg";
import emptyDocument from "../../assets/priority/empty-document.svg";
import emptySearch from "../../assets/priority/empty-search.svg";

const riskStyle = {
  높음: "border-[#a53632] bg-[#faefed] text-[#a53632]",
  주의: "border-[#865a16] bg-[#faf4e8] text-[#865a16]",
  낮음: "border-[#27654d] bg-[#edf5f0] text-[#27654d]",
};

const riskDots = { 높음: highDot, 주의: warningDot, 낮음: lowDot };

type Props = {
  filtered: PriorityApplication[];
  selectedId?: string;
  ordering: boolean;
  searchEmpty: boolean;
  onSelect: (application: PriorityApplication) => void;
  onDropOn: (id: string) => void;
  onDragStart: (id: string) => void;
  onDragEnd: () => void;
  onOpenReorder: () => void;
  onMove: (id: string, delta: number) => void;
  onReset: () => void;
};

export default function PriorityList({
  filtered,
  selectedId,
  ordering,
  searchEmpty,
  onSelect,
  onDropOn,
  onDragStart,
  onDragEnd,
  onOpenReorder,
  onMove,
  onReset,
}: Props) {
  return (
    <section
      aria-label="점검 전 신청 비교"
      className="flex h-[631px] min-w-0 flex-col overflow-hidden rounded-lg bg-white ring-[0.75px] ring-inset ring-[#c8d0d7] xl:h-full xl:min-h-0"
    >
      <div className="flex h-[62px] shrink-0 items-center justify-between gap-4 px-4">
        <h2 className="text-base font-bold leading-[23px]">
          점검 전 신청 비교
        </h2>
        <p className="text-xs leading-[18px]">총 {filtered.length}건</p>
      </div>
      <div className="min-h-0 flex-1 overflow-auto">
        <table className="w-full min-w-[780px] table-fixed border-collapse text-center text-[13px] leading-5">
          <caption className="sr-only">우선점검 신청 비교 목록</caption>
          <colgroup>
            {[59, 100, 88, 116, 190, 88, 139].map((width, i) => (
              <col key={i} style={{ width }} />
            ))}
          </colgroup>
          <thead className="sticky top-0 z-10 bg-white text-xs font-normal leading-[18px]">
            <tr className="h-11">
              {[
                ordering ? "정렬" : "선택",
                "접수번호",
                "취약도",
                "침수 경험",
                "주민 요청 사유",
                "인근 신청",
                "우선점검",
              ].map((c) => (
                <th key={c} scope="col" className="font-normal">
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((a) => (
              <tr
                key={a.id}
                onClick={() => onSelect(a)}
                onDragOver={(e) => {
                  if (ordering && a.designated && !a.assigned)
                    e.preventDefault();
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  onDropOn(a.id);
                }}
                className={`h-[46px] border-b border-[#c8d0d7] last:border-b-0 ${a.id === selectedId ? "bg-[#f4f5f6] font-bold" : "bg-white"}`}
              >
                <td className="pl-[15px]">
                  {ordering ? (
                    a.designated && !a.assigned ? (
                      <button
                        type="button"
                        draggable
                        onDragStart={() => onDragStart(a.id)}
                        onDragEnd={onDragEnd}
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpenReorder();
                        }}
                        onKeyDown={(e) => {
                          if (
                            e.key === "ArrowUp" ||
                            e.key === "ArrowDown"
                          ) {
                            e.preventDefault();
                            onMove(a.id, e.key === "ArrowUp" ? -1 : 1);
                          }
                        }}
                        aria-label={`${a.id} 선정 순서 이동`}
                        className="grid h-8 w-8 place-items-center text-lg text-[#234f73]"
                      >
                        ≡
                      </button>
                    ) : null
                  ) : (
                    <input
                      type="checkbox"
                      aria-label={`${a.id} 신청 선택`}
                      checked={selectedId === a.id}
                      onChange={() => onSelect(a)}
                      onClick={(e) => e.stopPropagation()}
                      className="h-[17px] w-[17px] cursor-pointer rounded border-[#234f73] accent-[#234f73]"
                    />
                  )}
                </td>
                <td>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelect(a);
                    }}
                    className="h-10 w-full"
                  >
                    {a.id}
                  </button>
                </td>
                <td>
                  <span
                    className={`inline-flex items-center gap-[5px] rounded-lg border px-[9px] py-1 font-bold ${riskStyle[a.risk]}`}
                  >
                    <img
                      src={riskDots[a.risk]}
                      alt=""
                      width={7}
                      height={7}
                    />
                    {a.risk}
                  </span>
                </td>
                <td>{a.floodExperience}</td>
                <td className="font-normal">{a.reason}</td>
                <td className="font-normal">{a.nearby}건</td>
                <td className="pr-[15px]">
                  <span
                    className={`inline-flex h-7 w-[58px] items-center justify-center rounded-lg border font-bold ${a.designated ? "border-[#a53632] bg-[#faefed] text-[#a53632]" : "border-[#cbd5e1] bg-[#f8fafc] text-[#64748b]"}`}
                  >
                    {a.designated ? "지정" : "미지정"}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!filtered.length && (
          <div className="flex min-h-[430px] flex-col items-center justify-center px-6 text-center">
            <img
              src={searchEmpty ? emptySearch : emptyDocument}
              alt=""
              width={56}
              height={56}
            />
            <h3 className="mt-5 text-base font-bold leading-6">
              {searchEmpty
                ? "선택한 조건에 맞는 신청이 없습니다."
                : "우선점검 대상 신청이 없습니다."}
            </h3>
            <p className="mt-4 text-sm leading-[22px] text-[#7b828a]">
              {searchEmpty
                ? "검색어나 필터 조건을 변경해 다시 검색해 주세요."
                : "접수된 신청이 등록되면 이곳에서 확인할 수 있습니다."}
            </p>
            {searchEmpty && (
              <button
                type="button"
                onClick={onReset}
                className="mt-4 min-h-10 rounded-md border border-[#c8d0d7] px-8 text-sm"
              >
                검색 조건 초기화
              </button>
            )}
          </div>
        )}
      </div>
      {!!filtered.length && (
        <nav
          aria-label="페이지 선택"
          className="flex h-[65px] shrink-0 items-center justify-center gap-2 border-t border-[#c8d0d7]"
        >
          <button
            type="button"
            disabled
            aria-label="이전 페이지"
            className="h-[34px] w-[34px] rounded-md border border-[#cbd5e1]"
          >
            ‹
          </button>
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              disabled={n !== 1}
              aria-current={n === 1 ? "page" : undefined}
              aria-label={`${n}페이지`}
              className={`h-[34px] w-[34px] rounded-md border text-sm ${n === 1 ? "border-[#234f73] bg-[#234f73] font-bold text-white" : "border-[#cbd5e1] bg-white text-[#64748b]"}`}
            >
              {n}
            </button>
          ))}
          <button
            type="button"
            disabled
            aria-label="다음 페이지"
            className="h-[34px] w-[34px] rounded-md border border-[#cbd5e1]"
          >
            ›
          </button>
        </nav>
      )}
    </section>
  );
}
