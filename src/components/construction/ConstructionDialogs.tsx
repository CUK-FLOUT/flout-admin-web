import { useEffect, useRef } from "react";
import type { ReactNode } from "react";
import Dialog from "../support/SupportDialog";
import type { ConstructionCandidate, ConstructionDialogKind, ConstructionRecord, EditableConstructionStatus, InstallationDraft } from "../../pages/Construction/types";
import { displayDate, installationIssue, sameInstallation } from "../../pages/Construction/model";
import ConstructionBadge from "./ConstructionBadge";
import ConstructionImage from "./ConstructionImage";
import { constructionInput, constructionPrimary, constructionSecondary } from "./styles";
function Row({label, children, right = false, success = false}: {label: string; children: ReactNode; right?: boolean; success?: boolean}) {
  return <div className={"grid items-start gap-3 " + (right ? "grid-cols-[minmax(120px,1fr)_minmax(0,206px)]" : "grid-cols-[116px_minmax(0,1fr)] max-[500px]:grid-cols-[96px_minmax(0,1fr)]")}>
    <dt className={"text-[13px] " + (right ? "leading-[22px]" : "leading-5 text-[#64748b]")}>{label}</dt>
    <dd className={"whitespace-pre-line text-sm " + (right ? "text-right leading-[22px] " : "leading-[21px] ") + (success ? "text-[#27654d]" : "")}>{children}</dd>
  </div>;
}
type Props = {
  kind: ConstructionDialogKind; application?: ConstructionRecord; candidate?: ConstructionCandidate; candidates: ConstructionCandidate[];
  draft: InstallationDraft | null; target: EditableConstructionStatus | ""; checked: boolean; error: string; busy: boolean;
  onClose: () => void; onConfirm: () => void; onInstall: () => void; onPublishedReview: () => void; onDraftSave: () => void;
  onCandidate: (id: string) => void; onChange: (draft: InstallationDraft) => void; onChecked: (checked: boolean) => void; onUpload: (files: File[]) => void;
};
const fit = "max-h-[calc(var(--support-viewport-height,100dvh)_-_32px)]!";
export default function ConstructionDialogs(props: Props) {
  const {kind, application: a, candidate, candidates, draft, target, checked, error, busy, onClose, onConfirm, onInstall, onPublishedReview, onDraftSave, onCandidate, onChange, onChecked, onUpload} = props;
  const file = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const trapFocus = (event: KeyboardEvent) => {
      if (event.key !== "Tab") return;
      const dialog = document.querySelector<HTMLDialogElement>("dialog[open]");
      if (!dialog) return;
      const controls = Array.from(dialog.querySelectorAll<HTMLElement>('button:not(:disabled), input:not([type="file"]):not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex="0"]')).filter(element => element.getClientRects().length > 0);
      const first = controls[0], last = controls[controls.length - 1];
      if (!first || !last) return;
      const outside = !dialog.contains(document.activeElement);
      if (event.shiftKey && (document.activeElement === first || outside)) {event.preventDefault(); last.focus();}
      else if (!event.shiftKey && (document.activeElement === last || outside)) {event.preventDefault(); first.focus();}
    };
    window.addEventListener("keydown", trapFocus, true);
    return () => window.removeEventListener("keydown", trapFocus, true);
  }, []);
  const alert = error ? <p role="alert" className="text-sm leading-[21px] text-[#a53632]">{error}</p> : null;
  if (kind === "register" || kind === "register-support") {
    const specific = kind === "register-support";
    return <Dialog title={specific ? "지원 승인 신청 시공 등록 " + (candidate?.id || "") : "승인 대상 등록"} width={specific ? "max-w-[680px]" : "max-w-[520px]"} height={specific ? "min-h-[341px]" : "min-h-[338px]"} onClose={onClose} className={fit + " rounded-xl"}>
      {!specific && <><p className="text-sm leading-[21px] text-[#64748b]">시공에 아직 연결되지 않은 승인 신청을 선택합니다.</p><select aria-label="승인 신청 선택" value={candidate?.id || ""} onChange={e => onCandidate(e.target.value)} className={constructionInput + " h-10 px-[15px] text-sm"}>{!candidate && <option value="">등록 가능한 승인 신청이 없습니다.</option>}{candidates.filter(c => c.eligible).map(c => <option key={c.id} value={c.id}>{c.id + " · " + c.resident + " · 미등록"}</option>)}</select></>}
      {candidate && <dl className="flex flex-col gap-3">
        {specific ? <><Row label="대상 신청">{candidate.id + " · " + candidate.resident + " · 미등록"}</Row><Row label="지원 / 동의">{(candidate.eligible ? "지원 승인 / " : "검토 필요 / ") + candidate.consent}</Row><Row label="시설">{candidate.facility}</Row><Row label="주민 시공 희망">{candidate.preferred}</Row></> : <><Row label="지원 결과">승인</Row><Row label="시설 / 주소">{candidate.facility + " · " + candidate.address}</Row><Row label="동의 필요 여부">{candidate.consent}</Row></>}
      </dl>}
      <p className={(specific ? "text-sm leading-[21px]" : "text-xs leading-[18px]") + " text-[#64748b]"}>{specific ? "검토 중·미승인 또는 필요한 동의 미확인 신청은 등록 대상에서 제외됩니다." : "지원 승인·필요 동의 확인 후 등록 가능합니다."}</p>
      {alert}
      {specific ? <><button disabled={!candidate?.eligible || busy} onClick={onConfirm} className={constructionPrimary}>시공 대상 등록</button><button onClick={onClose} className={constructionSecondary}>취소</button></> : <div className="grid grid-cols-2 gap-2"><button onClick={onClose} className={constructionSecondary}>취소</button><button disabled={!candidate?.eligible || busy} onClick={onConfirm} className={constructionPrimary}>시공 대상 등록</button></div>}
    </Dialog>;
  }
  if (!a || !draft) return null;
  const name = a.id + " · " + a.resident;
  const schedule = displayDate(a.date) + (a.time ? " · " + a.time : "");
  if (kind === "registered" || kind === "registered-support") {
    const specific = kind === "registered-support";
    return <Dialog title={specific ? "시공 대상으로 등록 " + a.id : "시공 대상으로 등록했습니다."} width={specific ? "max-w-[520px]" : "max-w-[480px]"} height={specific ? "min-h-[259px]" : "min-h-[223px]"} onClose={onClose} className={fit + " rounded-xl"}>
      {specific && <p className="text-base font-bold leading-6">시공 대상으로 등록했습니다.</p>}
      <p className="text-sm leading-[21px] text-[#64748b]">{specific ? "희망 일정과 주민 요청사항을 참고해 시공 일정을 확정하세요." : "등록 후 시공 담당자와 날짜·시간을 배정합니다."}</p>
      <dl className="flex flex-col gap-3"><Row label={specific ? "신청" : "접수번호"}>{name}</Row><Row label={specific ? "시설" : "시공 단계"}>{specific ? a.facility : "일정 미등록"}</Row></dl>
      <button onClick={onClose} className={constructionPrimary}>확인</button>
    </Dialog>;
  }
  if (kind === "schedule-saved" || kind === "draft-saved") {
    const temporary = kind === "draft-saved";
    return <Dialog title={temporary ? "설치 결과 초안을 저장했습니다." : "시공 일정을 저장했습니다."} width="max-w-[480px]" height={temporary ? "min-h-[244px]" : "min-h-[223px]"} onClose={onClose} className={fit + " rounded-xl"}>
      <p className="text-sm leading-[21px] text-[#64748b]">{temporary ? "진행 중 상태는 초안으로 저장됩니다. 시공 완료 및 결과 확인 후 주민에게 공개합니다." : "주민 시공 정보에 일정이 표시되고 일정 알림이 제공됩니다."}</p>
      <dl className="flex flex-col gap-3"><Row label="접수번호">{name}</Row><Row label={temporary ? "공개 상태" : "시공 일정"}>{temporary ? "초안 · 미공개" : schedule}</Row></dl>
      <button onClick={onClose} className={constructionPrimary}>확인</button>
    </Dialog>;
  }
  if (kind === "status-confirm") {
    const missingResult = target === "완료" && (!a.published || !sameInstallation(draft, a));
    return <Dialog title={"시공 상태 " + target} width="max-w-[580px]" height={target === "완료" ? "min-h-[310px]" : "min-h-[289px]"} onClose={onClose} className={fit + " rounded-xl"}>
      <dl className="flex flex-col gap-3"><Row label="신청">{name}</Row><Row label="설치 시설">{a.facility}</Row><Row label="확정 시공">{schedule}</Row><Row label="변경 상태">{target}</Row></dl>
      <p className="text-sm leading-[21px] text-[#64748b]">{target === "완료" ? (missingResult ? "설치 결과·완료 사진을 등록한 후 완료로 저장합니다. 이 신청은 진행 중이고 결과가 아직 없어 완료 저장이 비활성화됩니다." : "공개된 설치 결과와 완료 사진을 확인한 후 완료로 저장합니다.") : "변경된 시공 상태는 주민의 시공 진행상태에도 표시됩니다."}</p>
      {alert}
      <div className="grid grid-cols-2 gap-2"><button onClick={onClose} className={constructionSecondary}>취소</button><button disabled={busy} onClick={missingResult ? onInstall : onConfirm} className={constructionPrimary}>{missingResult ? "설치 결과 등록" : "시공 상태 저장"}</button></div>
    </Dialog>;
  }
  if (kind === "status-saved" || kind === "overall-saved") {
    const whole = kind === "overall-saved", completed = a.status === "완료";
    return <Dialog title={whole ? "시공이 전체 완료되었습니다." : "시공 " + a.status + (a.status === "예정" || a.status === "진행" ? "으로" : "로") + " 저장했습니다."} width="max-w-[520px]" height={completed && !whole ? "min-h-[318px]" : "min-h-[297px]"} onClose={onClose} titleClassName={whole || completed ? "text-[#27654d]" : ""} className={fit}>
      {!whole && !completed && <p className="text-sm leading-[21px]">주민 신청 상세에도 동일한 점검 상태를 표시합니다.</p>}
      <dl className="flex flex-col gap-3"><Row right label="신청">{name}</Row><Row right label="설치 시설">{a.facility}</Row><Row right label="확정 시공">{schedule}</Row><Row right label="변경 상태" success={whole || completed}>{a.status}</Row></dl>
      {(whole || completed) && <p className="text-sm leading-[21px]">{whole ? "설치 결과·사진과 전체 완료 상태가 주민 시공 상세에 표시됩니다." : "설치 결과·완료 사진이 등록되었습니다. 최종 설치 결과를 확인한 뒤 전체 완료로 처리해 주세요."}</p>}
      <button onClick={onClose} className={constructionPrimary + " h-11 rounded-md text-base leading-6"}>확인</button>
    </Dialog>;
  }
  if (kind === "installation") {
    const issue = installationIssue(draft);
    return <Dialog title={"설치 결과 등록 " + a.id} width="max-w-[580px]" height="min-h-[502px]" onClose={onClose} className={fit + " rounded-xl"}>
      <dl className="flex flex-col gap-3"><Row label="시공 신청">{name}</Row><Row label="지원·설치 시설">{a.facility}</Row><Row label="설치 완료일"><input aria-label="설치 완료일" type="date" value={draft.completionDate} onChange={e => onChange({...draft, completionDate: e.target.value, verified: false})} className={constructionInput + " h-10 px-[15px] text-sm"}/></Row></dl>
      <label className="contents"><span className="text-sm font-bold leading-[21px]">주민에게 공개할 설치 결과</span><textarea aria-label="주민에게 공개할 설치 결과" value={draft.note} onChange={e => onChange({...draft, note: e.target.value, verified: false})} className={constructionInput + " h-[45px] min-h-[45px] resize-y bg-[#f4f5f6] p-[11px] text-sm leading-[21px]"}/></label>
      <p className="text-sm font-bold leading-[21px]">완료 사진</p>
      <button type="button" disabled={busy} onClick={() => file.current?.click()} className={constructionSecondary + " min-w-0 truncate px-4 text-left"} title={draft.photos.map(p => p.name).join(", ")}>{busy ? "사진 저장 중…" : (draft.photos.length ? draft.photos.map(p => p.name).join(", ") + " · 사진 첨부" : "사진 첨부")}</button>
      <input ref={file} aria-label="설치 결과 완료 사진 파일" type="file" accept="image/jpeg,image/png" multiple className="sr-only" onChange={e => {onUpload(Array.from(e.target.files || [])); e.target.value = "";}}/>
      <label className="flex items-center gap-2 text-sm font-bold leading-[21px]"><input type="checkbox" aria-label="설치 내용·사진 확인 완료" checked={draft.verified} onChange={e => onChange({...draft, verified: e.target.checked})} className="size-[18px] shrink-0 accent-[#234f73]"/>설치 내용·사진 확인 완료</label>
      {alert || (issue && <p className="text-xs leading-[18px] text-[#64748b]">{issue}</p>)}
      <button onClick={onConfirm} disabled={!!issue || busy} className={constructionPrimary}>시공 완료·설치 결과 공개</button>
      <div className="grid grid-cols-2 gap-2"><button disabled={busy} onClick={onDraftSave} className={constructionSecondary}>설치 결과 임시 저장</button><button onClick={onClose} className={constructionSecondary}>취소</button></div>
    </Dialog>;
  }
  if (kind === "published") return <Dialog title={"시공 완료 설치 결과 공개 " + a.id} width="max-w-[580px]" height="min-h-[404px]" onClose={onClose} className={fit + " rounded-xl"}>
    <dl className="flex flex-col gap-3"><Row label="신청">{name}</Row><Row label="현재 처리 상태">시공 완료</Row><Row label="설치 시설">{a.facility}</Row><Row label="설치 완료일">{displayDate(a.published?.completionDate || "")}</Row><Row label="설치 결과">{a.published?.note}</Row></dl>
    <p className="text-sm leading-[21px] text-[#64748b]">설치 완료 사진 · 주민 시공 상세에 공개</p><p className="text-xs leading-[18px] text-[#64748b]">전체 완료는 최종 결과 확인 후 처리합니다.</p>
    <button onClick={onPublishedReview} className={constructionPrimary}>최종 결과 확인·전체 완료</button><button onClick={onClose} className={constructionSecondary}>닫기</button>
  </Dialog>;
  const reviewing = kind === "completion-review";
  return <Dialog title={name + "님의 신청"} width="max-w-[580px]" height="min-h-[594px]" onClose={onClose} className={fit + " rounded-xl p-[15px]!"} titleClassName="flex min-h-10 items-center pr-[84px]">
    <button onClick={onClose} className={constructionSecondary + " absolute top-[15px] right-[15px] w-[72px]"}>닫기</button>
    <div className="flex items-center justify-between gap-3"><h3 className="text-base font-bold leading-6">시공 정보</h3><ConstructionBadge status={a.status}/></div>
    <dl className="flex flex-col gap-3"><Row label="주소">{a.address}</Row><Row label="설치 시설">{a.facility}</Row><Row label="설치 완료일">{displayDate(a.published?.completionDate || "")}</Row><Row label="시공 상태">{a.status}</Row><Row label="설치 결과">{a.published?.note || "설치 결과와 사진이 등록되었습니다."}</Row>{!reviewing && <Row label="최종 처리">설치 결과 확인 · 전체 완료</Row>}</dl>
    {a.published?.photos.length ? <div className="flex gap-2 overflow-x-auto">{a.published.photos.map(photo => <ConstructionImage key={photo.id} source={photo.src} alt={"공개된 완료사진 " + photo.name} className="h-[88px] w-[160px] shrink-0 rounded-md object-cover"/>)}</div> : null}
    {reviewing ? <><label className="flex items-center gap-2 text-sm font-bold leading-[21px]"><input type="checkbox" aria-label="설치 결과·조치 내용 확인" checked={checked} onChange={e => onChecked(e.target.checked)} className="size-[18px] shrink-0 accent-[#234f73]"/>설치 결과·조치 내용 확인</label>{alert}<button disabled={!checked || busy} onClick={onConfirm} className={constructionPrimary}>결과 확인·전체 완료</button><p className="text-xs leading-[18px] text-[#64748b]">선택한 {a.id} 신청에만 적용됩니다.</p></> : <p className="text-xs leading-[18px] text-[#64748b]">주민에게 설치 결과와 완료 알림 제공</p>}
  </Dialog>;
}
