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
} from "../../api/supportApplications";
import type { SupportApplication } from "./types";
import { mapSupportDetail } from "./apiMapping";

export function useSupportList(
  keyword: string,
  page: number,
  revision = 0,
  filters: SupportSearchFilters = {},
) {
  const [state, setState] = useState<{
    key?: string;
    page?: SupportPage;
    counts?: SupportCounts;
    error: string;
    listError?: string;
    loading: boolean;
  }>({ error: "", loading: true });
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

    Promise.allSettled([
      getSupportApplications(
        keyword,
        page,
        { district, status, landlordConsentStatus },
        controller.signal,
      ),
      getSupportCounts(controller.signal),
    ]).then(([list, counts]) => {
      if (controller.signal.aborted) return;
      const listError =
        list.status === "rejected" ? supportError(list.reason) : "";

      setState({
        key,
        page: list.status === "fulfilled" ? list.value : undefined,
        counts: counts.status === "fulfilled" ? counts.value : undefined,
        error:
          listError ||
          (counts.status === "rejected" ? supportError(counts.reason) : ""),
        listError,
        loading: false,
      });
    });

    return () => controller.abort();
  }, [keyword, page, key, district, status, landlordConsentStatus]);

  return state.key === key ? state : { error: "", loading: true };
}

export function useSupportRecord(id: number | undefined, review = false) {
  const [state, setState] = useState<{
    id?: number;
    application?: SupportApplication;
    error: string;
  }>({ error: "" });

  useEffect(() => {
    if (!id || !Number.isSafeInteger(id) || id <= 0) return;
    const controller = new AbortController();

    Promise.all([
      getSupportDetail(id, controller.signal),
      review
        ? getSupportReview(id, controller.signal)
        : Promise.resolve(undefined),
    ])
      .then(([detail, review]) => {
        if (!controller.signal.aborted)
          setState({
            id,
            application: mapSupportDetail(detail, review),
            error: "",
          });
      })
      .catch((cause) => {
        if (!controller.signal.aborted)
          setState({ id, error: supportError(cause) });
      });

    return () => controller.abort();
  }, [id, review]);
  if (id !== undefined && (!Number.isSafeInteger(id) || id <= 0))
    return { error: "올바른 지원 신청 ID가 필요합니다." };

  return state.id === id ? state : { error: "" };
}
