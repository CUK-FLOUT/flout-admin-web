import { useEffect,useState } from "react";
import { readPhoto } from "../../pages/InspectionResults/photos";
export default function ResultImage({source,alt,className}:{source:string;alt:string;className:string}){
  const [resolved,setResolved]=useState({source:"",url:"",failed:false});
  useEffect(()=>{
    if(!source.startsWith("idb:"))return;
    let active=true;
    readPhoto(source).then(url=>{if(active)setResolved({source,url,failed:false});}).catch(()=>{if(active)setResolved({source,url:"",failed:true});});
    return ()=>{active=false;};
  },[source]);
  const url=source.startsWith("idb:")?(resolved.source===source?resolved.url:""):source;
  if(!url)return <div role="status" className={`grid place-items-center bg-[#f4f5f6] text-sm text-[#596672] ${className}`}>{resolved.source===source&&resolved.failed?"사진을 불러오지 못했습니다.":"사진 불러오는 중…"}</div>;
  return <img src={url} alt={alt} className={className}/>;
}
