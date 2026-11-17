import { useEffect, useEffectEvent, useState } from "react";
import { getInspections, inspectionError } from "../../api/inspections";
import { usePagePolling } from "../../hooks/usePagePolling";
import { loadInspection } from "./loadInspection";
import type { InspectionApplication } from "./types";

type Options = {
  searchQuery: string;
  selectedId: string | undefined;
  revision: number;
  busy: boolean;
};

export function useInspectionData({
  searchQuery,
  selectedId,
  revision,
  busy,
}: Options) {
  const [selected, setSelected] = useState<InspectionApplication>();
  const [storageError, setStorageError] = useState("");
  const [inspectorsError, setInspectorsError] = useState("");
  const [inspectors, setInspectors] = useState<{ id: number; name: string }[]>(
    [],
  );
  const list = usePagePolling({
    queryKey: searchQuery,
    revision,
    paused: busy,
    load: (signal) => getInspections(JSON.parse(searchQuery), signal),
    errorMessage: inspectionError,
  });
  const pageData = list.data;
  const loading = list.loading;
  const loadSelectedInspection = useEffectEvent(
    (id: number, signal: AbortSignal) =>
      loadInspection(
        id,
        signal,
        pageData?.inspections.find((item) => item.inspectionId === id),
      ),
  );

  useEffect(() => {
    const controller = new AbortController();

    async function load() {
      setStorageError("");
      setSelected(undefined);
      if (!selectedId || !/^[1-9]\d*$/.test(selectedId)) return;
      try {
        const detail = await loadSelectedInspection(
          Number(selectedId),
          controller.signal,
        );

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

  return {
    selected,
    setSelected,
    storageError,
    setStorageError,
    inspectorsError,
    inspectors,
    list,
    pageData,
    loading,
  };
}
