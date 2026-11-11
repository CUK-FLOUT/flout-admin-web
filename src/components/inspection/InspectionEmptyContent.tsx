import emptyDocument from "../../assets/priority/empty-document.svg";
import emptySearch from "../../assets/priority/empty-search.svg";

export default function InspectionEmptyContent({
  search,
  panel,
  onReset,
}: {
  search: boolean;
  panel?: boolean;
  onReset: () => void;
}) {
  return (
    <div className="flex min-h-[240px] flex-1 flex-col items-center justify-center gap-[14px] px-4 text-center font-[family-name:Inter,Pretendard,sans-serif]">
      <img
        src={search ? emptySearch : emptyDocument}
        alt=""
        width={56}
        height={56}
      />
      <p
        className={`${panel ? "text-[15px]" : "text-base"} font-bold leading-6`}
      >
        {panel
          ? "선택된 신청이 없습니다"
          : search
            ? "선택한 조건에 맞는 신청이 없습니다."
            : "현장점검 신청이 없습니다."}
      </p>
      <p
        className={`${panel ? "text-[13px]" : "text-sm"} leading-[21px] opacity-65`}
      >
        {panel ? (
          <>
            목록에서 신청을 선택하면
            <br />
            담당자와 점검 일정을 배정할 수 있습니다.
          </>
        ) : search ? (
          "검색어나 필터 조건을 변경해 다시 검색해 주세요."
        ) : (
          "현장점검 대상 신청이 등록되면 이곳에 표시됩니다."
        )}
      </p>
      {search && !panel && (
        <button
          type="button"
          onClick={onReset}
          className="h-10 w-[170px] rounded-md border border-[#c8d0d7] bg-white px-3 text-[13px] font-bold"
        >
          검색 조건 초기화
        </button>
      )}
    </div>
  );
}
