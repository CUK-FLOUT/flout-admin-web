import { useRef } from "react";
import type { ConstructionPhoto } from "../../pages/Construction/types";
import ConstructionImage from "./ConstructionImage";
import uploadIcon from "../../assets/construction/upload.svg";
import removeIcon from "../../assets/construction/photo-remove.svg";
export default function ConstructionPhotos({photos, disabled, busy, onUpload, onRemove}: {
  photos: ConstructionPhoto[]; disabled: boolean; busy: boolean; onUpload: (files: File[]) => void; onRemove: (id: string) => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  return <div className="grid grid-cols-[minmax(0,1fr)_150px] items-start gap-[10px]">
    <div className="flex h-[100px] min-w-0 snap-x gap-[10px] overflow-x-auto">
      {photos.length ? photos.map(photo => <div key={photo.id} className="w-full min-w-full snap-start">
        <div className="relative h-[76px] overflow-hidden rounded-lg border border-[#c8d0d7]">
          <ConstructionImage source={photo.src} alt={"완료사진 " + photo.name} className="h-full w-full object-cover"/>
          {!disabled && <button type="button" disabled={busy} aria-label={photo.name + " 삭제"} onClick={() => onRemove(photo.id)} className="absolute top-[7px] right-[7px] size-6 rounded-full disabled:opacity-40"><img src={removeIcon} alt="" width={24} height={24}/></button>}
        </div>
        <p title={photo.name} className="mt-[6px] truncate text-sm leading-[18px]">{photo.name}</p>
      </div>) : <p className="grid h-[76px] w-full place-items-center rounded-lg border border-[#c8d0d7] bg-[#f4f5f6] text-xs text-[#596672]">등록된 사진 없음</p>}
    </div>
    <button type="button" aria-label="완료 사진 첨부" disabled={disabled || busy} onClick={() => input.current?.click()} className="flex h-[100px] flex-col items-center rounded-lg border border-dashed border-[#c8d0d7] bg-[#f4f5f6] disabled:cursor-default disabled:opacity-60">
      <span className="mt-[7px] grid size-10 place-items-center"><img src={uploadIcon} alt="" width={22} height={22}/></span>
      <span className="mt-[7px] text-[13px] font-semibold leading-[18px]">{busy ? "사진 저장 중…" : "사진 첨부"}</span>
      <span className="mt-1 text-[10px] leading-[15px]">JPG · PNG / 현장 사진</span>
    </button>
    <input ref={input} aria-label="완료 사진 파일" type="file" accept="image/jpeg,image/png" multiple disabled={disabled || busy} className="sr-only" onChange={e => {onUpload(Array.from(e.target.files || [])); e.target.value = "";}}/>
  </div>;
}
