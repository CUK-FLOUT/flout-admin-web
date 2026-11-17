import type { ConstructionRecord, InstallationDraft } from "./types";

const installationNoteLimit = 4000;

export function savedConstructionScheduleError(
  record: ConstructionRecord,
  draft: InstallationDraft,
) {
  if (!record.date || !record.time) return "배정·일정을 먼저 저장해 주세요.";
  if (draft.date !== record.date || draft.time !== record.time)
    return "저장된 시공 일정과 입력값이 다릅니다. 최신 일정을 확인해 주세요.";

  return null;
}

export function constructionInstallationError(note: string) {
  const value = note.trim();

  return !value || value.length > installationNoteLimit
    ? "최종 설치 결과를 1~4000자로 입력해 주세요."
    : null;
}
