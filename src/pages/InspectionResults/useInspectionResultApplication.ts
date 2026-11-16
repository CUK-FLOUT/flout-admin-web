import { useEffect, useState } from "react";
import { loadInspection } from "../Inspection/loadInspection";
import { inspectionError } from "../../api/inspections";
import type { InspectionApplication } from "../Inspection/types";

export function useInspectionResultApplication(requestId: string | undefined) {
  const [application, setApplication] = useState<InspectionApplication>();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    const controller = new AbortController();

    async function load() {
      setLoading(true);
      setApplication(undefined);
      setError("");
      try {
        const result = await loadInspection(
          Number(requestId),
          controller.signal,
        );

        if (!controller.signal.aborted) setApplication(result);
      } catch (error) {
        if (!controller.signal.aborted) setError(inspectionError(error));
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }

    void load();

    return () => controller.abort();
  }, [requestId, revision]);

  return {
    application,
    error,
    loading,
    retry: () => setRevision((value) => value + 1),
  };
}
