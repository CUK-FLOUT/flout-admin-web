import { useEffect, useState } from "react";
import { resultsStorageKey } from "../InspectionResults/storage";
import { checkRevision, createInfrastructureIssue, infrastructureStorageKey, readInfrastructureIssues, writeInfrastructureIssues } from "./model";
import type { InfrastructureIssue, RegistrationDraft } from "./types";
export function useInfrastructureData() {
  const [records,setRecords]=useState(readInfrastructureIssues),[error,setError]=useState("");
  useEffect(()=>{const sync=(e:StorageEvent)=>{if(e.key===null||[infrastructureStorageKey,resultsStorageKey].includes(e.key))setRecords(readInfrastructureIssues());};window.addEventListener("storage",sync);return()=>window.removeEventListener("storage",sync);},[]);
  function commit(id:string,revision:number,update:(a:InfrastructureIssue)=>InfrastructureIssue){try{const latest=readInfrastructureIssues(),original=latest.find(a=>a.id===id);if(!original)throw new Error("지역 문제를 찾을 수 없습니다.");checkRevision(original,revision);const updated=update(original),next=latest.map(a=>a.id===id?updated:a);writeInfrastructureIssues(next);setRecords(next);setError("");return updated;}catch(e){setError(e instanceof Error?e.message:"저장하지 못했습니다.");return null;}}
  function register(draft:RegistrationDraft){try{const latest=readInfrastructureIssues(),created=createInfrastructureIssue(latest,draft),next=[...latest,created];writeInfrastructureIssues(next);setRecords(next);setError("");return created;}catch(e){setError(e instanceof Error?e.message:"등록하지 못했습니다.");return null;}}
  return {records,error,setError,commit,register};
}
