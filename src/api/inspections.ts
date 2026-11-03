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
  followUpType: "INDIVIDUAL_HOUSE" | "PUBLIC_AREA";
  internalMemo: string;
}
export interface UploadedPhoto {
  photoId: number;
  fileName: string;
  url: string;
  size: number;
  contentType: string;
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
  if (data.result == null) throw new Error("현장점검 응답을 확인하지 못했습니다.");

  return data.result;
}

export function inspectionError(error: unknown): string {
  if (axios.isAxiosError<{ message?: string }>(error))
    return (
      error.response?.data?.message ||
      "서버에 연결하지 못했습니다. 잠시 후 다시 시도해 주세요."
    );

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

export async function changeInspectionStatus(
  id: number,
  status: Exclude<InspectionApiStatus, "RECEIVED">,
) {
  const { data } = await apiClient.patch<
    Envelope<{
      inspectionId: number;
      receiptNo: string;
      status: InspectionApiStatus;
      updatedAt: string;
    }>
  >(`${root}/${id}/status`, { status });

  return result(data);
}

export async function saveInspectionDraft(id: number, body: ResultRequest) {
  const { data } = await apiClient.put<
    Envelope<{ inspectionId: number; resultStatus: "DRAFT"; savedAt: string }>
  >(`${root}/${id}/result/draft`, body);

  return result(data);
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
