import {
  publicIssueError,
  savePublicIssueReview,
} from "../../api/publicIssues";
import { publicReviewStatus } from "./apiMapping";
import type {
  InfrastructureActionOptions,
  SetFacilityDraft,
} from "./infrastructureReviewTypes";

type Options = InfrastructureActionOptions & { setDraft: SetFacilityDraft };

export function useInfrastructureReviewSave({
  issue,
  draft,
  readOnly,
  activeRef,
  submittingRef,
  setBusy,
  data,
  onDialog,
  setDraft,
}: Options) {
  async function save() {
    if (submittingRef.current || readOnly) return;
    const reviewStatus = issue.reviewState || publicReviewStatus(draft.status);

    if (reviewStatus === "COMPLETED") {
      data.setError("현재 조치 상태에서는 검토 내용을 저장할 수 없습니다.");

      return;
    }

    submittingRef.current = true;
    setBusy(true);
    data.setError("");
    try {
      const saved = await savePublicIssueReview(Number(issue.id), {
        reviewTarget: draft.target,
        reviewStatus,
        inspectionNotes: draft.requirements,
        reviewReason: issue.reviewReason,
      });

      if (!activeRef.current) return;
      setDraft((current) => ({
        ...current,
        target: saved.reviewTarget,
        requirements: saved.inspectionNotes,
      }));
      data.applyReview(saved);
      data.refresh();
      submittingRef.current = false;
      onDialog("status-saved");
    } catch (cause) {
      if (activeRef.current) data.setError(publicIssueError(cause));
    } finally {
      submittingRef.current = false;
      if (activeRef.current) setBusy(false);
    }
  }

  return { save };
}
