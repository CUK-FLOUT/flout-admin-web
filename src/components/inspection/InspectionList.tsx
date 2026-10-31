import type { InspectionApplication } from "../../pages/Inspection/mockData";
import { formatDate } from "../../pages/Inspection/mockData";
import { inspectionCheckbox, inspectionPanel } from "./styles";
import InspectionEmptyContent from "./InspectionEmptyContent";

const badgeStyles = {
  대기: "border-[#cbd5e1] bg-[#f8fafc] text-[#64748b]",
  예정: "border-[#865a16] bg-[#faf4e8] text-[#865a16]",
  진행: "border-[#27654d] bg-[#edf5f0] text-[#27654d]",
  완료: "border-[#4a7799] bg-[#eaf4fb] text-[#234f73]",
};

type Props = {
  filtered: InspectionApplication[];
  selectedId?: string;
  searchEmpty: boolean;
  onSelect: (id: string) => void;
  onDeselect: () => void;
  onReset: () => void;
};

export default function InspectionList({
  filtered,
  selectedId,
  searchEmpty,
  onSelect,
  onDeselect,
  onReset,
}: Props) {
  return (
    <section
      id="inspection-list"
      aria-label="점검 신청 목록"
      className={`${inspectionPanel} flex min-w-0 flex-col overflow-hidden rounded-lg border-[.75px] border-[#c8d0d7] bg-white`}
    >
      <div className="flex h-[58px] shrink-0 items-center justify-between px-4">
        <h2 className="text-lg font-bold leading-7">점검 신청 목록</h2>
        <span className="text-[13px] leading-[22px]" aria-live="polite">
          총 {filtered.length}건
        </span>
      </div>
      <div
        className="flex min-h-0 flex-1 flex-col overflow-auto"
        tabIndex={0}
        aria-label="점검 신청 목록 스크롤"
      >
        <table
          className="w-full table-fixed border-collapse max-[1400px]:min-w-[758px] [&_th]:h-[42px] [&_th]:text-center [&_th]:text-[12px] [&_th]:font-normal [&_th]:leading-[17px] [&_td]:h-[42px] [&_td]:border-b [&_td]:border-[#c8d0d7] [&_td]:p-0 [&_td]:text-center [&_td]:text-[13px] [&_td]:leading-[19px] [&_:is(td,th):first-child]:pl-3 [&_:is(td,th):last-child]:pr-3"
          aria-label="현장점검 신청"
        >
          <colgroup>
            {[56, 194, 110, 160, 100, 138.5].map((width, index) => (
              <col
                key={index}
                style={{ width: `${(width / 758.5) * 100}%` }}
              />
            ))}
          </colgroup>
          <thead className="sticky top-0 z-10 bg-white">
            <tr>
              {[
                "선택",
                "접수번호 · 주소",
                "우선점검",
                "방문 희망일·시간대",
                "담당자",
                "상태",
              ].map((text, index) => (
                <th scope="col" key={text}>
                  {index === 0 ? (
                    <span className="sr-only">{text}</span>
                  ) : (
                    text
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((a) => (
              <tr
                key={a.id}
                className={
                  a.id === selectedId
                    ? "bg-[#f4f5f6]"
                    : "bg-white hover:bg-[#eef3f7]"
                }
              >
                <td>
                  <input
                    type="checkbox"
                    aria-label={`${a.id} 신청 선택`}
                    checked={a.id === selectedId}
                    onChange={() => {
                      if (a.id === selectedId) onDeselect();
                      else onSelect(a.id);
                    }}
                    className={`${inspectionCheckbox} mx-auto`}
                  />
                </td>
                <td>
                  <button
                    type="button"
                    onClick={() => onSelect(a.id)}
                    className={`flex h-[41px] w-full items-center justify-center ${a.id === selectedId ? "font-bold" : "font-normal"}`}
                  >
                    {a.id} · {a.address}
                  </button>
                </td>
                <td>
                  <span
                    className={`inline-flex h-7 w-[58px] items-center justify-center rounded-lg border text-xs font-bold leading-[17px] ${a.priority ? "border-[#a53632] bg-[#faefed] text-[#a53632]" : "border-[#cbd5e1] bg-[#f8fafc] text-[#64748b]"}`}
                  >
                    {a.priority ? "지정" : "미지정"}
                  </span>
                </td>
                <td>
                  <div className="text-xs leading-[17px]">
                    {a.requestedDate
                      ? formatDate(a.requestedDate)
                      : "희망일 미입력"}
                    <br />
                    {a.requestedTime}
                  </div>
                </td>
                <td>{a.assignee}</td>
                <td>
                  <span
                    className={`inline-flex h-7 w-[58px] items-center justify-center rounded-lg border text-xs font-bold leading-[17px] ${badgeStyles[a.status]}`}
                  >
                    {a.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!filtered.length && (
          <InspectionEmptyContent search={searchEmpty} onReset={onReset} />
        )}
      </div>
      {!!filtered.length && (
        <nav
          aria-label="목록 페이지"
          className="flex h-[61.5px] shrink-0 items-center justify-center gap-2"
        >
          <button
            type="button"
            disabled
            aria-label="이전 페이지"
            className="size-[34px] rounded-md border border-[#c8d0d7] text-xs disabled:text-[#64748b]"
          >
            ‹
          </button>
          <button
            type="button"
            aria-current="page"
            className="size-[34px] rounded-md bg-[#234f73] text-xs font-bold text-white"
          >
            1
          </button>
          <button
            type="button"
            disabled
            aria-label="다음 페이지"
            className="size-[34px] rounded-md border border-[#c8d0d7] text-xs disabled:text-[#64748b]"
          >
            ›
          </button>
        </nav>
      )}
    </section>
  );
}
