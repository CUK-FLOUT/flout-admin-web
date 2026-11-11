import { readSupportApplications, consentLabel } from "../Support/model";
import { createConstructionFixtures, exampleCandidate } from "./mockData";
import { constructionStatuses } from "./types";
import type {
  ConstructionCandidate,
  ConstructionRecord,
  EditableConstructionStatus,
  InstallationDraft,
} from "./types";

export const constructionStorageKey = "flout-construction-management-v1";
export const displayDate = (value: string) =>
  value ? value.replaceAll("-", ".") : "미확정";
export function validDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(value + "T00:00:00Z");

  return (
    !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
  );
}

function isPhotos(value: unknown): value is InstallationDraft["photos"] {
  return (
    Array.isArray(value) &&
    value.every(
      (p) =>
        p &&
        typeof p.id === "string" &&
        p.id.length > 0 &&
        typeof p.name === "string" &&
        typeof p.src === "string" &&
        (p.src === "idb:" + p.id ||
          p.src.startsWith("/assets/") ||
          p.src.startsWith("/src/assets/")),
    ) &&
    new Set(value.map((p) => p.id)).size === value.length
  );
}

function isDraft(value: unknown): value is InstallationDraft {
  if (!value || typeof value !== "object") return false;
  const d = value as InstallationDraft;

  return (
    ["date", "time", "completionDate", "note"].every(
      (k) => typeof d[k as keyof InstallationDraft] === "string",
    ) &&
    typeof d.verified === "boolean" &&
    isPhotos(d.photos)
  );
}

export function readConstructionRecords(): ConstructionRecord[] {
  try {
    const raw = localStorage.getItem(constructionStorageKey);

    if (raw === null) return createConstructionFixtures();
    const data: unknown = JSON.parse(raw);

    if (
      !Array.isArray(data) ||
      !data.every(
        (a: ConstructionRecord) =>
          a &&
          typeof a.id === "string" &&
          /^\d{6}$/.test(a.id) &&
          [
            "resident",
            "address",
            "facility",
            "scope",
            "consent",
            "preferred",
            "date",
            "time",
          ].every(
            (k) => typeof a[k as keyof ConstructionRecord] === "string",
          ) &&
          constructionStatuses.includes(a.status) &&
          Number.isSafeInteger(a.revision) &&
          a.revision >= 0 &&
          isDraft(a.draft) &&
          (a.published === null ||
            (typeof a.published?.note === "string" &&
              typeof a.published.completionDate === "string" &&
              isPhotos(a.published.photos))),
      ) ||
      new Set(data.map((a) => a.id)).size !== data.length
    )
      return createConstructionFixtures();

    return data;
  } catch {
    return createConstructionFixtures();
  }
}

export function writeConstructionRecords(records: ConstructionRecord[]) {
  localStorage.setItem(constructionStorageKey, JSON.stringify(records));
}

export function constructionCandidates(
  records: ConstructionRecord[],
): ConstructionCandidate[] {
  const support = readSupportApplications().map((a) => ({
    id: a.id,
    resident: a.resident,
    address: a.address,
    facility: a.request,
    scope: a.review.scope || "담당자 검토 후 확정",
    consent: consentLabel(a),
    preferred: a.preferred,
    eligible:
      a.status === "승인" &&
      a.review.consentRequired !== "검토 필요" &&
      (a.review.consentRequired === "불필요" ||
        (a.review.consentState === "확인 완료" &&
          a.documents.some((d) => d.includes("동의")))),
  }));

  if (!support.some((a) => a.id === exampleCandidate.id))
    support.push({ ...exampleCandidate });

  return support.filter((a) => !records.some((r) => r.id === a.id));
}

export function enrollConstruction(
  records: ConstructionRecord[],
  id: string,
): ConstructionRecord[] {
  if (records.some((a) => a.id === id))
    throw new Error("이미 시공 대상으로 등록된 신청입니다.");
  const candidate = constructionCandidates(records).find((a) => a.id === id);

  if (!candidate?.eligible)
    throw new Error(
      "지원 승인과 필요한 동의 확인이 완료된 신청만 등록할 수 있습니다.",
    );
  const { eligible: _eligible, ...info } = candidate;

  void _eligible;
  const record: ConstructionRecord = {
    ...info,
    status: "일정 미등록",
    date: "",
    time: "",
    published: null,
    revision: 0,
    draft: {
      date: "",
      time: "",
      completionDate: "",
      note: "",
      photos: [],
      verified: false,
    },
  };

  return [record, ...records];
}

