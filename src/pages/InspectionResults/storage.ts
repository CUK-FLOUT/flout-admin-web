import { categories } from "./types";
import type {
  ResultContent,
  ResultRecord,
  ResultsState,
  RegionIssue,
} from "./types";

export const resultsStorageKey = "flout-inspection-results-v1";
function isContent(value: unknown): value is ResultContent {
  if (!value || typeof value !== "object") return false;
  const v = value as Partial<ResultContent>;

  return (
    Array.isArray(v.selected) &&
    v.selected.every((c) => categories.includes(c)) &&
    new Set(v.selected).size === v.selected.length &&
    typeof v.summary === "string" &&
    !!v.details &&
    categories.every((c) => {
      const d = v.details?.[c];

      return (
        d &&
        [d.title, d.opinion, d.findings].every((t) => typeof t === "string")
      );
    }) &&
    Array.isArray(v.actions) &&
    v.actions.every((t) => typeof t === "string") &&
    (v.route === "개별 주택" || v.route === "지역·공공") &&
    typeof v.memo === "string" &&
    typeof v.notify === "boolean" &&
    Array.isArray(v.photos) &&
    v.photos.every(
      (p) =>
        p &&
        typeof p.id === "string" &&
        typeof p.name === "string" &&
        typeof p.src === "string" &&
        (p.src === `idb:${p.id}` ||
          /^data:image\/(png|jpeg);base64,/.test(p.src) ||
          p.src.startsWith("/assets/") ||
          p.src.startsWith("/src/assets/")) &&
        (p.category === null || categories.includes(p.category)),
    )
  );
}

export function validatePublication(content: ResultContent): string | null {
  if (!content.selected.length) return "취약지점을 1개 이상 선택해 주세요.";
  if (!content.summary.trim()) return "결과 요약을 입력해 주세요.";
  for (const category of content.selected) {
    const d = content.details[category];

    if (![d.title, d.opinion, d.findings].every((t) => t.trim()))
      return `${category}의 제목, 전문가 의견, 현장 확인 내용을 모두 입력해 주세요.`;
  }

  if (!content.actions.some((t) => t.trim()))
    return "권장 예방조치를 1개 이상 입력해 주세요.";

  return null;
}

export function readResultsState(): ResultsState {
  const empty = { records: {}, issues: [] };

  try {
    const parsed: unknown = JSON.parse(
      localStorage.getItem(resultsStorageKey) || "null",
    );

    if (!parsed || typeof parsed !== "object") return empty;
    const state = parsed as Partial<ResultsState>;
    const records: Record<string, ResultRecord> = {};

    if (state.records && typeof state.records === "object")
      for (const [id, record] of Object.entries(state.records)) {
        if (
          /^\d{6}$/.test(id) &&
          record &&
          isContent(record.draft) &&
          (record.published === null ||
            (isContent(record.published) &&
              !validatePublication(record.published))) &&
          typeof record.savedAt === "string"
        )
          records[id] = record;
      }

    const issues = Array.isArray(state.issues)
      ? state.issues.filter(
          (issue: RegionIssue) =>
            issue &&
            typeof issue.id === "string" &&
            typeof issue.applicationId === "string" &&
            typeof issue.location === "string" &&
            typeof issue.postcode === "string" &&
            typeof issue.kind === "string" &&
            typeof issue.description === "string" &&
            typeof issue.findings === "string" &&
            issue.source === "전문가 현장점검" &&
            issue.status === "검토 대기",
        )
      : [];

    return { records, issues };
  } catch {
    return empty;
  }
}

export function readPublishedResultIds(): Set<string> {
  return new Set(
    Object.entries(readResultsState().records)
      .filter(([, record]) => record.published)
      .map(([id]) => id),
  );
}

export function writeResultsState(state: ResultsState) {
  localStorage.setItem(resultsStorageKey, JSON.stringify(state));
}
