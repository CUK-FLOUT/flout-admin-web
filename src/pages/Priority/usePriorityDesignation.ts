import { useState } from "react";
import type { RefObject } from "react";
import {
  setPriorityDesignation,
  priorityError,
} from "../../api/priorityInspections";
import type { PriorityApplication } from "./types";
import type { PriorityBulkTargets } from "./usePrioritySelection";

type Options = {
  mutationRef: RefObject<boolean>;
  listKey: string;
  dialog: string;
  locationKey: string;
  bulkToken: unknown;
  bulkTargets: PriorityBulkTargets | null;
  selected: PriorityApplication | undefined;
  setBusy: (busy: boolean) => void;
  setError: (error: string) => void;
  clearSelection: () => void;
  resetOrder: () => void;
  onRefresh: () => void;
  onDesignated: () => void;
};

export function usePriorityDesignation({
  mutationRef,
  listKey,
  dialog,
  locationKey,
  bulkToken,
  bulkTargets,
  selected,
  setBusy,
  setError,
  clearSelection,
  resetOrder,
  onRefresh,
  onDesignated,
}: Options) {
  const [cancelledDesignation, setCancelledDesignation] = useState(false);

  async function designate() {
    if (mutationRef.current) return;
    const isBulk = bulkToken != null || bulkTargets !== null;

    if (
      isBulk &&
      (dialog !== "designate" ||
        !bulkTargets ||
        bulkTargets.listKey !== listKey ||
        bulkTargets.token !== bulkToken ||
        bulkTargets.entryKey !== locationKey)
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
    mutationRef.current = true;
    setBusy(true);
    setError("");
    const cancel = !isBulk && Boolean(selected?.designated);

    try {
      await setPriorityDesignation(ids, !cancel);
      clearSelection();
      setCancelledDesignation(cancel);
      onRefresh();
      resetOrder();
      onDesignated();
    } catch (cause) {
      setError(priorityError(cause));
    } finally {
      mutationRef.current = false;
      setBusy(false);
    }
  }

  return { designate, cancelledDesignation };
}