export function scheduleIssue(draft: InstallationDraft): string | null {
  if (!validDate(draft.date) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(draft.time))
    return "확정 시공일과 시간을 올바르게 입력해 주세요.";

  return null;
}

export function installationIssue(draft: InstallationDraft): string | null {
  if (!validDate(draft.completionDate)) return "설치 완료일을 입력해 주세요.";
  if (!draft.note.trim()) return "주민에게 공개할 설치 결과를 입력해 주세요.";
  if (!draft.photos.length) return "설치 완료 사진을 1개 이상 첨부해 주세요.";
  if (!draft.verified) return "설치 내용·사진 확인 완료 항목을 선택해 주세요.";

  return null;
}

function assertEditable(record: ConstructionRecord) {
  if (record.status === "전체 완료")
    throw new Error("전체 완료된 신청은 수정할 수 없습니다.");
}

export function assertCurrentRevision(
  record: ConstructionRecord,
  revision: number,
) {
  if (record.revision !== revision)
    throw new Error(
      "다른 창에서 시공 정보가 변경되었습니다. 새로고침 후 최신 정보를 확인해 주세요.",
    );
}

function next(
  record: ConstructionRecord,
  patch: Partial<ConstructionRecord>,
): ConstructionRecord {
  return { ...record, ...patch, revision: record.revision + 1 };
}

export function saveConstructionSchedule(
  record: ConstructionRecord,
  draft: InstallationDraft,
): ConstructionRecord {
  assertEditable(record);
  const issue = scheduleIssue(draft);

  if (issue) throw new Error(issue);

  return next(record, {
    date: draft.date,
    time: draft.time,
    status: record.status === "일정 미등록" ? "예정" : record.status,
    draft: { ...record.draft, date: draft.date, time: draft.time },
  });
}

export function saveInstallationDraft(
  record: ConstructionRecord,
  draft: InstallationDraft,
): ConstructionRecord {
  assertEditable(record);

  return next(record, {
    draft: { ...structuredClone(draft), date: record.date, time: record.time },
  });
}

export function sameInstallation(
  draft: InstallationDraft,
  record: ConstructionRecord,
): boolean {
  const result = record.published;

  return (
    !!result &&
    draft.note.trim() === result.note &&
    draft.completionDate === result.completionDate &&
    JSON.stringify(draft.photos) === JSON.stringify(result.photos)
  );
}

export function publishInstallation(
  record: ConstructionRecord,
  draft: InstallationDraft,
): ConstructionRecord {
  assertEditable(record);
  const issue = installationIssue(draft);

  if (issue) throw new Error(issue);
  if (!record.date || !record.time)
    throw new Error("배정·일정을 먼저 저장해 주세요.");
  const published = {
    note: draft.note.trim(),
    completionDate: draft.completionDate,
    photos: structuredClone(draft.photos),
  };

  return next(record, {
    status: "완료",
    published,
    draft: { ...structuredClone(draft), date: record.date, time: record.time },
  });
}

export function changeConstructionStatus(
  record: ConstructionRecord,
  status: EditableConstructionStatus,
): ConstructionRecord {
  assertEditable(record);
  if (!record.date || !record.time)
    throw new Error("배정·일정을 먼저 저장해 주세요.");
  if (status === "완료" && !record.published)
    throw new Error("설치 결과·완료 사진을 먼저 등록해 주세요.");

  return next(record, { status });
}

export function finishConstruction(
  record: ConstructionRecord,
  checked: boolean,
): ConstructionRecord {
  if (record.status !== "완료" || !record.published)
    throw new Error(
      "공개된 설치 결과가 있는 시공 완료 신청만 전체 완료할 수 있습니다.",
    );
  if (!checked)
    throw new Error("설치 결과·조치 내용 확인 항목을 선택해 주세요.");

  return next(record, { status: "전체 완료" });
}
