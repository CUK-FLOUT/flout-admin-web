import type { ResultContent } from "./types";

let draftGeneration: number | undefined;
const unsavedDrafts = new Map<number, ResultContent>();

function draftsFor(generation: number) {
  if (draftGeneration !== generation) {
    unsavedDrafts.clear();
    draftGeneration = generation;
  }

  return unsavedDrafts;
}

export function restoreInspectionDraft(
  id: number,
  generation: number,
  fallback: ResultContent,
  preferServer = false,
) {
  const content = preferServer
    ? fallback
    : (draftsFor(generation).get(id) ?? fallback);

  return structuredClone(content);
}

export function storeInspectionDraft(
  id: number,
  generation: number,
  content: ResultContent,
) {
  draftsFor(generation).set(id, structuredClone(content));
}

export function clearInspectionDraft(id: number, generation: number) {
  draftsFor(generation).delete(id);
}
