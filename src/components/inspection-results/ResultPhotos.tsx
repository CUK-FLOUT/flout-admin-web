import type { ChangeEvent } from "react";
import type { ResultContent } from "../../pages/InspectionResults/types";
import ResultImage from "./ResultImage";
import camera from "../../assets/inspection-results/camera.svg";
import remove from "../../assets/inspection-results/photo-remove.svg";
import { resultPrimary,resultSecondary } from "./styles";
type Props={content:ResultContent;readOnly:boolean;busy:boolean;onUpload:(event:ChangeEvent<HTMLInputElement>)=>void;onRemove:(id:string)=>void;onSave:()=>void;onPublish:()=>void};
export default function ResultPhotos({content,readOnly,busy,onUpload,onRemove,onSave,onPublish}:Props){
  return <aside aria-label="현장사진 및 공개" className={`flex w-full min-w-0 max-w-[406px] flex-col justify-between rounded-lg border border-[#cbd5e1] bg-white p-[15px] ${readOnly?"min-h-[665px]":content.photos.length>1?"min-h-[775px]":"min-h-[575px]"}`}>
    <div className={`flex flex-col gap-3 ${!readOnly?(content.photos.length>1?"min-h-[703px]":"min-h-[346px]"):""}`}>
      <h2 className="flex h-6 items-center gap-2 text-lg font-semibold leading-6 text-[#1e2835]"><img src={camera} alt="" width={20} height={20}/>현장사진 및 공개</h2>
      {content.photos.map(photo=><figure key={photo.id} className="flex flex-col gap-[7px]">
        <div className="relative h-[140px]"><ResultImage source={photo.src} alt={`현장사진 ${photo.name}`} className="h-full w-full rounded-md object-cover"/>
          {!readOnly&&<button type="button" disabled={busy} aria-label={`${photo.name} 삭제`} onClick={()=>onRemove(photo.id)} className="absolute right-2 top-2 size-6"><img src={remove} alt="" width={24} height={24}/></button>}
        </div><figcaption className="min-h-[19px] break-all text-sm leading-[21px] text-[#1e2835]">{photo.name}</figcaption>
      </figure>)}
      {!readOnly&&<label className="relative flex h-[88px] cursor-pointer flex-col items-center justify-center gap-[5px] rounded-md border border-dashed border-[#cbd5e1] bg-[#f8fafc] px-4 py-3 focus-within:outline-2 focus-within:outline-[#234f73]">
        <span className="text-sm font-semibold text-[#1e2835]">{busy?"사진 불러오는 중…":"＋  사진 추가"}</span><span className="text-xs leading-[18px] text-[#64748b]">JPG, PNG · 파일당 최대 10MB</span>
        <input aria-label="현장사진 추가" type="file" accept="image/jpeg,image/png" multiple disabled={busy} onChange={onUpload} className="absolute inset-0 w-full cursor-pointer opacity-0"/>
      </label>}
    </div>
    <div className="flex gap-2"><button type="button" disabled={readOnly||busy} onClick={onSave} className={`${resultSecondary} w-[calc((100%_-_8px)/2)] min-w-0 px-2`}>{content.selected.length>1?"임시저장":"임시 저장"}</button><button type="button" disabled={readOnly||busy} onClick={onPublish} className={`${resultPrimary} w-[calc((100%_-_8px)/2)] min-w-0 px-2`}>결과 저장 · 주민 공개</button></div>
  </aside>;
}
