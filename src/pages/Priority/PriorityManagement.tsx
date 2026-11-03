import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import PriorityDetail from "../../components/priority/PriorityDetail";
import PriorityFilters from "../../components/priority/PriorityFilters";
import PriorityList from "../../components/priority/PriorityList";
import PriorityModals from "../../components/priority/PriorityModals";
import {
  getPriorityInspections,
  getPriorityInspection,
  getPriorityOrder,
  setPriorityDesignation,
  priorityError,
  savePriorityInternalMemo,
} from "../../api/priorityInspections";
import type {
  PriorityItem,
  PriorityPage,
  PriorityDetailResponse,
  RiskLevel,
} from "../../api/priorityInspections";
import { commitPriorityOrder } from "./orderApi";
import { changePosition, normalizePriorityOrder } from "./priorityUtils";
import type { PriorityApplication } from "./mockData";

function toApplication(item: PriorityItem): PriorityApplication {
  return {
    applicationId: item.applicationId,
    id: item.receiptNo,
    resident: "",
    address: item.address,
    district: "",
    risk: ({ HIGH: "높음", CAUTION: "주의", LOW: "낮음" } as const)[
      item.riskLevel
    ],
    floodExperience: ({ YES: "있음", NO: "없음", UNKNOWN: "모름" } as const)[
      item.floodExperience
    ],
    reason: item.requestReason || "미입력",
    nearby: item.nearbyApplicationCount,
    designated: item.designated,
    assigned: false,
    memo: "",
  };
}

