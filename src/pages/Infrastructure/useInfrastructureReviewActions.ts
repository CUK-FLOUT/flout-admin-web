import { useEffect, useRef, useState } from "react";
import { useInfrastructureDraft } from "./useInfrastructureDraft";
import { useInfrastructureReviewSave } from "./useInfrastructureReviewSave";
import { useInfrastructureCompletion } from "./useInfrastructureCompletion";
import type { InfrastructureReviewOptions } from "./infrastructureReviewTypes";

export function useInfrastructureReviewActions({
  issue,
  data,
  onDialog,
}: InfrastructureReviewOptions) {
  const [busy, setBusy] = useState(false);
  const activeRef = useRef(false);
  const submittingRef = useRef(false);
  const readOnly = issue.status === "조치 완료";

  useEffect(() => {
    activeRef.current = true;

    return () => {
      activeRef.current = false;
    };
  }, []);

  const { draft, setDraft, update, upload, applyCompletedPhotos } =
    useInfrastructureDraft({ issue, submittingRef, setError: data.setError });
  const options = {
    issue,
    data,
    onDialog,
    draft,
    readOnly,
    activeRef,
    submittingRef,
    setBusy,
  };
  const { save } = useInfrastructureReviewSave({ ...options, setDraft });
  const { requestComplete, finishAction } = useInfrastructureCompletion({
    ...options,
    applyCompletedPhotos,
  });

  return {
    draft,
    busy,
    readOnly,
    isSubmitting: () => submittingRef.current,
    update,
    save,
    requestComplete,
    upload,
    finishAction,
  };
}
