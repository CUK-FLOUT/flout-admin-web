import type {
  InspectionDetail,
  InspectionItem,
  InspectionSearch,
} from "../../api/inspections";
import type { InspectionApplication, InspectionStatus } from "./types";

export const apiStatuses = {
  대기: "RECEIVED",
  예정: "SCHEDULED",
  진행: "IN_PROGRESS",
  완료: "COMPLETED",
} as const;
const statusLabels: Record<InspectionItem["status"], InspectionStatus> = {
  RECEIVED: "대기",
  SCHEDULED: "예정",
  IN_PROGRESS: "진행",
  COMPLETED: "완료",
};
const timeLabels = {
  MORNING: "오전(9~12시)",
  AFTERNOON: "오후(13~18시)",
  ANY: "상관없음",
};

export function inspectionSearch(params: URLSearchParams): InspectionSearch {
  const stage = params.get("stage");
  const assignee = Number(params.get("assignee"));
  const page = Number(params.get("page") || 0);

  return {
    status:
      stage === "배정 대기"
        ? "RECEIVED"
        : apiStatuses[stage as InspectionStatus] || "ALL",
    district: params.get("district") || undefined,
    inspectorUserId:
      Number.isSafeInteger(assignee) && assignee > 0 ? assignee : undefined,
    visitDate: params.get("visit") || undefined,
    keyword: params.get("q") || undefined,
    page: Number.isSafeInteger(page) && page >= 0 ? page : 0,
    size: 10,
  };
}

export function inspectionRow(item: InspectionItem): InspectionApplication {
  return {
    id: item.receiptNo,
    inspectionId: item.inspectionId,
    applicationId: item.applicationId,
    inspectorUserId: item.inspectorUserId,
    resident: "",
    address: item.address || "주소 미확인",
    district: item.address || "",
    phone: "",
    priority: item.designated,
    requestedDate: item.preferredVisitDate || "",
    requestedTime: item.preferredTimeSlot
      ? timeLabels[item.preferredTimeSlot]
      : "희망 시간 미입력",
    assignee: item.inspectorName || "미배정",
    status: statusLabels[item.status],
    visitDate: "",
    visitTime: "",
    notice: "",
    notifyResident: false,
    resultPublished: false,
  };
}

export function inspectionDetail(
  detail: InspectionDetail,
  row?: InspectionApplication,
): InspectionApplication {
  return {
    ...(row || {
      id: detail.receiptNo,
      district: "",
      priority: false,
      status: "대기" as const,
      visitDate: "",
      visitTime: "",
      notice: "",
      notifyResident: false,
      resultPublished: false,
    }),
    inspectionId: detail.inspectionId,
    applicationId: detail.applicationId,
    inspectorUserId: detail.inspectorId,
    visitDate: detail.visitDate ?? "",
    visitTime: detail.visitTime ?? "",
    notice: detail.preVisitNotice ?? "",
    resident: detail.applicantName,
    address: [detail.address, detail.detailAddress].filter(Boolean).join(" "),
    phone: detail.contact,
    requestedDate: detail.preferredVisitDate || "",
    requestedTime: detail.preferredTimeSlot
      ? timeLabels[detail.preferredTimeSlot]
      : "희망 시간 미입력",
    assignee: detail.inspectorName || "미배정",
  };
}

export function validateAssignment(application: InspectionApplication) {
  if (application.inspectorUserId != null)
    return "이미 배정된 점검입니다. 현재 API는 재배정·일정 변경을 지원하지 않습니다.";
  if (!["대기", "예정"].includes(application.status))
    return "접수 또는 예정 상태의 미배정 점검만 배정할 수 있습니다.";
  if (
    !application.visitDate ||
    !application.visitTime ||
    !application.notice.trim()
  )
    return "확정 방문일·시간과 주민 방문 전 안내를 입력해 주세요.";
  if (application.notice.length > 2000)
    return "주민 방문 전 안내는 2000자 이하여야 합니다.";
  const when = Date.parse(
    `${application.visitDate}T${application.visitTime}:00+09:00`,
  );

  if (!Number.isFinite(when) || when < Date.now())
    return "확정 방문 일시는 한국 시간 기준 현재 이후로 입력해 주세요.";

  return "";
}
