import type { FormEventHandler } from "react";

import searchIcon from "../../assets/priority/search.svg";

const control =
  "h-[46px] rounded-md border border-[#c8d0d7] bg-white px-3 text-[15px] leading-[21px] tracking-[-.09px] focus:outline-2 focus:outline-offset-2 focus:outline-[#234f73]";

type Props = {
  filterKey: string;
  params: URLSearchParams;
  onSearch: FormEventHandler<HTMLFormElement>;
  onReset: () => void;
};

export default function PriorityFilters({
  filterKey,
  params,
  onSearch,
  onReset,
}: Props) {
  return (
    <form
      key={filterKey}
      onSubmit={onSearch}
      aria-label="우선점검 검색 조건"
      className="flex shrink-0 flex-wrap gap-[10px] xl:flex-nowrap"
    >
      <select
        name="district"
        aria-label="지역"
        defaultValue={params.get("district") || ""}
        className={`${control} w-[176px]`}
      >
        <option value="">지역 전체</option>
        {["중동", "상동", "원미동"].map((s) => (
          <option key={s}>{s}</option>
        ))}
      </select>
      <select
        name="risk"
        aria-label="취약도"
        defaultValue={params.get("risk") || ""}
        className={`${control} w-[166px]`}
      >
        <option value="">취약도 전체</option>
        {["높음", "주의", "낮음"].map((s) => (
          <option key={s}>{s}</option>
        ))}
      </select>
      <select
        name="status"
        aria-label="처리 상태"
        defaultValue={params.get("status") || ""}
        className={`${control} w-[192px]`}
      >
        <option value="">처리 상태 전체</option>
        {["접수", "배정 대기", "배정 완료"].map((s) => (
          <option key={s}>{s}</option>
        ))}
      </select>
      <div className="relative min-w-[160px] flex-1">
        <img
          src={searchIcon}
          alt=""
          width={16}
          height={16}
          className="pointer-events-none absolute left-3 top-[15px]"
        />
        <input
          name="q"
          aria-label="주소 또는 접수번호"
          defaultValue={params.get("q") || ""}
          placeholder="주소·접수번호 검색"
          className={`${control} w-full border-[#234f73] pl-9 text-sm`}
        />
      </div>
      <button
        type="submit"
        className="h-[46px] w-[101px] rounded-md bg-[#234f73] text-[15px] font-medium text-white hover:bg-[#183b58]"
      >
        검색
      </button>
      <button
        type="button"
        onClick={onReset}
        className={`${control} w-[118px]`}
      >
        초기화
      </button>
    </form>
  );
}
