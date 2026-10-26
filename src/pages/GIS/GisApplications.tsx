import { useState } from "react";
import type { FormEvent } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";

import ApplicationMap from "../../components/gis/ApplicationMap";
import ApplicationDetail from "../../components/gis/ApplicationDetail";
import { emptyFilters, initialApplications } from "./mockData";
import type { Filters } from "./types";

import searchIcon from "../../assets/gis/imgSearch1.svg";
import listIcon from "../../assets/gis/imgList.svg";
import listHeading from "../../assets/gis/imgListIcon.svg";
import layersIcon from "../../assets/gis/imgFrame.svg";
import clockIcon from "../../assets/gis/imgClock.svg";
import checkIcon from "../../assets/gis/imgCheckCircle.svg";
import toolboxIcon from "../../assets/gis/imgToolbox1.svg";

const control =
  "h-[46px] rounded-md border border-[#c8d0d7] bg-white px-3 text-[15px] focus:outline-2 focus:outline-offset-2 focus:outline-[#234f73]";

const riskClass = {
  높음: "border-[#a53632] bg-[#faefed] text-[#a53632]",
  주의: "border-[#865a16] bg-[#faf4e8] text-[#865a16]",
  낮음: "border-[#27654d] bg-[#edf5f0] text-[#27654d]",
};

type FilterFormProps = {
  filterKey: string;
  initialFilters: Filters;
  onSearch: (filters: Filters) => void;
  onReset: () => void;
};

