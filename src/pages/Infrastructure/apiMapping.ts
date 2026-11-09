import type {
  PublicIssueDetail,
  PublicIssueFilters,
  PublicIssueListItem,
  PublicIssueMarker,
  PublicIssueStatus,
  PublicIssueType,
  RelatedPublicApplications,
} from "../../api/publicIssues";
import type {
  FacilityDraft,
  InfrastructureFilters,
  InfrastructureIssue,
  RelatedResident,
  ReviewStatus,
} from "./types";

const statuses: Record<PublicIssueStatus, ReviewStatus> = {
  RECEIVED: "검토 대기",
  UNDER_REVIEW: "검토 중",
  INSPECTION_REQUIRED: "점검 필요",
  ACTION_IN_PROGRESS: "조치 진행",
  COMPLETED: "조치 완료",
};
const kinds: Record<PublicIssueType, string> = {
  REPEATED_FLOODING: "반복 침수",
  SEWAGE_BACKFLOW: "하수 역류",
  POOR_ROAD_DRAINAGE: "도로 배수 불량",
  BLOCKED_STORM_DRAIN: "빗물받이 막힘",
};

export function infrastructureApiFilters(
  filters: InfrastructureFilters,
): PublicIssueFilters {
  const status = (Object.keys(statuses) as PublicIssueStatus[]).find(
    (key) => statuses[key] === filters.status,
  );
  const issueType = (Object.keys(kinds) as PublicIssueType[]).find(
    (key) => kinds[key] === filters.kind,
  );
  const district = ["원미구", "소사구", "오정구"].find(
    (value) => value === filters.district,
  );

  return {
    keyword: filters.query.trim(),
    ...(district === "원미구" || district === "소사구" || district === "오정구"
      ? { district }
      : {}),
    ...(status ? { status } : {}),
    ...(issueType ? { issueType } : {}),
  };
}

export function publicIssueRecord(
  item: Pick<PublicIssueListItem, "publicIssueId" | "status"> &
    Partial<PublicIssueListItem>,
): InfrastructureIssue {
  return {
    id: String(item.publicIssueId),
    code: "지역-" + String(item.publicIssueId).padStart(3, "0"),
    number: item.publicIssueId,
    district: "",
    location: "",
    kind: item.issueType ? kinds[item.issueType] : "지역 문제",
    description: "",
    findings: "",
    source: "",
    history: item.floodHistoryCount ?? null,
    relatedCount: item.relatedApplicationCount,
    related: [],
    referencePhotos: [],
    status: statuses[item.status],
    target: "",
    requirements: "",
    action: { result: "", photos: [], verified: false },
    marker: { x: 0, y: 0 },
    revision: 0,
  };
}

export function publicIssueMapRecord(
  marker: PublicIssueMarker,
): InfrastructureIssue {
  const latitude = marker.latitude,
    longitude = marker.longitude;

  return {
    ...publicIssueRecord(marker),
    ...(typeof latitude === "number" && typeof longitude === "number"
      ? { coordinates: { latitude, longitude } }
      : {}),
  };
}

export function publicIssueDetailRecord(
  detail: PublicIssueDetail,
): InfrastructureIssue {
  const base = publicIssueRecord({
    ...detail,
    relatedApplicationCount:
      detail.referenceInformation.relatedApplicationCount,
    floodHistoryCount: detail.referenceInformation.floodHistoryCount,
  });
  const action = detail.actions.reduce<
    PublicIssueDetail["actions"][number] | undefined
  >(
    (latest, item) =>
      !latest || item.actionId > latest.actionId ? item : latest,
    undefined,
  );

  return {
    ...base,
    location: detail.address,
    description: detail.description,
    findings: detail.fieldFindings,
    coordinates:
      typeof detail.latitude === "number" &&
      typeof detail.longitude === "number"
        ? { latitude: detail.latitude, longitude: detail.longitude }
        : undefined,
    source: detail.source
      ? `현장점검 ${detail.source.inspectionId} · 접수 ${detail.source.receiptNo}`
      : "등록 출처 미제공",
    reviewId: detail.review?.reviewId,
    reviewState: detail.review?.reviewStatus,
    reviewReason: detail.review?.reviewReason,
    target: detail.review?.reviewTarget || "",
    requirements: detail.review?.inspectionNotes || "",
    actionId: action?.actionId,
    action: {
      result: action?.actionDescription || "",
      verified: detail.status === "COMPLETED",
      photos: detail.actions.flatMap((action) =>
        action.images.map((image) => ({
          id: String(image.imageId),
          name: `조치 사진 ${image.imageId}`,
          src: image.imageUrl,
        })),
      ),
    },
  };
}

export function publicIssueResidents(
  response: RelatedPublicApplications,
): RelatedResident[] {
  const risk = { HIGH: "높음", CAUTION: "주의", LOW: "낮음" } as const;

  return response.applications.map((item) => ({
    id: String(item.applicationId),
    receiptNo: item.receiptNo,
    address: item.address,
    risk: item.vulnerabilityGrade
      ? risk[item.vulnerabilityGrade] || "미확인"
      : "미확인",
    findings: item.fieldFindings || "미입력",
  }));
}

export function publicReviewStatus(status: FacilityDraft["status"]) {
  return status === "검토 대기"
    ? "PENDING"
    : status === "점검 필요"
      ? "INSPECTION_REQUIRED"
      : "UNDER_REVIEW";
}
