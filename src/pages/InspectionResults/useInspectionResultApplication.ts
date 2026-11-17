import { useEffect, useState } from "react";
import { loadInspection } from "../Inspection/loadInspection";
import { inspectionError } from "../../api/inspections";
import type { InspectionApplication } from "../Inspection/types";

type RequestState = {
  requestId: string | undefined;
  revision: number;
  application?: InspectionApplication;
  error: string;
  loading: boolean;
};

export function useInspectionResultApplication(requestId: string | undefined) {
  const [state, setState] = useState<RequestState>();
  const [revision, setRevision] = useState(0);
  const current =
    state?.requestId === requestId && state?.revision === revision
      ? state
      : undefined;

  useEffect(() => {
    const controller = new AbortController();

    async function load() {
      setState({ requestId, revision, error: "", loading: true });
      try {
        const application = await loadInspection(
          Number(requestId),
          controller.signal,
        );

        if (!controller.signal.aborted)
          setState({
            requestId,
            revision,
            application,
            error: "",
            loading: false,
          });
      } catch (error) {
        if (!controller.signal.aborted)
          setState({
            requestId,
            revision,
            error: inspectionError(error),
            loading: false,
          });
      }
    }

    void load();

    return () => controller.abort();
  }, [requestId, revision]);

  return {
    application: current?.application,
    error: current?.error ?? "",
    loading: current?.loading ?? true,
    retry: () => setRevision((value) => value + 1),
  };
}
