import { useRef, useState } from "react";
import type { RefObject } from "react";
import {
  inspectionError,
  publishInspectionResult,
  saveInspectionDraft,
  validateRecommendedFacilities,
} from "../../api/inspections";
import { resultRequest, validateResult } from "./apiContent";
import type { ResultContent, ResultsDialogKind } from "./types";

type Options = {
  id: number;
  draft: ResultContent;
  busy: boolean;
  readOnly: boolean;
  inFlightRef: RefObject<boolean>;
  isCurrent: () => boolean;
  setSaving: (saving: boolean) => void;
  setError: (error: string) => void;
  setReadOnly: (readOnly: boolean) => void;
  setDialog: (kind: ResultsDialogKind | null) => void;
  clearSavedDraft: () => void;
};

export function useInspectionResultPublish({
  id,
  draft,
  busy,
  readOnly,
  inFlightRef,
  isCurrent,
  setSaving,
  setError,
  setReadOnly,
  setDialog,
  clearSavedDraft,
}: Options) {
  const [facilityWarning, setFacilityWarning] = useState(false);
  const validatedSnapshot = useRef<string | null>(null);

  async function persistResult(publish: boolean, confirmed = false) {
    if (busy || inFlightRef.current || readOnly || !isCurrent()) return;
    const problem = validateResult(draft, publish);

    if (problem) {
      setError(problem);

      return;
    }

    inFlightRef.current = true;
    setSaving(true);
    setError("");
    try {
      const body = resultRequest(draft);

      if (publish && !confirmed) {
        const validation = await validateRecommendedFacilities(
          body.recommendedActions.map((action) => action.description),
        );

        if (!isCurrent()) return;
        if (!validation.hasFacilities) {
          validatedSnapshot.current = JSON.stringify(body);
          setFacilityWarning(true);

          return;
        }
      }

      if (publish) await publishInspectionResult(id, body);
      else await saveInspectionDraft(id, body);
      clearSavedDraft();
      if (!isCurrent()) return;
      setReadOnly(publish);
      inFlightRef.current = false;
      setDialog(publish ? "published" : "draft-saved");
    } catch (cause) {
      if (isCurrent()) setError(inspectionError(cause));
    } finally {
      inFlightRef.current = false;
      if (isCurrent()) setSaving(false);
    }
  }

  function dismissFacilityWarning() {
    if (inFlightRef.current) return;
    validatedSnapshot.current = null;
    setFacilityWarning(false);
  }

  function editFacilityActions() {
    if (busy || inFlightRef.current || readOnly || !isCurrent()) return;
    dismissFacilityWarning();
    setDialog("actions");
  }

  async function confirmFacilityPublish() {
    if (inFlightRef.current || !facilityWarning || !isCurrent()) return;
    if (validatedSnapshot.current !== JSON.stringify(resultRequest(draft))) {
      dismissFacilityWarning();
      setError(
        "입력 내용이 변경되었습니다. 공개 버튼을 눌러 다시 검증해 주세요.",
      );

      return;
    }

    dismissFacilityWarning();
    await persistResult(true, true);
  }

  return {
    persist: (publish: boolean) => persistResult(publish),
    facilityWarning,
    dismissFacilityWarning,
    editFacilityActions,
    confirmFacilityPublish,
  };
}
