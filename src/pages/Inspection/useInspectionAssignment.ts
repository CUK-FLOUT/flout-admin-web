import { useEffect, useRef } from "react";
import type { RefObject } from "react";
import type { NavigateFunction, SetURLSearchParams } from "react-router-dom";
import { getSessionGeneration } from "../../auth/session";
import { assignInspection, inspectionError } from "../../api/inspections";
import type { InspectionApplication } from "./types";
import type { InspectionDialogState } from "../../components/inspection/InspectionDialog";

type Options = {
  params: URLSearchParams;
  navigate: NavigateFunction;
  setParams: SetURLSearchParams;
  savingRef: RefObject<boolean>;
  setBusy: (busy: boolean) => void;
  setStorageError: (message: string) => void;
  setSelected: (application: InspectionApplication) => void;
  refresh: () => void;
};

let pendingAssignment: { inspectionId: number; generation: number } | null =
  null;

export function useInspectionAssignment({
  params,
  navigate,
  setParams,
  savingRef,
  setBusy,
  setStorageError,
  setSelected,
  refresh,
}: Options) {
  const activeRef = useRef(true);
  const generation = getSessionGeneration();

  useEffect(() => {
    activeRef.current = true;
    const pending = pendingAssignment;

    pendingAssignment = null;
    if (pending && pending.generation === getSessionGeneration())
      navigate(
        `/inspection/${pending.inspectionId}?dialog=assignment-saved&target=예정`,
        { replace: true },
      );

    return () => {
      activeRef.current = false;
    };
  }, [navigate]);
  async function save(
    application: InspectionApplication,
    dialog: InspectionDialogState,
  ) {
    if (
      savingRef.current ||
      !application.inspectionId ||
      dialog !== "assignment-saved"
    )
      return false;
    savingRef.current = true;
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

        if (!activeRef.current) {
          if (generation === getSessionGeneration())
            pendingAssignment = {
              inspectionId: application.inspectionId,
              generation,
            };

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
      refresh();

      return true;
    } catch (error) {
      if (!activeRef.current) return false;
      setStorageError(inspectionError(error));
      const query = new URLSearchParams(params);

      query.delete("dialog");
      query.delete("target");
      setParams(query);

      return false;
    } finally {
      savingRef.current = false;
      if (activeRef.current) setBusy(false);
    }
  }

  return { save };
}