function FilterForm({
  filterKey,
  initialFilters,
  onSearch,
  onReset,
}: FilterFormProps) {
  const [draft, setDraft] = useState<Filters>(initialFilters);
  const [lastFilterKey, setLastFilterKey] = useState(filterKey);

  if (lastFilterKey !== filterKey) {
    setLastFilterKey(filterKey);
    setDraft(initialFilters);
  }

  function search(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSearch(draft);
  }

  function reset() {
    setDraft(emptyFilters);
    onReset();
  }

  return (
    <form
      onSubmit={search}
      className="mb-[14px] flex shrink-0 flex-wrap gap-2.5"
    >
      <select
        aria-label="지역"
        value={draft.district}
        onChange={(e) =>
          setDraft((d) => ({
            ...d,
            district: e.target.value,
          }))
        }
        className={`${control} w-[176px]`}
      >
        <option value="">지역 전체</option>
        {["중동", "상동", "원미동"].map((x) => (
          <option key={x}>{x}</option>
        ))}
      </select>

      <select
        aria-label="취약도"
        value={draft.risk}
        onChange={(e) =>
          setDraft((d) => ({
            ...d,
            risk: e.target.value,
          }))
        }
        className={`${control} w-[166px]`}
      >
        <option value="">취약도 전체</option>
        {["높음", "주의", "낮음"].map((x) => (
          <option key={x}>{x}</option>
        ))}
      </select>

      <select
        aria-label="처리 상태"
        value={draft.status}
        onChange={(e) =>
          setDraft((d) => ({
            ...d,
            status: e.target.value,
          }))
        }
        className={`${control} w-[192px]`}
      >
        <option value="">처리 상태 전체</option>
        {[
          "접수",
          "배정 대기",
          "지원 검토 중",
          "시공 진행",
          "지원 미승인",
          "점검 완료",
        ].map((x) => (
          <option key={x}>{x}</option>
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
          aria-label="주소 또는 접수번호 검색"
          value={draft.search}
          onChange={(e) =>
            setDraft((d) => ({
              ...d,
              search: e.target.value,
            }))
          }
          placeholder="주소·접수번호 검색"
          className={`${control} w-full pl-9 text-sm`}
        />
      </div>

      <button
        type="submit"
        className="h-[46px] w-[101px] cursor-pointer rounded-md bg-[#234f73] text-[15px] font-medium text-white"
      >
        검색
      </button>

      <button
        type="button"
        onClick={reset}
        className={`${control} w-[118px] cursor-pointer`}
      >
        초기화
      </button>
    </form>
  );
}

export default function GisApplications() {
  const navigate = useNavigate();
  const { requestId } = useParams();
  const [params, setParams] = useSearchParams();

  const [applications, setApplications] = useState(initialApplications);
  const [showMarkers, setShowMarkers] = useState(true);
  const [mapRevision, setMapRevision] = useState(0);
  const [message, setMessage] = useState("");

  const filterKey = params.toString();

  const initialFilters: Filters = {
    district: params.get("district") || "",
    risk: params.get("risk") || "",
    status: params.get("status") || "",
    search: params.get("q") || "",
  };

  const filtered = applications.filter(
    (a) =>
      (!params.get("district") || a.district === params.get("district")) &&
      (!params.get("risk") || a.risk === params.get("risk")) &&
      (!params.get("status") || a.status === params.get("status")) &&
      (!params.get("q") ||
        `${a.address} ${a.id}`
          .toLowerCase()
          .includes(params.get("q")!.trim().toLowerCase())),
  );

  const selected = applications.find((a) => a.id === requestId);

  const accepted = applications.filter((a) => a.status === "배정 대기").length;

  function select(id: string) {
    setMessage("");

    navigate({
      pathname: `/gis/${id}`,
      search: params.toString() ? `?${params}` : "",
    });
  }

  function close() {
    navigate({
      pathname: "/gis",
      search: params.toString() ? `?${params}` : "",
    });
  }

  function search(filters: Filters) {
    const p = new URLSearchParams();

    if (filters.district) {
      p.set("district", filters.district);
    }

    if (filters.risk) {
      p.set("risk", filters.risk);
    }

    if (filters.status) {
      p.set("status", filters.status);
    }

    if (filters.search.trim()) {
      p.set("q", filters.search.trim());
    }

    setParams(p);
  }

  function reset() {
    setParams({});
    setMapRevision((r) => r + 1);
    setShowMarkers(true);
  }

  function accept(id: string, memo: string) {
    if (applications.find((a) => a.id === id)?.status !== "접수") {
      return;
    }

    setApplications((items) =>
      items.map((a) =>
        a.id === id
          ? {
              ...a,
              status: "배정 대기",
              memo,
              history: [
                ...a.history,
                "접수 처리 완료 · 배정 대기로 변경되었습니다.",
              ],
            }
          : a,
      ),
    );

    setMessage("접수 처리되었습니다. 현재 상태는 배정 대기입니다.");
  }

  const summary = [
    [listIcon, "전체 신청", 128],
    [clockIcon, "배정 대기", 32 + accepted],
    [checkIcon, "점검 진행 중", 8],
    [toolboxIcon, "지원·시공 진행 중", 24],
  ] as const;

  return (
    <div className="flex min-h-0 w-full flex-1 flex-col text-[#202b36]">
      <div className="mb-[14px] flex min-h-11 shrink-0 items-center justify-between gap-4">
        <h1 className="text-[30px] font-bold leading-9 tracking-[-.54px]">
          GIS 신청 관리
        </h1>

        <span className="text-xs text-[#596672]">샘플 데이터</span>
      </div>

      <FilterForm
        filterKey={filterKey}
        initialFilters={initialFilters}
        onSearch={search}
        onReset={reset}
      />

      <div className="mb-[14px] grid shrink-0 grid-cols-2 gap-[14px] lg:grid-cols-4">
        {summary.map(([icon, label, count], i) => (
          <div
            key={label}
            className={`flex min-h-[88px] min-w-0 items-center gap-3 p-4 ${
              i < 3 ? "border-r border-[#c8d0d7]" : ""
            }`}
          >
            <img
              src={icon}
              alt=""
              width={21}
              height={21}
              className="m-2 shrink-0"
            />

            <div>
              <p className="text-[15px] leading-[21px]">{label}</p>

              <p className="text-[26px] font-bold leading-[30px]">{count}건</p>
            </div>
          </div>
        ))}
      </div>

      {message && (
        <p role="status" className="mb-3 text-sm text-[#27654d]">
          {message}
        </p>
      )}

      <div className="grid min-h-[500px] flex-1 items-stretch gap-[14px] lg:min-h-[500px] lg:grid-cols-[minmax(0,678fr)_minmax(390px,490fr)]">
        <ApplicationMap
          key={mapRevision}
          applications={filtered}
          selectedId={requestId || "000001"}
          showMarkers={showMarkers}
          onSelect={select}
        />

        {requestId ? (
          selected ? (
            <ApplicationDetail
              key={selected.id}
              application={selected}
              onClose={close}
              onAccept={accept}
            />
          ) : (
            <section className="rounded-lg border border-[#c8d0d7] bg-white p-6">
              <h2 className="font-bold">신청을 찾을 수 없습니다.</h2>

              <button
                onClick={close}
                className="mt-4 cursor-pointer text-[#234f73] underline"
              >
                신청 목록으로 돌아가기
              </button>
            </section>
          )
        ) : (
          <section
            aria-label="신청 목록"
            className="flex h-full min-h-[500px] min-w-0 flex-col rounded-lg border border-[#c8d0d7] bg-white p-[14px] lg:min-h-0"
          >
            <h2 className="mb-4 flex min-h-11 items-center gap-2 border-b border-[#f4f5f6] pb-3 text-[22px] font-bold">
              <img src={listHeading} alt="" width={32} height={32} />
              신청 목록
              <button
                type="button"
                disabled
                title="준비 중"
                className="ml-auto flex h-9 items-center gap-1 rounded-md border border-[#c8d0d7] px-2 text-sm font-bold disabled:cursor-not-allowed disabled:opacity-60"
              >
                <img src={layersIcon} alt="" width={18} height={18} />
                우선점검 관리
              </button>
            </h2>

            <ul className="min-h-0 flex-1 overflow-y-auto">
              {filtered.map((a) => (
                <li key={a.id} className="border-b border-[#f4f5f6]">
                  <button
                    onClick={() => select(a.id)}
                    className={`flex min-h-16 w-full cursor-pointer items-center gap-3 rounded-lg border-l-4 px-3 py-2 text-left focus-visible:outline-2 focus-visible:outline-[#234f73] ${
                      a.id === "000001"
                        ? "border-l-[#234f73] bg-[#f4f5f6]"
                        : "border-l-transparent hover:bg-[#f4f5f6]"
                    }`}
                  >
                    <span className="min-w-0 flex-1">
                      <strong className="block text-base leading-[21px]">
                        {a.number}. {a.address}
                      </strong>

                      <span className="mt-[3px] block text-sm leading-[19px]">
                        {a.id} · {a.resident} · {a.status}
                      </span>
                    </span>

                    <span
                      className={`shrink-0 rounded-lg border px-3 py-1 text-[13px] font-bold ${
                        riskClass[a.risk]
                      }`}
                    >
                      {a.risk}
                    </span>

                    <span className="shrink-0 text-sm">상세 &gt;</span>
                  </button>
                </li>
              ))}

              {!filtered.length && (
                <li className="py-12 text-center text-sm text-[#596672]">
                  검색 조건에 맞는 신청이 없습니다.
                </li>
              )}
            </ul>

            <label className="mt-4 flex cursor-pointer items-center gap-2 text-[13px]">
              <input
                type="checkbox"
                role="switch"
                checked={showMarkers}
                onChange={(e) => setShowMarkers(e.target.checked)}
                className="h-5 w-5 accent-[#234f73]"
              />
              마커와 상태를 표시
            </label>
          </section>
        )}
      </div>
    </div>
  );
}
