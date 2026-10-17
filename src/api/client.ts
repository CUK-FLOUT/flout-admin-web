import axios from "axios";
import { getAccessToken } from "../lib/authToken";

/**
 * 운영자 어드민 API 호출에 사용하는 공용 axios 인스턴스입니다.
 */
export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  timeout: 10000,
  headers: {
    "Content-Type": "application/json",
  },
});

apiClient.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
