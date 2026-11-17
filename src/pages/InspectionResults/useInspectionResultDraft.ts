import { useEffect, useState } from "react";
import type { RefObject } from "react";
import { getSessionGeneration } from "../../auth/session";
import { getInspectionResult, inspectionError } from "../../api/inspections";
import { emptyResultContent, resultContent } from "./apiContent";
import {
  restoreInspectionDraft,
  storeInspectionDraft,
  clearInspectionDraft,
} from "./inspectionResultDrafts";
import type { ResultContent } from "./types";

type Options = {
  id: number;
  generation: number;
  inFlightRef: RefObject<boolean>;
  setError: (message: string) => void;
  viewOnly?: boolean;
};

export function useInspectionResultDraft({
  id,
  generation,
  inFlightRef,
  setError,
  viewOnly = false,
}: Options) {
  const [draft, setDraft] = useState<ResultContent>(() =>
    restoreInspectionDraft(id, generation, emptyResultContent(), viewOnly),
  );
  const [readOnly, setReadOnly] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loaded, setLoaded] = useState(false);
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    const isCurrentRequest = () =>
      !controller.signal.aborted && generation === getSessionGeneration();

    async function load() {
      setLoading(true);
      setLoaded(false);
      setError("");
      try {
        const result = await getInspectionResult(id, controller.signal);
        const content = resultContent(result);

        if (!isCurrentRequest()) return;
        const published = result?.resultStatus === "PUBLISHED";

        const useServerContent = published || viewOnly;

        if (published) clearInspectionDraft(id, generation);
        setDraft(
          restoreInspectionDraft(id, generation, content, useServerContent),
        );
        setReadOnly(useServerContent);
        setLoaded(true);
      } catch (cause) {
        if (isCurrentRequest()) setError(inspectionError(cause));
      } finally {
        if (isCurrentRequest()) setLoading(false);
      }
    }

    void load();

    return () => controller.abort();
  }, [id, generation, revision, setError, viewOnly]);

  function rememberDraft(
    value: ResultContent | ((previous: ResultContent) => ResultContent),
  ) {
    setDraft((previous) => {
      const next = typeof value === "function" ? value(previous) : value;

      storeInspectionDraft(id, generation, next);

      return next;
    });
  }

  return {
    draft,
    readOnly,
    setReadOnly,
    loading,
    loaded,
    rememberDraft,
    clearSavedDraft: () => {
      if (generation === getSessionGeneration())
        clearInspectionDraft(id, generation);
    },
    retry: () => {
      if (!inFlightRef.current) setRevision((value) => value + 1);
    },
  };
}
