import { useEffect, useRef, useState } from "react";
import type { ChangeEvent } from "react";
import { useSearchParams } from "react-router-dom";
import type { InspectionApplication } from "../Inspection/mockData";
import { getSessionGeneration } from "../../auth/session";
import {
  createPublicIssue,
  deleteInspectionPhoto,
  getInspectionResult,
  inspectionError,
  publishInspectionResult,
  saveInspectionDraft,
  uploadInspectionPhotos,
} from "../../api/inspections";
import {
  emptyResultContent,
  publicIssueRequest,
  resultContent,
  resultFeedbacks,
  resultRequest,
  validateResult,
} from "./apiContent";
import { categories, resultsDialogKinds } from "./types";
import type {
  Category,
  Feedback,
  RegionIssue,
  ResultContent,
  ResultsDialogKind,
} from "./types";

let draftGeneration: number | undefined;
const unsavedDrafts = new Map<number, ResultContent>();

function draftsFor(generation: number) {
  if (draftGeneration !== generation) {
    unsavedDrafts.clear();
    draftGeneration = generation;
  }

  return unsavedDrafts;
}

export default function useInspectionResultEditor(a: InspectionApplication) {
  const [params, setParams] = useSearchParams();
  const id = a.inspectionId!;
  const generation = getSessionGeneration();
  const [draft, setDraft] = useState<ResultContent>(() =>
    structuredClone(draftsFor(generation).get(id) ?? emptyResultContent()),
  );
  const [readOnly, setReadOnly] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [loaded, setLoaded] = useState(false);
  const [revision, setRevision] = useState(0);
  const [saving, setSaving] = useState(false);
  const inFlight = useRef(false);
  const active = useRef(true);
  const current = () => active.current && generation === getSessionGeneration();
  const busy = saving || loading || !loaded;
  const editingPublished = false;
  const content = draft;
  const expanded = content.selected.length > 1;
  const requestedDialog = params.get("dialog") as ResultsDialogKind;
  const dialog = resultsDialogKinds.includes(requestedDialog)
    ? requestedDialog
    : null;

  useEffect(() => {
    active.current = true;

    return () => {
      active.current = false;
    };
  }, []);

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
        setDraft(structuredClone(published ? content : draftsFor(generation).get(id) ?? content));
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
  }, [id, generation, revision]);

  function setDialog(kind: ResultsDialogKind | null) {
    if (inFlight.current) return;
    const next = new URLSearchParams(params);

    if (kind) next.set("dialog", kind);
    else next.delete("dialog");
    setParams(next, { replace: true });
  }

  function rememberDraft(value: ResultContent | ((previous: ResultContent) => ResultContent)) {
    setDraft((previous) => {
      const next = typeof value === "function" ? value(previous) : value;

      draftsFor(generation).set(id, structuredClone(next));

      return next;
    });
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
      : categories.filter((c) => c === category || content.selected.includes(c));
    const entries = resultFeedbacks(content).filter((entry) => selected.includes(entry.category));

    if (!content.selected.includes(category))
      entries.push({ category, feedback: content.details[category] });
    rememberDraft({ ...content, selected, feedbackEntries: entries });
    setError("");
  }

  async function persist(publish: boolean) {
    if (busy || inFlight.current || readOnly || !current()) return;
    const problem = validateResult(draft, publish);

    if (problem) {
      setError(problem);

      return;
    }

    inFlight.current = true;
    setSaving(true);
    setError("");
    try {
      if (publish) await publishInspectionResult(id, resultRequest(draft));
      else await saveInspectionDraft(id, resultRequest(draft));
      if (generation === getSessionGeneration()) draftsFor(generation).delete(id);
      if (!current()) return;
      setReadOnly(publish);
      inFlight.current = false;
      setDialog(publish ? "published" : "draft-saved");
    } catch (cause) {
      if (current()) setError(inspectionError(cause));
    } finally {
      inFlight.current = false;
      if (current()) setSaving(false);
    }
  }

  async function registerRegion(
    issue: Omit<RegionIssue, "id" | "source" | "status" | "applicationId">,
  ) {
    if (busy || inFlight.current || readOnly || !current()) return false;
    inFlight.current = true;
    setSaving(true);
    try {
      await createPublicIssue(
        publicIssueRequest(id, {
          ...issue,
          location: issue.location.trim() === a.address ? "" : issue.location,
        }),
      );
      if (!current()) return false;
      inFlight.current = false;
      setError("");
      setDialog("region-saved");

      return true;
    } catch (cause) {
      if (current()) throw new Error(inspectionError(cause), { cause });

      return false;
    } finally {
      inFlight.current = false;
      if (current()) setSaving(false);
    }
  }

  async function removePhoto(photoId: string) {
    if (busy || inFlight.current || readOnly || !current()) return;
    inFlight.current = true;
    setSaving(true);
    setError("");
    try {
      await deleteInspectionPhoto(id, Number(photoId));
      if (current())
        rememberDraft((value) => ({
          ...value,
          photos: value.photos.filter((photo) => photo.id !== photoId),
        }));
    } catch (cause) {
      if (current()) setError(inspectionError(cause));
    } finally {
      inFlight.current = false;
      if (current()) setSaving(false);
    }
  }

  async function upload(
    event: ChangeEvent<HTMLInputElement>,
    category: Category | null = null,
  ) {
    const files = Array.from(event.target.files || []);

    event.target.value = "";
    if (!files.length || busy || inFlight.current || readOnly || !current())
      return;
    inFlight.current = true;
    setSaving(true);
    setError("");
    try {
      const response = await uploadInspectionPhotos(id, files);

      if (!current()) return;
      const photos = response.photos.map((photo) => ({
        id: String(photo.photoId),
        name: photo.fileName,
        src: photo.url,
        category,
      }));

      rememberDraft((value) => ({ ...value, photos: [...value.photos, ...photos] }));
    } catch (cause) {
      if (current()) setError(inspectionError(cause));
    } finally {
      inFlight.current = false;
      if (current()) setSaving(false);
    }
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
    retry: () => {
      if (!inFlight.current) setRevision((value) => value + 1);
    },
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
    registerRegion,
    upload,
    removePhoto,
  };
}
