import { useState } from "react";
import type { FormEvent } from "react";
import type { Filters } from "../../pages/GIS/types";
import { emptyFilters } from "../../pages/GIS/mockData";
import searchIcon from "../../assets/gis/imgSearch1.svg";
import GisFilterSelect from "./GisFilterSelect";

const control =
  "h-[46px] rounded-md border border-[#c8d0d7] bg-white px-3 text-[15px] focus:outline-2 focus:outline-offset-2 focus:outline-[#234f73]";

type Props = {
  filterKey: string;
  initialFilters: Filters;
  onSearch: (filters: Filters) => void;
  onReset: () => void;
};

export default function GisFilters({
  filterKey,
  initialFilters,
  onSearch,
  onReset,
}: Props) {
  const [filterDraft, setFilterDraft] = useState({
    key: filterKey,
    values: initialFilters,
  });
  const draft = filterDraft.values;

  if (filterDraft.key !== filterKey) {
    setFilterDraft({ key: filterKey, values: initialFilters });
  }

  function update(next: Filters) {
    setFilterDraft({ key: filterKey, values: next });
    onSearch(next);
  }

  function search(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSearch(draft);
  }

  function reset() {
    setFilterDraft({ key: filterKey, values: emptyFilters });
    onReset();
  }

  return (
    <form
      onSubmit={search}
      className="mb-[14px] flex shrink-0 flex-wrap gap-2.5"
    >
      <GisFilterSelect
        label="지역"
        placeholder="지역 전체"
        value={draft.district}
        options={["원미구", "소사구", "오정구"]}
        className="w-[176px]"
        onChange={(district) => update({ ...draft, district })}
      />
      <GisFilterSelect
        label="취약도"
        placeholder="취약도 전체"
        value={draft.risk}
        options={["높음", "주의", "낮음"]}
        className="w-[166px]"
        onChange={(risk) => update({ ...draft, risk })}
      />
      <GisFilterSelect
        label="처리 상태"
        placeholder="처리 상태 전체"
        value={draft.status}
        options={["점검", "지원", "시공"]}
        className="w-[192px]"
        onChange={(status) => update({ ...draft, status })}
      />

      <div className="relative min-w-[160px] flex-1">
        <img
          src={searchIcon}
          alt=""
          width={16}
          height={16}
          className="pointer-events-none absolute left-3 top-[15px]"
        />

        <input
          aria-label="주소 또는 접수번호 검색"
          value={draft.search}
          onChange={(e) => update({ ...draft, search: e.target.value })}
          placeholder="주소·접수번호 검색"
          className={`${control} w-full pl-9 text-sm`}
        />
      </div>

      <button
        type="submit"
        className="h-[46px] w-[101px] cursor-pointer rounded-md bg-[#234f73] text-[15px] font-medium text-white"
      >
        검색
      </button>

      <button
        type="button"
        onClick={reset}
        className={`${control} w-[118px] cursor-pointer`}
      >
        초기화
      </button>
    </form>
  );
}
