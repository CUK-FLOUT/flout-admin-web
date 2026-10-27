import { readPublishedResultIds } from "../InspectionResults/storage";
export type InspectionStatus = "대기" | "예정" | "진행" | "완료";
export type EditableStatus = Exclude<InspectionStatus, "대기">;
export type InspectionApplication = {
  id: string;
  resident: string;
  address: string;
  district: string;
  phone: string;
  priority: boolean;
  requestedDate: string;
  requestedTime: string;
  assignee: string;
  status: InspectionStatus;
  visitDate: string;
  visitTime: string;
  notice: string;
  notifyResident: boolean;
  resultPublished: boolean;
};
export type AssignmentDraft = Pick<
  InspectionApplication,
  "assignee" | "visitDate" | "visitTime" | "notice" | "notifyResident"
> & { status: EditableStatus };
export const inspectionStorageKey = "flout-inspection-mock-v1";
export const inspectionStatuses: EditableStatus[] = ["예정", "진행", "완료"];
export const assignees = ["김담당", "이담당", "박담당", "최담당"];
// Figma에 실제로 정의된 10행. 전화번호·지역·000001 외 주민명/확정 일정은 흐름 확인용 Mock입니다.
const rows = [
  ["000001", "○○로 00", true, "2026-09-07", "오전(9~12시)", "미배정", "대기"],
  ["000008", "○○로 21", true, "2026-09-10", "오후(13~18시)", "김담당", "예정"],
  ["000012", "○○로 90", true, "2026-09-15", "오전(9~12시)", "김담당", "예정"],
  ["000006", "○○길 60", false, "", "상관없음", "미배정", "대기"],
  ["000002", "○○길 12", false, "", "상관없음", "이담당", "완료"],
  ["000004", "○○길 30", false, "", "상관없음", "이담당", "완료"],
  ["000005", "○○로 48", false, "", "상관없음", "박담당", "완료"],
  ["000009", "○○길 15", false, "2026-09-11", "오전(9~12시)", "최담당", "진행"],
  ["000010", "○○로 77", false, "2026-09-12", "오후(13~18시)", "최담당", "예정"],
  ["000011", "○○길 25", false, "", "상관없음", "김담당", "예정"],
] as const;
export const initialInspections: InspectionApplication[] = rows.map(
  (r, index) => ({
    id: r[0],
    address: r[1],
    priority: r[2],
    requestedDate: r[3],
    requestedTime: r[4],
    assignee: r[5],
    status: r[6],
    resident: index === 0 ? "김○○" : ["이○○", "박○○", "김○○"][index % 3],
    district: ["중동", "상동", "원미동"][index % 3],
    phone: "010-1234-1234",
    visitDate: r[5] === "미배정" ? "" : "2026-10-12",
    visitTime: r[5] === "미배정" ? "" : "14:00",
    notice: "방문 전 배수구 주변을 정리해 주세요.",
    notifyResident: true,
    resultPublished: r[6] === "완료",
  }),
);
export function getAssignmentDraft(
  application: InspectionApplication,
): AssignmentDraft {
  return {
    assignee:
      application.assignee === "미배정" ? "김담당" : application.assignee,
    visitDate: application.visitDate,
    visitTime: application.visitTime || "14:00",
    notice: application.notice,
    notifyResident: application.notifyResident,
    status: application.status === "대기" ? "예정" : application.status,
  };
}
export function readInspections(): InspectionApplication[] {
  const publishedIds = readPublishedResultIds();
  const defaults = initialInspections.map(a => ({...a, resultPublished: a.resultPublished || publishedIds.has(a.id)}));
  try {
    const data: unknown = JSON.parse(
      localStorage.getItem(inspectionStorageKey) || "null",
    );
    if (!Array.isArray(data) || data.length !== defaults.length)
      return structuredClone(defaults);
    return defaults.map((base) => {
      const value: unknown = data.find(
        (v: unknown) =>
          typeof v === "object" && v !== null && "id" in v && v.id === base.id,
      );
      if (!value || typeof value !== "object") return { ...base };
      const saved = value as Partial<InspectionApplication>;
      // 신청 기본 정보는 fixture를 유지하고, 결과 공개 여부는 05의 검증된 공개 결과도 반영합니다.
      if (
        typeof saved.assignee !== "string" ||
        ![...assignees, "미배정"].includes(saved.assignee) ||
        !["대기", ...inspectionStatuses].includes(saved.status || "") ||
        typeof saved.visitDate !== "string" ||
        !/^(|\d{4}-\d{2}-\d{2})$/.test(saved.visitDate) ||
        typeof saved.visitTime !== "string" ||
        !/^(|([01]\d|2[0-3]):[0-5]\d)$/.test(saved.visitTime) ||
        typeof saved.notice !== "string" ||
        typeof saved.notifyResident !== "boolean" ||
        (saved.status === "완료" && !base.resultPublished)
      )
        return { ...base };
      return {
        ...base,
        assignee: saved.assignee,
        status: saved.status as InspectionStatus,
        visitDate: saved.visitDate,
        visitTime: saved.visitTime,
        notice: saved.notice,
        notifyResident: saved.notifyResident,
      };
    });
  } catch {
    return structuredClone(defaults);
  }
}
export function formatDate(value: string) {
  return value.replaceAll("-", ".");
}
