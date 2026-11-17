import type {
  FacilityDraft,
  InfrastructureFilters,
  InfrastructureIssue,
} from "./types";

export const emptyFilters: InfrastructureFilters = {
  district: "지역 전체",
  status: "검토 상태 전체",
  kind: "문제 유형 전체",
  query: "",
};
export function facilityDraft(a: InfrastructureIssue): FacilityDraft {
  return {
    target: a.target,
    requirements: a.requirements,
    status: a.status === "검토 대기" ? "검토 대기" : "검토 중",
    ...structuredClone(a.action),
  };
}
