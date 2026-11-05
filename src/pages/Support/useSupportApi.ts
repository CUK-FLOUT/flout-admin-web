import { useEffect, useState } from "react";
import {
  getSupportApplications,
  getSupportCounts,
  getSupportDetail,
  getSupportReview,
  supportError,
} from "../../api/supportApplications";
import type {
  SupportCounts,
  SupportPage,
  SupportSearchFilters,
  SupportDetails,
  SupportReviewDetails,
} from "../../api/supportApplications";
import { mapSupportDetail } from "./apiMapping";

export function useSupportList(
  keyword: string,
  page: number,
  revision = 0,
  filters: SupportSearchFilters = {},
) {
  const [listState, setListState] = useState<{
    key?: string;
    page?: SupportPage;
    listError: string;
    loading: boolean;
  }>({ listError: "", loading: true });
  const [countState, setCountState] = useState<{
    key?: string;
    counts?: SupportCounts;
    error: string;
  }>({ error: "" });
  const { district, status, landlordConsentStatus } = filters;
  const key = JSON.stringify([
    keyword,
    page,
    revision,
    district,
    status,
    landlordConsentStatus,
  ]);

  useEffect(() => {
    const controller = new AbortController();

    getSupportApplications(
      keyword,
      page,
      { district, status, landlordConsentStatus },
      controller.signal,
    )
      .then((result) => {
        if (!controller.signal.aborted)
          setListState({ key, page: result, listError: "", loading: false });
      })
      .catch((cause) => {
        if (!controller.signal.aborted)
          setListState({ key, listError: supportError(cause), loading: false });
      });
    getSupportCounts(controller.signal)
      .then((counts) => {
        if (!controller.signal.aborted)
          setCountState({ key, counts, error: "" });
      })
      .catch((cause) => {
        if (!controller.signal.aborted)
          setCountState({ key, error: supportError(cause) });
      });

    return () => controller.abort();
  }, [keyword, page, key, district, status, landlordConsentStatus]);

  const list =
    listState.key === key
      ? listState
      : { listError: "", loading: true, page: undefined };
  const counts =
    countState.key === key ? countState : { error: "", counts: undefined };

  return {
    ...list,
    counts: counts.counts,
    error: list.listError || counts.error,
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
