import { useRef } from "react";
import {
  completePublicIssueAction,
  getPublicIssue,
  publicIssueError,
  validatePublicIssueImages,
} from "../../api/publicIssues";
import type { FacilityDraft } from "./types";
import type { InfrastructureActionOptions } from "./infrastructureReviewTypes";

type Options = InfrastructureActionOptions & {
  applyCompletedPhotos: (photos: FacilityDraft["photos"]) => void;
};

export function useInfrastructureCompletion({
  issue,
  draft,
  readOnly,
  activeRef,
  submittingRef,
  setBusy,
  data,
  onDialog,
  applyCompletedPhotos,
}: Options) {
  const completionUncertainRef = useRef(false);

  function requestComplete() {
    if (submittingRef.current) return;
    if (readOnly) return;
    if (completionUncertainRef.current) {
      void finishAction();

      return;
    }

    if (!issue.reviewId) {
      data.setError("공공시설 검토 내용을 먼저 저장해 주세요.");

      return;
    }

    if (!draft.result.trim() || draft.result.trim().length > 4000) {
      data.setError("조치 결과를 1~4000자로 입력해 주세요.");

      return;
    }

    if (!draft.photos.some((photo) => photo.file)) {
      data.setError("조치 사진을 1장 이상 선택해 주세요.");

      return;
    }

    data.setError("");
    onDialog("complete-confirm");
  }

  async function reconcileCompletion(failure = "") {
    try {
      const latest = await getPublicIssue(Number(issue.id));

      if (!activeRef.current) return;
      if (latest.status === "COMPLETED") {
        data.applyDetail(latest);
        const action = latest.actions
          .filter((item) => item.status === "COMPLETED")
          .sort((a, b) => b.actionId - a.actionId)[0];

        if (!action?.images.length) {
          data.setError(
            "조치 완료는 확인했지만 저장된 사진을 확인하지 못했습니다. 선택한 사진을 유지합니다. 관리자에게 사진 저장 상태를 확인해 주세요.",
          );

          return;
        }

        applyCompletedPhotos(
          action.images.map((image) => ({
            id: String(image.imageId),
            name: `조치 사진 ${image.imageId}`,
            src: image.imageUrl,
          })),
        );
        data.setError("서버의 사진 저장 및 조치 완료를 확인했습니다.");
        submittingRef.current = false;
        onDialog(null);
      } else {
        data.setError(
          (failure ? failure + " " : "") +
            "아직 조치가 완료되지 않았습니다. 입력 내용과 사진을 확인한 뒤 다시 시도해 주세요.",
        );
      }

      completionUncertainRef.current = false;
      data.refresh();
    } catch {
      if (activeRef.current)
        data.setError(
          "완료 여부를 확인하지 못했습니다. 완료 버튼을 누르면 상태부터 다시 확인합니다.",
        );
    }
  }

  async function finishAction() {
    if (submittingRef.current || readOnly) return;
    const files = draft.photos.flatMap((photo) =>
      photo.file ? [photo.file] : [],
    );

    if (!completionUncertainRef.current) {
      if (
        !issue.reviewId ||
        !draft.result.trim() ||
        draft.result.trim().length > 4000
      ) {
        data.setError("저장된 검토 내용과 조치 결과를 확인해 주세요.");

        return;
      }

      try {
        validatePublicIssueImages(files);
      } catch (cause) {
        data.setError(publicIssueError(cause));

        return;
      }
    }

    submittingRef.current = true;
    setBusy(true);
    data.setError("");
    try {
      if (completionUncertainRef.current) {
        await reconcileCompletion();

        return;
      }

      completionUncertainRef.current = true;
      const completed = await completePublicIssueAction(
        Number(issue.id),
        draft.result,
        files,
      );

      if (!activeRef.current) return;
      completionUncertainRef.current = false;
      applyCompletedPhotos(
        completed.images.map((image) => ({
          id: String(image.imageId),
          name: `조치 사진 ${image.imageId}`,
          src: image.imageUrl,
        })),
      );
      data.applyCompletion(completed);
      data.refresh();
      submittingRef.current = false;
      onDialog(null);
    } catch (cause) {
      if (activeRef.current) {
        await reconcileCompletion(publicIssueError(cause));
      }
    } finally {
      submittingRef.current = false;
      if (activeRef.current) setBusy(false);
    }
  }

  return { requestComplete, finishAction };
}
