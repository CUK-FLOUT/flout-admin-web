import { useState } from "react";
import type { FormEvent } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import SupportSelect from "../../components/support/SupportSelect";
import SupportDetail from "../../components/support/SupportDetail";
import SupportBadge from "../../components/support/SupportBadge";
import SupportEmpty from "../../components/support/SupportEmpty";
import SupportDialogs from "../../components/support/SupportDialogs";
import { supportFocus, supportPrimary, supportSecondary } from "../../components/support/styles";
import { consentLabel, filterSupport } from "./model";
import { useSupportData } from "./useSupportData";
import type { SupportDialogKind, SupportFilters } from "./types";
import search from "../../assets/support/search.svg";
import documentIcon from "../../assets/support/stat-document.svg";
import reviewIcon from "../../assets/support/stat-review.svg";
import clockIcon from "../../assets/support/stat-clock.svg";
import userIcon from "../../assets/support/stat-user.svg";
const initialFilters = (p: URLSearchParams): SupportFilters => ({district: p.get("district") || "", status: p.get("status") || "", consent: p.get("consent") || "", q: p.get("q") || ""});
const panel = "h-[calc(var(--support-viewport-height,100dvh)_-_384px)] min-h-[516px] max-[1101px]:h-[516px]";
export default function SupportManagement() {
  const [params] = useSearchParams();
  const filterKey = JSON.stringify({...initialFilters(params), dataset: params.get("dataset")});
  return <SupportManagementScreen key={filterKey}/>;
}
function SupportManagementScreen() {
  const {requestId} = useParams();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const {applications, error} = useSupportData();
  const [filters, setFilters] = useState(() => initialFilters(params));
  const source = params.get("dataset") === "empty" ? [] : applications;
  const filtered = filterSupport(source, initialFilters(params));
  const pageCount = Math.max(1, Math.ceil(filtered.length / 5));
  const page = Math.min(pageCount, Math.max(1, Math.floor(Number(params.get("page"))) || 1));
  const visible = filtered.slice((page - 1) * 5, page * 5);
  const selectedId = requestId || params.get("selected");
  const selected = selectedId === "none" ? undefined : selectedId ? filtered.find(a => a.id === selectedId) : visible[0];
  const stats = [
    {label: "지원 신청", count: source.length, icon: documentIcon},
    {label: "검토 중", count: source.filter(a => a.status === "검토 중").length, icon: reviewIcon},
    {label: "동의 확인 필요", count: source.filter(a => a.review.consentRequired === "필요" && a.review.consentState !== "확인 완료").length, icon: clockIcon},
    {label: "승인", count: source.filter(a => a.status === "승인").length, icon: userIcon},
  ];
  const kind = params.get("dialog") as SupportDialogKind | null;
  const dialog = selected && ["inspection", "document", "approved-view", "rejected-view"].includes(kind || "") ? kind : null;
  const returnQuery = () => { const p = new URLSearchParams(params); p.delete("dialog"); p.delete("document"); return p; };
  function change(next: URLSearchParams, id?: string, replace = false) { navigate({pathname: "/support" + (id ? "/" + id : ""), search: next.toString()}, {replace}); }
  function searchSubmit(e: FormEvent) {
    e.preventDefault();
    const p = returnQuery(); ["district", "status", "consent", "q", "page", "selected"].forEach(k => p.delete(k));
    Object.entries(filters).forEach(([k, v]) => { if (v.trim()) p.set(k, v.trim()); });
    change(p);
  }
  function reset() {
    setFilters({district: "", status: "", consent: "", q: ""});
    const p = new URLSearchParams(); if (params.get("dataset") === "empty") p.set("dataset", "empty");
    change(p);
  }
  function showDialog(value: SupportDialogKind, document?: string) {
    if (!selected) return;
    const p = returnQuery(); p.set("dialog", value); if (document) p.set("document", document);
    change(p, selected.id);
  }
  function review() {
    if (!selected) return;
    if (selected.status !== "검토 중") { showDialog(selected.status === "승인" ? "approved-view" : "rejected-view"); return; }
    const p = returnQuery(); p.delete("selected"); p.set("returnTo", "/support/" + selected.id + (returnQuery().size ? "?" + returnQuery().toString() : ""));
    navigate("/support/" + selected.id + "/review?" + p.toString());
  }
  const pageNumbers = [1, 2, 3].map(i => Math.min(Math.max(1, page - 1), Math.max(1, pageCount - 2)) + i - 1);
  return <div className={"w-full shrink-0 pt-0.5 text-[#202b36] " + supportFocus + " [&_button:enabled]:cursor-pointer"}>
    <h1 className="flex h-12 items-start text-[30px] font-bold leading-9">지원 신청 관리</h1>
    <form onSubmit={searchSubmit} aria-label="지원 신청 검색" className="mt-4 grid h-[46px] grid-cols-[166px_180px_184px_minmax(160px,1fr)_101px_119px] gap-[10px] max-[1101px]:h-auto max-[1101px]:grid-cols-2">
      <SupportSelect label="지역" value={filters.district || "지역 전체"} options={["지역 전체", "원미구", "소사구", "오정구"]} onChange={v => setFilters(f => ({...f, district: v === "지역 전체" ? "" : v}))}/>
      <SupportSelect label="지원 상태" value={filters.status || "지원 상태 전체"} options={["지원 상태 전체", "검토 중", "승인", "미승인"]} onChange={v => setFilters(f => ({...f, status: v === "지원 상태 전체" ? "" : v}))}/>
      <SupportSelect label="동의 확인" value={filters.consent || "동의 확인 전체"} options={["동의 확인 전체", "불필요", "필요 여부 검토 전", "필요 · 미확인", "필요 · 자료 요청", "필요 · 확인 중", "필요 · 확인 완료", "필요 · 불필요"]} onChange={v => setFilters(f => ({...f, consent: v === "동의 확인 전체" ? "" : v}))}/>
      <label className="flex h-12 min-w-0 items-center gap-[10px] rounded-md border border-[#c8d0d7] bg-white px-[14px]"><img src={search} alt="" width={18} height={18}/><input aria-label="접수번호 · 신청자 검색" value={filters.q} onChange={e => setFilters(f => ({...f, q: e.target.value}))} placeholder="접수번호 · 신청자 검색" className="min-w-0 flex-1 text-sm leading-5 outline-none placeholder:text-[#202b36]"/></label>
      <button type="submit" className={supportPrimary + " h-12"}>검색</button><button type="button" onClick={reset} className={supportSecondary + " h-12"}>초기화</button>
    </form>
    <section aria-label="지원 신청 통계" className="mt-4 grid grid-cols-4 gap-3 max-[1101px]:grid-cols-2">
      {stats.map(stat => <article key={stat.label} className="flex h-24 min-w-0 items-center gap-[18px] rounded-lg border-[0.75px] border-[#c8d0d7] bg-white px-[18px]">
        <span className="grid size-[58px] shrink-0 place-items-center rounded-lg bg-[#f4f5f6]"><img src={stat.icon} alt="" width={28} height={28}/></span>
        <div className="flex min-w-0 flex-col gap-1 pt-1"><h2 className="text-sm leading-[17px]">{stat.label}</h2><p className="text-[27px] font-bold leading-[33px]">{stat.count}건</p></div>
      </article>)}
    </section>
    {error && <p role="alert" className="mt-3 text-sm text-[#a53632]">{error}</p>}
    <div className="mt-[22px] grid grid-cols-[minmax(0,720fr)_minmax(0,446fr)] items-start gap-4 pb-[34px] max-[1101px]:grid-cols-1">
      <section aria-labelledby="support-list-title" className={"flex min-w-0 flex-col rounded-lg border-[0.75px] border-[#c8d0d7] bg-white px-[15.25px] pt-[17.25px] pb-[13.25px] " + panel}>
        <div className="flex h-6 shrink-0 items-start justify-between gap-2"><h2 id="support-list-title" className="text-base font-bold leading-[23px]">지원 신청 목록</h2><span className="text-xs leading-[18px]">총 {filtered.length}건</span></div>
        {!filtered.length ? <SupportEmpty search={source.length > 0} onReset={reset}/> : <>
          <div className="mt-[19px] min-h-0 flex-1 overflow-auto">
            <div role="table" aria-label="지원 신청 목록" className="min-w-[688px]">
              <div role="row" className="grid h-11 grid-cols-[minmax(181px,181fr)_minmax(194px,194fr)_minmax(190px,190fr)_95px] items-center px-[14px] text-xs leading-[18px]">
                {["접수번호 · 신청자", "주민 신청 조치", "임대인 동의", "지원 상태"].map((h, i) => <div role="columnheader" key={h} className={i === 3 ? "text-center" : ""}>{h}</div>)}
              </div>
              {visible.map(a => <div key={a.id} role="row" aria-selected={selected?.id === a.id} className={"grid min-h-[62px] grid-cols-[minmax(181px,181fr)_minmax(194px,194fr)_minmax(190px,190fr)_95px] items-center border-b border-[#f4f5f6] px-[14px] text-[13px] leading-5 " + (selected?.id === a.id ? "bg-[#f4f5f6]" : "bg-white")}>
                <div role="cell"><button type="button" onClick={() => change(returnQuery(), a.id)} aria-label={a.id + " · " + a.resident + " 신청 선택"} className="py-5 text-left after:absolute">{a.id + " · " + a.resident}</button></div>
                <div role="cell">{a.request}</div><div role="cell" className={a.review.consentState === "확인 완료" ? "text-[#27654d]" : ""}>{consentLabel(a)}</div><div role="cell" className="text-center"><SupportBadge status={a.status}/></div>
              </div>)}
            </div>
          </div>
          <nav aria-label="지원 신청 페이지" className="flex h-11 shrink-0 items-center justify-center gap-[6px]">
            {[page - 1, ...pageNumbers, page + 1].map((number, index) => <button key={index} type="button" aria-label={index === 0 ? "이전 페이지" : index === 4 ? "다음 페이지" : number + "페이지"} aria-current={index > 0 && index < 4 && number === page ? "page" : undefined} disabled={number < 1 || number > pageCount}
              onClick={() => { const p = returnQuery(); p.set("page", String(number)); p.delete("selected"); change(p); }}
              className={"grid size-7 place-items-center rounded-md border text-[13px] disabled:cursor-default disabled:opacity-40 " + (index > 0 && index < 4 && number === page ? "border-[#234f73] bg-[#234f73] font-bold text-white" : "border-[#c8d0d7] bg-white")}>{index === 0 ? "‹" : index === 4 ? "›" : number}</button>)}
          </nav>
        </>}
      </section>
      <SupportDetail application={selected} onReview={review} onDialog={showDialog} className={panel}/>
    </div>
    {dialog && selected && <SupportDialogs kind={dialog} application={selected} document={params.get("document") || undefined} onClose={() => change(returnQuery(), selected.id, true)}/>}
  </div>;
}
