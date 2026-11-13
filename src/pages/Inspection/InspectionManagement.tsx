import { getSessionGeneration } from "../../auth/session";
import { useEffect, useEffectEvent, useRef, useState } from "react";
import type { FormEvent } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import AssignmentPanel from "../../components/inspection/AssignmentPanel";
import InspectionEmptyContent from "../../components/inspection/InspectionEmptyContent";
import InspectionFilters from "../../components/inspection/InspectionFilters";
import InspectionList from "../../components/inspection/InspectionList";
import InspectionStatusTabs from "../../components/inspection/InspectionStatusTabs";
import InspectionDialog from "../../components/inspection/InspectionDialog";
import type { InspectionDialogState } from "../../components/inspection/InspectionDialog";
import { inspectionStatuses } from "./mockData";
import type { EditableStatus, InspectionApplication } from "./mockData";
import {
  inspectionFocus,
  inspectionPanel,
} from "../../components/inspection/styles";
import {
  assignInspection,
  getInspections,
  inspectionError,
} from "../../api/inspections";
import { usePagePolling } from "../../hooks/usePagePolling";
import { loadInspection } from "./loadInspection";
import { inspectionRow, inspectionSearch } from "./apiModel";

let pendingAssignment: { inspectionId: number; generation: number } | null = null;

