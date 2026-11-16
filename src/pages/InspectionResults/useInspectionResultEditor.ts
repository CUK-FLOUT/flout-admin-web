import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import type { InspectionApplication } from "../Inspection/types";
import { getSessionGeneration } from "../../auth/session";
import { resultFeedbacks } from "./apiContent";
import { useInspectionResultDraft } from "./useInspectionResultDraft";
import { useInspectionResultPhotos } from "./useInspectionResultPhotos";
import { useInspectionRegionRegistration } from "./useInspectionRegionRegistration";
import { useInspectionResultPublish } from "./useInspectionResultPublish";
import { categories, resultsDialogKinds } from "./types";
import type {
  Category,
  Feedback,
  ResultContent,
  ResultsDialogKind,
} from "./types";

export default function useInspectionResultEditor(a: InspectionApplication) {
  const [params, setParams] = useSearchParams();
  const id = a.inspectionId!;
  const generation = getSessionGeneration();
  const viewOnly = params.get("view") === "readonly";
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const inFlight = useRef(false);
  const active = useRef(true);
  const current = () => active.current && generation === getSessionGeneration();
  const {
    draft,
    readOnly: resultReadOnly,
    setReadOnly,
    loading,
    loaded,
    rememberDraft,
    clearSavedDraft,
    retry,
  } = useInspectionResultDraft({
    id,
    generation,
    inFlightRef: inFlight,
    setError,
    viewOnly,
  });
  const readOnly = viewOnly || resultReadOnly;
  const busy = saving || loading || !loaded;
  const editingPublished = false;
  const content = draft;
  const expanded = content.selected.length > 1;
  const requestedDialog = params.get("dialog") as ResultsDialogKind;
  const dialog = resultsDialogKinds.includes(requestedDialog)
    ? requestedDialog
    : null;

  const {
    persist,
    facilityWarning,
    dismissFacilityWarning,
    editFacilityActions,
    confirmFacilityPublish,
  } = useInspectionResultPublish({
    id,
    draft,
    busy,
    readOnly,
    inFlightRef: inFlight,
    isCurrent: current,
    setSaving,
    setError,
    setReadOnly,
    setDialog,
    clearSavedDraft,
  });

  useEffect(() => {
    active.current = true;

    return () => {
      active.current = false;
    };
  }, []);

  const actionOptions = {
    id,
    busy,
    readOnly,
    inFlightRef: inFlight,
    isCurrent: current,
    setSaving,
    setError,
  };
  const { upload, removePhoto } = useInspectionResultPhotos({
    ...actionOptions,
    rememberDraft,
  });
  const { registerRegion } = useInspectionRegionRegistration({
    ...actionOptions,
    address: a.address,
    setDialog,
  });

  function setDialog(kind: ResultsDialogKind | null) {
    if (inFlight.current) return;
    const next = new URLSearchParams(params);

    if (kind) next.set("dialog", kind);
    else next.delete("dialog");
    setParams(next, { replace: true });
  }

  function updateFeedback(index: number, feedback: Feedback) {
    const entries = resultFeedbacks(content).map((entry, i) =>
      i === index ? { ...entry, feedback } : entry,
    );

    update("feedbackEntries", entries);
  }

  function update<K extends keyof ResultContent>(
    key: K,
    value: ResultContent[K],
  ) {
    if (busy || inFlight.current || readOnly || !current()) return;
    rememberDraft((current) => ({ ...current, [key]: value }));
    setError("");
  }

  function toggleCategory(category: Category) {
    if (busy || inFlight.current || readOnly || !current()) return;
    const selected = content.selected.includes(category)
      ? content.selected.filter((c) => c !== category)
      : categories.filter(
          (c) => c === category || content.selected.includes(c),
        );
    const entries = resultFeedbacks(content).filter((entry) =>
      selected.includes(entry.category),
    );

    if (!content.selected.includes(category))
      entries.push({ category, feedback: content.details[category] });
    rememberDraft({ ...content, selected, feedbackEntries: entries });
    setError("");
  }

  return {
    params,
    setParams,
    draft,
    error,
    busy,
    saving,
    loading,
    loaded,
    retry,
    editingPublished,
    readOnly,
    content,
    expanded,
    dialog,
    setDialog,
    update,
    updateFeedback,
    toggleCategory,
    persist,
    facilityWarning,
    dismissFacilityWarning,
    editFacilityActions,
    confirmFacilityPublish,
    registerRegion,
    upload,
    removePhoto,
  };
}
