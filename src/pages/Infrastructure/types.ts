export const reviewStatuses = [
  "검토 대기",
  "검토 중",
  "점검 필요",
  "조치 진행",
  "조치 완료",
] as const;
export type ReviewStatus = (typeof reviewStatuses)[number];
export const registrationTypes = [
  "반복 침수",
  "하수 역류",
  "도로 배수 불량",
  "빗물받이 막힘",
] as const;
export const problemTypes = [
  ...registrationTypes,
  "배수 불량",
  "도로 침수",
  "시설 파손",
  "기타",
] as const;
export type InfrastructurePhoto = { id: string; name: string; src: string; file?: File };
export type RelatedResident = {
  id: string;
  receiptNo?: string;
  address: string;
  risk: "높음" | "주의" | "낮음" | "미확인";
  findings: string;
};
export type FacilityDraft = {
  target: string;
  requirements: string;
  status: "검토 대기" | "검토 중" | "점검 필요";
  result: string;
  photos: InfrastructurePhoto[];
  verified: boolean;
};
export type InfrastructureIssue = {
  relatedCount?: number;
  reviewId?: number;
  reviewState?: "PENDING" | "UNDER_REVIEW" | "INSPECTION_REQUIRED" | "ACTION_IN_PROGRESS" | "COMPLETED";
  reviewReason?: string | null;
  actionId?: number;
  id: string;
  code: string;
  number: number;
  district: string;
  location: string;
  kind: string;
  description: string;
  findings: string;
  source: string;
  externalKey?: string;
  history: number | null;
  related: RelatedResident[];
  referencePhotos: InfrastructurePhoto[];
  status: ReviewStatus;
  target: string;
  requirements: string;
  action: { result: string; photos: InfrastructurePhoto[]; verified: boolean };
  coordinates?: { latitude: number; longitude: number };
  marker: { x: number; y: number; labelBefore?: boolean };
  revision: number;
};
export type InfrastructureFilters = {
  district: string;
  status: string;
  kind: string;
  query: string;
};
export type RegistrationDraft = {
  location: string;
  postcode: string;
  kind: string;
  description: string;
  findings: string;
};
export const infrastructureDialogs = [
  "register",
  "address",
  "address-results",
  "registered",
  "summary",
  "requirements-saved",
  "status-saved",
  "complete-confirm",
] as const;
export type InfrastructureDialogKind = (typeof infrastructureDialogs)[number];
