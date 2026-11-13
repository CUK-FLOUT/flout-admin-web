import { useEffect, useRef, useState } from "react";
import {
  completeConstruction,
  constructionError,
  constructionScheduleError,
  saveConstructionSchedule,
  validateConstructionPhotos,
  uploadConstructionPhotos,
} from "../../api/constructions";
import { useConstructionDraft } from "./useConstructionDraft";
import { writeConstructionDraft } from "./draftStorage";
import type { ConstructionDialogKind, ConstructionRecord } from "./types";

type Options = {
  record?: ConstructionRecord;
  kind: ConstructionDialogKind | null;
  show: (kind: ConstructionDialogKind, id?: string) => void;
  setError: (message: string) => void;
  refresh: (id?: string) => void;
};

export function useConstructionActions({
  record: a,
  kind,
  show,
  setError,
  refresh,
}: Options) {
  const { draft, setDraft, restoring, restoreFailed, photoUrls } =
    useConstructionDraft(a, setError);
  const draftBlocked = restoring || restoreFailed;
  const [checked, setChecked] = useState(false);
  const [busy, setBusy] = useState(false);
  const submitting = useRef(false);
  const active = useRef(false);
  const uploadedPhotoIds = useRef(new Set<string>());

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
    if (submitting.current || draftBlocked || !a) return;
    submitting.current = true;
    setBusy(true);
    setError("");
    try {
      await action();
      refresh(a.id);
      if (active.current && success) show(success);
    } catch (cause) {
      if (active.current) setError(constructionError(cause));
    } finally {
      submitting.current = false;
      if (active.current) setBusy(false);
    }
  }

  function hasSavedSchedule() {
    if (!a || !draft) return false;
    if (!a.date || !a.time) {
      setError("배정·일정을 먼저 저장해 주세요.");

      return false;
    }

    if (draft.date !== a.date || draft.time !== a.time) {
      setError(
        "저장된 시공 일정과 입력값이 다릅니다. 최신 일정을 확인해 주세요.",
      );

      return false;
    }

    return true;
  }

  function schedule() {
    if (!a || !draft) return;
    if (!a.scheduleEditable) {
      setError("일정은 미배정 시공에 최초 한 번만 저장할 수 있습니다.");

      return;
    }

    const issue = constructionScheduleError(draft.date, draft.time);

    if (issue) {
      setError(issue);

      return;
    }

    void request(
      () => saveConstructionSchedule(Number(a.id), draft.date, draft.time),
      "schedule-saved",
    );
  }

  function install() {
    if (!a || !draft || a.status === "전체 완료" || submitting.current) return;
    setError("");
    show("installation");
  }

  function temporary() {
    setError(
      "설치 결과 임시 저장 API는 제공되지 않습니다. 입력 내용은 현재 화면에서 유지되며, 전체 완료 시 서버에 저장됩니다.",
    );
  }

  function upload(files: File[]) {
    if (
      !files.length ||
      !draft ||
      !a ||
      a.status === "전체 완료" ||
      submitting.current
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
    if (!draft || !a || a.status === "전체 완료" || submitting.current) return;
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

  async function completeWithPhotos() {
    if (!a || !draft) return;
    const pending = draft.photos.filter(
      (photo) => photo.file && !uploadedPhotoIds.current.has(photo.id),
    );

    if (pending.length) {
      const response = await uploadConstructionPhotos(
        Number(a.id),
        pending.map((photo) => photo.file!),
      );
      const uploaded = response.photos.map((photo) => ({
        id: String(photo.photoId),
        name: photo.fileName,
        src: photo.url,
      }));

      pending.forEach((photo) => uploadedPhotoIds.current.add(photo.id));
      const savedDraft = {
        ...draft,
        photos: [
          ...draft.photos.filter(
            (photo) => !pending.some((item) => item.id === photo.id),
          ),
          ...uploaded,
        ],
      };

      await writeConstructionDraft(a.id, savedDraft);
      if (active.current)
        setDraft((current) =>
          current
            ? {
                ...current,
                photos: [
                  ...current.photos.filter(
                    (photo) => !pending.some((item) => item.id === photo.id),
                  ),
                  ...uploaded,
                ],
              }
            : current,
        );
    }

    try {
      const result = await completeConstruction(Number(a.id), draft.note);

      await writeConstructionDraft(a.id, null).catch((cause) => {
        if (active.current)
          setError(
            "전체 완료는 처리되었지만 기기의 초안을 정리하지 못했습니다. " +
              constructionError(cause),
          );
      });

      return result;
    } catch (cause) {
      if (pending.length || uploadedPhotoIds.current.size) {
        throw new Error(
          "사진 업로드는 완료되었지만 전체 완료 처리가 실패했습니다. 사진을 다시 업로드하지 않고 완료 처리를 재시도할 수 있습니다. " +
            constructionError(cause),
          { cause },
        );
      }

      throw cause;
    }
  }

  function finish() {
    if (!a || !draft || submitting.current) return;
    if (a.status === "전체 완료") {
      show("completed-view");

      return;
    }

    if (!hasSavedSchedule()) return;
    if (!draft.note.trim() || draft.note.trim().length > 4000) {
      setError("최종 설치 결과를 1~4000자로 입력해 주세요.");

      return;
    }

    if (!draft.photos.length) {
      setError("시공 사진을 1장 이상 선택해 주세요.");

      return;
    }

    setChecked(false);
    setError("");
    show("completion-review");
  }

  function confirm() {
    if (submitting.current) return;
    if (kind === "register" || kind === "register-support") {
      setError(
        "시공 대상은 지원 승인 시 서버에서 생성됩니다. 별도 등록 API는 제공되지 않습니다.",
      );

      return;
    }

    if (!a || !draft) return;
    if (kind !== "completion-review" && kind !== "installation") return;
    if (!hasSavedSchedule() || a.status === "전체 완료") return;
    if (!(kind === "completion-review" ? checked : draft.verified)) {
      setError("설치 결과·사진 확인 항목을 선택해 주세요.");

      return;
    }

    if (!draft.photos.length) {
      setError("시공 사진을 1장 이상 선택해 주세요.");

      return;
    }

    if (!draft.note.trim() || draft.note.trim().length > 4000) {
      setError("최종 설치 결과를 1~4000자로 입력해 주세요.");

      return;
    }

    void request(completeWithPhotos, "overall-saved");
  }

  return {
    draft,
    setDraft,
    restoring,
    draftBlocked,
    checked,
    setChecked,
    busy,
    isSubmitting: () => submitting.current,
    schedule,
    install,
    temporary,
    upload,
    removePhoto,
    finish,
    confirm,
  };
}
