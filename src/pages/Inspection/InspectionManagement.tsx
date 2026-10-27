import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import AssignmentPanel from "../../components/inspection/AssignmentPanel";
import InspectionDialog from "../../components/inspection/InspectionDialog";
import type { InspectionDialogState } from "../../components/inspection/InspectionDialog";
import { assignees, formatDate, inspectionStatuses, inspectionStorageKey, readInspections } from "./mockData";
import type { EditableStatus, InspectionApplication } from "./mockData";
import { priorityStorageKey, readPrioritySnapshot } from "../Priority/mockData";
import emptyDocument from "../../assets/priority/empty-document.svg";
import emptySearch from "../../assets/priority/empty-search.svg";
import { inspectionCheckbox, inspectionFocus, inspectionPanel } from "../../components/inspection/styles";
const control = "h-[46px] shrink-0 rounded-md border border-[#c8d0d7] bg-white px-3 text-[13px] font-medium leading-[19px]";
const badgeStyles = {
  대기: "border-[#cbd5e1] bg-[#f8fafc] text-[#64748b]",
  예정: "border-[#865a16] bg-[#faf4e8] text-[#865a16]",
  진행: "border-[#27654d] bg-[#edf5f0] text-[#27654d]",
  완료: "border-[#4a7799] bg-[#eaf4fb] text-[#234f73]",
};
function EmptyContent({search, panel, onReset}: {search: boolean; panel?: boolean; onReset: () => void}) {
  return <div className="flex min-h-[240px] flex-1 flex-col items-center justify-center gap-[14px] px-4 text-center font-[family-name:Inter,Pretendard,sans-serif]">
    <img src={search ? emptySearch : emptyDocument} alt="" width={56} height={56} />
    <p className={`${panel ? "text-[15px]" : "text-base"} font-bold leading-6`}>{panel ? "선택된 신청이 없습니다" : search ? "선택한 조건에 맞는 신청이 없습니다." : "현장점검 신청이 없습니다."}</p>
    <p className={`${panel ? "text-[13px]" : "text-sm"} leading-[21px] opacity-65`}>{panel ? <>목록에서 신청을 선택하면<br />담당자와 점검 일정을 배정할 수 있습니다.</> : search ? "검색어나 필터 조건을 변경해 다시 검색해 주세요." : "현장점검 대상 신청이 등록되면 이곳에 표시됩니다."}</p>
    {search && !panel && <button type="button" onClick={onReset} className="h-10 w-[170px] rounded-md border border-[#c8d0d7] bg-white px-3 text-[13px] font-bold">검색 조건 초기화</button>}
  </div>;
}
export default function InspectionManagement() {
  const navigate = useNavigate();
  const {requestId} = useParams();
  const [params, setParams] = useSearchParams();
  const [applications, setApplications] = useState(readInspections);
  const [storageError, setStorageError] = useState("");
  const [priorityOverrides] = useState(() => {
    try { return localStorage.getItem(priorityStorageKey) ? readPrioritySnapshot().applications : []; }
    catch { return []; }
  });
  const source = params.get("dataset") === "empty" ? [] : applications.map(a => ({...a,
    priority: priorityOverrides.find(p => p.id === a.id && p.address === a.address)?.designated ?? a.priority,
  }));
  const stage = ["전체", "배정 대기", ...inspectionStatuses].includes(params.get("stage") || "") ? params.get("stage")! : "전체";
  const filtered = source.filter(a => (stage === "전체" || a.status === (stage === "배정 대기" ? "대기" : stage))
    && (!params.get("district") || a.district === params.get("district"))
    && (!params.get("assignee") || a.assignee === params.get("assignee"))
    && (!params.get("visit") || (params.get("visit") === "미입력" ? !a.requestedDate : a.requestedDate === params.get("visit")))
    && (!params.get("q") || `${a.id} ${a.address}`.includes(params.get("q")!.trim())));
  const selectedId = params.get("selected") === "none" ? "none" : requestId || params.get("selected");
  const selected = selectedId === "none" ? undefined : filtered.find(a => a.id === selectedId) || (!selectedId ? filtered[0] : undefined);
  const searchEmpty = source.length > 0 && filtered.length === 0;
  const kind = params.get("dialog");
  const modal = ["confirm", "status-saved", "assignment-saved"].includes(kind || "") ? kind as InspectionDialogState : null;
  const targetStatus: EditableStatus = inspectionStatuses.includes(params.get("target") as EditableStatus) ? params.get("target") as EditableStatus : "예정";
  const filterKey = [params.get("district"), params.get("assignee"), params.get("visit"), params.get("q")].join("|");
  useEffect(() => {
    const update = (event: StorageEvent) => { if (event.key === inspectionStorageKey || event.key === null) setApplications(readInspections()); };
    window.addEventListener("storage", update);
    return () => window.removeEventListener("storage", update);
  }, []);
  function changeParams(values: Record<string, string | null>) {
    const next = new URLSearchParams(params);
    Object.entries(values).forEach(([key,value]) => value ? next.set(key,value) : next.delete(key));
    setParams(next);
  }
  function reset() {
    const next = new URLSearchParams();
    if (params.get("dataset") === "empty") next.set("dataset", "empty");
    navigate(`/inspection${next.size ? `?${next}` : ""}`);
  }
  function search(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const next = new URLSearchParams(params);
    ["district", "assignee", "visit", "q"].forEach(key => {
      const value = String(data.get(key) || "").trim();
      if (value) next.set(key,value); else next.delete(key);
    });
    ["selected", "dialog", "target"].forEach(key => next.delete(key));
    navigate(`/inspection?${next}`);
  }
  function select(id: string) {
    const next = new URLSearchParams(params);
    ["selected", "dialog", "target"].forEach(key => next.delete(key));
    navigate(`/inspection/${id}${next.size ? `?${next}` : ""}`);
  }
  function save(application: InspectionApplication, dialog: InspectionDialogState) {
    const next = applications.map(a => a.id === application.id ? application : a);
    try {
      localStorage.setItem(inspectionStorageKey, JSON.stringify(next));
      setApplications(next); setStorageError("");
      // Filter changes must not make the saved record and its confirmation disappear.
      const query = new URLSearchParams(params);
      ["stage", "district", "assignee", "visit", "q", "selected"].forEach(key => query.delete(key));
      query.set("dialog", dialog); query.set("target", application.status === "대기" ? "예정" : application.status);
      navigate(`/inspection/${application.id}?${query}`);
      return true;
    } catch {
      setStorageError("브라우저 저장 공간에 저장하지 못했습니다. 저장 공간과 브라우저 설정을 확인해 주세요.");
      changeParams({dialog: null, target: null}); return false;
    }
  }
  function closeDialog() { changeParams({dialog: null, target: null}); }
  return <div className={`flex min-w-0 flex-col gap-4 pt-[2px] text-[#202b36] [&_button:enabled]:cursor-pointer [&_select]:cursor-pointer ${inspectionFocus}`}>
    <div className="flex h-12 shrink-0 items-center"><h1 className="text-[30px] font-bold leading-9">현장점검 관리</h1></div>
    <div role="tablist" aria-label="점검 상태별 목록" className="flex min-h-10 shrink-0 gap-2 overflow-x-auto">
      {["전체", "배정 대기", ...inspectionStatuses].map((tab,index,tabs) => <button type="button" key={tab} role="tab" aria-selected={stage === tab}
        tabIndex={stage === tab ? 0 : -1} aria-controls="inspection-list"
        onKeyDown={event => {
          if (!["ArrowRight", "ArrowLeft", "Home", "End"].includes(event.key)) return;
          event.preventDefault();
          const next = event.key === "Home" ? 0 : event.key === "End" ? tabs.length - 1 : (index + (event.key === "ArrowRight" ? 1 : -1) + tabs.length) % tabs.length;
          changeParams({stage: tabs[next] === "전체" ? null : tabs[next], selected: null, dialog: null, target: null});
          (event.currentTarget.parentElement?.children[next] as HTMLButtonElement)?.focus();
        }}
        onClick={() => { const query = new URLSearchParams(params); ["selected", "dialog", "target"].forEach(key => query.delete(key));
          if (tab === "전체") query.delete("stage"); else query.set("stage",tab); navigate(`/inspection?${query}`); }}
        className={`h-10 shrink-0 rounded-md border px-4 text-sm font-bold leading-5 ${tab === "배정 대기" ? "w-[104px]" : "w-[92px]"} ${stage === tab ? "border-[#234f73] bg-[#234f73] text-white" : "border-[#c8d0d7] bg-white"}`}>{tab}</button>)}
    </div>
    <form key={filterKey} onSubmit={search} className="flex h-[46px] shrink-0 items-center gap-[10px] max-[1400px]:h-auto max-[1400px]:flex-wrap max-[1400px]:[&>*]:grow" aria-label="현장점검 검색 조건">
      <select name="district" aria-label="지역" defaultValue={params.get("district") || ""} className={`${control} w-[176px]`}><option value="">지역 전체</option>{["중동", "상동", "원미동"].map(value => <option key={value}>{value}</option>)}</select>
      <select name="assignee" aria-label="담당자 필터" defaultValue={params.get("assignee") || ""} className={`${control} w-[166px]`}><option value="">전체 담당자</option>{["미배정", ...assignees].map(value => <option key={value}>{value}</option>)}</select>
      <select name="visit" aria-label="방문일 필터" defaultValue={params.get("visit") || ""} className={`${control} w-[192px]`}><option value="">방문일 전체</option><option value="미입력">희망일 미입력</option>{[...new Set(applications.map(a => a.requestedDate).filter(Boolean))].sort().map(value => <option key={value} value={value}>{formatDate(value)}</option>)}</select>
      <label className={`${control} flex min-w-[160px] flex-1 items-center gap-2 text-sm font-normal`}><span aria-hidden="true" className="w-5 shrink-0 text-center text-lg font-bold leading-7">⌕</span><input name="q" aria-label="주소·접수번호 검색" defaultValue={params.get("q") || ""} placeholder="주소·접수번호 검색" className="min-w-0 flex-1 bg-transparent outline-none placeholder:text-[#202b36]" /></label>
      <button type="submit" className="h-[46px] w-[101px] shrink-0 rounded-[7px] bg-[#234f73] text-sm font-bold text-white">검색</button>
      <button type="button" onClick={reset} className={`${control} w-[118px] text-sm font-bold`}>초기화</button>
    </form>
    {storageError && <p role="alert" className="text-sm text-[#a53632]">{storageError}</p>}
    <div className="grid grid-cols-[minmax(760px,1fr)_406px] gap-4 max-[1400px]:grid-cols-[minmax(0,1fr)_380px] max-[1101px]:grid-cols-[minmax(0,1fr)]">
      <section id="inspection-list" aria-label="점검 신청 목록" className={`${inspectionPanel} flex min-w-0 flex-col overflow-hidden rounded-lg border-[.75px] border-[#c8d0d7] bg-white`}>
        <div className="flex h-[58px] shrink-0 items-center justify-between px-4"><h2 className="text-lg font-bold leading-7">점검 신청 목록</h2><span className="text-[13px] leading-[22px]" aria-live="polite">총 {filtered.length}건</span></div>
        <div className="flex min-h-0 flex-1 flex-col overflow-auto" tabIndex={0} aria-label="점검 신청 목록 스크롤">
          <table className="w-full table-fixed border-collapse max-[1400px]:min-w-[758px] [&_th]:h-[42px] [&_th]:text-center [&_th]:text-[12px] [&_th]:font-normal [&_th]:leading-[17px] [&_td]:h-[42px] [&_td]:border-b [&_td]:border-[#c8d0d7] [&_td]:p-0 [&_td]:text-center [&_td]:text-[13px] [&_td]:leading-[19px] [&_:is(td,th):first-child]:pl-3 [&_:is(td,th):last-child]:pr-3" aria-label="현장점검 신청"><colgroup>{[56,194,110,160,100,138.5].map((width,index) => <col key={index} style={{width: `${width / 758.5 * 100}%`}} />)}</colgroup>
            <thead className="sticky top-0 z-10 bg-white"><tr>{["선택", "접수번호 · 주소", "우선점검", "방문 희망일·시간대", "담당자", "상태"].map((text,index) => <th scope="col" key={text}>{index === 0 ? <span className="sr-only">{text}</span> : text}</th>)}</tr></thead>
            <tbody>{filtered.map(a => <tr key={a.id} className={a.id === selected?.id ? "bg-[#f4f5f6]" : "bg-white hover:bg-[#eef3f7]"}>
              <td><input type="checkbox" aria-label={`${a.id} 신청 선택`} checked={a.id === selected?.id} onChange={() => a.id === selected?.id ? changeParams({selected: "none"}) : select(a.id)} className={`${inspectionCheckbox} mx-auto`} /></td>
              <td><button type="button" onClick={() => select(a.id)} className={`flex h-[41px] w-full items-center justify-center ${a.id === selected?.id ? "font-bold" : "font-normal"}`}>{a.id} · {a.address}</button></td>
              <td><span className={`inline-flex h-7 w-[58px] items-center justify-center rounded-lg border text-xs font-bold leading-[17px] ${a.priority ? "border-[#a53632] bg-[#faefed] text-[#a53632]" : "border-[#cbd5e1] bg-[#f8fafc] text-[#64748b]"}`}>{a.priority ? "지정" : "미지정"}</span></td>
              <td><div className="text-xs leading-[17px]">{a.requestedDate ? formatDate(a.requestedDate) : "희망일 미입력"}<br />{a.requestedTime}</div></td>
              <td>{a.assignee}</td>
              <td><span className={`inline-flex h-7 w-[58px] items-center justify-center rounded-lg border text-xs font-bold leading-[17px] ${badgeStyles[a.status]}`}>{a.status}</span></td>
            </tr>)}</tbody>
          </table>
          {!filtered.length && <EmptyContent search={searchEmpty} onReset={reset} />}
        </div>
        {!!filtered.length && <nav aria-label="목록 페이지" className="flex h-[61.5px] shrink-0 items-center justify-center gap-2">
          <button type="button" disabled aria-label="이전 페이지" className="size-[34px] rounded-md border border-[#c8d0d7] text-xs disabled:text-[#64748b]">‹</button>
          <button type="button" aria-current="page" className="size-[34px] rounded-md bg-[#234f73] text-xs font-bold text-white">1</button>
          <button type="button" disabled aria-label="다음 페이지" className="size-[34px] rounded-md border border-[#c8d0d7] text-xs disabled:text-[#64748b]">›</button>
        </nav>}
      </section>
      {selected ? <AssignmentPanel key={`${selected.id}:${selected.assignee}:${selected.visitDate}:${selected.visitTime}:${selected.status}:${selected.notice}:${selected.notifyResident}`} application={selected} onSave={save} onStatus={status => changeParams({dialog: "confirm", target: status})} />
        : <section aria-label="점검 배정" className={`${inspectionPanel} flex flex-col gap-2 rounded-lg border-[.75px] border-[#c8d0d7] bg-white p-[15.25px]`}><h2 className="flex h-[30px] shrink-0 items-center text-lg font-bold leading-[26px]">점검 배정</h2><EmptyContent search={searchEmpty} panel onReset={reset} /></section>}
    </div>
    {selected && modal && (modal !== "confirm" || (selected.assignee !== "미배정" && selected.visitDate && selected.visitTime)) && <InspectionDialog key={modal} kind={modal} application={selected} targetStatus={targetStatus} onClose={closeDialog} onConfirm={() => {
      if (selected.assignee === "미배정" || !selected.visitDate || !selected.visitTime || (targetStatus === "완료" && !selected.resultPublished)) return;
      save({...selected, status: targetStatus}, "status-saved");
    }} />}
  </div>;
}
