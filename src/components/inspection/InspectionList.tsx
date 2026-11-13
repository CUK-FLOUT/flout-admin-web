import Pagination from "../common/Pagination";
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
  total: number;
  page: number;
  totalPages: number;
  loading: boolean;
  onPage: (page: number) => void;
  selectedId?: string;
  searchEmpty: boolean;
  onSelect: (id: string) => void;
  onDeselect: () => void;
  onReset: () => void;
};

export default function InspectionList({
  filtered,
  total,
  page,
  totalPages,
  loading,
  onPage,
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
          총 {total}건
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
              <col key={index} style={{ width: `${(width / 758.5) * 100}%` }} />
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
                  {index === 0 ? <span className="sr-only">{text}</span> : text}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((a) => (
              <tr
                key={a.inspectionId}
                className={
                  String(a.inspectionId) === selectedId
                    ? "bg-[#f4f5f6]"
                    : "bg-white hover:bg-[#eef3f7]"
                }
              >
                <td>
                  <input
                    type="checkbox"
                    aria-label={`${a.id} 신청 선택`}
                    checked={String(a.inspectionId) === selectedId}
                    onChange={() => {
                      if (String(a.inspectionId) === selectedId) onDeselect();
                      else onSelect(String(a.inspectionId));
                    }}
                    className={`${inspectionCheckbox} mx-auto`}
                  />
                </td>
                <td>
                  <button
                    type="button"
                    onClick={() => onSelect(String(a.inspectionId))}
                    className={`flex h-[41px] w-full items-center justify-center ${String(a.inspectionId) === selectedId ? "font-bold" : "font-normal"}`}
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
        {!loading && !filtered.length && (
          <InspectionEmptyContent search={searchEmpty} onReset={onReset} />
        )}
      </div>
      {total > 0 && (
        <Pagination
          page={page + 1}
          totalPages={totalPages}
          disabled={loading}
          onPageChange={(next) => onPage(next - 1)}
          className="h-[61.5px]"
        />
      )}
    </section>
  );
}
