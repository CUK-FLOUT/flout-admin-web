import { useEffect, useState } from "react";
import {
  getSupportApplications,
  getSupportCounts,
  getSupportDetail,
  getSupportReview,
  supportError,
} from "../../api/supportApplications";
import type {
  SupportSearchFilters,
  SupportDetails,
  SupportReviewDetails,
} from "../../api/supportApplications";
import { usePagePolling } from "../../hooks/usePagePolling";
import { mapSupportDetail } from "./apiMapping";

export function useSupportList(
  keyword: string,
  page: number,
  revision = 0,
  filters: SupportSearchFilters = {},
) {
  const { district, status, landlordConsentStatus } = filters;
  const key = JSON.stringify([keyword, page, district, status, landlordConsentStatus]);
  const list = usePagePolling({
    queryKey: key,
    revision,
    load: (signal) => getSupportApplications(keyword, page, { district, status, landlordConsentStatus }, signal),
    errorMessage: supportError,
  });
  const counts = usePagePolling({
    queryKey: "support-counts",
    revision,
    load: getSupportCounts,
    errorMessage: supportError,
  });

  return {
    page: list.data,
    loading: list.loading,
    listError: list.error,
    counts: counts.data,
    error: list.error || counts.error,
  };
}

export function useSupportRecord(id: number | undefined, review = false) {
  const [detailState, setDetailState] = useState<{
    id?: number;
    detail?: SupportDetails;
    error: string;
  }>({ error: "" });
  const [reviewState, setReviewState] = useState<{
    id?: number;
    review?: SupportReviewDetails;
    error: string;
  }>({ error: "" });

  useEffect(() => {
    if (!id || !Number.isSafeInteger(id) || id <= 0) return;
    const controller = new AbortController();

    getSupportDetail(id, controller.signal)
      .then((detail) => {
        if (!controller.signal.aborted)
          setDetailState({ id, detail, error: "" });
      })
      .catch((cause) => {
        if (!controller.signal.aborted)
          setDetailState({ id, error: supportError(cause) });
      });
    if (review) {
      getSupportReview(id, controller.signal)
        .then((result) => {
          if (!controller.signal.aborted)
            setReviewState({ id, review: result, error: "" });
        })
        .catch((cause) => {
          if (!controller.signal.aborted)
            setReviewState({ id, error: supportError(cause) });
        });
    }

    return () => controller.abort();
  }, [id, review]);

  const detail = detailState.id === id ? detailState.detail : undefined;
  const reviewDetail =
    review && reviewState.id === id ? reviewState.review : undefined;

  return {
    application: detail ? mapSupportDetail(detail, reviewDetail) : undefined,
    error:
      id !== undefined && (!Number.isSafeInteger(id) || id <= 0)
        ? "올바른 지원 신청 ID가 필요합니다."
        : detailState.id === id
          ? detailState.error
          : "",
    reviewError: review && reviewState.id === id ? reviewState.error : "",
  };
}