export default function PriorityManagement() {
  const navigate = useNavigate();
  const { requestId } = useParams();
  const [params, setParams] = useSearchParams();
  const [revision, setRevision] = useState(0);
  const [list, setList] = useState<{
    key: string;
    data?: PriorityPage;
    error?: string;
  }>();
  const [detail, setDetail] = useState<{
    key: string;
    data?: PriorityDetailResponse;
    error?: string;
  }>();
  const [eligible, setEligible] = useState<PriorityApplication[]>([]);
  const [draftOrder, setDraftOrder] = useState<string[]>([]);
  const [orderLoading, setOrderLoading] = useState(false);
  const [orderReady, setOrderReady] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [memoDrafts, setMemoDrafts] = useState<Record<number, string>>({});
  const [memoSaving, setMemoSaving] = useState<Record<number, boolean>>({});
  const [memoFeedback, setMemoFeedback] = useState<{
    id: number;
    error?: string;
    message?: string;
  }>();
  const memoFlights = useRef(new Set<number>());
  const mutation = useRef(false);
  const orderRequest = useRef(0);
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
  const hasFilters = Boolean(keyword.trim() || district || risk || status);
  const data = list?.key === listKey ? list.data : undefined;
  const listError = list?.key === listKey ? list.error : undefined;
  const loading = !data && !listError;
  const filtered = data?.applications.map(toApplication) || [];
  const selectedRow = requestId
    ? filtered.find((a) => a.applicationId === Number(requestId))
    : filtered[0];
  const selectedApplicationId = requestId
    ? Number(requestId)
    : selectedRow?.applicationId;
  const detailKey = JSON.stringify([selectedApplicationId, revision]);
  const detailData = detail?.key === detailKey ? detail.data : undefined;
  const detailError = detail?.key === detailKey ? detail.error : undefined;
  const selected = detailData
    ? {
        ...toApplication({
          ...detailData,
          designated: selectedRow?.designated ?? false,
        }),
        resident: detailData.applicantName,
        address: [detailData.address, detailData.detailAddress]
          .filter(Boolean)
          .join(" "),
        memo: detailData.internalMemo || "",
        inspectionNeed: detailData.inspectionNeed,
        designationKnown: Boolean(selectedRow),
      }
    : undefined;
  const modalOrder = normalizePriorityOrder(draftOrder, eligible);
  const searchEmpty = Boolean(data && !data.totalElements && hasFilters);

  useEffect(() => {
    const controller = new AbortController();
    const riskLevel = (
      { 높음: "HIGH", 주의: "CAUTION", 낮음: "LOW" } as Record<
        string,
        RiskLevel
      >
    )[risk];

    getPriorityInspections(
      {
        keyword,
        district: district || undefined,
        riskLevel,
        designated:
          status === "지정" ? true : status === "미지정" ? false : undefined,
        page,
        size: 10,
      },
      controller.signal,
    )
      .then((data) => {
        if (!controller.signal.aborted) setList({ key: listKey, data });
      })
      .catch((cause) => {
        if (!controller.signal.aborted)
          setList({ key: listKey, error: priorityError(cause) });
      });

    return () => controller.abort();
  }, [district, risk, status, keyword, page, listKey]);

  useEffect(() => {
    if (selectedApplicationId === undefined) return;
    const controller = new AbortController();

    getPriorityInspection(selectedApplicationId, controller.signal)
      .then((data) => {
        if (!controller.signal.aborted) setDetail({ key: detailKey, data });
      })
      .catch((cause) => {
        if (!controller.signal.aborted)
          setDetail({ key: detailKey, error: priorityError(cause) });
      });

    return () => controller.abort();
  }, [selectedApplicationId, detailKey]);

  useEffect(
    () => () => {
      orderRequest.current += 1;
    },
    [],
  );

  function patch(values: Record<string, string | null>) {
    const next = new URLSearchParams(params);

    Object.entries(values).forEach(([key, value]) =>
      value === null ? next.delete(key) : next.set(key, value),
    );
    setParams(next);
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

  async function loadOrder() {
    const request = ++orderRequest.current;

    setOrderLoading(true);
    setOrderReady(false);
    setEligible([]);
    setDraftOrder([]);
    try {
      const items = await getPriorityOrder();

      if (request !== orderRequest.current) return;
      const rows = [...items]
        .sort(
          (a, b) =>
            a.selectionOrder - b.selectionOrder ||
            a.applicationId - b.applicationId,
        )
        .map(toApplication);

      setEligible(rows);
      setDraftOrder(rows.map((a) => a.id));
      setOrderReady(true);
    } catch (cause) {
      if (request === orderRequest.current) setError(priorityError(cause));
    } finally {
      if (request === orderRequest.current) setOrderLoading(false);
    }
  }

  function beginOrder() {
    if (mutation.current) return;
    setError("");
    patch({ dialog: "reorder" });
    void loadOrder();
  }

  function moveOrder(id: string, delta: number) {
    if (!mutation.current && orderReady)
      setDraftOrder((order) =>
        changePosition(normalizePriorityOrder(order, eligible), id, delta),
      );
  }

  async function saveOrder() {
    if (mutation.current || !orderReady || orderLoading) return;
    if (hasFilters) {
      setError("선정 순서를 저장하려면 검색어와 필터를 초기화해주세요.");

      return;
    }

    const ids = modalOrder.map(
      (id) => eligible.find((a) => a.id === id)?.applicationId,
    );

    if (ids.length !== eligible.length || ids.some((id) => id === undefined)) {
      setError("전체 대상 목록을 다시 조회해 주세요.");

      return;
    }

    mutation.current = true;
    setBusy(true);
    setError("");
    try {
      const result = await commitPriorityOrder(
        ids as number[],
        eligible.map((a) => a.applicationId!),
        hasFilters,
      );

      if (!result.saved) {
        const rows = [...result.applications]
          .sort(
            (a, b) =>
              a.selectionOrder - b.selectionOrder ||
              a.applicationId - b.applicationId,
          )
          .map(toApplication);

        setEligible(rows);
        setDraftOrder(rows.map((a) => a.id));
        setError(
          "지정 대상이 변경되어 저장하지 못했습니다. 최신 목록을 확인하고 다시 저장해 주세요.",
        );
        setRevision((value) => value + 1);

        return;
      }

      await loadOrder();
      setRevision((value) => value + 1);
      patch({ mode: null, dialog: "saved" });
    } catch (cause) {
      setOrderReady(false);
      setError(priorityError(cause));
    } finally {
      mutation.current = false;
      setBusy(false);
    }
  }

  async function designate() {
    if (
      mutation.current ||
      !selected?.applicationId ||
      !selected.designationKnown
    )
      return;
    mutation.current = true;
    setBusy(true);
    setError("");
    const cancel = selected.designated;

    try {
      await setPriorityDesignation([selected.applicationId], !cancel);
      setCancelledDesignation(cancel);
      setRevision((value) => value + 1);
      setOrderReady(false);
      setEligible([]);
      setDraftOrder([]);
      patch({ dialog: "designated" });
    } catch (cause) {
      setError(priorityError(cause));
    } finally {
      mutation.current = false;
      setBusy(false);
    }
  }

  async function saveMemo() {
    const id = selected?.applicationId;

    if (!id || !selected || memoFlights.current.has(id)) return;
    const value = memoDrafts[id];

    if (value === undefined || value === selected.memo) return;
    memoFlights.current.add(id);
    setMemoSaving((current) => ({ ...current, [id]: true }));
    setMemoFeedback({ id, message: "메모를 저장하는 중입니다." });
    try {
      const saved = await savePriorityInternalMemo(id, value);

      setDetail((current) =>
        current?.data?.applicationId === id
          ? {
              ...current,
              data: { ...current.data, internalMemo: saved.internalMemo },
            }
          : current,
      );
      setMemoDrafts((current) => {
        if (current[id] !== value) return current;
        const next = { ...current };

        delete next[id];

        return next;
      });
      setMemoFeedback({ id, message: "메모가 저장되었습니다." });
    } catch (cause) {
      setMemoFeedback({ id, error: priorityError(cause) });
    } finally {
      memoFlights.current.delete(id);
      setMemoSaving((current) => ({ ...current, [id]: false }));
    }
  }

  function closeModal() {
    if (mutation.current) return;
    orderRequest.current += 1;
    setError("");
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

      {(listError || detailError) && (
        <p role="alert">
          {listError || detailError}{" "}
          <button
            type="button"
            onClick={() => setRevision((value) => value + 1)}
          >
            다시 시도
          </button>
        </p>
      )}
      {memoFeedback?.id === selected?.applicationId && memoFeedback?.error && (
        <p role="alert">{memoFeedback.error}</p>
      )}
      {memoFeedback?.id === selected?.applicationId &&
        memoFeedback?.message && (
          <p role="status" className="sr-only">
            {memoFeedback.message}
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
          loading={loading || Boolean(listError)}
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
          memo={
            selected?.applicationId
              ? (memoDrafts[selected.applicationId] ?? selected.memo)
              : ""
          }
          memoSaving={Boolean(
            selected?.applicationId && memoSaving[selected.applicationId],
          )}
          onSaveMemo={() => {
            void saveMemo();
          }}
          busy={busy}
          onMemo={(value) => {
            if (selected?.applicationId) {
              const id = selected.applicationId;

              setMemoDrafts((current) => ({ ...current, [id]: value }));
              setMemoFeedback(undefined);
            }
          }}
          ordering={ordering}
          onDesignate={() => {
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
        busy={busy || orderLoading}
        error={error}
        orderReady={orderReady}
        cancelledDesignation={cancelledDesignation}
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
