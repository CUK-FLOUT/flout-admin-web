import axios from "axios";
import { apiClient } from "./client";

export type ConstructionServerStatus =
  "PENDING" | "SCHEDULED" | "IN_PROGRESS" | "COMPLETED";
export type ConstructionListStatus = Exclude<
  ConstructionServerStatus,
  "PENDING"
>;
export type ConstructionListItem = {
  constructionId: number;
  receiptNo: string;
  applicantName: string;
  requestedFacility: string | null;
  scheduledConstructionDate: string | null;
  scheduledConstructionTime: string | null;
  status: ConstructionServerStatus;
};
export type ConstructionPage = {
  constructions: ConstructionListItem[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
};
export type ConstructionPhotoResponse = {
  photoId: number;
  fileName: string;
  url: string;
  size: number;
  contentType: string;
};
export type ConstructionDetails = ConstructionListItem & {
  supportApplicationId: number;
  applicationId: number;
  supportStatus: "DRAFT" | "SUBMITTED" | "APPROVED" | "REJECTED";
  supportScope: string | null;
  preferredConstructionDate: string | null;
  preferredTimeSlot: "MORNING" | "AFTERNOON" | "ANY" | null;
  managerId: number | null;
  managerName: string | null;
  resultPublished: boolean;
  finalInstallationResult: string | null;
  completedAt: string | null;
  photos: (ConstructionPhotoResponse & { uploadedAt: string })[];
};
export type ConstructionScheduleResponse = {
  constructionId: number;
  supportApplicationId: number;
  applicationId: number;
  receiptNo: string;
  applicantName: string;
  managerId: number;
  managerName: string;
  constructionDate: string;
  constructionTime: string;
  status: ConstructionServerStatus;
  updatedAt: string;
};
export type ConstructionCompletionResponse = {
  constructionId: number;
  supportApplicationId: number;
  applicationId: number;
  receiptNo: string;
  applicantName: string;
  status: ConstructionServerStatus;
  finalInstallationResult: string;
  completedAt: string;
};
type Envelope<T> = {
  isSuccess: boolean;
  result: T;
  code: string;
  message: string;
};
const root = "/api/admin/constructions";

function result<T>(data: Envelope<T>): T {
  if (!data.isSuccess || data.result == null)
    throw new Error(
      data.message?.trim() ? data.message : "시공 요청에 실패했습니다.",
    );

  return data.result;
}

function path(id: number) {
  if (!Number.isSafeInteger(id) || id <= 0)
    throw new Error("올바른 시공 ID가 필요합니다.");

  return `${root}/${id}`;
}

export async function getConstructions(
  keyword: string,
  page: number,
  status?: ConstructionListStatus,
  signal?: AbortSignal,
) {
  if (keyword.trim().length > 255 || !Number.isSafeInteger(page) || page < 0)
    throw new Error("검색어와 페이지를 확인해 주세요.");

  return result(
    (
      await apiClient.get<Envelope<ConstructionPage>>(root, {
        params: {
          keyword: keyword.trim(),
          page,
          size: 5,
          ...(status ? { status } : {}),
        },
        signal,
      })
    ).data,
  );
}

export async function getConstructionDetail(id: number, signal?: AbortSignal) {
  return result(
    (await apiClient.get<Envelope<ConstructionDetails>>(path(id), { signal }))
      .data,
  );
}

export function constructionScheduleError(
  date: string,
  time: string,
  now = Date.now(),
) {
  const scheduled = Date.parse(`${date}T${time}:00+09:00`);

  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
    !/^([01]\d|2[0-3]):[0-5]\d$/.test(time) ||
    !Number.isFinite(scheduled) ||
    new Date(`${date}T00:00:00Z`).toISOString().slice(0, 10) !== date
  )
    return "확정 시공일과 시간을 올바르게 입력해 주세요.";
  if (scheduled < now)
    return "한국 시간 기준 현재 이후의 시공 일정을 입력해 주세요.";

  return null;
}

export async function saveConstructionSchedule(
  id: number,
  constructionDate: string,
  constructionTime: string,
) {
  const issue = constructionScheduleError(constructionDate, constructionTime);

  if (issue) throw new Error(issue);

  return result(
    (
      await apiClient.post<Envelope<ConstructionScheduleResponse>>(
        `${path(id)}/schedule`,
        {
          constructionDate,
          constructionTime,
        },
      )
    ).data,
  );
}

export async function completeConstruction(
  constructionId: number,
  finalInstallationResult: string,
) {
  path(constructionId);
  const note = finalInstallationResult.trim();

  if (!note || note.length > 4000)
    throw new Error("최종 설치 결과를 1~4000자로 입력해 주세요.");

  return result(
    (
      await apiClient.post<Envelope<ConstructionCompletionResponse>>(root, {
        constructionId,
        finalInstallationResult: note,
      })
    ).data,
  );
}

export function validateConstructionPhotos(files: File[]) {
  if (!files.length) throw new Error("사진을 1장 이상 선택해 주세요.");
  if (files.some((file) => !file.size || file.size > 10 * 1024 ** 2))
    throw new Error(
      "사진은 파일당 0바이트 초과, 최대 10MiB까지 첨부할 수 있습니다.",
    );
  if (files.reduce((sum, file) => sum + file.size, 0) >= 80 * 1024 ** 2)
    throw new Error("요청 전체가 80MiB를 넘지 않도록 사진 용량을 줄여 주세요.");
  if (
    files.some(
      (file) =>
        !/\.(jpe?g|png)$/i.test(file.name) ||
        !["image/jpeg", "image/png"].includes(file.type),
    )
  )
    throw new Error("JPG·JPEG·PNG 사진만 첨부할 수 있습니다.");
}

export async function uploadConstructionPhotos(id: number, files: File[]) {
  const url = `${path(id)}/photos`;

  validateConstructionPhotos(files);
  const form = new FormData();

  files.forEach((file) => form.append("files", file));

  return result(
    (
      await apiClient.post<
        Envelope<{
          constructionId: number;
          photos: ConstructionPhotoResponse[];
        }>
      >(url, form, {
        headers: { "Content-Type": undefined },
        timeout: 60000,
      })
    ).data,
  );
}

export function constructionError(cause: unknown) {
  if (axios.isAxiosError(cause)) {
    if (!cause.response)
      return "서버에 연결하지 못했습니다. 잠시 후 다시 시도해 주세요.";
    const message: unknown = cause.response.data?.message;

    return typeof message === "string" && message.trim()
      ? message
      : "시공 요청에 실패했습니다.";
  }

  return cause instanceof Error ? cause.message : "시공 요청에 실패했습니다.";
}
