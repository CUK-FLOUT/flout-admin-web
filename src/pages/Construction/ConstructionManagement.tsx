import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import ConstructionBadge from "../../components/construction/ConstructionBadge";
import ConstructionDetail from "../../components/construction/ConstructionDetail";
import ConstructionDialogs from "../../components/construction/ConstructionDialogs";
import ConstructionEmpty from "../../components/construction/ConstructionEmpty";
import { constructionFocus, constructionSecondary } from "../../components/construction/styles";
import { changeConstructionStatus, constructionCandidates, displayDate, finishConstruction, publishInstallation, sameInstallation, saveConstructionSchedule, saveInstallationDraft, scheduleIssue } from "./model";
import { constructionDialogKinds } from "./types";
import type { ConstructionCandidate, ConstructionDialogKind, ConstructionRecord, ConstructionTab, EditableConstructionStatus, InstallationDraft } from "./types";
import { uploadConstructionPhotos } from "./photos";
import { useConstructionData } from "./useConstructionData";
const tabs: ConstructionTab[] = ["전체", "예정", "진행", "완료"];
const emptyPanelDraft = null;
export default function ConstructionManagement() {
  const {requestId} = useParams();
  const [params] = useSearchParams();
  const data = useConstructionData();
  const keyboardTab = useRef(false);
  const tab = tabs.includes(params.get("tab") as ConstructionTab) ? params.get("tab") as ConstructionTab : "전체";
  useEffect(() => {
    if (keyboardTab.current) {
      document.querySelector<HTMLButtonElement>('[role="tab"][aria-selected="true"]')?.focus();
      keyboardTab.current = false;
    }
  }, [tab]);
  const empty = params.get("dataset") === "empty";
  const source = empty ? [] : data.records;
  const filtered = params.get("dataset") === "no-results" ? [] : source.filter(a => tab === "전체" || (tab === "완료" ? ["완료", "전체 완료"].includes(a.status) : a.status === tab));
  const pages = Math.max(1, Math.ceil(filtered.length / 5));
  const page = Math.min(pages, Math.max(1, Math.floor(Number(params.get("page"))) || 1));
  const visible = filtered.slice((page - 1) * 5, page * 5);
  const incoming = params.get("requestId");
  const selectedId = requestId || incoming;
  const selected = params.get("dataset") === "no-results" ? undefined : selectedId ? source.find(a => a.id === selectedId) : visible[0];
  const candidates = constructionCandidates(data.records);
  const incomingCandidate = incoming && !data.records.some(a => a.id === incoming) ? candidates.find(a => a.id === incoming) : undefined;
  const key = [selected?.id || "none", incoming || "", tab, page, params.get("dataset") || ""].join(":");
  return <ConstructionWorkspace key={key} data={data} onKeyboardTab={() => {keyboardTab.current = true;}} selected={selected} candidates={candidates} incomingCandidate={incomingCandidate} visible={visible} filteredCount={filtered.length} hasData={source.length > 0} tab={tab} page={page} pages={pages}/>;
}
type Props = {
  onKeyboardTab: () => void; data: ReturnType<typeof useConstructionData>; selected?: ConstructionRecord; incomingCandidate?: ConstructionCandidate;
  candidates: ConstructionCandidate[]; visible: ConstructionRecord[]; filteredCount: number; hasData: boolean;
  tab: ConstructionTab; page: number; pages: number;
};
function ConstructionWorkspace({data, onKeyboardTab, selected: a, incomingCandidate, candidates, visible, filteredCount, hasData, tab, page, pages}: Props) {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [draft, setDraft] = useState<InstallationDraft | null>(() => a ? structuredClone(a.draft) : emptyPanelDraft);
  const [revision, setRevision] = useState(a?.revision ?? 0);
  const [target, setTarget] = useState<EditableConstructionStatus | "">(() => ["예정", "진행", "완료"].includes(params.get("target") || "") ? params.get("target") as EditableConstructionStatus : "");
  const [candidateId, setCandidateId] = useState(incomingCandidate?.id || params.get("candidate") || "000013");
  const [checked, setChecked] = useState(false);
  const [busy, setBusy] = useState(false);
  const requested = params.get("dialog");
  const kind = constructionDialogKinds.includes(requested as ConstructionDialogKind) ? requested as ConstructionDialogKind : incomingCandidate ? "register-support" : null;
  const candidate = candidates.find(c => c.id === candidateId) || candidates.find(c => c.eligible);
  function query() {
    const p = new URLSearchParams(params);
    ["dialog", "target", "requestId"].forEach(k => p.delete(k));
    return p;
  }
  function go(p: URLSearchParams, id?: string, replace = false) {navigate({pathname: "/construction" + (id ? "/" + id : ""), search: p.toString()}, {replace});}
  function show(value: ConstructionDialogKind | null, id = a?.id, state?: EditableConstructionStatus) {
    const p = query();
    if (value) p.set("dialog", value);
    if (state) p.set("target", state);
    go(p, id, true);
  }
  function close() {data.setError(""); show(null);}
  function selectTab(value: ConstructionTab) {
    const p = query(); p.delete("page"); p.delete("dataset"); p.delete("candidate");
    if (value === "전체") p.delete("tab"); else p.set("tab", value);
    data.setError(""); go(p);
  }
  function reset() {data.setError(""); go(new URLSearchParams());}
  function apply(update: (original: ConstructionRecord) => ConstructionRecord) {
    if (!a) return null;
    const result = data.commit(a.id, revision, update);
    if (result) setRevision(result.revision);
    return result;
  }
  function hasSavedSchedule() {
    if (!a || !draft) return false;
    if (draft.date !== a.date || draft.time !== a.time) {data.setError("배정·일정 변경을 먼저 저장해 주세요."); return false;}
    const issue = scheduleIssue(draft);
    if (issue) {data.setError(issue); return false;}
    return true;
  }
  function schedule() {
    if (!a || !draft) return;
    if (apply(original => saveConstructionSchedule(original, draft))) show("schedule-saved");
  }
  function status() {
    if (!a || !draft) return;
    if (!target) {data.setError("변경할 시공 상태를 선택해 주세요."); return;}
    if (!hasSavedSchedule()) return;
    data.setError(""); show("status-confirm", a.id, target);
  }
  function install() {
    if (!a || !draft || a.status === "전체 완료") return;
    setDraft({...draft, completionDate: draft.completionDate || a.date});
    data.setError(""); show("installation");
  }
  function temporary() {
    if (!a || !draft) return;
    if (apply(original => saveInstallationDraft(original, draft))) show("draft-saved");
  }
  async function upload(files: File[]) {
    if (!files.length || !draft || a?.status === "전체 완료" || busy) return;
    setBusy(true); data.setError("");
    try {
      const photos = await uploadConstructionPhotos(files);
      setDraft(current => current ? {...current, photos: [...current.photos, ...photos], verified: false} : current);
    } catch (cause) {data.setError(cause instanceof Error ? cause.message : "사진을 첨부하지 못했습니다.");}
    finally {setBusy(false);}
  }
  function finish() {
    if (!a || !draft) return;
    if (a.status === "전체 완료") {show("completed-view"); return;}
    if (!a.published || a.status !== "완료" || !sameInstallation(draft, a)) {install(); return;}
    setChecked(false); data.setError(""); show("completion-review");
  }
  function confirm() {
    if (busy) return;
    if (kind === "register" || kind === "register-support") {
      if (!candidate) return;
      const record = data.register(candidate.id);
      if (record) {
        const p = new URLSearchParams(); p.set("dialog", kind === "register-support" ? "registered-support" : "registered");
        go(p, record.id, true);
      }
      return;
    }
    if (!a || !draft) return;
    if (kind === "status-confirm") {
      if (!target || !hasSavedSchedule()) return;
      if (apply(original => changeConstructionStatus(original, target))) show("status-saved");
    } else if (kind === "installation") {
      if (!hasSavedSchedule()) return;
      if (apply(original => publishInstallation(original, draft))) show("published");
    } else if (kind === "completion-review") {
      if (apply(original => finishConstruction(original, checked))) show("overall-saved");
    }
  }
  const firstNumber = Math.min(Math.max(1, page - 1), Math.max(1, pages - 2));
  const pageNumbers = [firstNumber, firstNumber + 1, firstNumber + 2];
  return <div className={"w-full shrink-0 text-[#202b36] " + constructionFocus + " [&_button:enabled]:cursor-pointer"}>
    <div className="h-[84px]"><h1 className="text-[30px] font-bold leading-9">시공 관리</h1></div>
    <div className="flex min-h-[42px] items-start justify-between gap-3 max-sm:flex-col">
      <div role="tablist" aria-label="시공 상태별 목록" className="flex gap-[10px]">
        {tabs.map((value, index) => <button key={value} type="button" role="tab" aria-selected={tab === value} tabIndex={tab === value ? 0 : -1} onClick={() => selectTab(value)}
          onKeyDown={e => {if (["ArrowLeft", "ArrowRight", "Home", "End"].includes(e.key)) {e.preventDefault(); const next = e.key === "Home" ? 0 : e.key === "End" ? 3 : (index + (e.key === "ArrowRight" ? 1 : -1) + 4) % 4; onKeyboardTab(); selectTab(tabs[next]);}}}
          className={"h-[42px] w-[94px] rounded-md border text-sm font-semibold leading-[19px] " + (value === tab ? "rounded-lg border-[#234f73] bg-[#234f73] text-white" : "border-[#c8d0d7] bg-white")}>{value}</button>)}
      </div>
      <button type="button" onClick={() => {data.setError(""); show("register");}} className={constructionSecondary + " h-[42px] w-[172px]"}>승인 대상 등록</button>
    </div>
    {data.error && <p role="alert" className="mt-3 text-sm leading-[21px] text-[#a53632]">{data.error}</p>}
    <div className="mt-4 grid grid-cols-[minmax(0,720fr)_minmax(0,446fr)] items-start gap-4 max-[1101px]:grid-cols-1">
      <section aria-labelledby="construction-list-title" className="flex h-[516px] min-w-0 flex-col rounded-lg border-[0.75px] border-[#c8d0d7] bg-white px-[19.25px] pt-[17.25px] pb-[17.25px]">
        <div className="flex h-6 shrink-0 items-start justify-between gap-2"><h2 id="construction-list-title" className="text-base font-bold leading-[23px]">시공 대상 목록</h2><p className="text-xs leading-[18px]">총 {filteredCount}건 표시</p></div>
        <div className={"mt-4 min-h-0 flex-1 " + (visible.length ? "overflow-auto" : "flex flex-col overflow-x-auto")}>
          <div role="table" aria-label="시공 대상 목록" className="min-w-[680px]">
            <div role="row" className="grid h-11 grid-cols-[minmax(186px,186fr)_minmax(190px,190fr)_minmax(93px,93fr)_183px] items-center px-[14px] text-xs leading-[18px]">{["접수번호 · 신청자", "시공 시설", "시공일", "시공 상태"].map((label, index) => <div role="columnheader" key={label} className={index === 3 ? "text-center" : ""}>{label}</div>)}</div>
            {visible.map(record => <div role="row" aria-selected={record.id === a?.id} key={record.id} className={"grid min-h-[62px] grid-cols-[minmax(186px,186fr)_minmax(190px,190fr)_minmax(93px,93fr)_183px] items-center border-b border-[#f4f5f6] px-[14px] text-[13px] leading-5 " + (record.id === a?.id ? "bg-[#f4f5f6]" : "")}>
              <div role="cell"><button type="button" onClick={() => {data.setError(""); go(query(), record.id);}} aria-label={record.id + " · " + record.resident + " 시공 선택"} className="py-5 text-left">{record.id + " · " + record.resident}</button></div>
              <div role="cell">{record.facility}</div><div role="cell">{record.date ? displayDate(record.date) : "00.00.00"}</div><div role="cell" className="text-center"><ConstructionBadge status={record.status}/></div>
            </div>)}
          </div>
          {!visible.length && <ConstructionEmpty search={hasData} onReset={reset}/>}
        </div>
        {visible.length > 0 && <nav aria-label="시공 목록 페이지" className="mt-4 flex h-10 shrink-0 items-center justify-center gap-1">
          {[page - 1, ...pageNumbers, page + 1].map((number, index) => <button key={index} type="button" aria-label={index === 0 ? "이전 페이지" : index === 4 ? "다음 페이지" : number + "페이지"} aria-current={index > 0 && index < 4 && number === page ? "page" : undefined} disabled={number < 1 || number > pages}
            onClick={() => {const p = query(); p.set("page", String(number)); data.setError(""); go(p);}}
            className={"grid size-8 place-items-center rounded-[7px] border text-[13px] leading-[18px] disabled:cursor-default disabled:opacity-40 " + (index > 0 && index < 4 && number === page ? "border-[#234f73] bg-[#234f73] font-bold text-white" : "border-[#c8d0d7] bg-white")}>{index === 0 ? "‹" : index === 4 ? "›" : number}</button>)}
        </nav>}
      </section>
      <ConstructionDetail application={a} draft={draft} target={target} busy={busy} onChange={setDraft} onTarget={setTarget} onSchedule={schedule} onStatus={status} onUpload={files => {void upload(files);}} onFinish={finish}/>
    </div>
    {kind && <ConstructionDialogs key={kind} kind={kind} application={a} candidate={candidate} candidates={candidates} draft={draft} target={target} checked={checked} error={data.error} busy={busy} onClose={close} onConfirm={confirm} onInstall={install}
      onPublishedReview={() => {setChecked(false); show("completion-review");}} onDraftSave={temporary} onCandidate={setCandidateId} onChange={setDraft} onChecked={setChecked} onUpload={files => {void upload(files);}}/>}
  </div>;
}
