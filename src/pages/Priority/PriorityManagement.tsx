import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import PriorityDetail from "../../components/priority/PriorityDetail";
import PriorityDialog from "../../components/priority/PriorityDialog";
import { priorityStorageKey, readPrioritySnapshot } from "./mockData";
import type { PriorityApplication } from "./mockData";
import searchIcon from "../../assets/priority/search.svg";
import highDot from "../../assets/priority/risk-high.svg";
import warningDot from "../../assets/priority/risk-warning.svg";
import lowDot from "../../assets/priority/risk-low.svg";
import emptyDocument from "../../assets/priority/empty-document.svg";
import emptySearch from "../../assets/priority/empty-search.svg";

const control =
  "h-[46px] rounded-md border border-[#c8d0d7] bg-white px-3 text-[15px] leading-[21px] tracking-[-.09px] focus:outline-2 focus:outline-offset-2 focus:outline-[#234f73]";
const primary =
  "min-h-11 rounded-md bg-[#234f73] px-4 text-sm font-bold text-white hover:bg-[#183b58] disabled:cursor-not-allowed disabled:bg-[#eef3f7] disabled:text-[#94a3b8]";
const secondary =
  "min-h-11 rounded-md border border-[#234f73] bg-white px-4 text-sm font-bold text-[#234f73] hover:bg-[#eef3f7] disabled:cursor-not-allowed disabled:border-[#cbd5e1] disabled:bg-[#f1f5f9] disabled:text-[#94a3b8]";
const riskStyle = {
  높음: "border-[#a53632] bg-[#faefed] text-[#a53632]",
  주의: "border-[#865a16] bg-[#faf4e8] text-[#865a16]",
  낮음: "border-[#27654d] bg-[#edf5f0] text-[#27654d]",
};
const riskDots = { 높음: highDot, 주의: warningDot, 낮음: lowDot };
const modalKinds = ["designate", "designated", "saved", "reorder"];

