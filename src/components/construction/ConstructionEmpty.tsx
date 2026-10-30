import documentIcon from "../../assets/construction/empty-document.svg";
import searchIcon from "../../assets/construction/empty-search.svg";
import { constructionSecondary } from "./styles";
export default function ConstructionEmpty({search = false, detail = false, onReset}: {search?: boolean; detail?: boolean; onReset?: () => void}) {
  return <div className="flex min-h-0 flex-1 flex-col items-center justify-center px-4 text-center">
    <img src={search ? searchIcon : documentIcon} alt="" width={56} height={56}/>
    <h3 className="mt-3 text-base font-bold leading-6">{detail ? "선택된 시공 대상이 없습니다" : search ? "선택한 조건에 맞는 시공 대상이 없습니다." : "등록된 시공 대상이 없습니다."}</h3>
    <p className="mt-3 text-sm leading-[21px] text-[#596672]">{detail ? <>목록에서 시공 대상을 선택하면<br/>일정과 진행 상태를 확인할 수 있습니다.</> : search ? "다른 시공 상태를 선택하거나 조건을 초기화해 주세요." : "지원 승인 후 시공 대상으로 등록되면 이곳에 표시됩니다."}</p>
    {search && !detail && <button type="button" onClick={onReset} className={constructionSecondary + " mt-3 w-[170px]"}>조건 초기화</button>}
  </div>;
}