export default function InspectionManagement() {
  const navigate = useNavigate();
  const { requestId } = useParams();
  const [params, setParams] = useSearchParams();
  const [selected, setSelected] = useState<InspectionApplication>();
  const [storageError, setStorageError] = useState("");
  const [inspectorsError, setInspectorsError] = useState("");
  const [busy, setBusy] = useState(false);
  const saving = useRef(false);
  const active = useRef(true);
  const generation = getSessionGeneration();

  useEffect(() => {
    active.current = true;
    const pending = pendingAssignment;

    pendingAssignment = null;
    if (pending && pending.generation === getSessionGeneration())
      navigate(`/inspection/${pending.inspectionId}?dialog=assignment-saved&target=예정`, { replace: true });

    return () => {
      active.current = false;
    };
  }, [navigate]);
  const [revision, setRevision] = useState(0);
  const [inspectors, setInspectors] = useState<{ id: number; name: string }[]>(
    [],
  );
  const searchQuery = JSON.stringify(inspectionSearch(params));
  const selectedId =
    params.get("selected") === "none"
      ? undefined
      : requestId || params.get("selected") || undefined;
  const stage = params.get("stage") || "전체";
  const list = usePagePolling({
    queryKey: searchQuery,
    revision,
    paused: busy,
    load: (signal) => getInspections(JSON.parse(searchQuery), signal),
    errorMessage: inspectionError,
  });
  const pageData = list.data;
  const loading = list.loading;
  const loadSelectedInspection = useEffectEvent((id: number, signal: AbortSignal) =>
    loadInspection(
      id,
      signal,
      pageData?.inspections.find((item) => item.inspectionId === id),
    ),
  );
  const filtered = (pageData?.inspections || []).map(inspectionRow);
  const searchEmpty =
    filtered.length === 0 &&
    Boolean(
      params.get("stage") ||
      params.get("district") ||
      params.get("assignee") ||
      params.get("visit") ||
      params.get("q"),
    );
  const kind = params.get("dialog");
  const modal = ["assignment-saved"].includes(kind || "")
    ? (kind as InspectionDialogState)
    : null;
  const targetStatus: EditableStatus = inspectionStatuses.includes(
    params.get("target") as EditableStatus,
  )
    ? (params.get("target") as EditableStatus)
    : "예정";
  const filterKey = [
    params.get("district"),
    params.get("assignee"),
    params.get("visit"),
    params.get("q"),
  ].join("|");

  useEffect(() => {
    const controller = new AbortController();

    async function load() {
      setStorageError("");
      setSelected(undefined);
      if (!selectedId || !/^[1-9]\d*$/.test(selectedId)) return;
      try {
        const detail = await loadSelectedInspection(Number(selectedId), controller.signal);

        if (!controller.signal.aborted) setSelected(detail);
      } catch (error) {
        if (!controller.signal.aborted) setStorageError(inspectionError(error));
      }
    }

    void load();

    return () => controller.abort();
  }, [selectedId, revision]);

  useEffect(() => {
    const controller = new AbortController();

    async function loadInspectors() {
      const names = new Map<number, string>();
      let page = 0;
      let totalPages = 1;

      setInspectorsError("");

      try {
        while (page < totalPages) {
          const response = await getInspections(
            { status: "ALL", page, size: 100 },
            controller.signal,
          );

          if (controller.signal.aborted) return;
          response.inspections.forEach((item) => {
            if (item.inspectorUserId != null && item.inspectorName)
              names.set(item.inspectorUserId, item.inspectorName);
          });
          totalPages = response.totalPages;
          page++;
        }

        setInspectors([...names].map(([id, name]) => ({ id, name })));
      } catch (error) {
        if (!controller.signal.aborted)
          setInspectorsError(inspectionError(error));
      }
    }

    void loadInspectors();

    return () => controller.abort();
  }, [revision]);

  function changeParams(values: Record<string, string | null>) {
    if (saving.current) return;
    const next = new URLSearchParams(params);

    Object.entries(values).forEach(([key, value]) =>
      value ? next.set(key, value) : next.delete(key),
    );
    setParams(next);
  }

  function reset() {
    if (saving.current) return false;
    navigate("/inspection");

    return true;
  }

  function search(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving.current) return;
    const data = new FormData(event.currentTarget);
    const next = new URLSearchParams(params);

    ["district", "assignee", "visit", "q"].forEach((key) => {
      const value = String(data.get(key) || "").trim();

      if (value) next.set(key, value);
      else next.delete(key);
    });
    ["selected", "dialog", "target", "page"].forEach((key) => next.delete(key));
    navigate(`/inspection?${next}`);
  }

  function select(id: string) {
    if (saving.current) return;
    const next = new URLSearchParams(params);

    ["selected", "dialog", "target"].forEach((key) => next.delete(key));
    navigate(`/inspection/${id}?${next}`);
  }

  async function save(
    application: InspectionApplication,
    dialog: InspectionDialogState,
  ) {
    if (
      saving.current ||
      !application.inspectionId ||
      dialog !== "assignment-saved"
    )
      return false;
    saving.current = true;
    setBusy(true);
    setStorageError("");
    try {
      let saved = application;

      if (dialog === "assignment-saved") {
        const response = await assignInspection(application.inspectionId, {
          visitDate: application.visitDate,
          visitTime: application.visitTime,
          preVisitNotice: application.notice,
        });

        if (!active.current) {
          if (generation === getSessionGeneration())
            pendingAssignment = { inspectionId: application.inspectionId, generation };

          return false;
        }

        if (generation !== getSessionGeneration()) return false;
        saved = {
          ...application,
          assignee: response.inspectorName,
          inspectorUserId: response.inspectorId,
          visitDate: response.visitDate,
          visitTime: response.visitTime,
          notice: response.preVisitNotice,
          status: "예정",
        };
      }

      setSelected(saved);
      const query = new URLSearchParams(params);

      [
        "stage",
        "district",
        "assignee",
        "visit",
        "q",
        "selected",
        "page",
      ].forEach((key) => query.delete(key));
      query.set("dialog", dialog);
      query.set("target", saved.status === "대기" ? "예정" : saved.status);
      navigate(`/inspection/${application.inspectionId}?${query}`);
      setRevision((value) => value + 1);

      return true;
    } catch (error) {
      if (!active.current) return false;
      setStorageError(inspectionError(error));
      const query = new URLSearchParams(params);

      query.delete("dialog");
      query.delete("target");
      setParams(query);

      return false;
    } finally {
      saving.current = false;
      if (active.current) setBusy(false);
    }
  }

  function switchTab(tab: string) {
    if (saving.current) return;
    const query = new URLSearchParams(params);

    ["selected", "dialog", "target", "page"].forEach((key) =>
      query.delete(key),
    );
    if (tab === "전체") query.delete("stage");
    else query.set("stage", tab);
    navigate(`/inspection?${query}`);
  }

  function closeDialog() {
    changeParams({ dialog: null, target: null });
  }

  return (
    <div
      data-layout="inspection"
      className={`flex min-w-0 flex-col gap-4 pt-[2px] text-[#202b36] [&_button:enabled]:cursor-pointer [&_select]:cursor-pointer ${inspectionFocus}`}
    >
      <div className="flex h-12 shrink-0 items-center">
        <h1 className="text-[30px] font-bold leading-9">현장점검 관리</h1>
      </div>

      <InspectionStatusTabs stage={stage} onSwitchTab={switchTab} />

      <InspectionFilters
        filterKey={filterKey}
        params={params}
        inspectors={inspectors}
        onSearch={search}
        onReset={reset}
      />

      {inspectorsError && (
        <p role="alert" className="text-sm text-[#a53632]">
          담당자 필터를 불러오지 못했습니다. {inspectorsError}
          <button
            type="button"
            onClick={() => setRevision((value) => value + 1)}
          >
            다시 시도
          </button>
        </p>
      )}

      {(storageError || list.error) && (
        <p role="alert" className="text-sm text-[#a53632]">
          {storageError || list.error}
        </p>
      )}

      {(storageError || list.error) && (
        <button type="button" onClick={() => setRevision((value) => value + 1)}>
          다시 시도
        </button>
      )}
      {loading && <p role="status">현장점검 정보를 불러오는 중…</p>}
      <div
        aria-busy={loading || busy}
        className="grid grid-cols-[minmax(0,760fr)_minmax(0,406fr)] gap-4 max-[1101px]:grid-cols-[minmax(0,1fr)]"
      >
        <InspectionList
          filtered={filtered}
          selectedId={
            selected?.inspectionId ? String(selected.inspectionId) : undefined
          }
          total={pageData?.totalElements || 0}
          page={pageData?.page || 0}
          totalPages={pageData?.totalPages || 0}
          loading={loading || (!pageData && Boolean(list.error))}
          onPage={(page) =>
            changeParams({ page: String(page), selected: "none" })
          }
          searchEmpty={searchEmpty}
          onSelect={select}
          onDeselect={() => changeParams({ selected: "none" })}
          onReset={reset}
        />
        {selected ? (
          <AssignmentPanel
            key={`${selected.id}:${selected.assignee}:${selected.visitDate}:${selected.visitTime}:${selected.status}:${selected.notice}`}
            application={selected}
            busy={busy}
            onSave={save}
          />
        ) : (
          <section
            aria-label="점검 배정"
            className={`${inspectionPanel} flex flex-col gap-2 rounded-lg border-[.75px] border-[#c8d0d7] bg-white p-[15.25px]`}
          >
            <h2 className="flex h-[30px] shrink-0 items-center text-lg font-bold leading-[26px]">
              점검 배정
            </h2>
            <InspectionEmptyContent
              search={searchEmpty}
              panel
              onReset={reset}
            />
          </section>
        )}
      </div>
      {selected && modal && (
        <InspectionDialog
          key={modal}
          kind={modal}
          application={selected}
          targetStatus={targetStatus}
          busy={busy}
          onClose={closeDialog}
          onConfirm={closeDialog}
        />
      )}
    </div>
  );
}
