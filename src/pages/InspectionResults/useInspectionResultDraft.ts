import { useEffect, useState } from "react";
import type { RefObject } from "react";
import { getSessionGeneration } from "../../auth/session";
import { getInspectionResult, inspectionError } from "../../api/inspections";
import { emptyResultContent, resultContent } from "./apiContent";
import type { ResultContent } from "./types";

type Options = {
  id: number;
  generation: number;
  inFlightRef: RefObject<boolean>;
  setError: (message: string) => void;
};

let draftGeneration: number | undefined;
const unsavedDrafts = new Map<number, ResultContent>();

function draftsFor(generation: number) {
  if (draftGeneration !== generation) {
    unsavedDrafts.clear();
    draftGeneration = generation;
  }

  return unsavedDrafts;
}

export function useInspectionResultDraft({
  id,
  generation,
  inFlightRef,
  setError,
}: Options) {
  const [draft, setDraft] = useState<ResultContent>(() =>
    structuredClone(draftsFor(generation).get(id) ?? emptyResultContent()),
  );
  const [readOnly, setReadOnly] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loaded, setLoaded] = useState(false);
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    const controller = new AbortController();

    async function load() {
      setLoading(true);
      setLoaded(false);
      setError("");
      try {
        const result = await getInspectionResult(id, controller.signal);
        const content = resultContent(result);

        if (controller.signal.aborted || generation !== getSessionGeneration())
          return;
        const published = result?.resultStatus === "PUBLISHED";

        if (published) draftsFor(generation).delete(id);
        setDraft(
          structuredClone(
            published ? content : (draftsFor(generation).get(id) ?? content),
          ),
        );
        setReadOnly(result?.resultStatus === "PUBLISHED");
        setLoaded(true);
      } catch (cause) {
        if (!controller.signal.aborted && generation === getSessionGeneration())
          setError(inspectionError(cause));
      } finally {
        if (!controller.signal.aborted && generation === getSessionGeneration())
          setLoading(false);
      }
    }

    void load();

    return () => controller.abort();
  }, [id, generation, revision, setError]);

  function rememberDraft(
    value: ResultContent | ((previous: ResultContent) => ResultContent),
  ) {
    setDraft((previous) => {
      const next = typeof value === "function" ? value(previous) : value;

      draftsFor(generation).set(id, structuredClone(next));

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
        draftsFor(generation).delete(id);
    },
    retry: () => {
      if (!inFlightRef.current) setRevision((value) => value + 1);
    },
  };
}
