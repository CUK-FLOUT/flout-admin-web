export const supportStatuses = [
  "검토 중",
  "승인",
  "미승인",
  "접수",
  "일정 조율 중",
] as const;
export const consentRequirements = ["검토 필요", "필요", "불필요"] as const;
export const consentSubmissions = [
  "미확인",
  "미제출",
  "제출 완료",
  "불필요",
] as const;
export type SupportStatus = (typeof supportStatuses)[number];
export type ConsentRequirement = (typeof consentRequirements)[number];
export type ConsentSubmission = (typeof consentSubmissions)[number];
export type ReviewDraft = {
  checks: [boolean, boolean, boolean];
  consentRequired: ConsentRequirement;
  consentSubmission: ConsentSubmission;
  scope: string;
  memo: string;
  notify: boolean;
};
export type SupportApplication = {
  id: string;
  apiId?: number;
  serverStatus?: string;
  attachmentUrls?: Record<string, string>;
  attachmentKeys?: string[];
  reviewLoaded?: boolean;
  programName?: string;
  programTarget?: string;
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
  inspectionId?: number | null;
  inspectionSummary: string;
  inspectionPublished: boolean;
  status: SupportStatus;
  review: ReviewDraft;
  rejectionReason: string;
  reviewedAt: string;
  constructionRegistered: boolean;
};
export type SupportDialogKind =
  | "approve"
  | "reject"
  | "approved"
  | "rejected"
  | "review-saved"
  | "review-check"
  | "approved-view"
  | "rejected-view"
  | "inspection"
  | "document";
export type SupportFilters = {
  district: string;
  status: string;
  q: string;
};
