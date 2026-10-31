import emptyDocument from "../../assets/support/empty-document.svg";
import emptySearch from "../../assets/support/empty-search.svg";
import { supportSecondary } from "./styles";

export default function SupportEmpty({
  search = false,
  panel = false,
  onReset,
}: {
  search?: boolean;
  panel?: boolean;
  onReset?: () => void;
}) {
  return (
    <div className="flex min-h-[260px] flex-1 flex-col items-center justify-center gap-[14px] px-3 text-center font-[family-name:Inter,Pretendard,sans-serif]">
      <img
        src={search && !panel ? emptySearch : emptyDocument}
        alt=""
        width={56}
        height={56}
      />
      <h3
        className={
          (panel ? "text-[15px]" : "text-base") + " font-bold leading-6"
        }
      >
        {panel
          ? "선택된 신청이 없습니다"
          : search
            ? "선택한 조건에 맞는 지원 신청이 없습니다."
            : "등록된 지원 신청이 없습니다."}
      </h3>
      <p
        className={
          (panel ? "text-[13px]" : "text-sm") + " leading-[21px] opacity-65"
        }
      >
        {panel ? (
          <>
            목록에서 지원 신청을 선택하면
            <br />
            상세 정보와 제출 자료를 확인할 수 있습니다.
          </>
        ) : search ? (
          "검색어나 필터 조건을 변경해 다시 검색해 주세요."
        ) : (
          "주민이 지원 신청서를 제출하면 이곳에 표시됩니다."
        )}
      </p>
      {search && !panel && (
        <button
          onClick={onReset}
          className={supportSecondary + " w-[170px] text-[13px]"}
        >
          검색 조건 초기화
        </button>
      )}
    </div>
  );
}
