import { usePagePolling } from "../../hooks/usePagePolling";
import { useEffect, useRef, useState } from "react";
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
import {
  getPriorityInspections,
  getPriorityInspection,
  getPriorityDesignation,
  setPriorityDesignation,
  priorityError,
} from "../../api/priorityInspections";
import type { PriorityDetailResponse } from "../../api/priorityInspections";
import { normalizePriorityFilters } from "./priorityUtils";
import type { PriorityApplication } from "./types";
import { toPriorityApplication as toApplication } from "./apiMapping";
import { usePriorityOrder } from "./usePriorityOrder";

export default function PriorityManagement() {
  const navigate = useNavigate();
  const location = useLocation();
  const { requestId } = useParams();
  const [params, setParams] = useSearchParams();
  const [revision, setRevision] = useState(0);
  const [detail, setDetail] = useState<{
    key: string;
    data?: PriorityDetailResponse;
    error?: string;
  }>();
  const [designation, setDesignation] = useState<{
    key: string;
    value?: boolean;
    error?: string;
  }>();
  const [selection, setSelection] = useState<{ key: string; ids: number[] }>({
    key: "",
    ids: [],
  });
  const [bulkTargets, setBulkTargets] = useState<{
    ids: number[];
    listKey: string;
    token: string;
    entryKey?: string;
  } | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const mutation = useRef(false);
  const [cancelledDesignation, setCancelledDesignation] = useState(false);
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
  const checkedIds = selection.key === listKey ? selection.ids : [];
  const list = usePagePolling({
    queryKey: JSON.stringify([filterKey, page]),
    revision,
    paused: checkedIds.length > 0 || !!dialog || busy || orderLoading,
    load: (signal) =>
      getPriorityInspections(
        {
          keyword,
          district: district || undefined,
          riskLevel,
          designated,
          page,
          size: 10,
        },
        signal,
      ),
    errorMessage: priorityError,
  });
  const data = list.data;
  const listError = list.error;
  const loading = list.loading;
  const filtered = data?.applications.map(toApplication) || [];

  if (selection.key !== listKey) setSelection({ key: listKey, ids: [] });

  function toggleSelection(id: number) {
    if (
      mutation.current ||
      !data?.applications.some(
        (item) => item.applicationId === id && !item.designated,
      )
    )
      return;
    setSelection((current) => {
      const ids = current.key === listKey ? current.ids : [];

      return {
        key: listKey,
        ids: ids.includes(id)
          ? ids.filter((value) => value !== id)
          : [...ids, id],
      };
    });
  }

  const selectionKey = JSON.stringify([filterKey, page]);
  const [automaticSelection, setAutomaticSelection] = useState<{
    key: string;
    id?: number;
  }>({ key: "" });
  const automaticId =
    automaticSelection.key === selectionKey
      ? (automaticSelection.id ?? filtered[0]?.applicationId)
      : filtered[0]?.applicationId;

  if (
    automaticSelection.key !== selectionKey ||
    automaticSelection.id !== automaticId
  )
    setAutomaticSelection({ key: selectionKey, id: automaticId });

  const selectedApplicationId = requestId ? Number(requestId) : automaticId;
  const selectedRow = filtered.find(
    (a) => a.applicationId === selectedApplicationId,
  );
  const selectionInList = selectedRow !== undefined;
  const detailKey = JSON.stringify([selectedApplicationId, revision]);
  const detailData = detail?.key === detailKey ? detail.data : undefined;
  const detailError = detail?.key === detailKey ? detail.error : undefined;
  const selectedDesignation =
    selectedRow?.designated ??
    (designation?.key === detailKey ? designation.value : undefined);
  const designationError =
    designation?.key === detailKey ? designation.error : undefined;
  const selected = detailData
    ? {
        ...toApplication({
          ...detailData,
          designated: selectedDesignation ?? false,
        }),
        resident: detailData.applicantName,
        address: [detailData.address, detailData.detailAddress]
          .filter(Boolean)
          .join(" "),
        memo: detailData.internalMemo || "",
        inspectionNeed: detailData.inspectionNeed,
        designationKnown: selectedDesignation !== undefined,
      }
    : undefined;
  const modalState: unknown = location.state;
  const bulkToken =
    modalState &&
    typeof modalState === "object" &&
    "priorityBulkToken" in modalState
      ? modalState.priorityBulkToken
      : null;

  if (
    bulkTargets &&
    !bulkTargets.entryKey &&
    dialog === "designate" &&
    bulkToken === bulkTargets.token
  )
    setBulkTargets({ ...bulkTargets, entryKey: location.key });

  const searchEmpty = Boolean(data && !data.totalElements && hasFilters);

  useEffect(() => {
    if (selectedApplicationId === undefined) return;
    const controller = new AbortController();

    getPriorityInspection(selectedApplicationId, controller.signal)
      .then((data) => {
        if (!controller.signal.aborted && data)
          setDetail({ key: detailKey, data });
      })
      .catch((cause) => {
        if (!controller.signal.aborted)
          setDetail({ key: detailKey, error: priorityError(cause) });
      });

    return () => controller.abort();
  }, [selectedApplicationId, detailKey]);

  useEffect(() => {
    if (!detailData || selectionInList || !data) return;
    const controller = new AbortController();

    getPriorityDesignation(
      detailData.applicationId,
      detailData.receiptNo,
      controller.signal,
    )
      .then((value) => {
        if (!controller.signal.aborted)
          setDesignation({ key: detailKey, value });
      })
      .catch((cause) => {
        if (!controller.signal.aborted)
          setDesignation({ key: detailKey, error: priorityError(cause) });
      });

    return () => controller.abort();
  }, [detailData, selectionInList, data, detailKey]);

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

  async function designate() {
    if (mutation.current) return;
    const isBulk = bulkToken != null || bulkTargets !== null;

    if (
      isBulk &&
      (dialog !== "designate" ||
        !bulkTargets ||
        bulkTargets.listKey !== listKey ||
        bulkTargets.token !== bulkToken ||
        bulkTargets.entryKey !== location.key)
    ) {
      setError(
        "선택한 목록 또는 확인 창이 변경되었습니다. 대상을 다시 선택해 주세요.",
      );

      return;
    }

    const ids = isBulk
      ? (bulkTargets?.ids ?? [])
      : selected?.applicationId && selected.designationKnown
        ? [selected.applicationId]
        : [];

    if (!ids.length) return;
    mutation.current = true;
    setBusy(true);
    setError("");
    const cancel = !isBulk && Boolean(selected?.designated);

    try {
      await setPriorityDesignation(ids, !cancel);
      setSelection({ key: listKey, ids: [] });
      setCancelledDesignation(cancel);
      setRevision((value) => value + 1);
      resetOrder();
      patch({ dialog: "designated" });
    } catch (cause) {
      setError(priorityError(cause));
    } finally {
      mutation.current = false;
      setBusy(false);
    }
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
