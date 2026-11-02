import { useCallback, useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";

import ApplicationDetail from "../../components/gis/ApplicationDetail";
import ApplicationList from "../../components/gis/ApplicationList";
import ApplicationMap from "../../components/gis/ApplicationMap";
import GisFilters from "../../components/gis/GisFilters";
import { filterApplications } from "./filterApplications";
import { initialApplications } from "./mockData";
import type { Filters } from "./types";

import listIcon from "../../assets/gis/imgList.svg";
import clockIcon from "../../assets/gis/imgClock.svg";
import checkIcon from "../../assets/gis/imgCheckCircle.svg";
import toolboxIcon from "../../assets/gis/imgToolbox1.svg";

export default function GisApplications() {
  const navigate = useNavigate();
  const { requestId } = useParams();
  const [params] = useSearchParams();

  const [applications, setApplications] = useState(initialApplications);
  const [showMarkers, setShowMarkers] = useState(true);
  const [mapRevision, setMapRevision] = useState(0);
  const [message, setMessage] = useState("");

  const filterKey = params.toString();

  const filters = useMemo<Filters>(() => {
    const query = new URLSearchParams(filterKey);

    return {
      district: query.get("district") || "",
      risk: query.get("risk") || "",
      status: query.get("status") || "",
      search: query.get("q") || "",
    };
  }, [filterKey]);
  const isEmptyDataset = params.get("dataset") === "empty";
  const source = isEmptyDataset ? [] : applications;
  const filtered = useMemo(
    () => filterApplications(isEmptyDataset ? [] : applications, filters),
    [applications, filters, isEmptyDataset],
  );
  const selected = filtered.find((application) => application.id === requestId);
  const selectedId = selected?.id;

  const accepted = applications.filter(
    (application) => application.status === "배정 대기",
  ).length;

  const handleSelectApplication = useCallback(
    (id: string) => {
      setMessage("");
      navigate({
        pathname: `/gis/${id}`,
        search: filterKey ? `?${filterKey}` : "",
      });
    },
    [navigate, filterKey],
  );

  function handleCloseDetail() {
    navigate({
      pathname: "/gis",
      search: params.toString() ? `?${params}` : "",
    });
  }

  function handleSearch(filters: Filters) {
    const nextParams = new URLSearchParams();

    if (params.get("dataset") === "empty") nextParams.set("dataset", "empty");

    if (filters.district) {
      nextParams.set("district", filters.district);
    }

    if (filters.risk) {
      nextParams.set("risk", filters.risk);
    }

    if (filters.status) {
      nextParams.set("status", filters.status);
    }

    if (filters.search.trim()) {
      nextParams.set("q", filters.search);
    }

    const keepSelection =
      requestId &&
      filterApplications(source, filters).some(
        (application) => application.id === requestId,
      );

    navigate(
      {
        pathname: keepSelection ? `/gis/${requestId}` : "/gis",
        search: nextParams.toString() ? `?${nextParams}` : "",
      },
      { replace: true },
    );
  }

  function handleReset() {
    navigate(
      {
        pathname: "/gis",
        search: params.get("dataset") === "empty" ? "?dataset=empty" : "",
      },
      { replace: true },
    );
    setMapRevision((r) => r + 1);
    setShowMarkers(true);
  }

  function handleAcceptApplication(id: string, memo: string) {
    if (
      applications.find((application) => application.id === id)?.status !==
      "접수"
    ) {
      return;
    }

    setApplications((items) =>
      items.map((application) =>
        application.id === id
          ? {
              ...application,
              status: "배정 대기",
              memo,
              history: [
                ...application.history,
                "접수 처리 완료 · 배정 대기로 변경되었습니다.",
              ],
            }
          : application,
      ),
    );

    setMessage("접수 처리되었습니다. 현재 상태는 배정 대기입니다.");
  }

  function renderApplicationPanel() {
    if (selected) {
      return (
        <ApplicationDetail
          key={selected.id}
          application={selected}
          onClose={handleCloseDetail}
          onAccept={handleAcceptApplication}
        />
      );
    }

    const isUnknownRequest =
      requestId && !source.some((application) => application.id === requestId);

    if (isUnknownRequest) {
      return (
        <section className="rounded-lg border border-[#c8d0d7] bg-white p-6">
          <h2 className="font-bold">신청을 찾을 수 없습니다.</h2>

          <button
            onClick={handleCloseDetail}
            className="mt-4 cursor-pointer text-[#234f73] underline"
          >
            신청 목록으로 돌아가기
          </button>
        </section>
      );
    }

    return (
      <ApplicationList
        applications={filtered}
        selectedId={selectedId}
        hasApplications={source.length > 0}
        showMarkers={showMarkers}
        onSelect={handleSelectApplication}
        onToggleMarkers={setShowMarkers}
      />
    );
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

      <GisFilters
        filterKey={filterKey}
        initialFilters={filters}
        onSearch={handleSearch}
        onReset={handleReset}
      />

      <div className="mb-[14px] grid min-h-[90px] shrink-0 grid-cols-2 gap-[14px] lg:grid-cols-4">
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

              <p className="text-[26px] font-bold leading-[30px]">
                {source.length ? count : 0}건
              </p>
            </div>
          </div>
        ))}
      </div>

      {message && (
        <p role="status" className="mb-3 text-sm text-[#27654d]">
          {message}
        </p>
      )}

      <div className="grid min-h-[500px] items-stretch gap-[14px] lg:h-[calc(100dvh_-_332px)] lg:grid-cols-[minmax(0,678fr)_minmax(390px,490fr)]">
        <ApplicationMap
          key={mapRevision}
          applications={filtered}
          selectedId={selectedId}
          showMarkers={showMarkers}
          onSelect={handleSelectApplication}
        />

        {renderApplicationPanel()}
      </div>
    </div>
  );
}
