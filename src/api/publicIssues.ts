import axios from "axios";
import { apiClient } from "./client";

export const publicIssueStatuses = [
  "RECEIVED",
  "UNDER_REVIEW",
  "INSPECTION_REQUIRED",
  "ACTION_IN_PROGRESS",
  "COMPLETED",
] as const;
export type PublicIssueStatus = (typeof publicIssueStatuses)[number];
export const publicIssueTypes = [
  "REPEATED_FLOODING",
  "SEWAGE_BACKFLOW",
  "POOR_ROAD_DRAINAGE",
  "BLOCKED_STORM_DRAIN",
] as const;
export type PublicIssueType = (typeof publicIssueTypes)[number];
export type FacilityReviewStatus =
  "PENDING" | "UNDER_REVIEW" | "INSPECTION_REQUIRED";
export type PublicIssueFilters = {
  district?: "원미구" | "소사구" | "오정구";
  status?: PublicIssueStatus;
  issueType?: PublicIssueType;
  keyword: string;
};
export type PublicIssueListItem = {
  publicIssueId: number;
  issueType: PublicIssueType;
  status: PublicIssueStatus;
  relatedApplicationCount: number;
  floodHistoryCount: number;
};
export type PublicIssuePage = {
  publicIssues: PublicIssueListItem[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
};
export type PublicIssueCounts = {
  registeredCount: number;
  pendingOrUnderReviewCount: number;
  actionInProgressCount: number;
  completedCount: number;
};
export type PublicIssueMarker = {
  publicIssueId: number;
  latitude: number | null;
  longitude: number | null;
  status: PublicIssueStatus;
};
export type ActionImage = {
  imageId: number;
  imageUrl: string;
  uploadedAt: string;
};
export type PublicIssueAction = {
  actionId: number;
  operatorUserId: number;
  operatorName: string;
  actionDescription: string;
  status: "IN_PROGRESS" | "COMPLETED";
  createdAt: string;
  completedAt: string | null;
  images: ActionImage[];
};
export type PublicIssueDetail = {
  publicIssueId: number;
  issueType: PublicIssueType;
  status: PublicIssueStatus;
  address: string;
  latitude: number | null;
  longitude: number | null;
  description: string;
  fieldFindings: string;
  createdAt: string;
  source: {
    inspectionId: number;
    applicationId: number;
    receiptNo: string;
    applicantName: string;
  } | null;
  referenceInformation: {
    relatedApplicationCount: number;
    floodHistoryCount: number;
    relatedApplications: {
      applicationId: number;
      receiptNo: string;
      applicantName: string;
      address: string;
      detailAddress: string | null;
      riskLevel: "HIGH" | "CAUTION" | "LOW" | null;
      floodExperience: "YES" | "NO" | "UNKNOWN";
      inflowLocations: string[];
      existingFacility: boolean;
      requestReason: string | null;
    }[];
  };
  review: {
    reviewId: number;
    reviewTarget: string;
    reviewStatus: FacilityReviewStatus | "ACTION_IN_PROGRESS" | "COMPLETED";
    inspectionNotes: string | null;
    reviewReason: string | null;
    reviewerUserId: number;
    reviewerName: string;
    reviewedAt: string | null;
  } | null;
  publicFacility: {
    facilityId: number;
    facilityName: string;
    facilityType: string;
    address: string;
    latitude: number | null;
    longitude: number | null;
  } | null;
  actions: PublicIssueAction[];
};
export type RelatedPublicApplications = {
  publicIssueId: number;
  totalCount: number;
  applications: {
    applicationId: number;
    receiptNo: string;
    address: string;
    vulnerabilityGrade: "HIGH" | "CAUTION" | "LOW" | null;
    fieldFindings: string | null;
  }[];
};
export type FacilityReviewRequest = {
  reviewTarget: string;
  reviewStatus: FacilityReviewStatus;
  inspectionNotes: string;
  reviewReason?: string | null;
};
export type FacilityReviewResponse = FacilityReviewRequest & {
  reviewId: number;
  publicIssueId: number;
  publicIssueStatus: PublicIssueStatus;
  reviewerUserId: number;
  reviewedAt: string;
};
export type PublicIssueCompletion = {
  actionId: number;
  reviewId: number;
  publicIssueId: number;
  operatorUserId: number;
  actionDescription: string;
  actionStatus: "COMPLETED";
  reviewStatus: "COMPLETED";
  publicIssueStatus: "COMPLETED";
  completedAt: string;
};
type Envelope<T> = {
  isSuccess: boolean;
  result: T;
  message: string;
  code: string;
};
const root = "/api/admin/public-issues";

export function validPublicId(id: number) {
  if (!Number.isSafeInteger(id) || id <= 0)
    throw new Error("올바른 지역·공공 문제 식별자가 필요합니다.");

  return id;
}

function path(id: number) {
  return `${root}/${validPublicId(id)}`;
}

function result<T>(data: Envelope<T>) {
  if (!data.isSuccess || data.result == null)
    throw new Error(
      data.message?.trim() ? data.message : "공공인프라 요청에 실패했습니다.",
    );

  return data.result;
}

function filters(value: PublicIssueFilters) {
  const keyword = value.keyword.trim();

  if (keyword.length > 255)
    throw new Error("검색어는 255자 이내로 입력해 주세요.");
  if (
    value.district &&
    !["원미구", "소사구", "오정구"].includes(value.district)
  )
    throw new Error("지역 필터를 확인해 주세요.");
  if (value.status && !publicIssueStatuses.includes(value.status))
    throw new Error("처리 상태를 확인해 주세요.");
  if (value.issueType && !publicIssueTypes.includes(value.issueType))
    throw new Error("문제 유형을 확인해 주세요.");

  return {
    keyword,
    ...(value.district ? { district: value.district } : {}),
    ...(value.status ? { status: value.status } : {}),
    ...(value.issueType ? { issueType: value.issueType } : {}),
  };
}

function validItem(value: {
  publicIssueId: number;
  status: PublicIssueStatus;
}) {
  validPublicId(value.publicIssueId);
  if (!publicIssueStatuses.includes(value.status))
    throw new Error("알 수 없는 공공 문제 상태가 반환되었습니다.");
}

export async function getPublicIssues(
  query: PublicIssueFilters,
  page: number,
  signal?: AbortSignal,
) {
  if (!Number.isSafeInteger(page) || page < 0)
    throw new Error("목록 페이지를 확인해 주세요.");
  const pageData = result(
    (
      await apiClient.get<Envelope<PublicIssuePage>>(root, {
        params: { ...filters(query), page, size: 5 },
        signal,
      })
    ).data,
  );

  if (
    !Array.isArray(pageData.publicIssues) ||
    !Number.isSafeInteger(pageData.totalPages) ||
    pageData.totalPages < 0 ||
    !Number.isSafeInteger(pageData.totalElements) ||
    pageData.totalElements < 0
  )
    throw new Error("공공 문제 목록 응답을 확인해 주세요.");
  pageData.publicIssues.forEach((item) => {
    validItem(item);
    if (
      ![item.relatedApplicationCount, item.floodHistoryCount].every(
        (value) => Number.isSafeInteger(value) && value >= 0,
      )
    )
      throw new Error("관련 신청 집계 응답을 확인해 주세요.");
    if (!publicIssueTypes.includes(item.issueType))
      throw new Error("알 수 없는 문제 유형이 반환되었습니다.");
  });

  return pageData;
}

export async function getPublicIssueCounts(
  query: PublicIssueFilters,
  signal?: AbortSignal,
) {
  const params = filters(query);

  delete params.status;

  const counts = result(
    (
      await apiClient.get<Envelope<PublicIssueCounts>>(`${root}/status`, {
        params,
        signal,
      })
    ).data,
  );

  if (
    ![
      counts.registeredCount,
      counts.pendingOrUnderReviewCount,
      counts.actionInProgressCount,
      counts.completedCount,
    ].every((value) => Number.isSafeInteger(value) && value >= 0)
  )
    throw new Error("공공 문제 현황 응답을 확인해 주세요.");

  return counts;
}

export async function getPublicIssueMap(
  query: PublicIssueFilters,
  signal?: AbortSignal,
) {
  const data = result(
    (
      await apiClient.get<Envelope<{ markers: PublicIssueMarker[] }>>(
        "/api/admin/map/public-issues",
        { params: filters(query), signal },
      )
    ).data,
  );

  if (!Array.isArray(data.markers))
    throw new Error("지도 응답을 확인해 주세요.");
  data.markers.forEach(validItem);

  return data.markers;
}

export async function getPublicIssue(id: number, signal?: AbortSignal) {
  const detail = result(
    (await apiClient.get<Envelope<PublicIssueDetail>>(path(id), { signal }))
      .data,
  );

  validItem(detail);
  if (
    detail.publicIssueId !== id ||
    !publicIssueTypes.includes(detail.issueType) ||
    !Array.isArray(detail.actions)
  )
    throw new Error("공공 문제 상세 응답을 확인해 주세요.");

  return detail;
}

export async function getPublicIssueApplications(
  id: number,
  signal?: AbortSignal,
) {
  const data = result(
    (
      await apiClient.get<Envelope<RelatedPublicApplications>>(
        `${path(id)}/resident-applications`,
        { signal },
      )
    ).data,
  );

  if (data.publicIssueId !== id || !Array.isArray(data.applications))
    throw new Error("관련 주민 신청 응답을 확인해 주세요.");

  return data;
}

export async function savePublicIssueReview(
  id: number,
  body: FacilityReviewRequest,
) {
  if (
    !body.reviewTarget.trim() ||
    body.reviewTarget.trim().length > 100 ||
    !body.inspectionNotes.trim() ||
    body.inspectionNotes.trim().length > 4000 ||
    (body.reviewReason?.trim().length || 0) > 4000 ||
    !["PENDING", "UNDER_REVIEW", "INSPECTION_REQUIRED"].includes(
      body.reviewStatus,
    )
  )
    throw new Error(
      "검토 대상(1~100자), 점검 필요사항(1~4000자), 검토 상태를 확인해 주세요.",
    );

  const response = result(
    (
      await apiClient.post<Envelope<FacilityReviewResponse>>(
        `${path(id)}/review`,
        {
          ...body,
          reviewTarget: body.reviewTarget.trim(),
          inspectionNotes: body.inspectionNotes.trim(),
          reviewReason: body.reviewReason?.trim() ?? body.reviewReason,
        },
      )
    ).data,
  );

  validItem({
    publicIssueId: response.publicIssueId,
    status: response.publicIssueStatus,
  });
  validPublicId(response.reviewId);
  if (response.publicIssueId !== id)
    throw new Error("검토 저장 응답의 문제 ID가 일치하지 않습니다.");

  return response;
}

export async function completePublicIssueAction(
  id: number,
  actionDescription: string,
) {
  const value = actionDescription.trim();

  if (!value || value.length > 4000)
    throw new Error("조치 결과를 1~4000자로 입력해 주세요.");

  const response = result(
    (
      await apiClient.post<Envelope<PublicIssueCompletion>>(
        `${path(id)}/actions`,
        { actionDescription: value },
      )
    ).data,
  );

  validPublicId(response.actionId);
  if (
    response.publicIssueId !== id ||
    response.publicIssueStatus !== "COMPLETED" ||
    response.actionStatus !== "COMPLETED"
  )
    throw new Error("조치 완료 응답을 확인해 주세요.");

  return response;
}

export function validatePublicIssueImages(files: File[]) {
  if (
    !files.length ||
    files.some(
      (file) =>
        !file.size ||
        file.size > 10 * 1024 ** 2 ||
        !/\.(jpe?g|png)$/i.test(file.name) ||
        !["image/jpeg", "image/png"].includes(file.type),
    )
  )
    throw new Error(
      "JPG·JPEG·PNG 사진을 파일당 0바이트 초과, 최대 10MiB로 선택해 주세요.",
    );
}

export async function uploadPublicIssueImages(
  id: number,
  actionId: number,
  files: File[],
) {
  const url = `${path(id)}/actions/${validPublicId(actionId)}/images`;

  validatePublicIssueImages(files);
  const body = new FormData();

  files.forEach((file) => body.append("files", file));

  const response = result(
    (
      await apiClient.post<
        Envelope<{
          publicIssueId: number;
          actionId: number;
          images: ActionImage[];
        }>
      >(url, body, { headers: { "Content-Type": undefined }, timeout: 120000 })
    ).data,
  );

  if (
    response.publicIssueId !== id ||
    response.actionId !== actionId ||
    !Array.isArray(response.images)
  )
    throw new Error("조치 사진 응답의 식별자를 확인해 주세요.");
  response.images.forEach((image) => validPublicId(image.imageId));

  return response;
}

export function publicIssueError(cause: unknown) {
  if (axios.isAxiosError(cause)) {
    if (!cause.response)
      return "서버에 연결하지 못했습니다. 잠시 후 다시 시도해 주세요.";
    if (cause.response.status >= 500)
      return "공공인프라 요청을 처리하지 못했습니다. 잠시 후 다시 시도해 주세요.";
    const message: unknown = cause.response.data?.message;

    return typeof message === "string" && message.trim()
      ? message
      : "공공인프라 요청에 실패했습니다.";
  }

  return cause instanceof Error
    ? cause.message
    : "공공인프라 요청에 실패했습니다.";
}
