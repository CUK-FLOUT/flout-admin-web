import type { ChangeEvent, Dispatch, SetStateAction } from "react";
import {
  deleteInspectionPhoto,
  inspectionError,
  uploadInspectionPhotos,
} from "../../api/inspections";
import type { Category, ResultContent } from "./types";
import type { InspectionResultActionOptions } from "./inspectionResultActionTypes";

type Options = InspectionResultActionOptions & {
  rememberDraft: Dispatch<SetStateAction<ResultContent>>;
};

export function useInspectionResultPhotos({
  id,
  busy,
  readOnly,
  inFlightRef,
  isCurrent,
  setSaving,
  setError,
  rememberDraft,
}: Options) {
  async function removePhoto(photoId: string) {
    if (busy || inFlightRef.current || readOnly || !isCurrent()) return;
    inFlightRef.current = true;
    setSaving(true);
    setError("");
    try {
      await deleteInspectionPhoto(id, Number(photoId));
      if (isCurrent())
        rememberDraft((value) => ({
          ...value,
          photos: value.photos.filter((photo) => photo.id !== photoId),
        }));
    } catch (cause) {
      if (isCurrent()) setError(inspectionError(cause));
    } finally {
      inFlightRef.current = false;
      if (isCurrent()) setSaving(false);
    }
  }

  async function upload(
    event: ChangeEvent<HTMLInputElement>,
    category: Category | null = null,
  ) {
    const files = Array.from(event.target.files || []);

    event.target.value = "";
    if (
      !files.length ||
      busy ||
      inFlightRef.current ||
      readOnly ||
      !isCurrent()
    )
      return;
    inFlightRef.current = true;
    setSaving(true);
    setError("");
    try {
      const response = await uploadInspectionPhotos(id, files);

      if (!isCurrent()) return;
      const photos = response.photos.map((photo) => ({
        id: String(photo.photoId),
        name: photo.fileName,
        src: photo.url,
        category,
      }));

      rememberDraft((value) => ({
        ...value,
        photos: [...value.photos, ...photos],
      }));
    } catch (cause) {
      if (isCurrent()) setError(inspectionError(cause));
    } finally {
      inFlightRef.current = false;
      if (isCurrent()) setSaving(false);
    }
  }

  return { upload, removePhoto };
}
