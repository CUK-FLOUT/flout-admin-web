import { useRef, useState } from "react";
import type { FormEvent } from "react";
import {
  useLocation,
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router-dom";
import PriorityDetail from "../../components/priority/PriorityDetail";
import PriorityFilters from "../../components/priority/PriorityFilters";
import PriorityList from "../../components/priority/PriorityList";
import PriorityModals from "../../components/priority/PriorityModals";
import { normalizePriorityFilters } from "./priorityUtils";
import type { PriorityApplication } from "./types";
import { usePriorityData } from "./usePriorityData";
import { usePrioritySelection } from "./usePrioritySelection";
import { usePriorityDesignation } from "./usePriorityDesignation";
import { usePriorityOrder } from "./usePriorityOrder";

export default function PriorityManagement() {
  const navigate = useNavigate();
  const location = useLocation();
  const { requestId } = useParams();
  const [params, setParams] = useSearchParams();
  const [revision, setRevision] = useState(0);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const mutation = useRef(false);
  const ordering = false;
  const dialog = params.get("dialog") || "";
  const district = params.get("district") || "";
  const risk = params.get("risk") || "";
  const status = params.get("status") || "";
  const keyword = params.get("q") || "";
  const rawPage = Number(params.get("page") || 0);
  const page = Number.isSafeInteger(rawPage) && rawPage >= 0 ? rawPage : 0;
  const filterKey = JSON.stringify([district, risk, status, keyword]);
  const listKey = JSON.stringify([filterKey, page, revision]);
  const { riskLevel, designated } = normalizePriorityFilters(risk, status);
  const hasFilters = Boolean(
    keyword.trim() || district || riskLevel || designated !== undefined,
  );
  const {
    eligible,
    modalOrder,
    orderLoading,
    orderReady,
    loadOrder,
    moveOrder,
    saveOrder,
    invalidateOrder,
    resetOrder,
  } = usePriorityOrder({
    hasFilters,
    mutationRef: mutation,
    setBusy,
    setError,
    onRefresh: () => setRevision((value) => value + 1),
    onSaved: () => patch({ mode: null, dialog: "saved" }),
  });
  const {
    checkedIds,
    setSelection,
    bulkTargets,
    setBulkTargets,
    bulkToken,
    toggleSelection: toggleSelected,
  } = usePrioritySelection({
    listKey,
    dialog,
    locationKey: location.key,
    locationState: location.state,
    mutationRef: mutation,
  });
  const {
    data,
    listError,
    loading,
    filtered,
    selectedApplicationId,
    detailData,
    detailError,
    designationError,
    selected,
  } = usePriorityData({
    filterKey,
    query: {
      keyword,
      district: district || undefined,
      riskLevel,
      designated,
      page,
      size: 10,
    },
    revision,
    paused: checkedIds.length > 0 || !!dialog || busy || orderLoading,
    requestId,
  });
  const { designate, cancelledDesignation } = usePriorityDesignation({
    mutationRef: mutation,
    listKey,
    dialog,
    locationKey: location.key,
    bulkToken,
    bulkTargets,
    selected,
    setBusy,
    setError,
    clearSelection: () => setSelection({ key: listKey, ids: [] }),
    resetOrder,
    onRefresh: () => setRevision((value) => value + 1),
    onDesignated: () => patch({ dialog: "designated" }),
  });

  function toggleSelection(id: number) {
    toggleSelected(id, data?.applications);
  }

  const searchEmpty = Boolean(data && !data.totalElements && hasFilters);

  function patch(
    values: Record<string, string | null>,
    bulkToken: string | null = null,
  ) {
    const next = new URLSearchParams(params);

    Object.entries(values).forEach(([key, value]) =>
      value === null ? next.delete(key) : next.set(key, value),
    );
    setParams(next, { state: { priorityBulkToken: bulkToken } });
  }

  function select(a: PriorityApplication) {
    if (!mutation.current)
      navigate({
        pathname: `/priority/${a.applicationId}`,
        search: params.toString(),
      });
  }

  function search(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (mutation.current) return;
    const fields = new FormData(event.currentTarget);
    const next = new URLSearchParams();

    for (const key of ["district", "risk", "status", "q"]) {
      const value = String(fields.get(key) || "").trim();

      if (value) next.set(key, value);
    }

    navigate({ pathname: "/priority", search: next.toString() });
  }

  function reset() {
    if (!mutation.current) navigate("/priority");
  }

  function beginOrder() {
    if (mutation.current) return;
    setError("");
    patch({ dialog: "reorder" });
    void loadOrder();
  }

  function closeModal() {
    if (mutation.current) return;
    invalidateOrder();
    setError("");
    setBulkTargets(null);
    patch({ dialog: null, mode: null });
  }

  return (
    <div className="flex w-full min-w-0 shrink-0 flex-col gap-4 pt-0.5 text-[#202b36] xl:min-h-0 xl:flex-1 xl:pb-[29px] [&_button]:cursor-pointer [&_button:disabled]:cursor-not-allowed [&_button:focus-visible]:outline-2 [&_button:focus-visible]:outline-offset-2 [&_button:focus-visible]:outline-[#234f73]">
      <h1 className="flex min-h-12 shrink-0 items-center text-[30px] font-bold leading-9">
        우선점검 관리
      </h1>

      <PriorityFilters
        filterKey={filterKey}
        params={params}
        onSearch={search}
        onReset={reset}
      />

      {(listError || detailError || designationError) && (
        <p role="alert">
          {listError || detailError || designationError}{" "}
          <button
            type="button"
            onClick={() => setRevision((value) => value + 1)}
          >
            다시 시도
          </button>
        </p>
      )}
      {loading && <p role="status">우선점검 목록을 불러오는 중입니다.</p>}
      {!loading &&
        selectedApplicationId !== undefined &&
        !detailData &&
        !detailError && <p role="status">신청정보를 불러오는 중입니다.</p>}
      <div aria-hidden="true" className="h-[10px] shrink-0" />
      <div className="grid items-stretch gap-4 xl:min-h-[360px] xl:flex-1 xl:grid-cols-[minmax(0,784fr)_minmax(342px,384fr)]">
        <PriorityList
          filtered={filtered}
          loading={loading || (!data && Boolean(listError))}
          total={data?.totalElements || 0}
          page={data?.page ?? page}
          totalPages={data?.totalPages || 0}
          onPage={(page) => {
            if (!mutation.current) {
              const next = new URLSearchParams(params);

              next.set("page", String(page));
              next.delete("dialog");
              navigate({ pathname: "/priority", search: next.toString() });
            }
          }}
          selectedId={selected?.id}
          checkedIds={checkedIds}
          onToggle={toggleSelection}
          busy={busy}
          onBulkDesignate={() => {
            if (mutation.current || !checkedIds.length) return;
            const token = crypto.randomUUID();

            setBulkTargets({ ids: [...checkedIds], listKey, token });
            setError("");
            patch({ dialog: "designate" }, token);
          }}
          ordering={ordering}
          searchEmpty={searchEmpty}
          onSelect={select}
          onDropOn={() => {}}
          onDragStart={() => {}}
          onDragEnd={() => {}}
          onOpenReorder={beginOrder}
          onMove={moveOrder}
          onReset={reset}
        />
        <PriorityDetail
          key={selected?.id || "empty"}
          application={selected}
          searchEmpty={searchEmpty}
          busy={busy}
          ordering={ordering}
          onDesignate={() => {
            setBulkTargets(null);
            setError("");
            patch({ dialog: "designate" });
          }}
          onOrder={ordering ? saveOrder : beginOrder}
        />
      </div>

      <PriorityModals
        dialog={dialog}
        selected={selected}
        eligible={eligible}
        modalOrder={modalOrder}
        busy={busy}
        orderLoading={orderLoading}
        error={error}
        orderReady={orderReady}
        cancelledDesignation={cancelledDesignation}
        bulkCount={bulkTargets?.ids.length ?? 0}
        onRetry={() => {
          setError("");
          void loadOrder();
        }}
        onClose={closeModal}
        onDesignate={designate}
        onSaveOrder={saveOrder}
        onMove={moveOrder}
        onCancelReorder={closeModal}
      />
    </div>
  );
}
