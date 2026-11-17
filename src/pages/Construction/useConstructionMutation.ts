import { useEffect, useRef, useState } from "react";
import { constructionError } from "../../api/constructions";
import type { ConstructionDialogKind, ConstructionRecord } from "./types";

type Options = {
  record?: ConstructionRecord;
  blocked: boolean;
  show: (kind: ConstructionDialogKind, id?: string) => void;
  setError: (message: string) => void;
  refresh: (id?: string) => void;
};

export function useConstructionMutation({
  record,
  blocked,
  show,
  setError,
  refresh,
}: Options) {
  const [busy, setBusy] = useState(false);
  const submitting = useRef(false);
  const active = useRef(false);

  useEffect(() => {
    active.current = true;

    return () => {
      active.current = false;
    };
  }, []);
  async function request(
    action: () => Promise<unknown>,
    success?: ConstructionDialogKind,
  ) {
    if (submitting.current || blocked || !record) return;
    submitting.current = true;
    setBusy(true);
    setError("");
    try {
      await action();
      refresh(record.id);
      if (active.current && success) show(success);
    } catch (cause) {
      if (active.current) setError(constructionError(cause));
    } finally {
      submitting.current = false;
      if (active.current) setBusy(false);
    }
  }

  return { busy, submitting, active, request };
}

export type ConstructionMutation = ReturnType<typeof useConstructionMutation>;
