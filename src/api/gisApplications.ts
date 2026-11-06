import axios from "axios";
import { apiClient } from "./client";

export type ProcessingStatus =
  | "RECEIVED"
  | "INSPECTION_SCHEDULED"
  | "INSPECTION_IN_PROGRESS"
  | "INSPECTION_COMPLETED"
  | "SUPPORT_REVIEWING"
  | "SUPPORT_APPROVED"
  | "SUPPORT_REJECTED"
  | "CONSTRUCTION_SCHEDULED"
  | "CONSTRUCTION_IN_PROGRESS"
  | "CONSTRUCTION_COMPLETED";
export type GisRisk = "HIGH" | "CAUTION" | "LOW";
export interface GisSearch {
  district?: string;
  riskLevel?: GisRisk;
  processingStatus?: "INSPECTION" | "SUPPORT" | "CONSTRUCTION";
  keyword?: string;
  page?: number;
  size?: number;
}
export interface GisItem {
  applicationId: number;
  receiptNo: string;
  applicantName: string;
  address: string;
  detailAddress: string | null;
  riskLevel: GisRisk | null;
  processingStatus: ProcessingStatus;
}
export interface GisPage {
  applications: GisItem[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}
export interface GisMarker {
  applicationId: number;
  latitude: number | null;
  longitude: number | null;
  riskLevel: GisRisk | null;
  processingStatus: ProcessingStatus;
}
export interface GisStats {
  totalCount: number;
  assignmentPendingCount: number;
  inspectionInProgressCount: number;
  supportConstructionInProgressCount: number;
}
export interface GisDetail {
  applicationId: number;
  receiptNo: string;
  applicantName: string;
  contact: string;
  address: string;
  detailAddress: string | null;
  housingType: "SEMI_BASEMENT" | "FIRST_FLOOR" | "SECOND_FLOOR_OR_ABOVE" | null;
  occupancyType: "OWNER" | "TENANT" | "ETC" | null;
  riskLevel: GisRisk | null;
  floodExperience: "YES" | "NO" | "UNKNOWN" | null;
  inflowLocations: (
    "WINDOW" | "ENTRANCE" | "BATHROOM" | "DRAIN" | "ETC" | "UNKNOWN"
  )[];
  existingFacility: boolean | null;
  preferredVisitDate: string | null;
  requestReason: string | null;
  preferredTimeSlot: "MORNING" | "AFTERNOON" | "ANY" | null;
}
export interface GisAttachment {
  attachmentId: number;
  originalFilename: string;
  imageUrl: string;
}
export interface GisHistory {
  eventId: string;
  eventType: string;
  statusLabel: string;
  title: string;
  description: string | null;
  occurredAt: string | null;
  actorName: string | null;
}
export interface GisHistories {
  applicationId: number;
  totalCount: number;
  histories: GisHistory[];
}
export interface GisSupport {
  supportApplicationId: number;
  programId: number;
  programName: string;
  status: "DRAFT" | "SUBMITTED" | "APPROVED" | "REJECTED";
  requestedFacility: string;
  supportScope: string | null;
  landlordConsentRequired: boolean;
  landlordConsentDocumentSubmitted: boolean;
  constructionId: number | null;
  constructionStatus:
    "PENDING" | "SCHEDULED" | "IN_PROGRESS" | "COMPLETED" | null;
  rejectionReason: string | null;
}
export interface GisConstruction {
  constructionId: number;
  status: "PENDING" | "SCHEDULED" | "IN_PROGRESS" | "COMPLETED";
  requestedFacility: string;
  supportScope: string | null;
  preferredConstructionDate: string | null;
  preferredTimeSlot: "MORNING" | "AFTERNOON" | "ANY" | null;
  constructionDate: string | null;
  constructionTime: string | null;
  managerId: number | null;
  managerName: string | null;
  completedAt: string | null;
  finalInstallationResult: string | null;
}
interface Envelope<T> {
  isSuccess: boolean;
  message: string;
  result: T | null;
}
const root = "/api/admin/applications";

async function get<T>(
  path: string,
  signal?: AbortSignal,
  params?: object,
): Promise<T> {
  const { data } = await apiClient.get<Envelope<T>>(path, { signal, params });

  if (!data.isSuccess || data.result == null)
    throw new Error(
      data.message?.trim()
        ? data.message
        : "GIS 신청 정보를 불러오지 못했습니다.",
    );

  return data.result;
}

function path(id: number, suffix = "") {
  if (!Number.isSafeInteger(id) || id <= 0)
    throw new Error("올바른 신청 ID가 아닙니다.");

  return `${root}/${id}${suffix}`;
}

export const getGisApplications = (params: GisSearch, signal?: AbortSignal) =>
  get<GisPage>(root, signal, params);
export const getGisMarkers = (
  { district, riskLevel, processingStatus, keyword }: GisSearch,
  signal?: AbortSignal,
) =>
  get<{ applications: GisMarker[] }>("/api/admin/map/applications", signal, {
    district,
    riskLevel,
    processingStatus,
    keyword,
  });
export const getGisStats = (signal?: AbortSignal) =>
  get<GisStats>(`${root}/stats`, signal);
export const getGisDetail = (id: number, signal?: AbortSignal) =>
  get<GisDetail>(path(id), signal);
export const getGisAttachments = (id: number, signal?: AbortSignal) =>
  get<GisAttachment[]>(path(id, "/attachments"), signal);
export const getGisHistories = (id: number, signal?: AbortSignal) =>
  get<GisHistories>(path(id, "/histories"), signal);
export const getGisSupport = (id: number, signal?: AbortSignal) =>
  get<{ support: GisSupport | null }>(path(id, "/support"), signal);
export const getGisConstruction = (id: number, signal?: AbortSignal) =>
  get<{ construction: GisConstruction | null }>(
    path(id, "/construction"),
    signal,
  );
export { savePriorityInternalMemo as saveGisMemo } from "./priorityInspections";
export function gisError(error: unknown): string {
  if (axios.isAxiosError(error)) {
    if (!error.response)
      return "서버에 연결하지 못했습니다. 잠시 후 다시 시도해 주세요.";
    const message: unknown = error.response.data?.message;

    return typeof message === "string" && message.trim()
      ? message
      : "GIS 요청에 실패했습니다.";
  }

  return error instanceof Error
    ? error.message
    : "GIS 요청을 처리하지 못했습니다.";
}
