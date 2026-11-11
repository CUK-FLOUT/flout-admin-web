import type {
  ConstructionDetails,
  ConstructionListItem,
  ConstructionServerStatus,
} from "../../api/constructions";
import type { ConstructionRecord, ConstructionStatus } from "./types";

const statusLabels: Record<ConstructionServerStatus, ConstructionStatus> = {
  PENDING: "일정 미등록",
  SCHEDULED: "예정",
  IN_PROGRESS: "진행",
  COMPLETED: "전체 완료",
};

export function constructionListRecord(
  item: ConstructionListItem,
): ConstructionRecord {
  const date = item.scheduledConstructionDate || "";
  const time = item.scheduledConstructionTime?.slice(0, 5) || "";

  return {
    id: String(item.constructionId),
    receiptNo: item.receiptNo,
    resident: item.applicantName,
    address: "미제공",
    facility: item.requestedFacility || "미입력",
    scope: "미제공",
    consent: "동의 정보 미제공",
    preferred: "미입력",
    status: statusLabels[item.status],
    date,
    time,
    draft: {
      date,
      time,
      completionDate: "",
      note: "",
      photos: [],
      verified: false,
    },
    published: null,
    revision: 0,
  };
}

export function constructionDetailRecord(
  detail: ConstructionDetails,
): ConstructionRecord {
  const record = constructionListRecord(detail);
  const timeSlots = {
    MORNING: "오전(9~12시)",
    AFTERNOON: "오후(13~18시)",
    ANY: "상관없음",
  };
  const photos = detail.photos.map((photo) => ({
    id: String(photo.photoId),
    name: photo.fileName,
    src: photo.url,
  }));
  const installation = {
    completionDate: detail.completedAt?.slice(0, 10) || "",
    note: detail.finalInstallationResult || "",
    photos,
  };

  return {
    ...record,
    scope: detail.supportScope || "미입력",
    supportStatus:
      detail.supportStatus === "APPROVED" ? "승인" : "승인되지 않음",
    scheduleEditable:
      detail.status === "PENDING" &&
      detail.managerId == null &&
      !record.date &&
      !record.time,
    preferred:
      [
        detail.preferredConstructionDate,
        detail.preferredTimeSlot ? timeSlots[detail.preferredTimeSlot] : null,
      ]
        .filter(Boolean)
        .join(" · ") || "미입력",
    draft: {
      date: record.date,
      time: record.time,
      ...installation,
      verified: detail.resultPublished,
    },
    published: detail.resultPublished ? installation : null,
  };
}

export function constructionConsentLabel(
  required: unknown,
  submitted: unknown,
) {
  if (typeof required !== "boolean" || typeof submitted !== "boolean")
    throw new Error("동의 필요 여부 또는 동의서 제출 여부가 응답에 없습니다.");

  return !required
    ? "불필요"
    : submitted
      ? "필요 · 확인 완료"
      : "필요 · 미확인";
}
