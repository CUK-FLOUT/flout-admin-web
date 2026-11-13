import { searchInputText } from "../../components/common/searchStyles";
import Pagination from "../../components/common/Pagination";
import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import InfrastructureSelect from "../../components/infrastructure/InfrastructureSelect";
import InfrastructureMap from "../../components/infrastructure/InfrastructureMap";
import InfrastructureBadge from "../../components/infrastructure/InfrastructureBadge";
import InfrastructureEmpty from "../../components/infrastructure/InfrastructureEmpty";
import {
  infrastructureCard,
  infrastructureFocus,
  infrastructurePrimary,
  infrastructureSecondary,
} from "../../components/infrastructure/styles";
import { infrastructureAssets as assets } from "./assets";
import { emptyFilters } from "./model";
import { registrationTypes, reviewStatuses } from "./types";
import type { InfrastructureFilters, InfrastructureIssue } from "./types";
import { useInfrastructureData } from "./useInfrastructureData";
import { infrastructureApiFilters } from "./apiMapping";
import type { PublicIssueCounts } from "../../api/publicIssues";

function filtersFrom(params: URLSearchParams): InfrastructureFilters {
  return {
    district:
      ["원미구", "소사구", "오정구"].find(
        (value) => value === params.get("district"),
      ) || emptyFilters.district,
    status:
      reviewStatuses.find((value) => value === params.get("status")) ||
      emptyFilters.status,
    kind:
      registrationTypes.find((value) => value === params.get("kind")) ||
      emptyFilters.kind,
    query: params.get("q") || "",
  };
}

export default function InfrastructureManagement() {
  const [params] = useSearchParams();
  const data = useInfrastructureData({
    filters: infrastructureApiFilters(filtersFrom(params)),
    page: Math.max(0, (Math.floor(Number(params.get("page"))) || 1) - 1),
  });

  return (
    <InfrastructureList
      key={[
        params.get("district"),
        params.get("status"),
        params.get("kind"),
        params.get("q"),
      ].join(":")}
      data={data}
    />
  );
}

