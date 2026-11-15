import { useEffect, useState } from "react";
import { usePagePolling } from "../../hooks/usePagePolling";
import {
  getPriorityInspections,
  getPriorityInspection,
  getPriorityDesignation,
  priorityError,
} from "../../api/priorityInspections";
import type {
  PriorityDetailResponse,
  PrioritySearch,
} from "../../api/priorityInspections";
import { toPriorityApplication as toApplication } from "./apiMapping";

type Options = {
  filterKey: string;
  query: PrioritySearch;
  revision: number;
  paused: boolean;
  requestId: string | undefined;
};

export function usePriorityData({
  filterKey,
  query,
  revision,
  paused,
  requestId,
}: Options) {
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
  const list = usePagePolling({
    queryKey: JSON.stringify([filterKey, query.page]),
    revision,
    paused,
    load: (signal) => getPriorityInspections(query, signal),
    errorMessage: priorityError,
  });
  const data = list.data;
  const listError = list.error;
  const loading = list.loading;
  const filtered = data?.applications.map(toApplication) || [];

  const selectionKey = JSON.stringify([filterKey, query.page]);
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

  return {
    data,
    listError,
    loading,
    filtered,
    selectedApplicationId,
    detailData,
    detailError,
    designationError,
    selected,
  };
}
