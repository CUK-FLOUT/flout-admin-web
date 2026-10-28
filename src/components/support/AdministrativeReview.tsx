import type { ReviewDraft, SupportApplication } from "../../pages/Support/types";
import { consentRequirements, consentStates } from "../../pages/Support/types";
import SupportSelect from "./SupportSelect";
import { supportInput, supportPrimary, supportSecondary } from "./styles";
import check from "../../assets/support/check.svg";
const checkLabels = ["신청자·주택 정보 확인", "전문가 점검 결과 확인", "사업 자격·필요서류 확인"];
export default function AdministrativeReview({application: a, draft, onChange, onApprove, onReject, onSave, onCheck}: {
  application: SupportApplication; draft: ReviewDraft; onChange: (draft: ReviewDraft) => void; onApprove: () => void; onReject: () => void; onSave: () => void; onCheck: () => void;
}) {
  const readOnly = a.status !== "검토 중";
  const owner = a.id === "000005";
  return <section aria-labelledby="administrative-review-title" className="flex w-full max-w-[418px] min-w-0 flex-col rounded-lg border-[0.75px] border-[#c8d0d7] bg-white px-[19.25px] pt-[17.25px] pb-[44px]">
    <h2 id="administrative-review-title" className="mb-4 flex h-[23px] items-center gap-3 text-lg font-bold leading-[23px]"><span aria-hidden="true" className="text-[#234f73]">✓</span>행정 검토 · {a.id}</h2>
    <div className="flex flex-col gap-3">
      {checkLabels.map((label, i) => <label key={label} className="flex min-h-[18px] items-center gap-[10px] text-sm font-medium leading-[18px]">
        <span className="relative size-[18px] shrink-0"><input aria-label={label} type="checkbox" disabled={readOnly} checked={draft.checks[i]} onChange={e => { const checks: ReviewDraft["checks"] = [...draft.checks]; checks[i] = e.target.checked; onChange({...draft, checks}); }} className="size-[18px] cursor-pointer appearance-none rounded border border-[#c8d0d7] checked:border-[#234f73] checked:bg-[#234f73] disabled:cursor-default"/>{draft.checks[i] && <img src={check} alt="" width={12} height={12} className="pointer-events-none absolute top-[3px] left-[3px]"/>}</span>{label}
      </label>)}
    </div>
    <div className="mt-[14px] h-px bg-[#f4f5f6]"/>
    <div className="mt-4 flex flex-1 flex-col gap-4">
      <div className="flex flex-col gap-2"><label className="text-sm font-bold leading-[17px]">임대인 동의 필요 여부</label><SupportSelect label="임대인 동의 필요 여부" review value={draft.consentRequired} options={[...consentRequirements]} disabled={readOnly} onChange={value => onChange({...draft, consentRequired: value as ReviewDraft["consentRequired"], consentState: value === "불필요" ? "불필요" : draft.consentState === "불필요" ? "미확인" : draft.consentState})}/></div>
      <div className="flex flex-col gap-2"><label className="text-sm font-bold leading-[17px]">임대인 동의 확인 상태</label><SupportSelect label="임대인 동의 확인 상태" review value={draft.consentState} options={[...consentStates]} disabled={readOnly || draft.consentRequired === "불필요"} onChange={value => onChange({...draft, consentState: value as ReviewDraft["consentState"]})}/></div>
      {owner && <p className="text-xs leading-[18px] text-[#64748b]">{a.documents.some(d => d.includes("동의")) ? "주민 제출 동의 자료를 확인해 주세요." : "소유자 입력 · 동의 필요 여부 검토 전. 제출된 동의 자료는 없습니다."}</p>}
      <label className="flex flex-1 flex-col gap-2 text-sm font-bold leading-[17px]">지원 범위<textarea aria-label="지원 범위" readOnly={readOnly} value={draft.scope} onChange={e => onChange({...draft, scope: e.target.value})} placeholder="확정할 범위를 입력하세요" className={supportInput + " min-h-[78px] flex-1 resize-y py-3 font-normal"}/></label>
      {owner && <label className="flex flex-col gap-2 text-sm font-bold leading-[17px]">검토 메모 / 미승인 안내<textarea aria-label="검토 메모 / 미승인 안내" readOnly={readOnly} value={draft.memo} onChange={e => onChange({...draft, memo: e.target.value})} placeholder="검토 결과를 입력하세요" className={supportInput + " min-h-[60px] resize-y py-3 font-normal"}/></label>}
    </div>
    <label className="mt-6 flex min-h-[21px] items-center gap-[10px] text-sm leading-[21px]"><input type="checkbox" disabled={readOnly} checked={draft.notify} onChange={e => onChange({...draft, notify: e.target.checked})} className="size-[18px] shrink-0 accent-[#234f73]"/>승인·미승인 확정 시 주민에게 알림</label>
    <div className="mt-[27px] grid grid-cols-2 gap-[7px] pl-[3px]">
      <button type="button" onClick={onApprove} disabled={readOnly} className={supportSecondary + " min-h-[38px] text-[#234f73]"}>지원 승인</button>
      <button type="button" onClick={onReject} disabled={readOnly} className={supportPrimary + " min-h-[38px]"}>지원 미승인</button>
    </div>
    {owner && !readOnly && <div className="mt-3 flex flex-col gap-2"><button type="button" onClick={onSave} className={supportSecondary}>검토 내용 저장</button><button type="button" onClick={onCheck} className={supportSecondary}>검토 확인사항</button></div>}
  </section>;
}
