import {
  completeConstruction,
  constructionError,
  uploadConstructionPhotos,
} from "../../api/constructions";
import { writeConstructionDraft } from "./draftStorage";
import {
  constructionInstallationError,
  savedConstructionScheduleError,
} from "./constructionValidation";
import type { ConstructionDialogKind, ConstructionPhoto } from "./types";
import type {
  ConstructionActionContext,
  ConstructionDraftSetter,
  ConstructionShowDialog,
  UploadedConstructionPhotoIds,
} from "./constructionActionTypes";

type Options = ConstructionActionContext & {
  kind: ConstructionDialogKind | null;
  show: ConstructionShowDialog;
  setDraft: ConstructionDraftSetter;
  uploadedPhotoIds: UploadedConstructionPhotoIds;
  checked: boolean;
  setChecked: (checked: boolean) => void;
};

export function useConstructionCompletion({
  record: a,
  draft,
  mutation,
  setError,
  kind,
  show,
  setDraft,
  uploadedPhotoIds,
  checked,
  setChecked,
}: Options) {
  function hasSavedSchedule() {
    if (!a || !draft) return false;
    const issue = savedConstructionScheduleError(a, draft);

    if (issue) setError(issue);

    return !issue;
  }

  function install() {
    if (!a || !draft || a.status === "전체 완료" || mutation.submitting.current)
      return;
    setError("");
    show("installation");
  }

  function temporary() {
    setError(
      "설치 결과 임시 저장 API는 제공되지 않습니다. 입력 내용은 현재 화면에서 유지되며, 전체 완료 시 서버에 저장됩니다.",
    );
  }

  async function completeWithPhotos() {
    if (!a || !draft) return;
    const pending = draft.photos.filter(
      (photo): photo is ConstructionPhoto & { file: File } =>
        Boolean(photo.file) && !uploadedPhotoIds.current.has(photo.id),
    );

    if (pending.length) {
      const response = await uploadConstructionPhotos(
        Number(a.id),
        pending.map((photo) => photo.file),
      );
      const uploaded = response.photos.map((photo) => ({
        id: String(photo.photoId),
        name: photo.fileName,
        src: photo.url,
      }));

      const pendingIds = new Set(pending.map((photo) => photo.id));
      const mergeUploadedPhotos = (photos: ConstructionPhoto[]) => [
        ...photos.filter((photo) => !pendingIds.has(photo.id)),
        ...uploaded,
      ];

      // 완료 요청만 실패했을 때 이미 업로드한 파일을 다시 전송하지 않도록 기록한다.
      pending.forEach((photo) => uploadedPhotoIds.current.add(photo.id));
      const savedDraft = {
        ...draft,
        photos: mergeUploadedPhotos(draft.photos),
      };

      // 재진입 시 같은 파일을 다시 올리지 않도록 업로드된 파일을 기기 초안에서 제외한다.
      await writeConstructionDraft(a.id, savedDraft);
      if (mutation.active.current)
        setDraft((current) =>
          current
            ? {
                ...current,
                photos: mergeUploadedPhotos(current.photos),
              }
            : current,
        );
    }

    try {
      const result = await completeConstruction(Number(a.id), draft.note);

      await writeConstructionDraft(a.id, null).catch((cause) => {
        if (mutation.active.current)
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
    if (!a || !draft || mutation.submitting.current) return;
    if (a.status === "전체 완료") {
      show("completed-view");

      return;
    }

    if (!hasSavedSchedule()) return;
    const issue = constructionInstallationError(draft.note);

    if (issue) {
      setError(issue);

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
    if (mutation.submitting.current) return;
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

    const issue = constructionInstallationError(draft.note);

    if (issue) {
      setError(issue);

      return;
    }

    void mutation.request(completeWithPhotos, "overall-saved");
  }

  return { install, temporary, finish, confirm };
}
