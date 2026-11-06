import type {
  InspectionResult,
  PublicIssueRequest,
  ResultRequest,
} from "../../api/inspections";
import type { Category, RegionIssue, ResultContent } from "./types";

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

export function resultFeedbacks(content: ResultContent) {
  return content.feedbackEntries ?? content.selected.map((category) => ({
    category, feedback: content.details[category],
  }));
}

export function resultRequest(content: ResultContent): ResultRequest {
  return {
    summary: content.summary,
    vulnerabilities: resultFeedbacks(content).map(({ category, feedback }) => ({
      type: vulnerabilityTypes[category],
      title: feedback.title,
      expertOpinion: feedback.opinion,
      fieldFindings: feedback.findings,
    })),
    recommendedActions: content.actions.map((description) => ({ description })),
    followUpType:
      content.route === "개별 주택"
        ? "INDIVIDUAL_HOUSE"
        : content.route === "지역·공공"
          ? "PUBLIC_AREA"
          : null,
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
      !body.followUpType ||
      !content.photos.length ||
      !body.vulnerabilities.length ||
      !body.recommendedActions.length ||
      body.vulnerabilities.some(
        (v) => !v.title.trim() || !v.expertOpinion.trim(),
      ) ||
      body.recommendedActions.some((a) => !a.description.trim()))
  )
    return "결과 요약·취약지점 제목과 전문가 의견·예방조치·후속 처리 경로를 입력하고 현장사진을 1장 이상 등록해 주세요.";

  return "";
}

export function resultContent(result: InspectionResult | null): ResultContent {
  const content = emptyResultContent();

  if (!result) return content;
  content.summary = result.summary ?? "";
  content.memo = result.internalMemo ?? "";
  content.route =
    result.followUpType === "PUBLIC_AREA"
      ? "지역·공공"
      : result.followUpType === "INDIVIDUAL_HOUSE"
        ? "개별 주택"
        : "";
  for (const vulnerability of result.vulnerabilities ?? []) {
    const category = (Object.keys(vulnerabilityTypes) as Category[]).find(
      (key) => vulnerabilityTypes[key] === vulnerability.type,
    );

    if (!category)
      throw new Error(
        "지원하지 않는 취약지점 유형입니다. 서버 데이터를 확인해 주세요.",
      );
    const feedback = {
      title: vulnerability.title ?? "",
      opinion: vulnerability.expertOpinion ?? "",
      findings: vulnerability.fieldFindings ?? "",
    };

    if (!content.selected.includes(category)) {
      content.selected.push(category);
      content.details[category] = feedback;
    }

    (content.feedbackEntries ??= []).push({ category, feedback });
  }

  content.actions = (result.recommendedActions ?? []).map(
    (action) => action.description ?? "",
  );
  content.photos = (result.photos ?? []).map((photo) => ({
    id: String(photo.photoId),
    name: photo.fileName,
    src: photo.url,
    category: null,
  }));

  return content;
}

export function publicIssueRequest(
  inspectionId: number,
  issue: Pick<RegionIssue, "location" | "kind" | "description" | "findings">,
): PublicIssueRequest {
  const types = {
    "반복 침수": "REPEATED_FLOODING",
    "하수 역류": "SEWAGE_BACKFLOW",
    "도로 배수 불량": "POOR_ROAD_DRAINAGE",
    "빗물받이 막힘": "BLOCKED_STORM_DRAIN",
  } as const;
  const issueType = types[issue.kind as keyof typeof types];

  if (!issueType) throw new Error("문제 유형을 선택해 주세요.");

  return {
    inspectionId,
    ...(issue.location.trim() ? { address: issue.location.trim() } : {}),
    issueType,
    description: issue.description.trim(),
    fieldFindings: issue.findings.trim(),
  };
}
