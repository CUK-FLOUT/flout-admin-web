import { useEffect, useRef, useState } from "react";
import { gisError } from "../../api/gisApplications";
import { getSessionGeneration } from "../../auth/session";

type Options = {
  applicationId: string;
  sourceMemo: string | null | undefined;
  loadError?: string;
  onSave: (id: string, memo: string) => Promise<string>;
};

export function useGisMemo({
  applicationId,
  sourceMemo,
  loadError,
  onSave,
}: Options) {
  const [memoSource, setMemoSource] = useState(sourceMemo);
  const [memo, setMemo] = useState(sourceMemo ?? "");

  if (memoSource !== sourceMemo) {
    setMemoSource(sourceMemo);
    setMemo(sourceMemo ?? "");
  }

  const memoReady = sourceMemo !== undefined && !loadError;
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [saveMessage, setSaveMessage] = useState("");
  const inFlight = useRef(false);
  const active = useRef(true);
  const generation = getSessionGeneration();

  useEffect(() => {
    active.current = true;

    return () => {
      active.current = false;
    };
  }, []);
  async function saveMemo() {
    if (inFlight.current || !memoReady) return;
    inFlight.current = true;
    setSaving(true);
    setSaveError("");
    setSaveMessage("");
    try {
      const saved = await onSave(applicationId, memo);

      if (active.current && generation === getSessionGeneration()) {
        setMemo(saved);
        setSaveMessage("내부 메모를 저장했습니다.");
      }
    } catch (error) {
      if (active.current && generation === getSessionGeneration())
        setSaveError(gisError(error));
    } finally {
      inFlight.current = false;
      if (active.current) setSaving(false);
    }
  }

  return { memo, setMemo, memoReady, saving, saveError, saveMessage, saveMemo };
}
