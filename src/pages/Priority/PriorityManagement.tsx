import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import PriorityDetail from "../../components/priority/PriorityDetail";
import PriorityFilters from "../../components/priority/PriorityFilters";
import PriorityList from "../../components/priority/PriorityList";
import PriorityModals from "../../components/priority/PriorityModals";
import { priorityStorageKey, readPrioritySnapshot } from "./mockData";
import { changePosition, orderApplications } from "./priorityUtils";
import type { PriorityApplication } from "./mockData";

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

      <div aria-hidden="true" className="h-[10px] shrink-0" />
      <div className="grid items-stretch gap-4 xl:min-h-[360px] xl:flex-1 xl:grid-cols-[minmax(0,784fr)_minmax(342px,384fr)]">
        <PriorityList
          filtered={filtered}
          selectedId={selected?.id}
          ordering={ordering}
          searchEmpty={searchEmpty}
          onSelect={select}
          onDropOn={dropOn}
          onDragStart={setDragId}
          onDragEnd={() => setDragId(null)}
          onOpenReorder={() => patch({ dialog: "reorder" })}
          onMove={(id, delta) =>
            setDraftOrder((order) => changePosition(order, id, delta))
          }
          onReset={reset}
        />
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

      <PriorityModals
        dialog={dialog}
        selected={selected}
        eligible={eligible}
        modalOrder={modalOrder}
        onClose={() => patch({ dialog: null })}
        onDesignate={designate}
        onSaveOrder={saveOrder}
        onMove={(id, delta) =>
          setDraftOrder((order) => changePosition(order, id, delta))
        }
        onCancelReorder={() => {
          setDraftOrder(snapshot.order);
          patch({ dialog: null, mode: null });
        }}
      />
    </div>
  );
}
