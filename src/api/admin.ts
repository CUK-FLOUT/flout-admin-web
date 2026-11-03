import axios from "axios";
import { apiClient } from "./client";
import { getSession, getSessionGeneration } from "../auth/session";

export interface AdminProfile {
  name: string;
  jurisdiction: string | null;
}

let profileRequest: {
  generation: number;
  promise: Promise<AdminProfile>;
} | null = null;

export function getAdminProfile(): Promise<AdminProfile> {
  const generation = getSessionGeneration();

  if (!getSession()) return Promise.reject(new Error("로그인이 필요합니다."));
  if (profileRequest?.generation === generation) return profileRequest.promise;

  const promise = apiClient
    .get<{ isSuccess: boolean; message: string; result: AdminProfile | null }>(
      "/api/admin/me",
    )
    .then(({ data }) => {
      if (generation !== getSessionGeneration())
        throw new Error("인증 정보가 변경되었습니다.");
      if (data.isSuccess !== true)
        throw new Error(data.message || "계정 정보를 확인하지 못했습니다.");
      const result = data.result;

      if (
        !result ||
        typeof result.name !== "string" ||
        (result.jurisdiction !== null &&
          typeof result.jurisdiction !== "string")
      ) {
        throw new Error("계정 정보 응답이 올바르지 않습니다.");
      }

      return { name: result.name, jurisdiction: result.jurisdiction };
    })
    .catch((error: unknown) => {
      if (profileRequest?.promise === promise) profileRequest = null;
      if (axios.isAxiosError<{ message?: string }>(error)) {
        throw new Error(
          error.response?.data?.message ||
            "계정 정보를 확인하지 못했습니다. 잠시 후 다시 시도해 주세요.",
        );
      }

      throw error;
    });

  profileRequest = { generation, promise };

  return promise;
}
