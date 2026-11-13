import { searchInputText } from "../common/searchStyles";
import FormFilterSelect from "../common/FormFilterSelect";
import type { FormEventHandler } from "react";

import searchIcon from "../../assets/priority/search.svg";

const control =
  "h-[46px] rounded-md border border-[#c8d0d7] bg-white px-3 focus:outline-2 focus:outline-offset-2 focus:outline-[#234f73]";

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
      <FormFilterSelect
        name="district"
        label="지역"
        defaultValue={params.get("district") || ""}
        className="w-[176px]"
        options={[
          { value: "", label: "지역 전체" },
          ...["원미구", "소사구", "오정구"].map((value) => ({
            value,
            label: value,
          })),
        ]}
      />
      <FormFilterSelect
        name="risk"
        label="취약도"
        defaultValue={params.get("risk") || ""}
        className="w-[166px]"
        options={[
          { value: "", label: "취약도 전체" },
          ...["높음", "주의", "낮음"].map((value) => ({ value, label: value })),
        ]}
      />
      <FormFilterSelect
        name="status"
        label="처리 상태"
        defaultValue={params.get("status") || ""}
        className="w-[192px]"
        options={[
          { value: "", label: "처리 상태 전체" },
          ...["지정", "미지정"].map((value) => ({ value, label: value })),
        ]}
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
          name="q"
          maxLength={255}
          aria-label="주소 또는 접수번호"
          defaultValue={params.get("q") || ""}
          placeholder="주소·접수번호 검색"
          className={`${control} w-full border-[#234f73] pl-9 ${searchInputText}`}
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
        onClick={(event) => {
          event.currentTarget.form?.reset();
          onReset();
        }}
        className={`${control} w-[118px] text-[15px] leading-[21px] tracking-[-.09px]`}
      >
        초기화
      </button>
    </form>
  );
}
