import { useState } from "react";
import type { RefObject } from "react";
import type { PriorityItem } from "../../api/priorityInspections";

export type PriorityBulkTargets = {
  ids: number[];
  listKey: string;
  token: string;
  entryKey?: string;
};

type Options = {
  listKey: string;
  dialog: string;
  locationKey: string;
  locationState: unknown;
  mutationRef: RefObject<boolean>;
};

export function usePrioritySelection({
  listKey,
  dialog,
  locationKey,
  locationState,
  mutationRef,
}: Options) {
  const [selection, setSelection] = useState<{ key: string; ids: number[] }>({
    key: "",
    ids: [],
  });
  const [bulkTargets, setBulkTargets] = useState<PriorityBulkTargets | null>(
    null,
  );
  const checkedIds = selection.key === listKey ? selection.ids : [];

  if (selection.key !== listKey) setSelection({ key: listKey, ids: [] });

  function toggleSelection(id: number, applications: PriorityItem[] = []) {
    if (
      mutationRef.current ||
      !applications.some(
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

  const modalState: unknown = locationState;
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
    setBulkTargets({ ...bulkTargets, entryKey: locationKey });

  return {
    checkedIds,
    setSelection,
    bulkTargets,
    setBulkTargets,
    bulkToken,
    toggleSelection,
  };
}
