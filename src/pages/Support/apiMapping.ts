import type {
  HousingType,
  SupportSearchFilters,
  SupportDetails,
  SupportListItem,
  SupportReviewDetails,
} from "../../api/supportApplications";
import type {
  SupportApplication,
  SupportFilters,
  SupportStatus,
} from "./types";

const statuses: Record<SupportListItem["status"], SupportStatus> = {
  SUBMITTED: "검토 중",
  APPROVED: "승인",
  REJECTED: "미승인",
};

const housingLabels: Record<HousingType, string> = {
  SEMI_BASEMENT: "반지하/지하",
  FIRST_FLOOR: "1층",
  SECOND_FLOOR_OR_ABOVE: "2층 이상",
};

export const supportDistrictOptions = ["원미구", "소사구", "오정구"] as const;
export const supportStatusOptions = ["검토 중", "승인", "미승인"] as const;
export const supportConsentOptions = [
  "불필요",
  "필요 · 확인 중",
  "필요 · 확인 완료",
] as const;

export function supportSearchFilters(
  filters: SupportFilters,
): SupportSearchFilters {
  const status: Record<string, SupportSearchFilters["status"]> = {
    "검토 중": "REVIEWING",
    승인: "APPROVED",
    미승인: "REJECTED",
  };
  const consent: Record<string, SupportSearchFilters["landlordConsentStatus"]> =
    {
      불필요: "NOT_REQUIRED",
      "필요 · 확인 중": "PENDING",
      "필요 · 확인 완료": "VERIFIED",
    };

  return {
    district: supportDistrictOptions.find(
      (value) => value === filters.district,
    ),
    status: Object.hasOwn(status, filters.status)
      ? status[filters.status]
      : undefined,
    landlordConsentStatus: Object.hasOwn(consent, filters.consent)
      ? consent[filters.consent]
      : undefined,
  };
}

const vulnerabilityLabels: Record<string, string> = {
  ENTRANCE: "출입구",
  WINDOW_OPENING: "창문/개구부",
  DRAIN: "배수구",
  OTHER_STRUCTURE: "기타 구조",
};

export function mapSupport(item: SupportListItem): SupportApplication {
  const required = item.landlordConsentStatus !== "NOT_REQUIRED";

  return {
    id: item.receiptNo,
    apiId: item.supportApplicationId,
    serverStatus: item.status,
    resident: item.applicantName,
    phone: "—",
    district: "",
    address: "—",
    housing: "—",
    ownership: "—",
    request: item.requestedFacility || "미입력",
    residentNote: "미입력",
    preferred: "미입력",
    documents: [],
    vulnerabilities: [],
    recommendations: [],
    inspectionSummary: "",
    inspectionPublished: false,
    status: statuses[item.status],
    review: {
      checks: [false, false, false],
      consentRequired: required ? "필요" : "불필요",
      consentState: !required
        ? "불필요"
        : item.landlordConsentStatus === "VERIFIED"
          ? "확인 완료"
          : "확인 중",
      scope: "",
      memo: "",
      notify: false,
    },
    rejectionReason: "상세 사유 조회 API 미제공",
    reviewedAt: "",
    constructionRegistered: false,
  };
}

export function mapSupportDetail(
  detail: SupportDetails,
  review?: SupportReviewDetails,
): SupportApplication {
  const a = mapSupport(detail);
  const housingType =
    review?.housingType !== undefined ? review.housingType : detail.housingType;

  return {
    ...a,
    phone: detail.contact || "미입력",
    address:
      [detail.address, detail.detailAddress].filter(Boolean).join(" ") ||
      "미입력",
    housing: housingType ? (housingLabels[housingType] ?? "미입력") : "미입력",
    ownership:
      detail.occupancyType === "OWNER"
        ? "소유자"
        : detail.occupancyType === "TENANT"
          ? "세입자"
          : "기타",
    residentNote: detail.residentRequest || "미입력",
    preferred:
      [
        detail.preferredConstructionDate,
        detail.preferredTimeSlot
          ? {
              MORNING: "오전(9~12시)",
              AFTERNOON: "오후(13~18시)",
              ANY: "상관없음",
            }[detail.preferredTimeSlot]
          : null,
      ]
        .filter(Boolean)
        .join(" · ") || "미입력",
    documents: detail.attachments.map((a) => a.originalName),
    attachmentUrls: Object.fromEntries(
      detail.attachments.map((a) => [
        a.originalName,
        /^https?:\/\//.test(a.fileUrl) ? a.fileUrl : "",
      ]),
    ),
    recommendations: review?.recommendedActions ?? detail.recommendedActions,
    vulnerabilities: (review?.vulnerabilityTypes ?? []).map(
      (type) => vulnerabilityLabels[type] ?? type,
    ),
    inspectionPublished: detail.inspectionResultPublished,
    programName: review?.program?.name,
    programTarget: review?.program?.targetDescription,
    review: {
      ...a.review,
      consentRequired: review
        ? review.landlordConsentRequired
          ? "필요"
          : "불필요"
        : a.review.consentRequired,
      scope: review?.supportScope || "",
    },
  };
}
