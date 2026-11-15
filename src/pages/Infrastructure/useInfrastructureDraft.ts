import { useEffect, useRef, useState } from "react";
import type { RefObject } from "react";
import { facilityDraft } from "./model";
import {
  publicIssueError,
  validatePublicIssueImages,
} from "../../api/publicIssues";
import type { FacilityDraft, InfrastructureIssue } from "./types";

type Options = {
  issue: InfrastructureIssue;
  submittingRef: RefObject<boolean>;
  setError: (error: string) => void;
};

export function useInfrastructureDraft({
  issue,
  submittingRef,
  setError,
}: Options) {
  const readOnly = issue.status === "조치 완료";
  const photoUrlsRef = useRef(new Set<string>());
  const [draft, setDraft] = useState<FacilityDraft>(() => facilityDraft(issue));
  const [previousIssue, setPreviousIssue] = useState(issue);

  if (issue !== previousIssue) {
    setPreviousIssue(issue);
    setDraft((current) => ({
      ...current,
      result:
        issue.status === "조치 완료" ? issue.action.result : current.result,
      verified:
        issue.status === "조치 완료" ? issue.action.verified : current.verified,
      photos: Array.from(
        new Map(
          [...current.photos, ...issue.action.photos].map((photo) => [
            photo.id,
            photo,
          ]),
        ).values(),
      ),
    }));
  }

  useEffect(() => {
    const urls = photoUrlsRef.current;

    return () => {
      urls.forEach((url) => URL.revokeObjectURL(url));
      urls.clear();
    };
  }, []);

  function update<K extends keyof FacilityDraft>(
    key: K,
    value: FacilityDraft[K],
  ) {
    if (submittingRef.current || readOnly) return;
    const oldPhotos = draft.photos;

    if (key === "photos" && Array.isArray(value)) {
      for (const photo of oldPhotos) {
        if (photo.file && !value.some((item) => item.id === photo.id)) {
          URL.revokeObjectURL(photo.src);
          photoUrlsRef.current.delete(photo.src);
        }
      }
    }

    setDraft((d) => ({
      ...d,
      [key]: value,
      ...(!readOnly && ["result", "photos"].includes(key)
        ? { verified: false }
        : {}),
    }));
    setError("");
  }

  async function upload(files: File[]) {
    if (!files.length || submittingRef.current || readOnly) return;
    setError("");
    try {
      validatePublicIssueImages([
        ...draft.photos.flatMap((photo) => (photo.file ? [photo.file] : [])),
        ...files,
      ]);
      const photos = files.map((file) => {
        const src = URL.createObjectURL(file);

        photoUrlsRef.current.add(src);

        return {
          id: "pending-" + crypto.randomUUID(),
          name: file.name,
          src,
          file,
        };
      });

      setDraft((current) => ({
        ...current,
        photos: [...current.photos, ...photos],
        verified: false,
      }));
    } catch (cause) {
      setError(publicIssueError(cause));
    }
  }

  function applyCompletedPhotos(photos: FacilityDraft["photos"]) {
    photoUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
    photoUrlsRef.current.clear();
    setDraft((current) => ({ ...current, photos, verified: true }));
  }

  return { draft, setDraft, update, upload, applyCompletedPhotos };
}
