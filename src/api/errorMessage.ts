import axios from "axios";

type ErrorMessages = {
  request: string;
  unknown?: string;
  server?: string;
};

export function apiErrorMessage(
  error: unknown,
  messages: ErrorMessages,
): string {
  if (axios.isAxiosError(error)) {
    if (!error.response)
      return "서버에 연결하지 못했습니다. 잠시 후 다시 시도해 주세요.";
    // 공공인프라처럼 서버 오류의 내부 메시지를 숨기는 도메인 정책을 유지한다.
    if (messages.server && error.response.status >= 500) return messages.server;
    const data: unknown = error.response.data;
    const message =
      data && typeof data === "object" && "message" in data
        ? data.message
        : undefined;

    return typeof message === "string" && message.trim()
      ? message
      : messages.request;
  }

  return error instanceof Error
    ? error.message
    : (messages.unknown ?? messages.request);
}
