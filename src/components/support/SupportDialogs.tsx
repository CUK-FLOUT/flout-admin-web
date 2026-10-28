import { Link } from "react-router-dom";
import type { ReactNode } from "react";
import type { ReviewDraft, SupportApplication, SupportDialogKind } from "../../pages/Support/types";
import { approvalIssue, consentLabel, inspectionFor } from "../../pages/Support/model";
import SupportDialog from "./SupportDialog";
import SupportBadge from "./SupportBadge";
import ResultImage from "../inspection-results/ResultImage";
import { supportInput, supportPrimary, supportSecondary } from "./styles";
function Row({label, children}: {label: string; children: ReactNode}) {
  return <div className="grid grid-cols-[116px_minmax(0,1fr)] gap-3 max-[500px]:grid-cols-[95px_minmax(0,1fr)]"><dt className="text-[13px] leading-5 text-[#64748b]">{label}</dt><dd className="whitespace-pre-line text-sm leading-[21px]">{children}</dd></div>;
}
type Props = {
  kind: SupportDialogKind; application: SupportApplication; draft?: ReviewDraft; reason?: string; document?: string; error?: string;
  onClose: () => void; onConfirm?: () => void; onReason?: (value: string) => void; onRegister?: () => void;
};
export default function SupportDialogs({kind, application: a, draft = a.review, reason = "", document, error, onClose, onConfirm, onReason, onRegister}: Props) {
  const isOwner = a.ownership === "소유자";
  const issue = approvalIssue(a, draft);
  if (kind === "approve") return <SupportDialog title="지원을 승인할까요?" width="max-w-[480px]" height="min-h-[198px]" onClose={onClose} titleClassName="leading-9">
    <div className="-mt-1 text-sm leading-[21px]"><p>{a.id + " · " + a.resident + "님의 신청"}</p><p>{draft.notify ? "승인 확정 시 주민에게 알림이 전송되며 시공 연계가 시작됩니다." : "승인 확정 시 주민에게 결과가 공개되며 시공 연계가 시작됩니다."}</p></div>
    {(issue || error) && <p role="alert" className="text-sm leading-[21px] text-[#a53632]">{issue || error}</p>}
    <div className="mt-1 grid grid-cols-2 gap-3"><button onClick={onClose} className={supportSecondary + " h-11 border-[#234f73] text-base text-[#234f73]"}>취소</button><button disabled={!!issue} onClick={onConfirm} className={supportPrimary + " h-11 rounded-md text-base"}>지원 승인</button></div>
  </SupportDialog>;
  if (kind === "reject") return <SupportDialog title={a.id + " · 미승인 처리"} width="max-w-[480px]" height="min-h-[209px]" onClose={onClose} titleClassName="text-[#a53632]" className="pb-[19px]">
    <p className="text-sm leading-[21px]">주민에게 안내할 미승인 사유를 입력해 주세요.</p>
    <input autoFocus aria-label="미승인 사유" value={reason} onChange={e => onReason?.(e.target.value)} placeholder="검토 결과 안내 입력" className={supportInput + " h-10 border-[#234f73] px-[15px] text-sm"}/>
    {error && <p role="alert" className="text-sm text-[#a53632]">{error}</p>}
    <div className="grid grid-cols-2 gap-2"><button onClick={onClose} className={supportSecondary + " h-11 border-[#234f73] text-[#234f73]"}>취소</button><button onClick={onConfirm} disabled={!reason.trim()} className={supportPrimary + " h-11 rounded-md"}>안내 입력 후 저장</button></div>
  </SupportDialog>;
  if (kind === "review-check") return <SupportDialog title={a.id + " · 검토 확인사항"} width="max-w-[680px]" height="min-h-[355px]" onClose={onClose} className="rounded-xl">
    <dl className="flex flex-col gap-3"><Row label="신청">{a.id + " · " + a.resident + " · " + a.ownership}</Row><Row label="주민 신청 조치">{a.request}</Row><Row label="자격·서류">{draft.checks.every(Boolean) ? "☑ 검토 완료" : "확인 필요"}</Row><Row label="동의 출처">{a.documents.find(d => d.includes("동의")) || "제출된 동의 자료 없음"}</Row><Row label="필요 여부 / 확인">{draft.consentRequired + " / " + draft.consentState}</Row><Row label="승인 지원 범위">{draft.scope || "입력 필요"}</Row></dl>
    <p role={error || issue ? "alert" : undefined} className={"text-sm leading-[21px] " + (error || issue ? "text-[#a53632]" : "text-[#64748b]")}>{error || issue || "자격·서류·주민 제출 동의 자료를 확인한 뒤 승인 결과를 저장합니다."}</p>
    <div className="grid grid-cols-2 gap-2"><button onClick={onConfirm} disabled={!!issue} className={supportPrimary}>지원 승인 저장</button><button onClick={onClose} className={supportSecondary}>취소</button></div>
  </SupportDialog>;
  if (kind === "approved") return <SupportDialog title={"지원 승인 저장 후 " + a.id} width="max-w-[680px]" height="min-h-[344px]" onClose={onClose} className="rounded-xl">
    <p className="text-base font-bold leading-6">지원 승인 · 주민에게 결과 공개</p><dl className="flex flex-col gap-3"><Row label="신청">{a.id + " · " + a.resident}</Row><Row label="지원 시설">{a.request}</Row><Row label="동의 상태">{consentLabel(a)}</Row></dl>
    <p className="text-sm leading-[21px] text-[#64748b]">지원 승인과 필요한 동의가 확인되어 시공 대상 등록이 가능합니다.</p>
    <button onClick={onRegister} className={supportPrimary}>{a.constructionRegistered ? "시공 관리에서 확인" : "승인한 신청을 시공 대상 등록"}</button><button onClick={onClose} className={supportSecondary}>닫기</button>
  </SupportDialog>;
  if (kind === "rejected") return <SupportDialog title={"지원 미승인 저장 " + a.id} width="max-w-[520px]" height="min-h-[280px]" onClose={onClose} className="rounded-xl">
    <p className="text-base font-bold leading-6">지원 미승인 · 주민에게 결과 공개</p><p className="text-sm leading-[21px] text-[#64748b]">담당자가 입력한 검토 안내가 주민 지원 상세에 표시됩니다. 시공 대상 등록은 비활성화됩니다.</p>
    <dl className="flex flex-col gap-3"><Row label="신청">{a.id + " · " + a.resident}</Row><Row label="검토 결과">지원 미승인</Row></dl><button onClick={onClose} className={supportPrimary}>확인</button>
  </SupportDialog>;
  if (kind === "review-saved") return <SupportDialog title={isOwner ? a.id + " · 검토 내용 저장" : "검토 내용을 저장했습니다."} width={isOwner ? "max-w-[400px]" : "max-w-[480px]"} height={isOwner ? "min-h-[244px]" : "min-h-[256px]"} onClose={onClose} className="rounded-xl">
    {!isOwner && <p className="text-sm leading-[21px] text-[#64748b]">지원 결과는 검토 완료 후 별도로 저장합니다.</p>}
    <dl className="flex flex-col gap-3">{!isOwner && <Row label="접수번호">{a.id + " · " + a.resident}</Row>}<Row label="지원 상태">지원 검토 중</Row><Row label={isOwner ? "남은 검토" : "남은 확인"}>자격·필요자료·동의 필요 여부</Row></dl>
    {isOwner && <p className="text-sm leading-[21px] text-[#64748b]">검토 결과를 확정한 뒤 주민 지원 상세에 안내합니다. 현재 승인·시공 등록 전 단계입니다.</p>}<button onClick={onClose} className={supportPrimary}>확인</button>
  </SupportDialog>;
  if (kind === "approved-view" || kind === "rejected-view") return <SupportDialog title={a.id + " · " + a.resident + "님의 신청"} width="max-w-[580px]" height="min-h-[594px]" onClose={onClose} className="rounded-xl p-[15px]">
    <button onClick={onClose} className={supportSecondary + " absolute top-[15px] right-[15px] w-[72px]"}>닫기</button>
    <div className="mt-3 flex items-center justify-between gap-3"><h3 className="font-bold">지원 정보</h3><SupportBadge status={a.status}/></div>
    <dl className="flex flex-col gap-3"><Row label="주소">{a.address + " · " + a.housing}</Row><Row label={a.status === "승인" ? "지원 시설" : "요청 조치"}>{a.request}</Row>
      {a.status === "승인" ? <><Row label="지원 범위">{a.review.scope}</Row><Row label="임대인 동의">{consentLabel(a)}</Row><Row label="시공 연계">{a.constructionRegistered ? "등록됨 · 진행" : "등록 전"}</Row></> : <><Row label="검토 결과">미승인</Row><Row label="주민 안내 내용">{a.rejectionReason}</Row></>}
    </dl><p className="text-xs leading-[18px] text-[#64748b]">{a.status === "승인" ? "지원 결과와 동의 확인 상태는 주민 화면에도 표시됩니다." : "검토 안내문은 행정 담당자가 입력한 내용입니다."}</p>
    {a.status === "승인" && <Link to={"/construction?requestId=" + a.id} className={supportSecondary}>시공 관리에서 확인</Link>}
  </SupportDialog>;
  if (kind === "document") return <SupportDialog title={document || "주민 제출 자료"} width="max-w-[480px]" height="min-h-[198px]" onClose={onClose}>
    <p className="text-sm leading-[21px]">주민 제출 자료 · {a.id}</p><p className="text-sm leading-[21px] text-[#64748b]">파일 원본이 연결되지 않았습니다.</p><button onClick={onClose} className={supportSecondary}>닫기</button>
  </SupportDialog>;
  const result = inspectionFor(a);
  return <SupportDialog title={a.id + (isOwner ? " · 공개된 점검 결과" : " · 공개된 전문가 점검 결과")} width={isOwner ? "max-w-[448px]" : "max-w-[580px]"} height={isOwner ? "min-h-[625px]" : "min-h-[318px]"} onClose={onClose} className="rounded-xl">
    {isOwner && <><span className="w-fit rounded-full border border-[#234f73] bg-[#eef3f7] px-4 py-1 text-xs text-[#234f73]">점검 완료·결과 공개</span><h3 className="text-2xl font-bold leading-9">우리 집 맞춤 예방안</h3></>}
    <dl className="flex flex-col gap-3"><Row label="취약지점">{result.selected.join(" · ")}</Row>{!isOwner && <Row label="점검 설명">{result.summary}</Row>}</dl>
    {isOwner && <><p className="text-sm leading-[21px]">{result.summary}</p><div className="flex gap-2">{result.photos.slice(0, 2).map(p => <ResultImage key={p.id} source={p.src} alt={"현장사진 " + p.name} className="h-20 min-w-0 flex-1 rounded-md object-cover"/>)}</div><h3 className="text-sm font-bold leading-[21px]">전문가 권장 예방조치</h3></>}
    <div>{isOwner ? <ol className="text-sm leading-[21px]">{result.actions.map((action, i) => <li key={action}>{i + 1}. {action}</li>)}</ol> : <Row label="권장 예방조치"><ol>{result.actions.map((action, i) => <li key={action}>{i + 1}. {action}</li>)}</ol></Row>}</div>
    {isOwner ? <><h3 className="text-sm font-bold">관련 지원사업</h3><p className="text-sm leading-[21px] text-[#64748b]">지원 대상과 범위는 행정 검토 후 확정됩니다.</p><hr className="border-[#cbd5e1]"/><p className="text-sm">결과 공개 완료 · 주민에게 제공된 동일 내용</p><p className="text-xs leading-[18px] text-[#64748b]">권장조치 목록 공개 · 후속 처리 분류·내부 메모 비공개</p></> : <p className="text-[13px] leading-5 text-[#64748b]">▧ 현장사진 {result.photos.length}개 · 주민에게 공개된 동일 자료</p>}
    <button onClick={onClose} className={supportSecondary}>닫기</button>
  </SupportDialog>;
}
