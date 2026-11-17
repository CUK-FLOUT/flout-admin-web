export const statuses: Record<string, string> = {
  SUBMITTED: "검토 중",
  APPROVED: "승인",
  REJECTED: "미승인",
  PENDING: "일정 미등록",
  SCHEDULED: "예정",
  IN_PROGRESS: "진행",
  COMPLETED: "완료",
};
export const display = (value: string | null | undefined) => value || "미입력";
