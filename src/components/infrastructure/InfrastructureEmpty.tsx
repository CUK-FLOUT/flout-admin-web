import { infrastructureAssets as assets } from "../../pages/Infrastructure/assets";
import { infrastructureSecondary } from "./styles";

export default function InfrastructureEmpty({
  search,
  onReset,
}: {
  search: boolean;
  onReset: () => void;
}) {
  return (
    <div
      role="status"
      className={
        "flex min-h-[389px] flex-col items-center justify-center px-2 text-center " +
        (search ? "gap-[14px]" : "gap-3")
      }
    >
      <img
        src={search ? assets.noResults : assets.empty}
        alt=""
        width={56}
        height={56}
      />
      <h3 className="text-lg font-bold leading-7 tracking-[-0.108px]">
        {search
          ? "선택한 조건에 맞는 지역 문제가 없습니다"
          : "등록된 지역 문제가 없습니다"}
      </h3>
      <p className="text-sm leading-[18px] tracking-[-0.084px] opacity-65">
        {search
          ? "검색어나 필터 조건을 변경해 다시 검색해 주세요."
          : "지역·공공 문제가 등록되면 이곳에 표시됩니다."}
      </p>
      {search && (
        <button
          onClick={onReset}
          className={infrastructureSecondary + " h-10 w-[170px] font-medium"}
        >
          검색 조건 초기화
        </button>
      )}
    </div>
  );
}
