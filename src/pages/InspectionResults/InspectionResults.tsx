import { useState } from "react";
import type { ChangeEvent } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { readInspections, inspectionStorageKey } from "../Inspection/mockData";
import type { InspectionApplication } from "../Inspection/mockData";
import { categories, resultsDialogKinds } from "./types";
import type { Category, RegionIssue, ResultContent, ResultRecord, ResultPhoto, ResultsDialogKind } from "./types";
import { readResultsState, resultsStorageKey, validatePublication, writeResultsState } from "./storage";
import { persistPhotoReferences } from "./photos";
import { createInitialRecord } from "./fixtures";
import ResultFeedback, { GrowingTextarea, ResidentPreview } from "../../components/inspection-results/ResultFeedback";
import ResultPhotos from "../../components/inspection-results/ResultPhotos";
import ResultsDialogs from "../../components/inspection-results/ResultsDialogs";
import { DocumentIcon, MemoIcon } from "../../components/inspection-results/ResultIcons";
import { resultInput, resultPrimary, resultSecondary } from "../../components/inspection-results/styles";
import { inspectionCheckbox, inspectionFocus } from "../../components/inspection/styles";
import check from "../../assets/inspection-results/check.svg";
import routeIcon from "../../assets/inspection-results/route.svg";
import emptyDocument from "../../assets/priority/empty-document.svg";
export default function InspectionResults(){
  const {requestId}=useParams();
  const application=readInspections().find(a=>a.id===requestId);
  if(!application)return <section className="flex min-h-[400px] flex-col items-center justify-center gap-4 text-center"><img src={emptyDocument} alt="" width={56} height={56}/><h1 className="text-xl font-bold">신청 정보를 찾을 수 없습니다.</h1><Link to="/inspection" className={resultSecondary}>현장점검 목록으로</Link></section>;
  return <ResultEditor key={application.id} application={application}/>;
}
function ResultEditor({application:a}:{application:InspectionApplication}){
  const [params,setParams]=useSearchParams();
  const [record,setRecord]=useState<ResultRecord>(()=>readResultsState().records[a.id]||createInitialRecord(a.resultPublished));
  const [draft,setDraft]=useState(()=>structuredClone(record.draft));
  const [error,setError]=useState("");
  const [busy,setBusy]=useState(false);
  const editingPublished=!!record.published&&params.get("mode")==="edit";
  const readOnly=!!record.published&&!editingPublished;
  const content=readOnly?record.published!:draft;
  const expanded=content.selected.length>1;
  const dialog=resultsDialogKinds.includes(params.get("dialog") as ResultsDialogKind)?params.get("dialog") as ResultsDialogKind:null;
  function setDialog(kind:ResultsDialogKind|null){
    const next=new URLSearchParams(params);
    if(kind)next.set("dialog",kind);else{
      const old=next.get("dialog");next.delete("dialog");next.delete("addressQuery");
      if(old==="published"||old==="republished")next.delete("mode");
    }
    setParams(next);
  }
  function update<K extends keyof ResultContent>(key:K,value:ResultContent[K]){setDraft(current=>({...current,[key]:value}));setError("");}
  function toggleCategory(category:Category){
    const selected=content.selected.includes(category)?content.selected.filter(c=>c!==category):categories.filter(c=>c===category||content.selected.includes(c));
    update("selected",selected);
  }
  async function persist(publish:boolean){
    if(busy)return;
    if(publish){const problem=validatePublication(draft);if(problem){setError(problem);return;}}
    setBusy(true);
    try{
      const savedDraft=await persistPhotoReferences(draft);
      const state=readResultsState();
      const next:ResultRecord={draft:savedDraft,published:publish?structuredClone(savedDraft):record.published,savedAt:new Date().toISOString()};
      const previousResults=localStorage.getItem(resultsStorageKey);
      writeResultsState({...state,records:{...state.records,[a.id]:next}});
      if(publish){
        const inspections=readInspections().map(item=>item.id===a.id?{...item,status:"완료",resultPublished:true}:item);
        try{localStorage.setItem(inspectionStorageKey,JSON.stringify(inspections));}
        catch(error){if(previousResults===null)localStorage.removeItem(resultsStorageKey);else localStorage.setItem(resultsStorageKey,previousResults);throw error;}
      }
      setRecord(next);setDraft(structuredClone(savedDraft));setError("");setDialog(publish?(record.published?"republished":"published"):"draft-saved");
    }catch{setError("저장하지 못했습니다. 사진 용량이나 브라우저 저장 공간을 확인해 주세요. 입력 내용은 이 화면에 유지됩니다.");}finally{setBusy(false);}
  }
  function registerRegion(issue:Omit<RegionIssue,"id"|"applicationId"|"source"|"status">){
    try{
      const state=readResultsState();
      const item:RegionIssue={...issue,id:`지역-${String(state.issues.length+1).padStart(3,"0")}`,applicationId:a.id,source:"전문가 현장점검",status:"검토 대기"};
      writeResultsState({...state,issues:[...state.issues,item]});setError("");setDialog("region-saved");return true;
    }catch{return false;}
  }
  async function upload(event:ChangeEvent<HTMLInputElement>,category:Category|null=null){
    const files=Array.from(event.target.files||[]);event.target.value="";
    if(!files.length)return;
    if(files.some(file=>!["image/jpeg","image/png"].includes(file.type)||file.size>10*1024*1024)){
      setError("JPG 또는 PNG 파일만 첨부할 수 있습니다. 파일당 최대 용량은 10MB입니다.");return;
    }
    setBusy(true);setError("");
    try{
      const photos=await Promise.all(files.map(file=>new Promise<ResultPhoto>((resolve,reject)=>{
        const reader=new FileReader();reader.onerror=()=>reject(new Error("read"));reader.onload=()=>{
          const src=String(reader.result);const image=new Image();image.onerror=()=>reject(new Error("image"));image.onload=()=>resolve({id:crypto.randomUUID(),name:file.name,src,category});image.src=src;
        };reader.readAsDataURL(file);
      })));
      setDraft(current=>({...current,photos:[...current.photos.filter(p=>category===null||p.category!==category),...photos]}));
    }catch{setError("사진을 불러오지 못했습니다. 올바른 이미지 파일인지 확인해 주세요.");}finally{setBusy(false);}
  }
  return <div className={`w-full shrink-0 pb-[10px] font-[family-name:Inter,Pretendard,sans-serif] text-[#0f172a] ${expanded?"pt-[2px]":"pt-px"} ${inspectionFocus} [&_button:enabled]:cursor-pointer`}>
    <div className="flex h-10 items-center justify-between gap-4"><h1 className="text-[30px] font-bold leading-[38px] max-sm:text-2xl">{readOnly?"점검 결과 조회":editingPublished?"공개된 결과 조회·수정":"점검 결과 등록·공개"}</h1>
      {readOnly&&<Link to={`?${new URLSearchParams({mode:"edit"})}`} className="shrink-0 text-sm font-bold text-[#234f73] underline underline-offset-4">공개 결과 수정</Link>}
    </div>
    <div className={`mt-4 flex items-center text-sm leading-5 text-[#64748b] ${expanded?"h-5":"min-h-7"}`}>{a.id} · {a.resident} · {a.address} · {a.assignee}</div>
    {error&&<p role="alert" className="my-3 text-sm leading-[21px] text-[#a53632]">{error}</p>}
    <div className="mt-4 grid grid-cols-[minmax(0,1fr)_406px] items-start gap-4 max-[1101px]:grid-cols-1">
      <section aria-labelledby="result-editor-title" className={`flex min-w-0 flex-col gap-3 rounded-xl border border-[#cbd5e1] bg-white p-[15px] ${expanded?"min-h-[1581px]":"min-h-[816px]"}`}>
        <h2 id="result-editor-title" className="flex h-6 items-center gap-2 text-lg font-semibold leading-6 text-[#1e2835]"><DocumentIcon/>전문가 점검 결과 입력</h2>
        <fieldset disabled={busy} className="flex w-[calc(100%_-_8px)] min-w-0 flex-col gap-3">
          <p className="text-sm font-bold leading-[21px]">{expanded?"확인된 취약지점 · 해당 유형 모두 선택 (복수 선택 · 1곳 이상)":"확인된 취약지점 (복수 선택)"}</p>
          <div role="group" aria-label="확인된 취약지점" className="grid grid-cols-4 gap-2 max-sm:grid-cols-2">{categories.map(category=><button type="button" key={category} aria-disabled={readOnly} tabIndex={readOnly?-1:0} aria-pressed={content.selected.includes(category)} onClick={()=>{if(!readOnly)toggleCategory(category);}} className={`${content.selected.includes(category)?resultPrimary:resultSecondary} min-w-0 px-2`}>{category}</button>)}</div>
          <p className="text-sm font-bold leading-[21px]">결과 요약 · 전문가 의견</p>
          <GrowingTextarea label="결과 요약 · 전문가 의견" value={content.summary} onChange={value=>update("summary",value)} readOnly={readOnly}/>
          {content.selected.map((category,index)=><ResultFeedback key={category} category={category} index={index} feedback={content.details[category]} readOnly={readOnly} editingPublished={editingPublished}
            onChange={feedback=>update("details",{...draft.details,[category]:feedback})} onPhoto={(event,type)=>{void upload(event,type);}}/>)}
          {!content.selected.length&&<p role="status" className="text-sm text-[#64748b]">취약지점을 1개 이상 선택해 주세요.</p>}
          <section aria-label="권장 예방조치" className="flex flex-col gap-2">
            <div className="flex min-h-10 items-center justify-between gap-2"><h3 className="flex items-center gap-2 text-sm font-bold leading-[21px]"><img src={check} alt="" width={18} height={18}/>권장 예방조치</h3>{!readOnly&&<button type="button" onClick={()=>setDialog("actions")} className={`${resultSecondary} w-[144px]`}>+ 조치 추가</button>}</div>
            <ol className="flex flex-col gap-2">{content.actions.map((action,index)=><li key={index} className="flex min-h-10 items-center gap-1 rounded-md border border-[#cbd5e1] px-[15px] py-2 text-sm leading-[21px]"><span className="shrink-0">{index+1}.</span><span>{action}</span></li>)}</ol>
          </section>
          <h3 className="flex items-center gap-2 text-sm font-bold leading-[21px]"><img src={routeIcon} alt="" width={18} height={18}/>문제 유형 · 후속 처리 경로</h3>
          <div role="group" aria-label="후속 처리 경로" className="flex flex-wrap gap-3">{(["개별 주택","지역·공공"] as const).map(value=><button type="button" key={value} aria-pressed={content.route===value} aria-disabled={readOnly} tabIndex={readOnly?-1:0} onClick={()=>{if(!readOnly)update("route",value);}} className={`${content.route===value?resultPrimary:resultSecondary} w-[176px] max-sm:flex-1`}>{value}</button>)}{content.route==="지역·공공"&&!readOnly&&<button type="button" onClick={()=>setDialog("region")} className={`${resultPrimary} w-[176px]`}>지역 문제 등록</button>}</div>
          <label className="flex min-h-10 items-center gap-2 max-sm:flex-col max-sm:items-start"><span className="flex w-[168px] shrink-0 items-center gap-2 text-sm font-bold leading-[21px]"><MemoIcon/>내부 메모 · 주민 비공개</span><input aria-label="내부 메모 · 주민 비공개" value={content.memo} onChange={e=>update("memo",e.target.value)} readOnly={readOnly} className={`${resultInput} h-10 flex-1 px-[15px] py-0`}/></label>
          {editingPublished&&<><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={draft.notify} onChange={e=>update("notify",e.target.checked)} className={inspectionCheckbox}/>결과 공개 시 주민에게 알림</label><div className="flex gap-3"><button type="button" disabled={busy} onClick={()=>persist(false)} className={`${resultSecondary} w-[144px]`}>임시 저장</button><button type="button" disabled={busy} onClick={()=>persist(true)} className={`${resultPrimary} w-[228px]`}>수정 결과 재공개</button></div></>}
        </fieldset>
      </section>
      {editingPublished?<ResidentPreview content={draft}/>:<ResultPhotos content={content} readOnly={readOnly} busy={busy} onUpload={event=>{void upload(event);}} onRemove={id=>update("photos",draft.photos.filter(p=>p.id!==id))} onSave={()=>persist(false)} onPublish={()=>persist(true)}/>}
    </div>
    {dialog&&<ResultsDialogs kind={dialog} application={a} content={draft} setDialog={setDialog} onActions={actions=>{update("actions",actions);setDialog(null);}} onRegion={registerRegion}
      addressQuery={params.get("addressQuery")||""} onSearchAddress={query=>{const next=new URLSearchParams(params);next.set("dialog","address-results");next.set("addressQuery",query);setParams(next);}}/>}
  </div>;
}
