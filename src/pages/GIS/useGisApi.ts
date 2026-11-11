import { useEffect, useState } from "react";
import { usePagePolling } from "../../hooks/usePagePolling";
import * as api from "../../api/gisApplications";

export interface GisRecord {
  detail?: api.GisDetail;
  internalMemo?: string | null;
  attachments?: api.GisAttachment[];
  histories?: api.GisHistories;
  support?: api.GisSupport | null;
  construction?: api.GisConstruction | null;
  errors: Partial<
    Record<
      "detail" | "attachments" | "histories" | "support" | "construction" | "internalMemo",
      string
    >
  >;
}
export function useGisApi(query: string, id: string | undefined) {
  const [record, setRecord] = useState<{ key: string; data: GisRecord }>();
  const [revision, setRevision] = useState(0);
  const page = usePagePolling({
    queryKey: query,
    revision,
    load: (signal) => api.getGisApplications(JSON.parse(query) as api.GisSearch, signal),
    errorMessage: api.gisError,
  });
  const markers = usePagePolling({
    queryKey: query,
    revision,
    load: async (signal) => (await api.getGisMarkers(JSON.parse(query) as api.GisSearch, signal)).applications,
    errorMessage: api.gisError,
  });
  const stats = usePagePolling({
    queryKey: "gis-stats",
    revision,
    load: api.getGisStats,
    errorMessage: api.gisError,
  });

  useEffect(() => {
    if (!id) return;
    const controller = new AbortController();
    const key = id;

    async function load() {
      const value: GisRecord = { errors: {} };

      setRecord({ key, data: value });
      const number = Number(id);

      if (!/^[1-9]\d*$/.test(id!) || !Number.isSafeInteger(number)) {
        setRecord({
          key,
          data: { errors: { detail: "올바른 신청 ID가 아닙니다." } },
        });

        return;
      }

      async function part<K extends keyof Omit<GisRecord, "errors">>(
        name: K,
        request: Promise<GisRecord[K]>,
      ) {
        try {
          value[name] = await request;
        } catch (error) {
          value.errors[name] = api.gisError(error);
        }

        if (!controller.signal.aborted)
          setRecord({ key, data: { ...value, errors: { ...value.errors } } });
      }

      await Promise.all([
        part("detail", api.getGisDetail(number, controller.signal)),
        part("internalMemo", api.getGisMemo(number, controller.signal)),
        part("attachments", api.getGisAttachments(number, controller.signal)),
        part("histories", api.getGisHistories(number, controller.signal)),
        part(
          "support",
          api.getGisSupport(number, controller.signal).then((r) => r.support),
        ),
        part(
          "construction",
          api
            .getGisConstruction(number, controller.signal)
            .then((r) => r.construction),
        ),
      ]);
    }

    void load();

    return () => controller.abort();
  }, [id, revision]);

  return {
    page: page.data,
    listError: page.error,
    markers: markers.data,
    mapError: markers.error,
    stats: stats.data,
    statsError: stats.error,
    record: record && record.key === id ? record.data : undefined,
    reload: () => setRevision((value) => value + 1),
  };
}
