import axios from "axios";
import { apiClient } from "./client";

export type RiskLevel = "HIGH" | "CAUTION" | "LOW";
export interface PriorityItem {
  applicationId: number;
  receiptNo: string;
  address: string;
  riskLevel: RiskLevel;
  floodExperience: "YES" | "NO" | "UNKNOWN";
  requestReason: string | null;
  nearbyApplicationCount: number;
  designated: boolean;
}
export interface PriorityDetailResponse extends Omit<
  PriorityItem,
  "designated"
> {
  applicantName: string;
  detailAddress: string | null;
  inspectionNeed: string;
  internalMemo: string | null;
}
export interface PriorityOrderItem extends PriorityItem {
  selectionOrder: number;
}
export interface PriorityPage {
  applications: PriorityItem[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}
export interface PrioritySearch {
  keyword?: string;
  district?: string;
  riskLevel?: RiskLevel;
  designated?: boolean;
  page: number;
  size: number;
}
interface Envelope<T> {
  isSuccess: boolean;
  code: string;
  message: string;
  result: T | null;
}
export class PriorityApiError extends Error {
  code: string;
  constructor(message: string, code: string) {
    super(message);
    this.code = code;
  }
}
const root = "/api/admin/priority-inspections";

function unwrap<T>(data: Envelope<T>): T {
  if (!data.isSuccess || data.result == null)
    throw new PriorityApiError(
      data.message || "우선점검 응답을 확인하지 못했습니다.",
      data.code,
    );

  return data.result;
}

export function priorityError(error: unknown): string {
  if (axios.isAxiosError(error)) {
    if (!error.response)
      return "서버에 연결하지 못했습니다. 잠시 후 다시 시도해 주세요.";
    const body: unknown = error.response.data;
    const message =
      body && typeof body === "object" && "message" in body
        ? body.message
        : null;

    return typeof message === "string" && message.trim()
      ? message
      : "우선점검 요청에 실패했습니다. 다시 시도해 주세요.";
  }

  return error instanceof Error ? error.message : "요청을 처리하지 못했습니다.";
}

export function isPriorityConflict(error: unknown) {
  return (
    (axios.isAxiosError(error) && error.response?.status === 409) ||
    (error instanceof PriorityApiError &&
      /^PRIORITY_INSPECTION_409_/.test(error.code))
  );
}

export function validateApplicationIds(ids: number[], maximum = Infinity) {
  if (
    !ids.length ||
    ids.length > maximum ||
    new Set(ids).size !== ids.length ||
    ids.some((id) => !Number.isSafeInteger(id) || id <= 0)
  )
    throw new Error("유효한 신청 ID를 중복 없이 선택해 주세요.");
}

export async function getPriorityInspections(
  params: PrioritySearch,
  signal?: AbortSignal,
) {
  const { data } = await apiClient.get<Envelope<PriorityPage>>(root, {
    params,
    signal,
  });

  return unwrap(data);
}

export async function getPriorityInspection(id: number, signal?: AbortSignal) {
  validateApplicationIds([id]);
  const { data } = await apiClient.get<Envelope<PriorityDetailResponse>>(
    `${root}/${id}`,
    { signal },
  );

  return unwrap(data);
}

export async function setPriorityDesignation(
  applicationIds: number[],
  designated: boolean,
) {
  validateApplicationIds(applicationIds, 500);
  const { data } = await apiClient.put<
    Envelope<{
      applications: {
        applicationId: number;
        receiptNo: string;
        designated: boolean;
        designatedAt: string | null;
      }[];
    }>
  >(`${root}/designation`, { applicationIds, designated });

  return unwrap(data);
}

export async function getPriorityOrder(signal?: AbortSignal) {
  const { data } = await apiClient.get<
    Envelope<{ applications: PriorityOrderItem[] }>
  >(`${root}/order`, { signal });

  return unwrap(data).applications;
}

export async function savePriorityOrder(applicationIds: number[]) {
  validateApplicationIds(applicationIds);
  const { data } = await apiClient.put<
    Envelope<{
      applications: {
        applicationId: number;
        receiptNo: string;
        selectionOrder: number;
      }[];
    }>
  >(`${root}/order`, { applicationIds });

  return unwrap(data);
}

export async function savePriorityInternalMemo(
  applicationId: number,
  internalMemo: string,
) {
  validateApplicationIds([applicationId]);
  if (typeof internalMemo !== "string" || internalMemo.length > 2000)
    throw new Error("내부 메모는 2000자 이하여야 합니다.");
  const { data } = await apiClient.patch<
    Envelope<{ applicationId: number; internalMemo: string | null }>
  >(`/api/admin/applications/${applicationId}/internal-memo`, { internalMemo });

  return unwrap(data);
}

export async function getPriorityDesignation(
  applicationId: number,
  receiptNo: string,
  signal?: AbortSignal,
) {
  validateApplicationIds([applicationId]);
  let page = 0;

  while (!signal?.aborted) {
    const result = await getPriorityInspections(
      { keyword: receiptNo, page, size: 100 },
      signal,
    );
    const application = result.applications.find(
      (item) => item.applicationId === applicationId,
    );

    if (application) return application.designated;
    if (++page >= result.totalPages) return undefined;
  }

  return undefined;
}
