import { readResultsState } from "../InspectionResults/storage";
import { initialInfrastructureIssues } from "./mockData";
import { reviewStatuses } from "./types";
import type { FacilityDraft, InfrastructureFilters, InfrastructureIssue, InfrastructurePhoto, RegistrationDraft } from "./types";
export const infrastructureStorageKey = "flout-public-infrastructure-v1";
export const emptyFilters: InfrastructureFilters = {district:"지역 전체",status:"검토 상태 전체",kind:"문제 유형 전체",query:""};
function isPhotos(value: unknown): value is InfrastructurePhoto[] {
  return Array.isArray(value) && value.every(p=>p && typeof p.id==="string" && typeof p.name==="string" && typeof p.src==="string" && (p.src==="idb:"+p.id || p.src.startsWith("/assets/") || p.src.startsWith("/src/assets/"))) && new Set(value.map(p=>p.id)).size===value.length;
}
function isIssue(value: unknown): value is InfrastructureIssue {
  if (!value || typeof value!=="object") return false;
  const a=value as InfrastructureIssue;
  return ["id","code","district","location","kind","description","findings","source","target","requirements"].every(k=>typeof a[k as keyof InfrastructureIssue]==="string")
    && reviewStatuses.includes(a.status) && Number.isSafeInteger(a.number) && a.number>0 && Number.isSafeInteger(a.revision) && a.revision>=0
    && (a.history===null || Number.isSafeInteger(a.history)&&a.history>=0) && (a.externalKey===undefined || typeof a.externalKey==="string")
    && Array.isArray(a.related) && a.related.every(r=>r && [r.id,r.address,r.findings].every(s=>typeof s==="string") && ["높음","주의","낮음","미확인"].includes(r.risk))
    && isPhotos(a.referencePhotos) && !!a.action && typeof a.action.result==="string" && typeof a.action.verified==="boolean" && isPhotos(a.action.photos)
    && !!a.marker && Number.isFinite(a.marker.x) && Number.isFinite(a.marker.y);
}
export function readInfrastructureIssues(): InfrastructureIssue[] {
  let records: InfrastructureIssue[];
  try {const raw=localStorage.getItem(infrastructureStorageKey);const parsed: unknown=raw===null?null:JSON.parse(raw);
    records=parsed===null?initialInfrastructureIssues():Array.isArray(parsed)&&parsed.every(isIssue)&&new Set(parsed.map(a=>a.id)).size===parsed.length?parsed:initialInfrastructureIssues();
  } catch {records=initialInfrastructureIssues();}
  // Read the existing 05 flow without writing to its storage or changing its pages.
  for (const issue of readResultsState().issues) {
    try {
      const externalKey=issue.id+":"+issue.applicationId;
      if (records.some(a=>a.externalKey===externalKey)) continue;
      const created=createInfrastructureIssue(records,{location:issue.location,postcode:issue.postcode,kind:issue.kind,description:issue.description,findings:issue.findings});
      created.externalKey=externalKey;created.source=issue.source;
      created.related=[{id:issue.applicationId,address:issue.location,risk:"미확인",findings:issue.findings}];
      records=[...records,created];
    } catch {
      // Skip an invalid imported record without preventing the remaining imports.
      continue;
    }
  }
  return records;
}
export function writeInfrastructureIssues(records: InfrastructureIssue[]) {localStorage.setItem(infrastructureStorageKey,JSON.stringify(records));}
export function filterInfrastructure(records: InfrastructureIssue[], filters: InfrastructureFilters) {
  const query=filters.query.trim().toLocaleLowerCase();
  return records.filter(a=>(filters.district==="지역 전체"||a.district===filters.district)&&(filters.status==="검토 상태 전체"||a.status===filters.status)&&(filters.kind==="문제 유형 전체"||a.kind===filters.kind)&&(!query||[a.code,a.location,a.kind,a.description,a.findings].join(" ").toLocaleLowerCase().includes(query)));
}
export function createInfrastructureIssue(records: InfrastructureIssue[], draft: RegistrationDraft): InfrastructureIssue {
  if (![draft.location,draft.kind,draft.description,draft.findings].every(v=>v.trim())) throw new Error("위치, 문제 유형, 문제 내용, 현장 확인 내용을 입력해 주세요.");
  const number=Math.max(0,...records.map(a=>a.number))+1,code=String(number).padStart(3,"0");
  return {id:"region-"+code,code:"지역-"+code,number,district:["원미구","소사구","오정구"].find(s=>draft.location.includes(s))||"미분류",location:draft.location.trim(),kind:draft.kind,
    description:draft.description.trim(),findings:draft.findings.trim(),source:"운영자 등록",history:null,related:[],referencePhotos:[],status:"검토 대기",target:"",requirements:"",action:{result:"",photos:[],verified:false},marker:{x:430+(number%3)*28,y:210+(number%4)*38},revision:0};
}
export function facilityDraft(a: InfrastructureIssue): FacilityDraft {return {target:a.target,requirements:a.requirements,status:a.status==="검토 대기"?"검토 대기":"검토 중",...structuredClone(a.action)};}
export function checkRevision(a: InfrastructureIssue, expected: number) {if(a.revision!==expected)throw new Error("다른 창에서 정보가 변경되었습니다. 새로고침 후 최신 내용을 확인해 주세요.");}
function editable(a: InfrastructureIssue) {if(a.status==="조치 완료")throw new Error("조치 완료된 지역 문제는 조회만 가능합니다.");}
export function saveFacilityRequirements(a: InfrastructureIssue, draft: FacilityDraft, status = false): InfrastructureIssue {
  editable(a);if(!draft.target.trim()||!draft.requirements.trim())throw new Error("검토 대상과 점검 필요사항을 입력해 주세요.");
  return {...a,target:draft.target.trim(),requirements:draft.requirements.trim(),status:status?draft.status:a.status,revision:a.revision+1};
}
export function actionIssue(draft: FacilityDraft) {
  if(!draft.result.trim())return "실제 점검·조치 결과를 입력해 주세요.";
  if(!draft.photos.length)return "조치 사진을 1개 이상 첨부해 주세요.";
  if(!draft.verified)return "공공시설 조치·결과 확인 완료 항목을 선택해 주세요.";
  return null;
}
export function completeFacility(a: InfrastructureIssue,draft: FacilityDraft): InfrastructureIssue {
  editable(a);const issue=actionIssue(draft);if(issue)throw new Error(issue);
  return {...a,status:"조치 완료",action:{result:draft.result.trim(),photos:structuredClone(draft.photos),verified:true},revision:a.revision+1};
}
