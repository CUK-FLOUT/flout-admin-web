import type { FormEventHandler } from "react";

import { assignees, formatDate } from "../../pages/Inspection/mockData";
import type { InspectionApplication } from "../../pages/Inspection/mockData";

const control =
  "h-[46px] shrink-0 rounded-md border border-[#c8d0d7] bg-white px-3 text-[13px] font-medium leading-[19px]";

type Props = {
  filterKey: string;
  params: URLSearchParams;
  applications: InspectionApplication[];
  onSearch: FormEventHandler<HTMLFormElement>;
  onReset: () => void;
};

export default function InspectionFilters({
  filterKey,
  params,
  applications,
  onSearch,
  onReset,
}: Props) {
  return (
    <form
      key={filterKey}
      onSubmit={onSearch}
      className="flex h-[46px] shrink-0 items-center gap-[10px] max-[1400px]:h-auto max-[1400px]:flex-wrap max-[1400px]:[&>*]:grow"
      aria-label="현장점검 검색 조건"
    >
      <select
        name="district"
        aria-label="지역"
        defaultValue={params.get("district") || ""}
        className={`${control} w-[176px]`}
      >
        <option value="">지역 전체</option>
        {["중동", "상동", "원미동"].map((value) => (
          <option key={value}>{value}</option>
        ))}
      </select>
      <select
        name="assignee"
        aria-label="담당자 필터"
        defaultValue={params.get("assignee") || ""}
        className={`${control} w-[166px]`}
      >
        <option value="">전체 담당자</option>
        {["미배정", ...assignees].map((value) => (
          <option key={value}>{value}</option>
        ))}
      </select>
      <select
        name="visit"
        aria-label="방문일 필터"
        defaultValue={params.get("visit") || ""}
        className={`${control} w-[192px]`}
      >
        <option value="">방문일 전체</option>
        <option value="미입력">희망일 미입력</option>
        {[
          ...new Set(
            applications.map((a) => a.requestedDate).filter(Boolean),
          ),
        ]
          .sort()
          .map((value) => (
            <option key={value} value={value}>
              {formatDate(value)}
            </option>
          ))}
      </select>
      <label
        className={`${control} flex min-w-[160px] flex-1 items-center gap-2 text-sm font-normal`}
      >
        <span
          aria-hidden="true"
          className="w-5 shrink-0 text-center text-lg font-bold leading-7"
        >
          ⌕
        </span>
        <input
          name="q"
          aria-label="주소·접수번호 검색"
          defaultValue={params.get("q") || ""}
          placeholder="주소·접수번호 검색"
          className="min-w-0 flex-1 bg-transparent outline-none placeholder:text-[#202b36]"
        />
      </label>
      <button
        type="submit"
        className="h-[46px] w-[101px] shrink-0 rounded-[7px] bg-[#234f73] text-sm font-bold text-white"
      >
        검색
      </button>
      <button
        type="button"
        onClick={onReset}
        className={`${control} w-[118px] text-sm font-bold`}
      >
        초기화
      </button>
    </form>
  );
}
