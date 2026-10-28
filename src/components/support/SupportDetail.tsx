import type { ReactNode } from "react";
import type { SupportApplication, SupportDialogKind } from "../../pages/Support/types";
import { consentLabel, inspectionFor } from "../../pages/Support/model";
import SupportEmpty from "./SupportEmpty";
import attachment from "../../assets/support/attachment.svg";
import { supportPrimary, supportSecondary } from "./styles";
export function DetailRow({label, children, success = false}: {label: string; children: ReactNode; success?: boolean}) {
  return <div className="flex w-[calc(100%_-_12px)] items-center gap-4 leading-[22px]">
    <dt className="w-[118px] shrink-0">{label}</dt>
    <dd className={"min-w-0 flex-1 whitespace-pre-line " + (success ? "text-[#27654d]" : "")}>{children}</dd>
  </div>;
}
type Props = { application?: SupportApplication; onReview: () => void; onDialog: (kind: SupportDialogKind, document?: string) => void; className: string };
export default function SupportDetail({application: a, onReview, onDialog, className}: Props) {
  const result = a ? inspectionFor(a) : null;
  return <aside aria-label="지원 신청 상세" className={"flex w-full min-w-0 flex-col gap-4 rounded-md border-[0.75px] border-[#cbd5e1] bg-white p-[19.25px] " + className}>
    <h2 className="shrink-0 text-lg font-bold leading-[26px]">{a ? a.id + " · 지원신청" : "지원 신청 상세"}</h2>
    {!a ? <SupportEmpty panel/> : <>
      <div className="min-h-0 -mb-[14px] flex-1 overflow-y-auto">
        <dl className="flex h-[234px] shrink-0 flex-col gap-1 pt-0.5 text-[13px]">
          <DetailRow label="신청자/연락처">{a.resident + " · " + a.phone}</DetailRow>
          <DetailRow label="주소">{a.address + " · " + a.housing + "/" + a.ownership}</DetailRow>
          <DetailRow label="전문가 권장조치">{result!.actions.join("\n")}</DetailRow>
          <DetailRow label="신청 조치">{a.request}</DetailRow>
          <DetailRow label="주민 요청사항">{a.residentNote}</DetailRow>
          <DetailRow label="시공 희망">{a.preferred}</DetailRow>
          <DetailRow label="점검 상태" success={a.inspectionPublished}>{a.inspectionPublished ? "완료 · 결과 공개" : "결과 공개 전"}</DetailRow>
        </dl>
      </div>
      <div className="h-px shrink-0 bg-[#f4f5f6]"/>
      <h3 className="flex shrink-0 items-center gap-[6px] text-sm font-bold leading-[21px]"><img src={attachment} alt="" width={18} height={18}/>첨부자료</h3>
      <div className="flex min-h-9 shrink-0 flex-col gap-0.5 text-[13px] leading-[18px]">
        {a.documents.length ? a.documents.map((d, i) => <button key={d} type="button" onClick={() => onDialog("document", d)} className="w-fit text-left hover:text-[#234f73] hover:underline">{i === 0 ? "주민 제출: " : ""}{d}</button>) : <p>추가 첨부자료 없음 · 동의자료 없음</p>}
      </div>
      <dl className="shrink-0 text-[13px]"><DetailRow label="임대인 동의">{consentLabel(a) === "필요 · 확인 중" ? "필요 · 제출 자료 확인 중" : consentLabel(a)}</DetailRow></dl>
      <div className="grid shrink-0 grid-cols-2 gap-2">
        <button type="button" onClick={onReview} className={supportPrimary}>{a.status === "검토 중" ? "지원 자격 검토" : "지원 결과 조회"}</button>
        <button type="button" onClick={() => onDialog("inspection")} className={supportSecondary}>점검 결과 보기</button>
      </div>
    </>}
  </aside>;
}
