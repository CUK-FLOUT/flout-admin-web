import { useRef, useState } from "react";
import { useConstructionDraft } from "./useConstructionDraft";
import { useConstructionMutation } from "./useConstructionMutation";
import { useConstructionSchedule } from "./useConstructionSchedule";
import { useConstructionPhotos } from "./useConstructionPhotos";
import { useConstructionCompletion } from "./useConstructionCompletion";
import type { ConstructionDialogKind, ConstructionRecord } from "./types";

type Options = {
  record?: ConstructionRecord;
  kind: ConstructionDialogKind | null;
  show: (kind: ConstructionDialogKind, id?: string) => void;
  setError: (message: string) => void;
  refresh: (id?: string) => void;
};

export function useConstructionActions({
  record,
  kind,
  show,
  setError,
  refresh,
}: Options) {
  const { draft, setDraft, restoring, restoreFailed, photoUrls } =
    useConstructionDraft(record, setError);
  const draftBlocked = restoring || restoreFailed;
  const [checked, setChecked] = useState(false);
  const uploadedPhotoIds = useRef(new Set<string>());
  // 일정 저장과 사진·완료 처리는 하나의 잠금을 공유해야 동시 요청이 겹치지 않는다.
  const mutation = useConstructionMutation({
    record,
    blocked: draftBlocked,
    show,
    setError,
    refresh,
  });
  const context = { record, draft, mutation, setError };
  const { schedule } = useConstructionSchedule(context);
  const { upload, removePhoto } = useConstructionPhotos({
    ...context,
    setDraft,
    photoUrls,
    uploadedPhotoIds,
    setChecked,
  });
  const { install, temporary, finish, confirm } = useConstructionCompletion({
    ...context,
    kind,
    show,
    setDraft,
    uploadedPhotoIds,
    checked,
    setChecked,
  });

  return {
    draft,
    setDraft,
    restoring,
    draftBlocked,
    checked,
    setChecked,
    busy: mutation.busy,
    isSubmitting: () => mutation.submitting.current,
    schedule,
    install,
    temporary,
    upload,
    removePhoto,
    finish,
    confirm,
  };
}
