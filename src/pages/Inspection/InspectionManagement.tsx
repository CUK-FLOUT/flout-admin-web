import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import AssignmentPanel from "../../components/inspection/AssignmentPanel";
import InspectionEmptyContent from "../../components/inspection/InspectionEmptyContent";
import InspectionFilters from "../../components/inspection/InspectionFilters";
import InspectionList from "../../components/inspection/InspectionList";
import InspectionStatusTabs from "../../components/inspection/InspectionStatusTabs";
import InspectionDialog from "../../components/inspection/InspectionDialog";
import type { InspectionDialogState } from "../../components/inspection/InspectionDialog";
import {
  inspectionStatuses,
  inspectionStorageKey,
  readInspections,
} from "./mockData";
import type { EditableStatus, InspectionApplication } from "./mockData";
import { priorityStorageKey, readPrioritySnapshot } from "../Priority/mockData";
import {
  inspectionFocus,
  inspectionPanel,
} from "../../components/inspection/styles";

export default function InspectionManagement() {
  const navigate = useNavigate();
  const { requestId } = useParams();
  const [params, setParams] = useSearchParams();
  const [applications, setApplications] = useState(readInspections);
  const [storageError, setStorageError] = useState("");
  const [priorityOverrides] = useState(() => {
    try {
      return localStorage.getItem(priorityStorageKey)
        ? readPrioritySnapshot().applications
        : [];
    } catch {
      return [];
    }
  });

  const source =
    params.get("dataset") === "empty"
      ? []
      : applications.map((a) => ({
          ...a,
          priority:
            priorityOverrides.find(
              (p) => p.id === a.id && p.address === a.address,
            )?.designated ?? a.priority,
        }));

  const stage = ["전체", "배정 대기", ...inspectionStatuses].includes(
    params.get("stage") || "",
  )
    ? params.get("stage")!
    : "전체";

  const filtered = source.filter(
    (a) =>
      (stage === "전체" ||
        a.status === (stage === "배정 대기" ? "대기" : stage)) &&
      (!params.get("district") || a.district === params.get("district")) &&
      (!params.get("assignee") || a.assignee === params.get("assignee")) &&
      (!params.get("visit") ||
        (params.get("visit") === "미입력"
          ? !a.requestedDate
          : a.requestedDate === params.get("visit"))) &&
      (!params.get("q") ||
        `${a.id} ${a.address}`.includes(params.get("q")!.trim())),
  );

  const selectedId =
    params.get("selected") === "none"
      ? "none"
      : requestId || params.get("selected");
  const selected =
    selectedId && selectedId !== "none"
      ? filtered.find((a) => a.id === selectedId)
      : undefined;

  const searchEmpty = source.length > 0 && filtered.length === 0;
  const kind = params.get("dialog");
  const modal = ["confirm", "status-saved", "assignment-saved"].includes(
    kind || "",
  )
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
    const update = (event: StorageEvent) => {
      if (event.key === inspectionStorageKey || event.key === null)
        setApplications(readInspections());
    };

    window.addEventListener("storage", update);

    return () => window.removeEventListener("storage", update);
  }, []);

  function changeParams(values: Record<string, string | null>) {
    const next = new URLSearchParams(params);

    Object.entries(values).forEach(([key, value]) =>
      value ? next.set(key, value) : next.delete(key),
    );
    setParams(next);
  }

  function reset() {
    const next = new URLSearchParams();

    if (params.get("dataset") === "empty") next.set("dataset", "empty");
    navigate(`/inspection${next.size ? `?${next}` : ""}`);
  }

  function search(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const next = new URLSearchParams(params);

    ["district", "assignee", "visit", "q"].forEach((key) => {
      const value = String(data.get(key) || "").trim();

      if (value) next.set(key, value);
      else next.delete(key);
    });
    ["selected", "dialog", "target"].forEach((key) => next.delete(key));
    navigate(`/inspection?${next}`);
  }

  function select(id: string) {
    const next = new URLSearchParams(params);

    ["selected", "dialog", "target"].forEach((key) => next.delete(key));
    navigate(`/inspection/${id}${next.size ? `?${next}` : ""}`);
  }

  function save(
    application: InspectionApplication,
    dialog: InspectionDialogState,
  ) {
    const next = applications.map((a) =>
      a.id === application.id ? application : a,
    );

    try {
      localStorage.setItem(inspectionStorageKey, JSON.stringify(next));
      setApplications(next);
      setStorageError("");

      const query = new URLSearchParams(params);

      ["stage", "district", "assignee", "visit", "q", "selected"].forEach(
        (key) => query.delete(key),
      );
      query.set("dialog", dialog);
      query.set(
        "target",
        application.status === "대기" ? "예정" : application.status,
      );
      navigate(`/inspection/${application.id}?${query}`);

      return true;
    } catch {
      setStorageError(
        "브라우저 저장 공간에 저장하지 못했습니다. 저장 공간과 브라우저 설정을 확인해 주세요.",
      );
      changeParams({ dialog: null, target: null });

      return false;
    }
  }

  function switchTab(tab: string) {
    const query = new URLSearchParams(params);

    ["selected", "dialog", "target"].forEach((key) => query.delete(key));
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
        applications={applications}
        onSearch={search}
        onReset={reset}
      />

      {storageError && (
        <p role="alert" className="text-sm text-[#a53632]">
          {storageError}
        </p>
      )}

      <div className="grid grid-cols-[minmax(0,760fr)_minmax(0,406fr)] gap-4 max-[1101px]:grid-cols-[minmax(0,1fr)]">
        <InspectionList
          filtered={filtered}
          selectedId={selected?.id}
          searchEmpty={searchEmpty}
          onSelect={select}
          onDeselect={() => changeParams({ selected: "none" })}
          onReset={reset}
        />
        {selected ? (
          <AssignmentPanel
            key={`${selected.id}:${selected.assignee}:${selected.visitDate}:${selected.visitTime}:${selected.status}:${selected.notice}:${selected.notifyResident}`}
            application={selected}
            onSave={save}
            onStatus={(status) =>
              changeParams({ dialog: "confirm", target: status })
            }
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
      {selected &&
        modal &&
        (modal !== "confirm" ||
          (selected.assignee !== "미배정" &&
            selected.visitDate &&
            selected.visitTime)) && (
          <InspectionDialog
            key={modal}
            kind={modal}
            application={selected}
            targetStatus={targetStatus}
            onClose={closeDialog}
            onConfirm={() => {
              if (
                selected.assignee === "미배정" ||
                !selected.visitDate ||
                !selected.visitTime ||
                (targetStatus === "완료" && !selected.resultPublished)
              )
                return;
              save({ ...selected, status: targetStatus }, "status-saved");
            }}
          />
        )}
    </div>
  );
}
