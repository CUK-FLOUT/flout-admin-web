import entrance from "../../assets/gis/imgJpg.png";
import drain from "../../assets/gis/imgJpg1.png";
import { readResultsState } from "../InspectionResults/storage";
import { createSupportFixtures } from "./mockData";
import { consentRequirements, consentStates, supportStatuses } from "./types";
import type { ReviewDraft, SupportApplication, SupportFilters } from "./types";
export const supportStorageKey = "flout-support-management-v1";
export function isReview(value: unknown): value is ReviewDraft {
  if (!value || typeof value !== "object") return false;
  const r = value as ReviewDraft;
  return Array.isArray(r.checks) && r.checks.length === 3 && r.checks.every(v => typeof v === "boolean")
    && consentRequirements.includes(r.consentRequired) && consentStates.includes(r.consentState)
    && typeof r.scope === "string" && typeof r.memo === "string" && typeof r.notify === "boolean";
}
function isApplication(value: unknown): value is SupportApplication {
  if (!value || typeof value !== "object") return false;
  const a = value as SupportApplication;
  return typeof a.id === "string" && /^\d{6}$/.test(a.id) && ["resident", "phone", "district", "address", "housing", "ownership", "request", "residentNote", "preferred", "inspectionSummary", "rejectionReason", "reviewedAt"].every(k => typeof a[k as keyof SupportApplication] === "string")
    && [a.documents, a.vulnerabilities, a.recommendations].every(v => Array.isArray(v) && v.every(s => typeof s === "string"))
    && typeof a.inspectionPublished === "boolean" && typeof a.constructionRegistered === "boolean"
    && supportStatuses.includes(a.status) && isReview(a.review);
}
export function readSupportApplications(): SupportApplication[] {
  try {
    const raw = localStorage.getItem(supportStorageKey);
    if (raw === null) return createSupportFixtures();
    const value: unknown = JSON.parse(raw);
    if (!Array.isArray(value) || !value.every(isApplication) || new Set(value.map(a => a.id)).size !== value.length) return createSupportFixtures();
    return value;
  } catch { return createSupportFixtures(); }
}
export function writeSupportApplications(applications: SupportApplication[]) {
  localStorage.setItem(supportStorageKey, JSON.stringify(applications));
}
export function consentLabel(a: SupportApplication) {
  if (a.review.consentRequired === "불필요") return "불필요";
  if (a.review.consentRequired === "검토 필요") return "필요 여부 검토 전";
  return "필요 · " + a.review.consentState;
}
export function filterSupport(applications: SupportApplication[], filters: SupportFilters) {
  const query = filters.q.trim().toLocaleLowerCase();
  return applications.filter(a =>
    (!filters.district || a.district === filters.district)
    && (!filters.status || a.status === filters.status)
    && (!filters.consent || consentLabel(a) === filters.consent)
    && (!query || (a.id + " " + a.resident).toLocaleLowerCase().includes(query)));
}
export function approvalIssue(a: SupportApplication, draft: ReviewDraft): string | null {
  if (!draft.checks.every(Boolean)) return "신청자·주택 정보, 전문가 점검 결과, 사업 자격·필요서류를 모두 확인해 주세요.";
  if (!a.inspectionPublished) return "공개된 전문가 점검 결과를 먼저 확인해 주세요.";
  if (draft.consentRequired === "검토 필요") return "임대인 동의 필요 여부를 확인해 주세요.";
  if (draft.consentRequired === "필요" && (draft.consentState !== "확인 완료" || !a.documents.some(d => d.includes("동의")))) return "제출된 임대인 동의 자료를 확인 완료한 뒤 승인할 수 있습니다.";
  if (!draft.scope.trim()) return "승인할 지원 범위를 입력해 주세요.";
  return null;
}
export function withReview(a: SupportApplication, review: ReviewDraft): SupportApplication {
  return { ...a, review: structuredClone(review), reviewedAt: new Date().toISOString() };
}
export function confirmApproval(a: SupportApplication, review: ReviewDraft, expectedReview?: ReviewDraft): SupportApplication {
  if (expectedReview) {
    const fields = ["consentRequired", "consentState", "scope", "memo", "notify"] as const;
    if (fields.some(field => a.review[field] !== expectedReview[field])
      || a.review.checks.some((checked, index) => checked !== expectedReview.checks[index])) {
      throw new Error("다른 창에서 검토 내용이 변경되었습니다. 새로고침하여 최신 정보를 확인한 뒤 다시 승인해 주세요.");
    }
  }
  const issue = approvalIssue(a, review);
  if (issue) throw new Error(issue);
  return { ...withReview(a, review), status: "승인", rejectionReason: "", constructionRegistered: false };
}
export function confirmRejection(a: SupportApplication, review: ReviewDraft, reason: string): SupportApplication {
  if (!reason.trim()) throw new Error("주민에게 안내할 미승인 사유를 입력해 주세요.");
  return { ...withReview(a, review), status: "미승인", rejectionReason: reason.trim(), constructionRegistered: false };
}
export function inspectionFor(a: SupportApplication) {
  const published = readResultsState().records[a.id]?.published;
  return {
    selected: published?.selected ?? a.vulnerabilities,
    summary: published?.summary ?? a.inspectionSummary,
    actions: published?.actions ?? a.recommendations,
    photos: published?.photos ?? (a.inspectionPublished ? [
      {id: "support-entrance", name: "출입구.jpg", src: entrance, category: "출입구" as const},
      {id: "support-drain", name: "배수구.jpg", src: drain, category: "배수구" as const},
    ] : []),
  };
}
