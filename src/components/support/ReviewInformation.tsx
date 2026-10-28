import type { ReactNode } from "react";
import type { SupportApplication } from "../../pages/Support/types";
import { inspectionFor } from "../../pages/Support/model";
import inspectionIcon from "../../assets/support/inspection-document.svg";
import resultIcon from "../../assets/support/result-document.svg";
import forward from "../../assets/support/forward.svg";
function BusinessIcon() {
  return <span aria-hidden="true" className="relative block size-5 shrink-0"><span className="absolute top-px left-0.5 h-[18px] w-4 rounded-[2px] border-[1.5px] border-[#234f73]"/><span className="absolute top-[6px] left-[5.5px] h-[1.5px] w-[9px] rounded bg-[#234f73]"/><span className="absolute top-[10px] left-[5.5px] h-[1.5px] w-[9px] rounded bg-[#234f73]"/><span className="absolute top-[14px] left-[5.5px] h-[1.5px] w-[6px] rounded bg-[#234f73]"/></span>;
}
function InformationRow({label, children, success = false}: {label: string; children: ReactNode; success?: boolean}) {
  return <div className="grid min-h-9 grid-cols-[146px_minmax(0,1fr)] border-b border-[#f4f5f6] text-[13px] font-medium leading-[18px] max-sm:grid-cols-[116px_minmax(0,1fr)]">
    <dt className="flex items-center bg-[#f4f5f6] px-[14px] py-2">{label}</dt><dd className={"flex items-center pl-[21px] py-2 " + (success ? "text-[#27654d]" : "")}>{children}</dd>
  </div>;
}
export default function ReviewInformation({application: a, onInspection, onDocument}: {application: SupportApplication; onInspection: () => void; onDocument: (document: string) => void}) {
  const result = inspectionFor(a);
  return <div className="flex min-w-0 flex-col gap-4">
    <section aria-labelledby="support-information-title" className="min-h-[394px] rounded-lg border-[0.75px] border-[#c8d0d7] bg-white px-[19.25px] pt-[17.25px] pb-[14px]">
      <h2 id="support-information-title" className="mb-[17px] flex min-h-[23px] items-center gap-2 text-lg font-bold leading-[23px]"><img src={inspectionIcon} alt="" width={20} height={20}/>신청·점검 정보</h2>
      <dl>
        <InformationRow label="신청자 / 연락처">{a.resident + " · " + a.phone.replace("****", a.id.slice(-4))}</InformationRow>
        <InformationRow label="주택 / 거주 형태">{a.address + " · " + a.housing + " · " + a.ownership}</InformationRow>
        <InformationRow label="취약지점">{result.selected.join(" · ")}</InformationRow>
        <InformationRow label="점검 결과" success={a.inspectionPublished}>{a.inspectionPublished ? "완료 · 주민에게 결과 공개" : "결과 공개 전"}</InformationRow>
        <InformationRow label="전문가 권장조치">{result.actions.join(" · ")}</InformationRow>
        <InformationRow label="주민 신청 조치">{a.request}</InformationRow>
        <InformationRow label="주민 요청사항">{a.residentNote}</InformationRow>
        <InformationRow label="시공 희망">{a.preferred}</InformationRow>
      </dl>
      <div className="flex justify-end"><button onClick={onInspection} type="button" className="flex h-[34px] w-[180px] items-center justify-center gap-[14px] rounded-md border border-[#c8d0d7] text-sm font-semibold"><img src={resultIcon} alt="" width={18} height={18}/>점검 결과 보기<img src={forward} alt="" width={18} height={18}/></button></div>
    </section>
    <section aria-labelledby="support-documents-title" className="min-h-[180px] rounded-lg border-[0.75px] border-[#c8d0d7] bg-white px-[19.25px] pt-[15.25px] pb-[15px]">
      <h2 id="support-documents-title" className="mb-[10px] flex min-h-[23px] items-center gap-2 text-lg font-bold leading-[23px]"><BusinessIcon/>지원사업·첨부서류</h2>
      <dl className="text-xs leading-[17px]">
        {[["지원사업", "해당 사업 확인 필요"], ["지원 대상 조건", "해당 사업 기준 확인"], ["지원 범위", a.status === "승인" ? a.review.scope : "담당자 검토 후 확정"]].map(([label, value], i) => <div key={label} className={"grid min-h-[29px] grid-cols-[136px_minmax(0,1fr)] px-[14px] py-[6px] max-sm:grid-cols-[110px_minmax(0,1fr)] " + (i % 2 === 0 ? "bg-[#f4f5f6]" : "")}><dt className="font-medium">{label}</dt><dd>{value}</dd></div>)}
        <div className="grid min-h-[29px] grid-cols-[136px_minmax(0,1fr)] px-[14px] py-[6px] max-sm:grid-cols-[110px_minmax(0,1fr)]"><dt className="font-medium">주민 제출 자료</dt><dd>{a.documents.length ? a.documents.map((d, i) => <span key={d}>{i > 0 && " · "}<button type="button" onClick={() => onDocument(d)} className="hover:underline">{d}</button></span>) : "없음 · 필요한 자료는 검토 후 안내"}</dd></div>
      </dl>
    </section>
  </div>;
}