function changePosition(order: string[], id: string, delta: number) {
  const from = order.indexOf(id),
    to = from + delta;
  if (from < 0 || to < 0 || to >= order.length) return order;
  const next = [...order];
  [next[from], next[to]] = [next[to], next[from]];
  return next;
}
function orderApplications(
  applications: PriorityApplication[],
  order: string[],
) {
  const eligible = applications.filter((a) => a.designated && !a.assigned);
  const ranked = order
    .map((id) => eligible.find((a) => a.id === id))
    .filter((a): a is PriorityApplication => Boolean(a));
  const full = [...ranked, ...eligible.filter((a) => !order.includes(a.id))];
  let index = 0;
  return applications.map((a) =>
    a.designated && !a.assigned ? full[index++] : a,
  );
}
export default function PriorityManagement() {
  const navigate = useNavigate();
  const { requestId } = useParams();
  const [params, setParams] = useSearchParams();
  const [snapshot, setSnapshot] = useState(readPrioritySnapshot);
  const [draftOrder, setDraftOrder] = useState(() => snapshot.order);
  const [memos, setMemos] = useState<Record<string, string>>({});
  const [dragId, setDragId] = useState<string | null>(null);
  const ordering = params.get("mode") === "order";
  const dialog = params.get("dialog") || "";
  const datasetEmpty = params.get("dataset") === "empty";
  const applications = datasetEmpty
    ? []
    : orderApplications(
        snapshot.applications,
        ordering ? draftOrder : snapshot.order,
      );
  const filtered = applications.filter(
    (a) =>
      (!params.get("district") || a.district === params.get("district")) &&
      (!params.get("risk") || a.risk === params.get("risk")) &&
      (!params.get("status") ||
        (params.get("status") === "배정 완료"
          ? a.assigned
          : params.get("status") === "배정 대기"
            ? a.designated && !a.assigned
            : !a.designated)) &&
      (!params.get("q") ||
        `${a.id} ${a.address}`.includes(params.get("q")!.trim())),
  );
  const selectedId = requestId || params.get("selected") || "000006";
  const selected =
    filtered.find((a) => a.id === selectedId) ||
    (!requestId ? filtered[0] : undefined);
  const memo = selected ? (memos[selected.id] ?? selected.memo) : "";
  const eligible = snapshot.applications.filter(
    (a) => a.designated && !a.assigned,
  );
  const modalOrder = [
    ...draftOrder.filter((id) => eligible.some((a) => a.id === id)),
    ...eligible.filter((a) => !draftOrder.includes(a.id)).map((a) => a.id),
  ];
  const filterKey = [
    params.get("district"),
    params.get("risk"),
    params.get("status"),
    params.get("q"),
  ].join("|");
  const searchEmpty = applications.length > 0 && filtered.length === 0;
  useEffect(() => {
    try {
      localStorage.setItem(priorityStorageKey, JSON.stringify(snapshot));
    } catch {
      /* 메모리 상태로 계속 동작합니다. */
    }
  }, [snapshot]);
  function patch(values: Record<string, string | null>) {
    const p = new URLSearchParams(params);
    Object.entries(values).forEach(([key, value]) => {
      if (value === null) p.delete(key);
      else p.set(key, value);
    });
    setParams(p);
  }
  function select(a: PriorityApplication) {
    navigate({
      pathname: `/priority/${a.id}`,
      search: params.toString() ? `?${params}` : "",
    });
  }
  function search(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const p = new URLSearchParams(params);
    for (const key of ["district", "risk", "status", "q"]) {
      const value = String(data.get(key) || "").trim();
      if (value) p.set(key, value);
      else p.delete(key);
    }
    p.delete("dialog");
    navigate({ pathname: "/priority", search: p.toString() ? `?${p}` : "" });
  }
  function reset() {
    navigate(datasetEmpty ? "/priority?dataset=empty" : "/priority");
  }
  function beginOrder() {
    setDraftOrder(snapshot.order);
    patch({ mode: "order" });
  }
  function saveOrder() {
    setSnapshot((s) => ({ ...s, order: modalOrder }));
    patch({ mode: null, dialog: "saved" });
  }
  function designate() {
    if (!selected || selected.designated) return;
    setSnapshot((s) => ({
      applications: s.applications.map((a) =>
        a.id === selected.id ? { ...a, designated: true, memo } : a,
      ),
      order: [...s.order, selected.id],
    }));
    setDraftOrder((o) => (o.includes(selected.id) ? o : [...o, selected.id]));
    patch({ dialog: "designated" });
  }
  function dropOn(target: string) {
    if (!dragId || dragId === target || !modalOrder.includes(target)) return;
    setDraftOrder((order) => {
      const next = [...order];
      const from = next.indexOf(dragId),
        to = next.indexOf(target);
      if (from < 0 || to < 0) return order;
      next.splice(to, 0, next.splice(from, 1)[0]);
      return next;
    });
    setDragId(null);
  }
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 pb-[13px] text-[#202b36] [&_button]:cursor-pointer [&_button:disabled]:cursor-not-allowed [&_button:focus-visible]:outline-2 [&_button:focus-visible]:outline-offset-2 [&_button:focus-visible]:outline-[#234f73]">
      <h1 className="flex min-h-12 shrink-0 items-center text-[30px] font-bold leading-9">
        우선점검 관리
      </h1>
      <form
        key={filterKey}
        onSubmit={search}
        aria-label="우선점검 검색 조건"
        className="flex shrink-0 flex-wrap gap-[10px] xl:flex-nowrap"
      >
        <select
          name="district"
          aria-label="지역"
          defaultValue={params.get("district") || ""}
          className={`${control} w-[176px]`}
        >
          <option value="">지역 전체</option>
          {["중동", "상동", "원미동"].map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
        <select
          name="risk"
          aria-label="취약도"
          defaultValue={params.get("risk") || ""}
          className={`${control} w-[166px]`}
        >
          <option value="">취약도 전체</option>
          {["높음", "주의", "낮음"].map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
        <select
          name="status"
          aria-label="처리 상태"
          defaultValue={params.get("status") || ""}
          className={`${control} w-[192px]`}
        >
          <option value="">처리 상태 전체</option>
          {["접수", "배정 대기", "배정 완료"].map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
        <div className="relative min-w-[160px] flex-1">
          <img
            src={searchIcon}
            alt=""
            width={16}
            height={16}
            className="pointer-events-none absolute left-3 top-[15px]"
          />
          <input
            name="q"
            aria-label="주소 또는 접수번호"
            defaultValue={params.get("q") || ""}
            placeholder="주소·접수번호 검색"
            className={`${control} w-full border-[#234f73] pl-9 text-sm`}
          />
        </div>
        <button
          type="submit"
          className="h-[46px] w-[101px] rounded-md bg-[#234f73] text-[15px] font-medium text-white hover:bg-[#183b58]"
        >
          검색
        </button>
        <button
          type="button"
          onClick={reset}
          className={`${control} w-[118px]`}
        >
          초기화
        </button>
      </form>
      <div aria-hidden="true" className="h-[10px] shrink-0" />
      <div className="grid min-h-[631px] flex-1 items-stretch gap-4 xl:grid-cols-[minmax(0,784fr)_minmax(342px,384fr)]">
        <section
          aria-label="점검 전 신청 비교"
          className="flex min-h-[631px] min-w-0 flex-col overflow-hidden rounded-lg border border-[#c8d0d7] bg-white"
        >
          <div className="flex h-[62px] shrink-0 items-center justify-between gap-4 px-4">
            <h2 className="text-base font-bold leading-[23px]">
              점검 전 신청 비교
            </h2>
            <p className="text-xs leading-[18px]">총 {filtered.length}건</p>
          </div>
          <div className="min-h-0 flex-1 overflow-auto">
            <table className="w-full min-w-[780px] table-fixed border-collapse text-center text-[13px] leading-5">
              <caption className="sr-only">우선점검 신청 비교 목록</caption>
              <colgroup>
                {[59, 100, 88, 116, 190, 88, 139].map((width, i) => (
                  <col key={i} style={{ width }} />
                ))}
              </colgroup>
              <thead className="sticky top-0 z-10 bg-white text-xs font-normal leading-[18px]">
                <tr className="h-10">
                  {[
                    ordering ? "정렬" : "선택",
                    "접수번호",
                    "취약도",
                    "침수 경험",
                    "주민 요청 사유",
                    "인근 신청",
                    "우선점검",
                  ].map((c) => (
                    <th key={c} scope="col" className="font-normal">
                      {c}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((a) => (
                  <tr
                    key={a.id}
                    onClick={() => select(a)}
                    onDragOver={(e) => {
                      if (ordering && a.designated && !a.assigned)
                        e.preventDefault();
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      dropOn(a.id);
                    }}
                    className={`h-[46px] border-b border-[#c8d0d7] ${a.id === selected?.id ? "bg-[#f4f5f6] font-bold" : "bg-white"}`}
                  >
                    <td className="pl-[15px]">
                      {ordering ? (
                        a.designated && !a.assigned ? (
                          <button
                            type="button"
                            draggable
                            onDragStart={() => setDragId(a.id)}
                            onDragEnd={() => setDragId(null)}
                            onClick={(e) => {
                              e.stopPropagation();
                              patch({ dialog: "reorder" });
                            }}
                            onKeyDown={(e) => {
                              if (
                                e.key === "ArrowUp" ||
                                e.key === "ArrowDown"
                              ) {
                                e.preventDefault();
                                setDraftOrder((o) =>
                                  changePosition(
                                    o,
                                    a.id,
                                    e.key === "ArrowUp" ? -1 : 1,
                                  ),
                                );
                              }
                            }}
                            aria-label={`${a.id} 선정 순서 이동`}
                            className="grid h-8 w-8 place-items-center text-lg text-[#234f73]"
                          >
                            ≡
                          </button>
                        ) : null
                      ) : (
                        <input
                          type="checkbox"
                          aria-label={`${a.id} 신청 선택`}
                          checked={selected?.id === a.id}
                          onChange={() => select(a)}
                          onClick={(e) => e.stopPropagation()}
                          className="h-[17px] w-[17px] cursor-pointer rounded border-[#234f73] accent-[#234f73]"
                        />
                      )}
                    </td>
                    <td>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          select(a);
                        }}
                        className="h-10 w-full"
                      >
                        {a.id}
                      </button>
                    </td>
                    <td>
                      <span
                        className={`inline-flex items-center gap-[5px] rounded-lg border px-[9px] py-1 font-bold ${riskStyle[a.risk]}`}
                      >
                        <img
                          src={riskDots[a.risk]}
                          alt=""
                          width={7}
                          height={7}
                        />
                        {a.risk}
                      </span>
                    </td>
                    <td>{a.floodExperience}</td>
                    <td className="font-normal">{a.reason}</td>
                    <td className="font-normal">{a.nearby}건</td>
                    <td className="pr-[15px]">
                      <span
                        className={`inline-flex h-7 w-[58px] items-center justify-center rounded-lg border font-bold ${a.designated ? "border-[#a53632] bg-[#faefed] text-[#a53632]" : "border-[#cbd5e1] bg-[#f8fafc] text-[#64748b]"}`}
                      >
                        {a.designated ? "지정" : "미지정"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!filtered.length && (
              <div className="flex min-h-[430px] flex-col items-center justify-center px-6 text-center">
                <img
                  src={searchEmpty ? emptySearch : emptyDocument}
                  alt=""
                  width={56}
                  height={56}
                />
                <h3 className="mt-5 text-base font-bold leading-6">
                  {searchEmpty
                    ? "선택한 조건에 맞는 신청이 없습니다."
                    : "우선점검 대상 신청이 없습니다."}
                </h3>
                <p className="mt-4 text-sm leading-[22px] text-[#7b828a]">
                  {searchEmpty
                    ? "검색어나 필터 조건을 변경해 다시 검색해 주세요."
                    : "접수된 신청이 등록되면 이곳에서 확인할 수 있습니다."}
                </p>
                {searchEmpty && (
                  <button
                    type="button"
                    onClick={reset}
                    className="mt-4 min-h-10 rounded-md border border-[#c8d0d7] px-8 text-sm"
                  >
                    검색 조건 초기화
                  </button>
                )}
              </div>
            )}
          </div>
          {!!filtered.length && (
            <nav
              aria-label="페이지 선택"
              className="flex h-[65px] shrink-0 items-center justify-center gap-2 border-t border-[#c8d0d7]"
            >
              <button
                type="button"
                disabled
                aria-label="이전 페이지"
                className="h-[34px] w-[34px] rounded-md border border-[#cbd5e1]"
              >
                ‹
              </button>
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  disabled={n !== 1}
                  aria-current={n === 1 ? "page" : undefined}
                  aria-label={`${n}페이지`}
                  className={`h-[34px] w-[34px] rounded-md border text-sm ${n === 1 ? "border-[#234f73] bg-[#234f73] font-bold text-white" : "border-[#cbd5e1] bg-white text-[#64748b]"}`}
                >
                  {n}
                </button>
              ))}
              <button
                type="button"
                disabled
                aria-label="다음 페이지"
                className="h-[34px] w-[34px] rounded-md border border-[#cbd5e1]"
              >
                ›
              </button>
            </nav>
          )}
        </section>
        <PriorityDetail
          key={selected?.id || "empty"}
          application={selected}
          searchEmpty={searchEmpty}
          memo={memo}
          onMemo={(value) => {
            if (selected) setMemos((m) => ({ ...m, [selected.id]: value }));
          }}
          ordering={ordering}
          onDesignate={() => patch({ dialog: "designate" })}
          onOrder={ordering ? saveOrder : beginOrder}
        />
      </div>
      {modalKinds.includes(dialog) && (
        <PriorityDialog
          key={dialog}
          wide={dialog === "reorder"}
          title={
            dialog === "designate"
              ? "우선점검 대상으로 지정할까요?"
              : dialog === "designated"
                ? "우선점검 대상으로 지정했습니다."
                : dialog === "saved"
                  ? "선정 순서를 저장했습니다."
                  : "지정된 우선점검 대상의 순서 변경"
          }
          onClose={() => patch({ dialog: null })}
        >
          {dialog === "designate" && (
            <>
              <p className="mt-2 text-sm leading-[21px]">
                {selected
                  ? `${selected.id} · ${selected.resident}님의 신청`
                  : "선택된 신청이 없습니다."}
                <br />
                지정 후 현장점검 담당자와 방문 일정을 배정할 수 있습니다.
              </p>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => patch({ dialog: null })}
                  className={secondary}
                >
                  취소
                </button>
                <button
                  type="button"
                  onClick={designate}
                  disabled={!selected || selected.designated}
                  className={primary}
                >
                  대상 지정
                </button>
              </div>
            </>
          )}
          {dialog === "designated" && (
            <>
              <p className="mt-2 text-sm leading-[21px] text-[#64748b]">
                점검 담당자와 방문 일정은 현장점검 관리에서 별도로 배정합니다.
              </p>
              <dl className="mt-4 space-y-2 text-sm">
                <div className="flex">
                  <dt className="w-32 text-[#64748b]">접수번호</dt>
                  <dd>
                    {selected?.id} · {selected?.resident}
                  </dd>
                </div>
                <div className="flex">
                  <dt className="w-32 text-[#64748b]">우선점검</dt>
                  <dd>지정</dd>
                </div>
              </dl>
              <button
                type="button"
                onClick={() => patch({ dialog: null })}
                className={`${primary} mt-4 w-full`}
              >
                확인
              </button>
            </>
          )}
          {dialog === "saved" && (
            <>
              <p className="mt-2 text-sm leading-[21px]">
                지정된 대상의 점검 순서를 변경합니다.
              </p>
              <button
                type="button"
                onClick={() => patch({ dialog: null })}
                className={`${primary} mt-3 w-full`}
              >
                확인
              </button>
            </>
          )}
          {dialog === "reorder" && (
            <>
              <p className="mb-3 mt-2 text-[13px] leading-5 text-[#64748b]">
                지정된 미배정 신청만 표시합니다. 미지정·배정 완료 신청은
                제외됩니다.
              </p>
              <ol className="max-h-[50dvh] space-y-3 overflow-auto">
                {modalOrder.map((id, i) => {
                  const a = eligible.find((a) => a.id === id)!;
                  return (
                    <li
                      key={id}
                      className="flex min-h-12 items-center gap-2 bg-[#f1f5f9] p-2 text-sm font-bold"
                    >
                      <span className="min-w-0 flex-1">
                        {i + 1} · {id} · {a.address}
                      </span>
                      <button
                        type="button"
                        disabled={i === 0}
                        aria-label={`${id} 위로`}
                        onClick={() =>
                          setDraftOrder((o) => changePosition(o, id, -1))
                        }
                        className={`${secondary} min-h-10 w-20`}
                      >
                        ↑
                      </button>
                      <button
                        type="button"
                        disabled={i === modalOrder.length - 1}
                        aria-label={`${id} 아래로`}
                        onClick={() =>
                          setDraftOrder((o) => changePosition(o, id, 1))
                        }
                        className={`${secondary} min-h-10 w-20`}
                      >
                        ↓
                      </button>
                    </li>
                  );
                })}
              </ol>
              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setDraftOrder(snapshot.order);
                    patch({ dialog: null, mode: null });
                  }}
                  className={`${secondary} w-36`}
                >
                  취소
                </button>
                <button
                  type="button"
                  onClick={saveOrder}
                  className={`${primary} w-36`}
                >
                  순서 저장
                </button>
              </div>
            </>
          )}
        </PriorityDialog>
      )}
    </div>
  );
}
