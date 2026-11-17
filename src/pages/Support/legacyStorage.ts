// 이전 저장 데이터 이관의 회귀 검증용이며 운영 화면에서는 불러오지 않는다.
import { createSupportFixtures } from "./mockData";
import {
  consentRequirements,
  consentSubmissions,
  supportStatuses,
} from "./types";
import type { ReviewDraft, SupportApplication } from "./types";

export const supportStorageKey = "flout-support-management-v1";
export function isReview(value: unknown): value is ReviewDraft {
  if (!value || typeof value !== "object") return false;
  const r = value as ReviewDraft;

  return (
    Array.isArray(r.checks) &&
    r.checks.length === 3 &&
    r.checks.every((v) => typeof v === "boolean") &&
    consentRequirements.includes(r.consentRequired) &&
    consentSubmissions.includes(r.consentSubmission) &&
    typeof r.scope === "string" &&
    typeof r.memo === "string" &&
    typeof r.notify === "boolean"
  );
}

function isApplication(value: unknown): value is SupportApplication {
  if (!value || typeof value !== "object") return false;
  const a = value as SupportApplication;

  return (
    typeof a.id === "string" &&
    /^\d{6}$/.test(a.id) &&
    [
      "resident",
      "phone",
      "district",
      "address",
      "housing",
      "ownership",
      "request",
      "residentNote",
      "preferred",
      "inspectionSummary",
      "rejectionReason",
      "reviewedAt",
    ].every((k) => typeof a[k as keyof SupportApplication] === "string") &&
    [a.documents, a.vulnerabilities, a.recommendations].every(
      (v) => Array.isArray(v) && v.every((s) => typeof s === "string"),
    ) &&
    typeof a.inspectionPublished === "boolean" &&
    typeof a.constructionRegistered === "boolean" &&
    supportStatuses.includes(a.status) &&
    isReview(a.review)
  );
}

// 이전의 확인 완료 상태를 동의서 제출 완료로 간주하지 않는다.
function migrateStoredApplication(value: unknown): unknown {
  if (!value || typeof value !== "object" || !("review" in value)) return value;
  const review = value.review;

  if (
    !review ||
    typeof review !== "object" ||
    "consentSubmission" in review ||
    !("consentState" in review) ||
    !["미확인", "자료 요청", "확인 중", "확인 완료", "불필요"].some(
      (state) => state === review.consentState,
    )
  )
    return value;

  const migratedReview = {
    ...review,
    consentSubmission:
      "consentRequired" in review && review.consentRequired === "불필요"
        ? "불필요"
        : "미확인",
  };

  Reflect.deleteProperty(migratedReview, "consentState");

  return { ...value, review: migratedReview };
}

export function readSupportApplications(): SupportApplication[] {
  try {
    const raw = localStorage.getItem(supportStorageKey);

    if (raw === null) return createSupportFixtures();
    const parsed: unknown = JSON.parse(raw);
    const value: unknown = Array.isArray(parsed)
      ? parsed.map(migrateStoredApplication)
      : parsed;

    if (
      !Array.isArray(value) ||
      !value.every(isApplication) ||
      new Set(value.map((a) => a.id)).size !== value.length
    )
      return createSupportFixtures();

    return value;
  } catch {
    return createSupportFixtures();
  }
}

export function writeSupportApplications(applications: SupportApplication[]) {
  localStorage.setItem(supportStorageKey, JSON.stringify(applications));
}
