import type { ResultRequest } from "../../api/inspections";
import type { Category, ResultContent } from "./types";

const vulnerabilityTypes = {
  출입구: "ENTRANCE",
  "창문·개구부": "WINDOW_OPENING",
  배수구: "DRAIN",
  "기타 구조": "OTHER_STRUCTURE",
} as const;

export function emptyResultContent(): ResultContent {
  return {
    selected: [],
    summary: "",
    details: Object.fromEntries(
      Object.keys(vulnerabilityTypes).map((category) => [
        category,
        { title: "", opinion: "", findings: "" },
      ]),
    ) as Record<Category, { title: string; opinion: string; findings: string }>,
    actions: [],
    route: "개별 주택",
    memo: "",
    photos: [],
    notify: false,
  };
}

export function resultRequest(content: ResultContent): ResultRequest {
  return {
    summary: content.summary,
    vulnerabilities: content.selected.map((category) => ({
      type: vulnerabilityTypes[category],
      title: content.details[category].title,
      expertOpinion: content.details[category].opinion,
      fieldFindings: content.details[category].findings,
    })),
    recommendedActions: content.actions.map((description) => ({ description })),
    followUpType:
      content.route === "개별 주택" ? "INDIVIDUAL_HOUSE" : "PUBLIC_AREA",
    internalMemo: content.memo,
  };
}

export function validateResult(
  content: ResultContent,
  publish: boolean,
): string {
  const body = resultRequest(content);

  if (body.vulnerabilities.length > 20 || body.recommendedActions.length > 20)
    return "취약지점과 예방조치는 각각 최대 20개입니다.";
  if (
    [
      body.summary,
      body.internalMemo,
      ...body.vulnerabilities.flatMap((v) => [
        v.expertOpinion,
        v.fieldFindings,
      ]),
      ...body.recommendedActions.map((a) => a.description),
    ].some((text) => text.length > 4000)
  )
    return "본문은 항목당 4000자 이하여야 합니다.";
  if (body.vulnerabilities.some((v) => v.title.length > 255))
    return "취약지점 제목은 255자 이하여야 합니다.";
  if (
    publish &&
    (!body.summary.trim() ||
      !body.internalMemo.trim() ||
      !body.vulnerabilities.length ||
      !body.recommendedActions.length ||
      body.vulnerabilities.some(
        (v) => !v.title.trim() || !v.expertOpinion.trim(),
      ) ||
      body.recommendedActions.some((a) => !a.description.trim()))
  )
    return "결과 요약·내부 메모·취약지점 제목과 전문가 의견·예방조치를 모두 입력해 주세요.";

  return "";
}