function InfrastructureList({
  data,
}: {
  data: ReturnType<typeof useInfrastructureData>;
}) {
  const [params] = useSearchParams(),
    navigate = useNavigate();
  const applied = filtersFrom(params);
  const [filters, setFilters] = useState(applied),
    [showMarkers, setShowMarkers] = useState(true);
  const pages = Math.max(1, data.totalPages);
  const page = Math.max(1, Math.floor(Number(params.get("page"))) || 1);
  const visible = data.records;
  const selected =
    visible.find((issue) => issue.id === params.get("selected")) || visible[0];

  useEffect(() => {
    if (data.loading || data.listError || page <= pages) return;
    const next = new URLSearchParams(params);

    next.set("page", String(pages));
    navigate({ search: next.toString() }, { replace: true });
  }, [data.loading, data.listError, page, pages, params, navigate]);

  function clean() {
    const p = new URLSearchParams(params);

    p.delete("dialog");

    return p;
  }

  function go(p: URLSearchParams, replace = false) {
    navigate(
      { pathname: "/infrastructure", search: p.toString() },
      { replace },
    );
  }

  function search() {
    const p = clean();

    ["district", "status", "kind", "q", "page", "selected", "dataset"].forEach(
      (k) => p.delete(k),
    );
    if (filters.district !== emptyFilters.district)
      p.set("district", filters.district);
    if (filters.status !== emptyFilters.status) p.set("status", filters.status);
    if (filters.kind !== emptyFilters.kind) p.set("kind", filters.kind);
    if (filters.query.trim()) p.set("q", filters.query.trim());
    if (
      page === 1 &&
      JSON.stringify(infrastructureApiFilters(filters)) ===
        JSON.stringify(infrastructureApiFilters(applied))
    )
      data.refresh();
    go(p);
  }

  function reset() {
    data.setError("");
    data.refresh();
    setFilters({ ...emptyFilters });
    go(new URLSearchParams());
  }

  function select(id: string) {
    const p = clean();

    p.set("selected", id);
    go(p, true);
  }

  function openDetail(id: string) {
    navigate({
      pathname: "/infrastructure/" + id + "/review",
      search: clean().toString(),
    });
  }

  return (
    <div
      className={
        "flex w-full min-w-0 shrink-0 flex-col pt-0.5 text-[#202b36] min-[1102px]:min-h-0 min-[1102px]:flex-1 min-[1102px]:pb-[29px] " +
        infrastructureFocus +
        " [&_button:enabled]:cursor-pointer"
      }
    >
      <div className="flex h-12 shrink-0 items-center justify-between gap-3">
        <h1 className="text-[30px] font-bold leading-9">
          지역·공공 인프라 관리
        </h1>
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          search();
        }}
        className="mt-4 grid h-[46px] shrink-0 grid-cols-[166px_180px_184px_minmax(160px,1fr)_101px_119px] gap-[10px] max-[1350px]:h-auto max-[1350px]:grid-cols-[repeat(3,minmax(0,1fr))]"
      >
        <InfrastructureSelect
          label="지역 필터"
          value={filters.district}
          options={["지역 전체", "원미구", "소사구", "오정구"]}
          onChange={(v) => setFilters((f) => ({ ...f, district: v }))}
        />
        <InfrastructureSelect
          label="검토 상태 필터"
          value={filters.status}
          options={["검토 상태 전체", ...reviewStatuses]}
          onChange={(v) => setFilters((f) => ({ ...f, status: v }))}
        />
        <InfrastructureSelect
          label="문제 유형 필터"
          value={filters.kind}
          options={["문제 유형 전체", ...registrationTypes]}
          onChange={(v) => setFilters((f) => ({ ...f, kind: v }))}
        />
        <label className="flex h-12 min-w-0 items-center gap-[10px] rounded-md border border-[#c8d0d7] bg-white px-[14px]">
          <img
            src={assets.search}
            alt=""
            width={18}
            height={18}
            className="shrink-0"
          />
          <input
            aria-label="지역 · 문제 내용 검색"
            placeholder="지역 · 문제 내용 검색"
            value={filters.query}
            onChange={(e) =>
              setFilters((f) => ({ ...f, query: e.target.value }))
            }
            className={`min-w-0 flex-1 outline-none ${searchInputText}`}
          />
        </label>
        <button
          type="submit"
          className={infrastructurePrimary + " h-12 rounded-lg"}
        >
          검색
        </button>
        <button
          type="button"
          onClick={reset}
          className={infrastructureSecondary + " h-12"}
        >
          초기화
        </button>
      </form>
      <InfrastructureMetrics counts={data.counts} />
      {data.error && (
        <p role="alert" className="mt-3 text-sm text-[#a53632]">
          {data.error}
        </p>
      )}
      <div className="mt-4 grid grid-cols-[minmax(0,678fr)_minmax(0,490fr)] items-stretch gap-[14px] min-[1102px]:min-h-[240px] min-[1102px]:flex-1 max-[1101px]:grid-cols-1">
        <InfrastructureMap
          issues={data.markers}
          selectedId={selected?.id}
          showMarkers={showMarkers}
          onSelect={(id) =>
            visible.some((issue) => issue.id === id)
              ? select(id)
              : openDetail(id)
          }
        />
        <section
          aria-labelledby="infra-list-title"
          className={
            infrastructureCard +
            " flex h-[523px] min-w-0 flex-col px-[13.25px] pt-[21.25px] pb-[4px] min-[1102px]:h-full min-[1102px]:min-h-0"
          }
        >
          <div className="flex h-[34px] shrink-0 items-center gap-[6px]">
            <img src={assets.list} alt="" width={32} height={32} />
            <h2
              id="infra-list-title"
              className="text-[22px] font-bold leading-7 tracking-[-0.132px]"
            >
              등록된 지역 문제
            </h2>
          </div>
          <div className="mt-[17px] h-px shrink-0 bg-[#c8d0d7]" />
          <div className="mt-3 min-h-0 flex-1 overflow-y-auto">
            {data.loading ? (
              <p role="status" className="py-10 text-center text-sm">
                지역 문제를 불러오는 중입니다.
              </p>
            ) : visible.length ? (
              visible.map((issue) => (
                <InfrastructureIssueRow
                  key={issue.id}
                  issue={issue}
                  selected={issue.id === selected?.id}
                  onSelect={select}
                  onOpenDetail={openDetail}
                />
              ))
            ) : !data.listError ? (
              <InfrastructureEmpty
                search={Object.values(infrastructureApiFilters(applied)).some(
                  Boolean,
                )}
                onReset={reset}
              />
            ) : null}
          </div>
          <div className="flex min-h-11 shrink-0 flex-wrap items-center justify-between gap-x-3 px-[7px]">
            <label className="flex items-center gap-2 text-[13px] leading-[18px] tracking-[-0.078px]">
              <input
                type="checkbox"
                role="switch"
                aria-label="마커와 상태를 표시"
                checked={showMarkers}
                onChange={(e) => setShowMarkers(e.target.checked)}
                className="peer sr-only"
              />
              <span
                className={
                  "flex h-[19px] w-[34px] items-center rounded-lg p-0.5 peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-[#234f73] " +
                  (showMarkers
                    ? "justify-end bg-[#234f73]"
                    : "justify-start bg-[#c8d0d7]")
                }
              >
                <span className="size-[15px] rounded-lg bg-white" />
              </span>
              마커와 상태를 표시
            </label>
            <Pagination
              label="지역 문제 목록 페이지"
              page={page}
              totalPages={data.totalPages}
              disabled={data.loading}
              onPageChange={(number) => {
                const p = clean();

                p.set("page", String(number));
                p.delete("selected");
                go(p);
              }}
            />
          </div>
        </section>
      </div>
    </div>
  );
}

