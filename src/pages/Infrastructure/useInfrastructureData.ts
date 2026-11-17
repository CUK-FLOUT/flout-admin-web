import { useEffect, useRef, useState } from "react";
import {
  getPublicIssue,
  getPublicIssueApplications,
  getPublicIssueCounts,
  getPublicIssueMap,
  getPublicIssues,
  publicIssueError,
} from "../../api/publicIssues";
import type {
  FacilityReviewResponse,
  PublicIssueCompletion,
  PublicIssueCounts,
  PublicIssueDetail,
  PublicIssueFilters,
} from "../../api/publicIssues";
import {
  publicIssueDetailRecord,
  publicIssueMapRecord,
  publicIssueRecord,
  publicIssueResidents,
} from "./apiMapping";
import type { InfrastructureIssue, RelatedResident } from "./types";

type Resource<T> = { key: string; data?: T; error?: string };
type ListData = {
  records: InfrastructureIssue[];
  totalPages: number;
  totalElements: number;
};
type Query = { filters: PublicIssueFilters; page: number };
export function useInfrastructureData(query?: Query, issueId?: string) {
  const normalizedIssueId =
    issueId && Number.isSafeInteger(Number(issueId)) && Number(issueId) > 0
      ? String(Number(issueId))
      : issueId;
  const [revision, setRevision] = useState(0);
  const [error, setError] = useState("");
  const mounted = useRef(false);
  const queryKey = query ? JSON.stringify([query.filters, query.page]) : "";
  const listKey = queryKey ? queryKey + ":" + revision : "";
  const filterKey = query ? JSON.stringify(query.filters) : "";
  const mapKey = filterKey ? filterKey + ":" + revision : "";
  const detailKey = issueId ? issueId + ":" + revision : "";
  const [list, setList] = useState<Resource<ListData>>({ key: "" });
  const [counts, setCounts] = useState<Resource<PublicIssueCounts>>({
    key: "",
  });
  const [map, setMap] = useState<Resource<InfrastructureIssue[]>>({ key: "" });
  const [detail, setDetail] = useState<Resource<InfrastructureIssue>>({
    key: "",
  });
  const [related, setRelated] = useState<
    Resource<{ records: RelatedResident[]; total: number }>
  >({ key: "" });

  useEffect(() => {
    mounted.current = true;

    return () => {
      mounted.current = false;
    };
  }, []);

  useEffect(() => {
    if (!queryKey) return;
    const controller = new AbortController();
    const [filters, page] = JSON.parse(queryKey) as [
      PublicIssueFilters,
      number,
    ];

    void getPublicIssues(filters, page, controller.signal)
      .then((data) => {
        if (!controller.signal.aborted)
          setList({
            key: listKey,
            data: {
              records: data.publicIssues.map(publicIssueRecord),
              totalElements: data.totalElements,
              totalPages: data.totalPages,
            },
          });
      })
      .catch((cause) => {
        if (!controller.signal.aborted)
          setList({ key: listKey, error: publicIssueError(cause) });
      });

    return () => controller.abort();
  }, [queryKey, listKey]);

  useEffect(() => {
    if (!filterKey) return;
    const controller = new AbortController();
    const filters = JSON.parse(filterKey) as PublicIssueFilters;

    void getPublicIssueCounts(filters, controller.signal)
      .then((data) => {
        if (!controller.signal.aborted) setCounts({ key: mapKey, data });
      })
      .catch((cause) => {
        if (!controller.signal.aborted)
          setCounts({
            key: mapKey,
            error: "현황 조회: " + publicIssueError(cause),
          });
      });
    void getPublicIssueMap(filters, controller.signal)
      .then((data) => {
        if (!controller.signal.aborted)
          setMap({ key: mapKey, data: data.map(publicIssueMapRecord) });
      })
      .catch((cause) => {
        if (!controller.signal.aborted)
          setMap({
            key: mapKey,
            error: "지도 위치 조회: " + publicIssueError(cause),
          });
      });

    return () => controller.abort();
  }, [filterKey, mapKey]);

  useEffect(() => {
    if (!issueId) return;
    const controller = new AbortController();
    const id = Number(issueId);

    void getPublicIssue(id, controller.signal)
      .then((data) => {
        if (!controller.signal.aborted)
          setDetail({ key: detailKey, data: publicIssueDetailRecord(data) });
      })
      .catch((cause) => {
        if (!controller.signal.aborted)
          setDetail((current) => ({
            key: detailKey,
            error: publicIssueError(cause),
            data:
              current.data?.id === normalizedIssueId ? current.data : undefined,
          }));
      });
    void getPublicIssueApplications(id, controller.signal)
      .then((data) => {
        if (!controller.signal.aborted)
          setRelated({
            key: detailKey,
            data: {
              records: publicIssueResidents(data),
              total: data.totalCount,
            },
          });
      })
      .catch((cause) => {
        if (!controller.signal.aborted)
          setRelated({ key: detailKey, error: publicIssueError(cause) });
      });

    return () => controller.abort();
  }, [issueId, normalizedIssueId, detailKey]);

  function refresh() {
    if (mounted.current) setRevision((value) => value + 1);
  }

  function applyReview(response: FacilityReviewResponse) {
    if (!mounted.current) return;
    setDetail((current) =>
      current.data?.id === String(response.publicIssueId)
        ? {
            ...current,
            data: {
              ...current.data,
              reviewId: response.reviewId,
              reviewState: response.reviewStatus,
              target: response.reviewTarget,
              requirements: response.inspectionNotes,
              reviewReason: response.reviewReason,
              status: publicIssueRecord({
                publicIssueId: response.publicIssueId,
                status: response.publicIssueStatus,
              }).status,
            },
          }
        : current,
    );
  }

  function applyCompletion(response: PublicIssueCompletion) {
    if (!mounted.current) return;
    setDetail((current) =>
      current.data?.id === String(response.publicIssueId)
        ? {
            ...current,
            data: {
              ...current.data,
              status: "조치 완료",
              actionId: response.actionId,
              action: {
                ...current.data.action,
                result: response.actionDescription,
                verified: true,
                photos: response.images.map((image) => ({
                  id: String(image.imageId),
                  name: `조치 사진 ${image.imageId}`,
                  src: image.imageUrl,
                })),
              },
            },
          }
        : current,
    );
  }

  function applyDetail(response: PublicIssueDetail) {
    if (!mounted.current) return;
    setDetail((current) =>
      current.data?.id === String(response.publicIssueId)
        ? { ...current, data: publicIssueDetailRecord(response) }
        : current,
    );
  }

  return {
    records: list.key === listKey ? list.data?.records || [] : [],
    markers: map.key === mapKey ? map.data || [] : [],
    counts: counts.key === mapKey ? counts.data : undefined,
    issue: detail.data?.id === normalizedIssueId ? detail.data : undefined,
    related: related.key === detailKey ? related.data?.records || [] : [],
    relatedTotal: related.key === detailKey ? related.data?.total || 0 : 0,
    relatedLoading: !!issueId && related.key !== detailKey,
    relatedError: related.key === detailKey ? related.error : undefined,
    loading: !!queryKey && list.key !== listKey,
    detailLoading: !!issueId && detail.key !== detailKey,
    listError: list.key === listKey ? list.error : undefined,
    totalPages: list.key === listKey ? list.data?.totalPages || 0 : 0,
    totalElements: list.key === listKey ? list.data?.totalElements || 0 : 0,
    error:
      error ||
      (list.key === listKey ? list.error : "") ||
      (counts.key === mapKey ? counts.error : "") ||
      (map.key === mapKey ? map.error : "") ||
      (detail.key === detailKey ? detail.error : "") ||
      "",
    setError,
    refresh,
    applyReview,
    applyCompletion,
    applyDetail,
  };
}
