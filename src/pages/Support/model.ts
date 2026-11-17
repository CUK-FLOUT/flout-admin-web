import entrance from "../../assets/gis/imgJpg.png";
import drain from "../../assets/gis/imgJpg1.png";
import { readResultsState } from "../InspectionResults/storage";
import type { ReviewDraft, SupportApplication } from "./types";

export function consentLabel(a: SupportApplication) {
  if (a.review.consentRequired === "불필요") return "불필요";
  if (a.review.consentRequired === "검토 필요") return "필요 여부 검토 전";

  return a.review.consentSubmission;
}

export function approvalIssue(
  a: SupportApplication,
  draft: ReviewDraft,
): string | null {
  if (a.apiId && !a.reviewLoaded)
    return "지원 자격 검토 정보를 먼저 불러와 주세요.";
  if (a.apiId && a.serverStatus !== "SUBMITTED")
    return "현재 상태에서는 승인할 수 없습니다.";
  if (!draft.checks.every(Boolean))
    return "신청자·주택 정보, 전문가 점검 결과, 사업 자격·필요서류를 모두 확인해 주세요.";
  if (!a.inspectionPublished)
    return "공개된 전문가 점검 결과를 먼저 확인해 주세요.";
  if (draft.consentRequired === "검토 필요")
    return "임대인 동의 필요 여부를 확인해 주세요.";
  if (
    draft.consentRequired === "필요" &&
    draft.consentSubmission !== "제출 완료"
  )
    return "임대인 동의서가 제출되어야 승인할 수 있습니다.";
  if (!draft.scope.trim()) return "승인할 지원 범위를 입력해 주세요.";

  return null;
}

export function inspectionFor(a: SupportApplication) {
  if (a.apiId)
    return {
      selected: a.vulnerabilities,
      summary: a.inspectionSummary || "",
      actions: a.recommendations,
      photos: [],
    };
  const published = readResultsState().records[a.id]?.published;

  return {
    selected: published?.selected ?? a.vulnerabilities,
    summary: published?.summary ?? a.inspectionSummary,
    actions: published?.actions ?? a.recommendations,
    photos:
      published?.photos ??
      (a.inspectionPublished
        ? [
            {
              id: "support-entrance",
              name: "출입구.jpg",
              src: entrance,
              category: "출입구" as const,
            },
            {
              id: "support-drain",
              name: "배수구.jpg",
              src: drain,
              category: "배수구" as const,
            },
          ]
        : []),
  };
}
