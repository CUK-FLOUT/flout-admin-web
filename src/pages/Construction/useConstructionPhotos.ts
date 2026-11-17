import type { RefObject } from "react";
import {
  constructionError,
  validateConstructionPhotos,
} from "../../api/constructions";
import type {
  ConstructionActionContext,
  ConstructionDraftSetter,
  UploadedConstructionPhotoIds,
} from "./constructionActionTypes";

type Options = ConstructionActionContext & {
  setDraft: ConstructionDraftSetter;
  photoUrls: RefObject<Set<string>>;
  uploadedPhotoIds: UploadedConstructionPhotoIds;
  setChecked: (checked: boolean) => void;
};

export function useConstructionPhotos({
  record: a,
  draft,
  mutation,
  setError,
  setDraft,
  photoUrls,
  uploadedPhotoIds,
  setChecked,
}: Options) {
  function upload(files: File[]) {
    if (
      !files.length ||
      !draft ||
      !a ||
      a.status === "전체 완료" ||
      mutation.submitting.current
    )
      return;
    setError("");
    try {
      validateConstructionPhotos([
        ...draft.photos.flatMap((photo) => (photo.file ? [photo.file] : [])),
        ...files,
      ]);
      const photos = files.map((file) => {
        const src = URL.createObjectURL(file);

        photoUrls.current.add(src);

        return {
          id: "pending-" + crypto.randomUUID(),
          name: file.name,
          src,
          file,
        };
      });

      setDraft((current) =>
        current
          ? {
              ...current,
              photos: [...current.photos, ...photos],
              verified: false,
            }
          : current,
      );
    } catch (cause) {
      setError(constructionError(cause));
    }
  }

  function removePhoto(id: string) {
    if (!draft || !a || a.status === "전체 완료" || mutation.submitting.current)
      return;
    const photo = draft.photos.find((item) => item.id === id);

    if (!photo?.file || uploadedPhotoIds.current.has(id)) {
      setError("이미 서버에 업로드된 사진은 삭제할 수 없습니다.");

      return;
    }

    URL.revokeObjectURL(photo.src);
    photoUrls.current.delete(photo.src);
    setDraft((current) =>
      current
        ? {
            ...current,
            photos: current.photos.filter((item) => item.id !== id),
            verified: false,
          }
        : current,
    );
    setChecked(false);
    setError("");
  }

  return { upload, removePhoto };
}
