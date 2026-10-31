import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import InfrastructureSelect from "../../components/infrastructure/InfrastructureSelect";
import InfrastructureMap from "../../components/infrastructure/InfrastructureMap";
import InfrastructureBadge from "../../components/infrastructure/InfrastructureBadge";
import InfrastructureEmpty from "../../components/infrastructure/InfrastructureEmpty";
import InfrastructureDialogs from "../../components/infrastructure/InfrastructureDialogs";
import InfrastructureRegistration from "../../components/infrastructure/InfrastructureRegistration";
import { infrastructureCard, infrastructureFocus, infrastructurePrimary, infrastructureSecondary } from "../../components/infrastructure/styles";
import { infrastructureAssets as assets } from "./assets";
import { emptyFilters, filterInfrastructure } from "./model";
import { infrastructureDialogs, problemTypes, reviewStatuses } from "./types";
import type { InfrastructureDialogKind, InfrastructureFilters, RegistrationDraft } from "./types";
import { useInfrastructureData } from "./useInfrastructureData";
function filtersFrom(params:URLSearchParams):InfrastructureFilters{return{district:params.get("district")||emptyFilters.district,status:params.get("status")||emptyFilters.status,kind:params.get("kind")||emptyFilters.kind,query:params.get("q")||""};}
export default function InfrastructureManagement(){
  const [params]=useSearchParams();const data=useInfrastructureData();
  return <InfrastructureList key={[params.get("district"),params.get("status"),params.get("kind"),params.get("q")].join(":")} data={data}/>;
}
function InfrastructureList({data}:{data:ReturnType<typeof useInfrastructureData>}){
  const [params]=useSearchParams(),navigate=useNavigate();const applied=filtersFrom(params);const [filters,setFilters]=useState(applied),[showMarkers,setShowMarkers]=useState(true);
  const source=params.get("dataset")==="empty"?[]:data.records;
  const filtered=params.get("dataset")==="no-results"?[]:filterInfrastructure(source,applied);
  const pages=Math.max(1,Math.ceil(filtered.length/5)),page=Math.min(pages,Math.max(1,Math.floor(Number(params.get("page")))||1));const visible=filtered.slice((page-1)*5,page*5);
  const selected=filtered.find(a=>a.id===params.get("selected"))||visible[0];const requested=params.get("dialog"),kind=infrastructureDialogs.includes(requested as InfrastructureDialogKind)?requested as InfrastructureDialogKind:null;
  function clean(){const p=new URLSearchParams(params);p.delete("dialog");return p;}
  function go(p:URLSearchParams,replace=false){navigate({pathname:"/infrastructure",search:p.toString()},{replace});}
  function dialog(value:InfrastructureDialogKind|null){data.setError("");const p=clean();if(value)p.set("dialog",value);go(p,true);}
  function search(){const p=clean();["district","status","kind","q","page","selected","dataset"].forEach(k=>p.delete(k));if(filters.district!==emptyFilters.district)p.set("district",filters.district);if(filters.status!==emptyFilters.status)p.set("status",filters.status);if(filters.kind!==emptyFilters.kind)p.set("kind",filters.kind);if(filters.query.trim())p.set("q",filters.query.trim());go(p);}
  function reset(){data.setError("");setFilters({...emptyFilters});go(new URLSearchParams());}
  function select(id:string){const p=clean();p.set("selected",id);const index=filtered.findIndex(a=>a.id===id);if(index>=0)p.set("page",String(Math.floor(index/5)+1));go(p,true);}
  function register(draft:RegistrationDraft){const created=data.register(draft);if(created){const p=new URLSearchParams({selected:created.id,dialog:"registered",page:String(Math.ceil((data.records.length+1)/5))});go(p,true);}}
  const stats=[source.length,source.filter(a=>["검토 대기","검토 중"].includes(a.status)).length,source.filter(a=>["점검 필요","조치 진행"].includes(a.status)).length,source.filter(a=>a.status==="조치 완료").length];
  return <div className={"w-full shrink-0 pt-0.5 text-[#202b36] "+infrastructureFocus+" [&_button:enabled]:cursor-pointer"}>
    <div className="flex h-12 items-center justify-between gap-3"><h1 className="text-[30px] font-bold leading-9">지역·공공 인프라 관리</h1><button onClick={()=>dialog("register")} className={infrastructureSecondary+" h-10 px-4"}>지역 문제 등록</button></div>
    <form onSubmit={e=>{e.preventDefault();search();}} className="mt-4 grid h-[46px] grid-cols-[166px_180px_184px_minmax(160px,1fr)_101px_119px] gap-[10px] max-[1350px]:h-auto max-[1350px]:grid-cols-[repeat(3,minmax(0,1fr))]">
      <InfrastructureSelect label="지역 필터" value={filters.district} options={["지역 전체","원미구","소사구","오정구"]} onChange={v=>setFilters(f=>({...f,district:v}))}/>
      <InfrastructureSelect label="검토 상태 필터" value={filters.status} options={["검토 상태 전체",...reviewStatuses]} onChange={v=>setFilters(f=>({...f,status:v}))}/>
      <InfrastructureSelect label="문제 유형 필터" value={filters.kind} options={["문제 유형 전체",...problemTypes]} onChange={v=>setFilters(f=>({...f,kind:v}))}/>
      <label className="flex h-12 min-w-0 items-center gap-[10px] rounded-md border border-[#c8d0d7] bg-white px-[14px]"><img src={assets.search} alt="" width={18} height={18} className="shrink-0"/><input aria-label="지역 · 문제 내용 검색" placeholder="지역 · 문제 내용 검색" value={filters.query} onChange={e=>setFilters(f=>({...f,query:e.target.value}))} className="min-w-0 flex-1 text-sm leading-[normal] outline-none placeholder:text-[#202b36]"/></label>
      <button type="submit" className={infrastructurePrimary+" h-12 rounded-lg"}>검색</button><button type="button" onClick={reset} className={infrastructureSecondary+" h-12"}>초기화</button>
    </form>
    <div className="mt-4 grid h-[90px] grid-cols-4 gap-4 max-[700px]:h-auto max-[700px]:grid-cols-2">{["등록된 지역 문제","검토 대기·검토 중","조치 진행","조치 완료"].map((label,i)=><div key={label} className={infrastructureCard+" relative h-[88px] min-w-0"}><img src={assets.metricBackground} alt="" width={40} height={40} className="absolute top-[23.25px] left-[15.25px]"/><img src={[assets.metricLocation,assets.metricReview,assets.metricProgress,assets.metricCompleted][i]} alt="" width={24} height={24} className="absolute top-[31.25px] left-[23.25px]"/><p className="absolute top-[17.25px] left-[67.25px] text-xs leading-[18px]">{label}</p><p className="absolute top-[40.25px] left-[67.25px] text-2xl font-bold leading-9">{stats[i]}건</p></div>)}</div>
    {data.error&&<p role="alert" className="mt-3 text-sm text-[#a53632]">{data.error}</p>}
    <div className="mt-4 grid grid-cols-[minmax(0,1fr)_490px] items-start gap-[14px] max-[1101px]:grid-cols-1">
      <InfrastructureMap issues={filtered} selectedId={selected?.id} showMarkers={showMarkers} onSelect={select}/>
      <section aria-labelledby="infra-list-title" className={infrastructureCard+" flex h-[523px] min-w-0 flex-col px-[13.25px] pt-[21.25px] pb-[4px]"}>
        <div className="flex h-[34px] shrink-0 items-center gap-[6px]"><img src={assets.list} alt="" width={32} height={32}/><h2 id="infra-list-title" className="text-[22px] font-bold leading-7 tracking-[-0.132px]">등록된 지역 문제</h2></div><div className="mt-[17px] h-px shrink-0 bg-[#c8d0d7]"/>
        <div className="mt-3 min-h-0 flex-1 overflow-y-auto">
          {visible.length?visible.map(a=><article key={a.id} aria-label={a.code+" "+a.kind} className={"relative grid h-[79px] grid-cols-[minmax(0,1fr)_70px_76px] items-center gap-3 border-b border-[#e6eaee] px-3 last:border-0 "+(a.id===selected?.id?"rounded-lg bg-[#f4f5f6]":"bg-white")}>
            {a.id===selected?.id&&<span aria-hidden="true" className="absolute inset-y-0 left-0 w-1 rounded-sm bg-[#234f73]"/>}<button onClick={()=>select(a.id)} aria-label={a.code+" 목록 선택"} className="min-w-0 text-left"><strong className="block text-base leading-[21px]">{a.number+". "+a.kind}</strong><span className="mt-1 block text-sm leading-[19px]">관련 신청 {a.related.length}건 · {a.history===null?"이력 확인 필요":"침수 이력 "+a.history+"건"}</span></button><InfrastructureBadge status={a.status}/><button aria-label={a.code+" 공공시설 검토 상세"} onClick={()=>navigate({pathname:"/infrastructure/"+a.id+"/review",search:clean().toString()})} className="text-right text-sm leading-[19px]">상세 &gt;</button>
          </article>):<InfrastructureEmpty search={source.length>0} onReset={reset}/>}
        </div>
        <div className="flex h-10 shrink-0 items-center justify-between gap-1 px-[7px]"><label className="flex items-center gap-2 text-[13px] leading-[18px] tracking-[-0.078px]"><input type="checkbox" role="switch" aria-label="마커와 상태를 표시" checked={showMarkers} onChange={e=>setShowMarkers(e.target.checked)} className="peer sr-only"/><span className={"flex h-[19px] w-[34px] items-center rounded-lg p-0.5 peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-[#234f73] "+(showMarkers?"justify-end bg-[#234f73]":"justify-start bg-[#c8d0d7]")}><span className="size-[15px] rounded-lg bg-white"/></span>마커와 상태를 표시</label>{pages>1&&<nav aria-label="지역 문제 목록 페이지" className="flex items-center gap-2 text-xs"><button disabled={page===1} aria-label="지역 문제 이전 페이지" onClick={()=>{const p=clean();p.set("page",String(page-1));p.delete("selected");go(p);}} className="px-1 disabled:opacity-40">‹</button><span>{page} / {pages}</span><button disabled={page===pages} aria-label="지역 문제 다음 페이지" onClick={()=>{const p=clean();p.set("page",String(page+1));p.delete("selected");go(p);}} className="px-1 disabled:opacity-40">›</button></nav>}</div>
      </section>
    </div>
    {kind&&["register","address","address-results"].includes(kind)&&<InfrastructureRegistration kind={kind} error={data.error} onDialog={dialog} onClose={()=>dialog(null)} onRegister={register}/>}
    {kind&&selected&&!["register","address","address-results"].includes(kind)&&<InfrastructureDialogs key={kind} kind={kind} issue={selected} onClose={()=>dialog(null)} onConfirm={()=>dialog("summary")}/>}
  </div>;
}
