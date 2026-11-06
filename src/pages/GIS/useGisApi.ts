import { useEffect, useState } from "react";
import * as api from "../../api/gisApplications";

export interface GisRecord {
  detail?: api.GisDetail;
  attachments?: api.GisAttachment[];
  histories?: api.GisHistories;
  support?: api.GisSupport | null;
  construction?: api.GisConstruction | null;
  errors: Partial<
    Record<
      "detail" | "attachments" | "histories" | "support" | "construction",
      string
    >
  >;
}
export function useGisApi(query: string, id: string | undefined) {
  const [page, setPage] = useState<{
    key: string;
    data?: api.GisPage;
    error?: string;
  }>();
  const [markers, setMarkers] = useState<{
    key: string;
    data?: api.GisMarker[];
    error?: string;
  }>();
  const [stats, setStats] = useState<{ data?: api.GisStats; error?: string }>();
  const [record, setRecord] = useState<{ key: string; data: GisRecord }>();
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    const params = JSON.parse(query) as api.GisSearch;

    void api.getGisApplications(params, controller.signal).then(
      (data) => {
        if (!controller.signal.aborted) setPage({ key: query, data });
      },
      (error) => {
        if (!controller.signal.aborted)
          setPage({ key: query, error: api.gisError(error) });
      },
    );
    void api.getGisMarkers(params, controller.signal).then(
      (data) => {
        if (!controller.signal.aborted)
          setMarkers({ key: query, data: data.applications });
      },
      (error) => {
        if (!controller.signal.aborted)
          setMarkers({ key: query, error: api.gisError(error) });
      },
    );

    return () => controller.abort();
  }, [query, revision]);
  useEffect(() => {
    const controller = new AbortController();

    void api.getGisStats(controller.signal).then(
      (data) => {
        if (!controller.signal.aborted) setStats({ data });
      },
      (error) => {
        if (!controller.signal.aborted)
          setStats({ error: api.gisError(error) });
      },
    );

    return () => controller.abort();
  }, [revision]);
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
    page: page?.key === query ? page.data : undefined,
    listError: page?.key === query ? page.error : undefined,
    markers: markers?.key === query ? markers.data : undefined,
    mapError: markers?.key === query ? markers.error : undefined,
    stats: stats?.data,
    statsError: stats?.error,
    record: record && record.key === id ? record.data : undefined,
    reload: () => setRevision((value) => value + 1),
  };
}
