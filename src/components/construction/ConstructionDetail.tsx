import type { ConstructionRecord, EditableConstructionStatus, InstallationDraft } from "../../pages/Construction/types";
import ConstructionEmpty from "./ConstructionEmpty";
import ConstructionStatusSelect from "./ConstructionStatusSelect";
import ConstructionPhotos from "./ConstructionPhotos";
import calendar from "../../assets/construction/calendar.svg";
import chevron from "../../assets/construction/chevron.svg";
import { constructionInput, constructionPrimary } from "./styles";
type Props = {
  application?: ConstructionRecord; draft: InstallationDraft | null; target: EditableConstructionStatus | ""; busy: boolean;
  onChange: (draft: InstallationDraft) => void; onTarget: (target: EditableConstructionStatus) => void;
  onStatus: () => void; onSchedule: () => void; onUpload: (files: File[]) => void; onFinish: () => void;
};
export default function ConstructionDetail({application: a, draft, target, busy, onChange, onTarget, onStatus, onSchedule, onUpload, onFinish}: Props) {
  const readOnly = a?.status === "전체 완료";
  return <aside aria-label="시공 상세" className="flex min-h-[656px] min-w-0 flex-col rounded-lg border-[0.75px] border-[#c8d0d7] bg-white px-[19.25px] pt-[15.25px] pb-[20.75px]">
    <h2 className="text-[19px] font-bold leading-[25px]">{a ? a.id + " · 시공 상세" : "시공 상세"}</h2>
    {!a || !draft ? <ConstructionEmpty detail/> : <>
      <dl className="mt-[15px] flex min-h-24 flex-col justify-center gap-[11px] rounded-lg bg-[#f4f5f6] px-3 py-[10px]">
        {[["지원 / 동의", "승인 / " + a.consent], ["시설 / 자료 형태", a.facility + " / " + a.scope], ["주민 시공 희망", a.preferred]].map(([label, value], i) => <div key={label} className="grid min-h-[18px] grid-cols-[142px_minmax(0,1fr)] items-start gap-0"><dt className="text-xs font-medium leading-[18px]">{label}</dt><dd className={"text-[13px] font-medium leading-[18px] " + (i === 0 ? "text-[#27654d]" : "")}>{value}</dd></div>)}
      </dl>
      <div className="mt-[14px] grid grid-cols-2 gap-[6px]">
        <label className="flex min-w-0 flex-col gap-[5px] text-[13px] font-bold leading-[17px]">확정 시공일<span className="relative"><input aria-label="확정 시공일" type="date" readOnly={readOnly} value={draft.date} onChange={e => onChange({...draft, date: e.target.value})} className={constructionInput + " h-[42px] pr-[35px] font-medium [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:right-3 [&::-webkit-calendar-picker-indicator]:opacity-0"}/><img src={calendar} alt="" width={18} height={18} className="pointer-events-none absolute top-3 right-3"/></span></label>
        <label className="flex min-w-0 flex-col gap-[5px] text-[13px] font-bold leading-[17px]">확정 시간<span className="relative"><input aria-label="확정 시간" type="time" readOnly={readOnly} value={draft.time} onChange={e => onChange({...draft, time: e.target.value})} className={constructionInput + " h-[42px] pr-[35px] font-medium [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:right-3 [&::-webkit-calendar-picker-indicator]:opacity-0"}/><img src={chevron} alt="" width={18} height={18} className="pointer-events-none absolute top-3 right-3"/></span></label>
      </div>
      <div className="mt-[17px] grid grid-cols-[minmax(0,200fr)_minmax(0,196fr)] gap-[10px]">
        <ConstructionStatusSelect value={target} disabled={readOnly || busy} onChange={onTarget}/>
        <button type="button" disabled={readOnly || busy} onClick={onStatus} className={constructionPrimary + " h-[46px] rounded-md text-[15px] font-semibold"}>상태 저장</button>
      </div>
      <button type="button" disabled={readOnly || busy} onClick={onSchedule} className={constructionPrimary + " mt-[22px] h-10 rounded-md"}>배정·일정 저장</button>
      <label className="mt-[10px] flex flex-col gap-[9px] text-sm font-bold leading-[18px]">최종 설치 결과 · 주민 공개<textarea aria-label="최종 설치 결과 · 주민 공개" readOnly={readOnly} value={draft.note} onChange={e => onChange({...draft, note: e.target.value, verified: false})} placeholder="설치한 시설과 조치 내용을 입력하세요." className={constructionInput + " h-[54px] min-h-[54px] resize-y py-3 font-normal"}/></label>
      <h3 className="mt-2 mb-[7px] text-sm font-bold leading-[18px]">첨부사진</h3>
      <ConstructionPhotos photos={draft.photos} disabled={readOnly} busy={busy} onUpload={onUpload} onRemove={id => onChange({...draft, photos: draft.photos.filter(p => p.id !== id), verified: false})}/>
      <button type="button" disabled={busy} onClick={onFinish} className={constructionPrimary + " mt-4 h-10"}>{readOnly ? "전체 완료 결과 보기" : "결과 확인 후 전체 완료"}</button>
    </>}
  </aside>;
}
