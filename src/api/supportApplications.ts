import axios from "axios";
import { apiClient } from "./client";

export type SupportServerStatus = "SUBMITTED" | "APPROVED" | "REJECTED";
export type HousingType =
  "SEMI_BASEMENT" | "FIRST_FLOOR" | "SECOND_FLOOR_OR_ABOVE";
export type SupportSearchFilters = {
  district?: "원미구" | "소사구" | "오정구";
  status?: SupportServerStatus | "REVIEWING" | "CONSENT_PENDING" | "SCHEDULING";
  landlordConsentStatus?: "NOT_REQUIRED" | "PENDING" | "VERIFIED" | "CONFIRMED";
};
export type SupportListItem = {
  supportApplicationId: number;
  receiptNo: string;
  applicantName: string;
  requestedFacility: string | null;
  landlordConsentStatus: "PENDING" | "VERIFIED" | "NOT_REQUIRED";
  status: SupportServerStatus;
};
export type SupportPage = {
  supportApplications: SupportListItem[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
};
export type SupportCounts = {
  totalCount: number;
  reviewingCount: number;
  consentRequiredCount: number;
  approvedCount: number;
};
export type SupportDetails = {
  supportApplicationId: number;
  receiptNo: string;
  applicantName: string;
  contact: string | null;
  address: string | null;
  detailAddress: string | null;
  housingType?: HousingType | null;
  occupancyType: "OWNER" | "TENANT" | "ETC" | null;
  recommendedActions: string[];
  requestedFacility: string | null;
  residentRequest: string | null;
  preferredConstructionDate: string | null;
  preferredTimeSlot: "MORNING" | "AFTERNOON" | "ANY" | null;
  inspectionId: number | null;
  inspectionStatus: string | null;
  inspectionResultPublished: boolean;
  attachments: { originalName: string; fileUrl: string }[];
  landlordConsentStatus: SupportListItem["landlordConsentStatus"];
  status: SupportServerStatus;
};
export type SupportReviewDetails = Omit<
  SupportDetails,
  "landlordConsentStatus"
> & {
  applicationId: number;
  vulnerabilityTypes: string[];
  landlordConsentRequired: boolean;
  supportScope: string | null;
  program: {
    programId: number;
    name: string;
    description: string;
    targetDescription: string;
    operatingStatus: string;
  } | null;
};
type Envelope<T> = {
  isSuccess: boolean;
  result: T;
  code: string;
  message: string;
};
const root = "/api/admin/support-applications";

function result<T>(data: Envelope<T>): T {
  if (!data.isSuccess || data.result == null)
    throw new Error(data.message || "지원 신청 요청에 실패했습니다.");

  return data.result;
}

function path(id: number) {
  if (!Number.isSafeInteger(id) || id <= 0)
    throw new Error("올바른 지원 신청 ID가 필요합니다.");

  return `${root}/${id}`;
}

export async function getSupportApplications(
  keyword: string,
  page: number,
  filters: SupportSearchFilters = {},
  signal?: AbortSignal,
) {
  const { data } = await apiClient.get<Envelope<SupportPage>>(root, {
    params: {
      keyword: keyword.trim(),
      page,
      size: 5,
      ...(filters.district ? { district: filters.district } : {}),
      ...(filters.status ? { status: filters.status } : {}),
      ...(filters.landlordConsentStatus
        ? { landlordConsentStatus: filters.landlordConsentStatus }
        : {}),
    },
    signal,
  });

  return result(data);
}

export async function getSupportCounts(signal?: AbortSignal) {
  return result(
    (await apiClient.get<Envelope<SupportCounts>>(`${root}/status`, { signal }))
      .data,
  );
}

export async function getSupportDetail(id: number, signal?: AbortSignal) {
  return result(
    (await apiClient.get<Envelope<SupportDetails>>(path(id), { signal })).data,
  );
}

export async function getSupportReview(id: number, signal?: AbortSignal) {
  return result(
    (
      await apiClient.get<Envelope<SupportReviewDetails>>(
        `${path(id)}/histories`,
        { signal },
      )
    ).data,
  );
}

export async function approveSupport(
  id: number,
  supportScope: string,
  checks: readonly boolean[],
) {
  if (
    !supportScope.trim() ||
    supportScope.trim().length > 500 ||
    checks.length !== 3 ||
    !checks.every(Boolean)
  )
    throw new Error("검토 항목과 지원 범위(1~500자)를 확인해 주세요.");

  return result(
    (
      await apiClient.post<
        Envelope<{ status: SupportServerStatus; supportApplicationId: number }>
      >(`${path(id)}/approve`, {
        supportScope: supportScope.trim(),
        applicantHousingReviewed: checks[0],
        expertInspectionReviewed: checks[1],
        eligibilityDocumentsReviewed: checks[2],
      })
    ).data,
  );
}

export async function rejectSupport(id: number, reason: string) {
  if (!reason.trim() || reason.trim().length > 500)
    throw new Error("미승인 사유를 1~500자로 입력해 주세요.");

  return result(
    (
      await apiClient.post<
        Envelope<{ status: SupportServerStatus; supportApplicationId: number }>
      >(`${path(id)}/reject`, { reason: reason.trim() })
    ).data,
  );
}

export function supportError(cause: unknown) {
  if (axios.isAxiosError(cause)) {
    if (!cause.response)
      return "서버에 연결하지 못했습니다. 잠시 후 다시 시도해 주세요.";
    const data = cause.response.data as { message?: unknown } | undefined;

    return typeof data?.message === "string" && data.message.trim()
      ? data.message
      : "지원 신청 요청에 실패했습니다.";
  }

  return cause instanceof Error
    ? cause.message
    : "지원 신청 요청에 실패했습니다.";
}
