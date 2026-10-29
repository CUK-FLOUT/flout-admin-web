export const supportStatuses = ["검토 중", "승인", "미승인"] as const;
export const consentRequirements = ["검토 필요", "필요", "불필요"] as const;
export const consentStates = ["미확인", "자료 요청", "확인 중", "확인 완료", "불필요"] as const;
export type SupportStatus = (typeof supportStatuses)[number];
export type ConsentRequirement = (typeof consentRequirements)[number];
export type ConsentState = (typeof consentStates)[number];
export type ReviewDraft = {
  checks: [boolean, boolean, boolean];
  consentRequired: ConsentRequirement;
  consentState: ConsentState;
  scope: string;
  memo: string;
  notify: boolean;
};
export type SupportApplication = {
  id: string;
  resident: string;
  phone: string;
  district: string;
  address: string;
  housing: string;
  ownership: string;
  request: string;
  residentNote: string;
  preferred: string;
  documents: string[];
  vulnerabilities: string[];
  recommendations: string[];
  inspectionSummary: string;
  inspectionPublished: boolean;
  status: SupportStatus;
  review: ReviewDraft;
  rejectionReason: string;
  reviewedAt: string;
  constructionRegistered: boolean;
};
export type SupportDialogKind =
  | "approve" | "reject" | "approved" | "rejected" | "review-saved"
  | "review-check" | "approved-view" | "rejected-view" | "inspection" | "document";
export type SupportFilters = { district: string; status: string; consent: string; q: string };
