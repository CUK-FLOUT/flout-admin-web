import axios from "axios";
import { apiClient } from "./client";

export type InspectionApiStatus =
  "RECEIVED" | "SCHEDULED" | "IN_PROGRESS" | "COMPLETED";
export type TimeSlot = "MORNING" | "AFTERNOON" | "ANY";
export interface InspectionItem {
  inspectionId: number;
  applicationId: number;
  receiptNo: string;
  address: string | null;
  designated: boolean;
  preferredVisitDate: string | null;
  preferredTimeSlot: TimeSlot | null;
  inspectorUserId: number | null;
  inspectorName: string | null;
  status: InspectionApiStatus;
}
export interface InspectionDetail {
  inspectionId: number;
  applicationId: number;
  receiptNo: string;
  applicantName: string;
  address: string;
  detailAddress: string | null;
  contact: string;
  preferredVisitDate: string | null;
  preferredTimeSlot: TimeSlot | null;
  inspectorId: number | null;
  inspectorName: string | null;
  visitDate: string | null;
  visitTime: string | null;
  preVisitNotice: string | null;
}
export interface InspectionPage {
  inspections: InspectionItem[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}
export interface InspectionSearch {
  status?: InspectionApiStatus | "ALL";
  district?: string;
  inspectorUserId?: number;
  visitDate?: string;
  keyword?: string;
  page?: number;
  size?: number;
}
export interface AssignmentRequest {
  visitDate: string;
  visitTime: string;
  preVisitNotice: string;
}
export interface AssignmentResult extends AssignmentRequest {
  inspectionId: number;
  receiptNo: string;
  applicantName: string;
  inspectorId: number;
  inspectorName: string;
  status: InspectionApiStatus;
  updatedAt: string;
}
export interface ResultRequest {
  summary: string;
  vulnerabilities: {
    type: "ENTRANCE" | "WINDOW_OPENING" | "DRAIN" | "OTHER_STRUCTURE";
    title: string;
    expertOpinion: string;
    fieldFindings: string;
  }[];
  recommendedActions: { description: string }[];
  followUpType: "INDIVIDUAL_HOUSE" | "PUBLIC_AREA" | null;
  internalMemo: string;
}
export interface UploadedPhoto {
  photoId: number;
  fileName: string;
  url: string;
  size: number;
  contentType: string;
}
export interface InspectionResult extends Omit<
  ResultRequest,
  "summary" | "internalMemo"
> {
  inspectionId: number;
  resultId: number;
  resultStatus: "DRAFT" | "PUBLISHED";
  summary: string | null;
  internalMemo: string | null;
  savedAt: string;
  publishedAt: string | null;
  photos: UploadedPhoto[];
}
export type PublicIssueType =
  | "REPEATED_FLOODING"
  | "SEWAGE_BACKFLOW"
  | "POOR_ROAD_DRAINAGE"
  | "BLOCKED_STORM_DRAIN";
export interface PublicIssueRequest {
  inspectionId: number;
  address?: string;
  issueType: PublicIssueType;
  description: string;
  fieldFindings: string;
}
export interface PublicIssueResponse extends PublicIssueRequest {
  publicIssueId: number;
  address: string;
  status: "RECEIVED";
  createdAt: string;
}
interface Envelope<T> {
  isSuccess: boolean;
  message: string;
  result: T | null;
}
const root = "/api/admin/inspections";

function result<T>(data: Envelope<T>): T {
  if (!data.isSuccess)
    throw new Error(data.message || "현장점검 요청을 처리하지 못했습니다.");
  if (data.result == null)
    throw new Error("현장점검 응답을 확인하지 못했습니다.");

  return data.result;
}

export function inspectionError(error: unknown): string {
  if (axios.isAxiosError(error)) {
    if (!error.response)
      return "서버에 연결하지 못했습니다. 잠시 후 다시 시도해 주세요.";

    const data: unknown = error.response.data;
    const body =
      data && typeof data === "object"
        ? (data as Record<string, unknown>)
        : null;

    return typeof body?.message === "string" && body.message.trim()
      ? body.message
      : "현장점검 요청에 실패했습니다. 다시 시도해 주세요.";
  }

  return error instanceof Error ? error.message : "요청을 처리하지 못했습니다.";
}

export async function getInspections(
  params: InspectionSearch,
  signal?: AbortSignal,
) {
  const { data } = await apiClient.get<Envelope<InspectionPage>>(root, {
    params,
    signal,
  });

  return result(data);
}

export async function getInspection(id: number, signal?: AbortSignal) {
  const { data } = await apiClient.get<Envelope<InspectionDetail>>(
    `${root}/${id}`,
    { signal },
  );

  return result(data);
}

export async function assignInspection(id: number, body: AssignmentRequest) {
  const { data } = await apiClient.post<Envelope<AssignmentResult>>(
    `${root}/${id}/assignment`,
    body,
  );

  return result(data);
}

export async function getInspectionResult(id: number, signal?: AbortSignal) {
  const { data } = await apiClient.get<Envelope<InspectionResult>>(
    `${root}/${id}/result`,
    { signal },
  );

  if (!data.isSuccess)
    throw new Error(data.message || "점검 결과를 불러오지 못했습니다.");

  return data.result;
}

export async function deleteInspectionPhoto(id: number, photoId: number) {
  if (!Number.isSafeInteger(photoId) || photoId <= 0)
    throw new Error("올바른 사진 ID가 아닙니다.");
  const { data } = await apiClient.delete<
    Envelope<{ inspectionId: number; photoId: number }>
  >(`${root}/${id}/attachments/${photoId}`);

  return result(data);
}

export async function createPublicIssue(body: PublicIssueRequest) {
  if (!Number.isSafeInteger(body.inspectionId) || body.inspectionId <= 0)
    throw new Error("올바른 점검 ID가 아닙니다.");
  if (
    ![
      "REPEATED_FLOODING",
      "SEWAGE_BACKFLOW",
      "POOR_ROAD_DRAINAGE",
      "BLOCKED_STORM_DRAIN",
    ].includes(body.issueType)
  )
    throw new Error("문제 유형을 선택해 주세요.");
  if (
    !body.description.trim() ||
    !body.fieldFindings.trim() ||
    body.description.length > 4000 ||
    body.fieldFindings.length > 4000
  )
    throw new Error("문제 내용과 현장 확인 내용을 1~4000자로 입력해 주세요.");
  if (
    body.address !== undefined &&
    (!body.address.trim() || body.address.length > 255)
  )
    throw new Error("위치를 1~255자로 입력해 주세요.");
  const { data } = await apiClient.post<Envelope<PublicIssueResponse>>(
    "/api/admin/public-issues",
    body,
  );

  return result(data);
}

export async function saveInspectionDraft(id: number, body: ResultRequest) {
  const { data } = await apiClient.put<
    Envelope<{ inspectionId: number; resultStatus: "DRAFT"; savedAt: string }>
  >(`${root}/${id}/result/draft`, body);

  return result(data);
}

export interface RecommendedFacilitiesValidation {
  hasFacilities: boolean;
  facilities: string[];
}

export async function validateRecommendedFacilities(
  descriptions: string[],
): Promise<RecommendedFacilitiesValidation> {
  if (
    !descriptions.length ||
    descriptions.length > 20 ||
    descriptions.some((text) => !text.trim() || text.length > 4000)
  )
    throw new Error(
      "권장 예방조치를 1~20개 입력해 주세요. 각 문장은 4000자 이하여야 합니다.",
    );
  const { data } = await apiClient.post<
    Envelope<RecommendedFacilitiesValidation>
  >(`${root}/recommended-facilities/validate`, { descriptions });
  const response = result(data);

  if (
    typeof response.hasFacilities !== "boolean" ||
    !Array.isArray(response.facilities) ||
    response.facilities.some((name) => typeof name !== "string" || !name.trim()) ||
    response.hasFacilities !== (response.facilities.length > 0)
  )
    throw new Error("시설 검증 응답을 확인하지 못했습니다. 다시 시도해 주세요.");

  return response;
}

export async function publishInspectionResult(id: number, body: ResultRequest) {
  const { data } = await apiClient.post<
    Envelope<{
      inspectionId: number;
      resultStatus: "PUBLISHED";
      inspectionStatus: "COMPLETED";
      publishedAt: string;
      applicationStatus: "INSPECTION_COMPLETED";
      supportStatus: "NOT_APPLIED";
    }>
  >(`${root}/${id}/result`, body);

  return result(data);
}

export async function uploadInspectionPhotos(id: number, files: File[]) {
  if (
    !files.length ||
    files.some(
      (file) =>
        !["image/jpeg", "image/png"].includes(file.type) ||
        !file.size ||
        file.size > 10485760,
    )
  )
    throw new Error(
      "JPG 또는 PNG 사진을 선택해 주세요. 파일당 최대 10MiB입니다.",
    );
  if (files.reduce((size, file) => size + file.size, 0) > 80 * 1024 * 1024)
    throw new Error("사진의 총 용량은 한 번에 80MiB 이하여야 합니다.");
  const body = new FormData();

  files.forEach((file) => body.append("files", file));
  const { data } = await apiClient.post<
    Envelope<{ inspectionId: number; photos: UploadedPhoto[] }>
  >(`${root}/${id}/attachments`, body, {
    headers: { "Content-Type": undefined },
    timeout: 120000,
  });

  return result(data);
}

export interface AddressSearchResponse {
  addresses: {
    roadAddress: string;
    jibunAddress: string;
    buildingName: string | null;
    zipCode: string;
  }[];
  currentPage: number;
  countPerPage: number;
  hasMore: boolean;
  nextPage: number | null;
}

export async function searchInspectionAddresses(
  keyword: string,
  currentPage = 1,
  signal?: AbortSignal,
) {
  const search = keyword.trim();

  if (!search || search.length > 100)
    throw new Error("검색할 주소를 1~100자로 입력해 주세요.");
  if (!Number.isSafeInteger(currentPage) || currentPage < 1)
    throw new Error("올바른 주소 검색 페이지가 아닙니다.");
  const { data } = await apiClient.get<Envelope<AddressSearchResponse>>(
    "/api/resident/addresses/search",
    { params: { keyword: search, currentPage }, signal },
  );

  return result(data);
}
