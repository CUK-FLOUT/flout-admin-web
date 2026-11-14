import { useEffect, useRef, useState } from "react";
import { facilityDraft } from "./model";
import {
  completePublicIssueAction,
  getPublicIssue,
  publicIssueError,
  savePublicIssueReview,
  validatePublicIssueImages,
} from "../../api/publicIssues";
import { publicReviewStatus } from "./apiMapping";
import type {
  FacilityDraft,
  InfrastructureDialogKind,
  InfrastructureIssue,
} from "./types";
import type { useInfrastructureData } from "./useInfrastructureData";

type Options = {
  issue: InfrastructureIssue;
  data: Pick<
    ReturnType<typeof useInfrastructureData>,
    "setError" | "applyReview" | "applyDetail" | "applyCompletion" | "refresh"
  >;
  onDialog: (kind: InfrastructureDialogKind | null) => void;
};

export function useInfrastructureReviewActions({
  issue,
  data,
  onDialog,
}: Options) {
  const [draft, setDraft] = useState<FacilityDraft>(() => {
    const initial = facilityDraft(issue);

    return {
      ...initial,
      status:
        issue.reviewState === "INSPECTION_REQUIRED"
          ? "점검 필요"
          : initial.status,
    };
  });
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

  const [busy, setBusy] = useState(false);
  const readOnly = issue.status === "조치 완료";
  const active = useRef(false);
  const submitting = useRef(false);
  const completionUncertain = useRef(false);
  const photoUrls = useRef(new Set<string>());

  useEffect(() => {
    active.current = true;
    const urls = photoUrls.current;

    return () => {
      active.current = false;
      urls.forEach((url) => URL.revokeObjectURL(url));
      urls.clear();
    };
  }, []);

  function update<K extends keyof FacilityDraft>(
    key: K,
    value: FacilityDraft[K],
  ) {
    if (submitting.current || readOnly) return;
    const oldPhotos = draft.photos;

    if (key === "photos" && Array.isArray(value)) {
      for (const photo of oldPhotos) {
        if (photo.file && !value.some((item) => item.id === photo.id)) {
          URL.revokeObjectURL(photo.src);
          photoUrls.current.delete(photo.src);
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
    data.setError("");
  }

  async function save() {
    if (submitting.current || readOnly) return;
    const reviewStatus = issue.reviewState || publicReviewStatus(draft.status);

    if (reviewStatus === "ACTION_IN_PROGRESS" || reviewStatus === "COMPLETED") {
      data.setError("현재 조치 상태에서는 검토 내용을 저장할 수 없습니다.");

      return;
    }

    submitting.current = true;
    setBusy(true);
    data.setError("");
    try {
      const saved = await savePublicIssueReview(Number(issue.id), {
        reviewTarget: draft.target,
        reviewStatus,
        inspectionNotes: draft.requirements,
        reviewReason: issue.reviewReason,
      });

      if (!active.current) return;
      setDraft((current) => ({
        ...current,
        target: saved.reviewTarget,
        requirements: saved.inspectionNotes,
      }));
      data.applyReview(saved);
      data.refresh();
      submitting.current = false;
      onDialog("status-saved");
    } catch (cause) {
      if (active.current) data.setError(publicIssueError(cause));
    } finally {
      submitting.current = false;
      if (active.current) setBusy(false);
    }
  }

  function requestComplete() {
    if (submitting.current) return;
    if (readOnly) return;
    if (completionUncertain.current) {
      void finishAction();

      return;
    }

    if (!issue.reviewId) {
      data.setError("공공시설 검토 내용을 먼저 저장해 주세요.");

      return;
    }

    if (
      !draft.result.trim() ||
      draft.result.trim().length > 4000 ||
      !draft.verified
    ) {
      data.setError(
        "조치 결과(1~4000자)와 조치·결과 확인 항목을 확인해 주세요.",
      );

      return;
    }

    if (!draft.photos.some((photo) => photo.file)) {
      data.setError("조치 사진을 1장 이상 선택해 주세요.");

      return;
    }

    data.setError("");
    onDialog("complete-confirm");
  }

  async function upload(files: File[]) {
    if (!files.length || submitting.current || readOnly) return;
    data.setError("");
    try {
      validatePublicIssueImages([
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

      setDraft((current) => ({
        ...current,
        photos: [...current.photos, ...photos],
        verified: false,
      }));
    } catch (cause) {
      data.setError(publicIssueError(cause));
    }
  }

  function applyCompletedPhotos(photos: FacilityDraft["photos"]) {
    photoUrls.current.forEach((url) => URL.revokeObjectURL(url));
    photoUrls.current.clear();
    setDraft((current) => ({ ...current, photos, verified: true }));
  }

  async function reconcileCompletion(failure = "") {
    try {
      const latest = await getPublicIssue(Number(issue.id));

      if (!active.current) return;
      if (latest.status === "COMPLETED") {
        data.applyDetail(latest);
        const action = latest.actions
          .filter((item) => item.status === "COMPLETED")
          .sort((a, b) => b.actionId - a.actionId)[0];

        applyCompletedPhotos(
          (action?.images ?? []).map((image) => ({
            id: String(image.imageId),
            name: `조치 사진 ${image.imageId}`,
            src: image.imageUrl,
          })),
        );
        data.setError("서버의 사진 저장 및 조치 완료를 확인했습니다.");
        submitting.current = false;
        onDialog(null);
      } else {
        data.setError(
          (failure ? failure + " " : "") +
            "아직 조치가 완료되지 않았습니다. 입력 내용과 사진을 확인한 뒤 다시 시도해 주세요.",
        );
      }

      completionUncertain.current = false;
      data.refresh();
    } catch {
      if (active.current)
        data.setError(
          "완료 여부를 확인하지 못했습니다. 완료 버튼을 누르면 상태부터 다시 확인합니다.",
        );
    }
  }

  async function finishAction() {
    if (submitting.current || readOnly) return;
    const files = draft.photos.flatMap((photo) =>
      photo.file ? [photo.file] : [],
    );

    if (!completionUncertain.current) {
      if (
        !issue.reviewId ||
        !draft.verified ||
        !draft.result.trim() ||
        draft.result.trim().length > 4000
      ) {
        data.setError(
          "저장된 검토 내용과 조치 결과·확인 항목을 확인해 주세요.",
        );

        return;
      }

      try {
        validatePublicIssueImages(files);
      } catch (cause) {
        data.setError(publicIssueError(cause));

        return;
      }
    }

    submitting.current = true;
    setBusy(true);
    data.setError("");
    try {
      if (completionUncertain.current) {
        await reconcileCompletion();

        return;
      }

      completionUncertain.current = true;
      const completed = await completePublicIssueAction(
        Number(issue.id),
        draft.result,
        files,
      );

      if (!active.current) return;
      completionUncertain.current = false;
      applyCompletedPhotos(
        completed.images.map((image) => ({
          id: String(image.imageId),
          name: `조치 사진 ${image.imageId}`,
          src: image.imageUrl,
        })),
      );
      data.applyCompletion(completed);
      data.refresh();
      submitting.current = false;
      onDialog(null);
    } catch (cause) {
      if (active.current) {
        await reconcileCompletion(publicIssueError(cause));
      }
    } finally {
      submitting.current = false;
      if (active.current) setBusy(false);
    }
  }

  return {
    draft,
    busy,
    readOnly,
    isSubmitting: () => submitting.current,
    update,
    save,
    requestComplete,
    upload,
    finishAction,
  };
}