function InfrastructureMetrics({ counts }: { counts?: PublicIssueCounts }) {
  const metrics = [
    {
      label: "등록된 지역 문제",
      icon: assets.metricLocation,
      count: counts?.registeredCount,
    },
    {
      label: "검토 대기·검토 중",
      icon: assets.metricReview,
      count: counts?.pendingOrUnderReviewCount,
    },
    {
      label: "조치 진행",
      icon: assets.metricProgress,
      count: counts?.actionInProgressCount,
    },
    {
      label: "조치 완료",
      icon: assets.metricCompleted,
      count: counts?.completedCount,
    },
  ];

  return (
    <div className="mt-4 grid h-[90px] shrink-0 grid-cols-4 gap-4 max-[700px]:h-auto max-[700px]:grid-cols-2">
      {metrics.map(({ label, icon, count }) => (
        <div
          key={label}
          className={infrastructureCard + " relative h-[88px] min-w-0"}
        >
          <img
            src={assets.metricBackground}
            alt=""
            width={40}
            height={40}
            className="absolute top-[23.25px] left-[15.25px]"
          />
          <img
            src={icon}
            alt=""
            width={24}
            height={24}
            className="absolute top-[31.25px] left-[23.25px]"
          />
          <p className="absolute top-[17.25px] left-[67.25px] text-xs leading-[18px]">
            {label}
          </p>
          <p className="absolute top-[40.25px] left-[67.25px] text-2xl font-bold leading-9">
            {count === undefined ? "—" : count + "건"}
          </p>
        </div>
      ))}
    </div>
  );
}

function InfrastructureIssueRow({
  issue,
  selected,
  onSelect,
  onOpenDetail,
}: {
  issue: InfrastructureIssue;
  selected: boolean;
  onSelect: (id: string) => void;
  onOpenDetail: (id: string) => void;
}) {
  return (
    <article
      aria-label={issue.code + " " + issue.kind}
      className={
        "relative grid h-[79px] grid-cols-[minmax(0,1fr)_70px_76px] items-center gap-3 border-b border-[#e6eaee] px-3 last:border-0 " +
        (selected ? "rounded-lg bg-[#f4f5f6]" : "bg-white")
      }
    >
      {selected && (
        <span
          aria-hidden="true"
          className="absolute inset-y-0 left-0 w-1 rounded-sm bg-[#234f73]"
        />
      )}
      <button
        onClick={() => onSelect(issue.id)}
        aria-label={issue.code + " 목록 선택"}
        className="min-w-0 text-left"
      >
        <strong className="block text-base leading-[21px]">
          {issue.number + ". " + issue.kind}
        </strong>
        <span className="mt-1 block text-sm leading-[19px]">
          관련 신청 {issue.relatedCount ?? issue.related.length}건 ·{" "}
          {issue.history === null
            ? "이력 확인 필요"
            : "침수 이력 " + issue.history + "건"}
        </span>
      </button>
      <InfrastructureBadge status={issue.status} />
      <button
        aria-label={issue.code + " 공공시설 검토 상세"}
        onClick={() => onOpenDetail(issue.id)}
        className="text-right text-sm leading-[19px]"
      >
        상세 &gt;
      </button>
    </article>
  );
}
