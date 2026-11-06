import type {
  GisDetail,
  GisItem,
  GisMarker,
  GisSearch,
  ProcessingStatus,
} from "../../api/gisApplications";
import type { Application, Filters } from "./types";

export const processingLabels: Record<ProcessingStatus, string> = {
  RECEIVED: "접수",
  INSPECTION_SCHEDULED: "점검 예정",
  INSPECTION_IN_PROGRESS: "점검 진행 중",
  INSPECTION_COMPLETED: "점검 완료",
  SUPPORT_REVIEWING: "지원 검토 중",
  SUPPORT_APPROVED: "지원 승인",
  SUPPORT_REJECTED: "지원 미승인",
  CONSTRUCTION_SCHEDULED: "시공 예정",
  CONSTRUCTION_IN_PROGRESS: "시공 진행",
  CONSTRUCTION_COMPLETED: "시공 완료",
};
export function gisSearch(filters: Filters, page: number): GisSearch {
  return {
    district: ["원미구", "소사구", "오정구"].includes(filters.district)
      ? filters.district
      : undefined,
    riskLevel: ({ 높음: "HIGH", 주의: "CAUTION", 낮음: "LOW" } as const)[
      filters.risk as "높음"
    ],
    processingStatus: (
      { 점검: "INSPECTION", 지원: "SUPPORT", 시공: "CONSTRUCTION" } as const
    )[filters.status as "점검"],
    keyword: filters.search.trim() || undefined,
    page,
    size: 10,
  };
}

const riskLabel = (risk: GisItem["riskLevel"]) =>
  risk === "HIGH"
    ? "높음"
    : risk === "CAUTION"
      ? "주의"
      : risk === "LOW"
        ? "낮음"
        : "미입력";

export function gisApplication(item: GisItem, number: number): Application {
  return {
    id: String(item.applicationId),
    receiptNo: item.receiptNo,
    number,
    address: [item.address, item.detailAddress].filter(Boolean).join(" "),
    district: "",
    resident: item.applicantName || "미입력",
    phone: "미입력",
    risk: riskLabel(item.riskLevel),
    status: processingLabels[item.processingStatus] ?? "상태 확인 필요",
    history: [],
    memo: "",
    visitDate: "미입력",
    visitTime: "미입력",
    reason: "미입력",
    houseType: "미입력",
    tenure: "미입력",
    inflow: "미입력",
    facilities: "미입력",
    floodHistory: "미입력",
    marker: { x: 0, y: 0 },
  };
}

export function gisMapApplication(
  marker: GisMarker,
  index: number,
  known?: Application,
): Application {
  const item =
    known ??
    gisApplication(
      {
        ...marker,
        receiptNo: String(marker.applicationId).padStart(6, "0"),
        applicantName: "",
        address: "",
        detailAddress: null,
      },
      index + 1,
    );

  return {
    ...item,
    number: index + 1,
    risk: riskLabel(marker.riskLevel),
    status: processingLabels[marker.processingStatus] ?? "상태 확인 필요",
    coordinates:
      marker.latitude != null && marker.longitude != null
        ? { latitude: marker.latitude, longitude: marker.longitude }
        : undefined,
  };
}

export function gisDetailApplication(
  detail: GisDetail,
  existing?: Application,
): Application {
  const a =
    existing ?? gisApplication({ ...detail, processingStatus: "RECEIVED" }, 0);
  const locations = {
    WINDOW: "창문",
    ENTRANCE: "출입구",
    BATHROOM: "화장실",
    DRAIN: "배수구",
    ETC: "기타",
    UNKNOWN: "모름",
  };

  return {
    ...a,
    status: existing?.status ?? "상태 확인 필요",
    receiptNo: detail.receiptNo,
    resident: detail.applicantName,
    phone: detail.contact || "미입력",
    address: [detail.address, detail.detailAddress].filter(Boolean).join(" "),
    risk: riskLabel(detail.riskLevel),
    houseType: detail.housingType
      ? ({
          SEMI_BASEMENT: "반지하",
          FIRST_FLOOR: "1층",
          SECOND_FLOOR_OR_ABOVE: "2층 이상",
        }[detail.housingType] ?? "미입력")
      : "미입력",
    tenure: detail.occupancyType
      ? ({ OWNER: "자가", TENANT: "세입자", ETC: "기타" }[
          detail.occupancyType
        ] ?? "미입력")
      : "미입력",
    floodHistory: detail.floodExperience
      ? ({ YES: "침수 경험 있음", NO: "침수 경험 없음", UNKNOWN: "모름" }[
          detail.floodExperience
        ] ?? "미입력")
      : "미입력",
    inflow:
      detail.inflowLocations
        .map((value) => locations[value] ?? value)
        .join("·") || "미입력",
    facilities:
      detail.existingFacility == null
        ? "미입력"
        : detail.existingFacility
          ? "기존 시설 있음"
          : "기존 시설 없음",
    visitDate: detail.preferredVisitDate ?? "미입력",
    visitTime: detail.preferredTimeSlot
      ? ({ MORNING: "오전 9~12시", AFTERNOON: "오후 13~18시", ANY: "상관없음" }[
          detail.preferredTimeSlot
        ] ?? "미입력")
      : "미입력",
    reason: detail.requestReason || "미입력",
  };
}
