import { useCallback, useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";

import ApplicationDetail from "../../components/gis/ApplicationDetail";
import ApplicationList from "../../components/gis/ApplicationList";
import ApplicationMap from "../../components/gis/ApplicationMap";
import GisFilters from "../../components/gis/GisFilters";
import {
  gisApplication,
  gisDetailApplication,
  gisMapApplication,
  gisMarkerNumber,
  gisSearch,
} from "./apiMapping";
import { useGisApi } from "./useGisApi";
import { saveGisMemo } from "../../api/gisApplications";
import type { Filters } from "./types";

import listIcon from "../../assets/gis/imgList.svg";
import clockIcon from "../../assets/gis/imgClock.svg";
import checkIcon from "../../assets/gis/imgCheckCircle.svg";
import toolboxIcon from "../../assets/gis/imgToolbox1.svg";

export default function GisApplications() {
  const navigate = useNavigate();
  const { requestId } = useParams();
  const [params] = useSearchParams();

  const [showMarkers, setShowMarkers] = useState(true);
  const [mapRevision, setMapRevision] = useState(0);

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
  const pageNumber = Number(params.get("page") || 0);
  const query = JSON.stringify(
    gisSearch(
      filters,
      Number.isSafeInteger(pageNumber) && pageNumber >= 0 ? pageNumber : 0,
    ),
  );
  const data = useGisApi(query, requestId);
  const filtered = useMemo(() => (data.page?.applications ?? []).map((item) =>
    gisApplication(item, gisMarkerNumber(item.applicationId, data.markers)),
  ), [data.page, data.markers]);
  const markers = useMemo(() => (data.markers ?? []).map((marker, index) =>
    gisMapApplication(marker, index, filtered.find((item) => item.id === String(marker.applicationId))),
  ), [data.markers, filtered]);
  const selected = data.record?.detail
    ? gisDetailApplication(
        data.record.detail,
        markers.find((item) => item.id === requestId) ??
          filtered.find((item) => item.id === requestId),
      )
    : undefined;
  const selectedId = requestId;

  const handleSelectApplication = useCallback(
    (id: string) => {
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

    navigate(
      {
        pathname: "/gis",
        search: nextParams.toString() ? `?${nextParams}` : "",
      },
      { replace: true },
    );
  }

  function handleReset() {
    navigate(
      {
        pathname: "/gis",
        search: "",
      },
      { replace: true },
    );
    setMapRevision((r) => r + 1);
    setShowMarkers(true);
  }

  async function handleAcceptApplication(id: string, memo: string) {
    const saved = await saveGisMemo(Number(id), memo);

    return saved.internalMemo ?? "";
  }

  function renderApplicationPanel() {
    if (selected) {
      return (
        <ApplicationDetail
          key={selected.id}
          application={selected}
          onClose={handleCloseDetail}
          onAccept={handleAcceptApplication}
          record={data.record!}
        />
      );
    }

    if (requestId || !data.page) {
      const error = requestId ? data.record?.errors.detail : data.listError;

      return (
        <section className="rounded-lg border border-[#c8d0d7] bg-white p-6">
          <p role={error ? "alert" : "status"}>
            {error || "신청 정보를 불러오는 중입니다."}
          </p>
          {error && (
            <button
              onClick={data.reload}
              className="mt-4 text-[#234f73] underline"
            >
              다시 시도
            </button>
          )}
          {requestId && (
            <button
              onClick={handleCloseDetail}
              className="mt-4 ml-4 text-[#234f73] underline"
            >
              신청 목록으로 돌아가기
            </button>
          )}
        </section>
      );
    }

    return (
      <ApplicationList
        applications={filtered}
        selectedId={selectedId}
        hasApplications={
          Boolean(
            filters.search ||
            filters.district ||
            filters.risk ||
            filters.status,
          ) || data.page.totalElements > 0
        }
        showMarkers={showMarkers}
        onSelect={handleSelectApplication}
        onToggleMarkers={setShowMarkers}
        page={data.page}
        onPage={(page) => {
          const next = new URLSearchParams(params);

          next.set("page", String(page));
          navigate(`/gis?${next}`);
        }}
      />
    );
  }

  const summary = [
    [listIcon, "전체 신청", data.stats?.totalCount],
    [clockIcon, "배정 대기", data.stats?.assignmentPendingCount],
    [checkIcon, "점검 진행 중", data.stats?.inspectionInProgressCount],
    [
      toolboxIcon,
      "지원·시공 진행 중",
      data.stats?.supportConstructionInProgressCount,
    ],
  ] as const;

  return (
    <div className="flex min-h-0 w-full flex-1 flex-col text-[#202b36]">
      <div className="mb-[14px] flex min-h-11 shrink-0 items-center justify-between gap-4">
        <h1 className="text-[30px] font-bold leading-9 tracking-[-.54px]">
          GIS 신청 관리
        </h1>
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
                {count ?? "—"}건
              </p>
            </div>
          </div>
        ))}
      </div>

      {[data.listError, data.mapError, data.statsError]
        .filter(Boolean)
        .map((error, i) => (
          <p key={i} role="alert" className="mb-3 text-sm text-[#a53632]">
            {error} <button onClick={data.reload}>다시 시도</button>
          </p>
        ))}


      <div className="grid min-h-[500px] items-stretch gap-[14px] lg:h-[calc(100dvh_-_332px)] lg:grid-cols-[minmax(0,678fr)_minmax(390px,490fr)]">
        <ApplicationMap
          key={mapRevision}
          applications={markers}
          selectedId={selectedId}
          showMarkers={showMarkers}
          onSelect={handleSelectApplication}
        />

        {renderApplicationPanel()}
      </div>
    </div>
  );
}
