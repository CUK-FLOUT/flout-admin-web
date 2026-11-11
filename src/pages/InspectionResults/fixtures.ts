import entrance from "../../assets/gis/imgJpg.png";
import drain from "../../assets/gis/imgJpg1.png";
import type { ResultContent, ResultRecord } from "./types";

export const feedbackExamples = {
  출입구: {
    title: "낮은 출입구 높이",
    opinion:
      "출입구 하단이 주변 외부 바닥과 비교해 낮게 형성되어 있어 짧은 시간에 많은 비가 내릴 경우 빗물이 출입구 방향으로 유입될 가능성이 있는 상태로 확인됐어요",
    findings:
      "기존 차수시설은 설치되어 있지 않았으며,\n출입구 전면 공간에 별도의 유입 차단 구조가 없는 상태예요.",
  },
  "창문·개구부": {
    title: "창문 하단 높이 낮음",
    opinion:
      "반지하 창문 하단이 바깥 지면과 거의 같은 높이라 도로에 물이 차면 창문으로 유입될 수 있는 상태예요.",
    findings: "창문 앞에 차수판이나 턱이 없고, 창틀 실링이 일부 들떠 있어요.",
  },
  배수구: {
    title: "배수구 이물질 적체",
    opinion:
      "배수구 주변에 토사와 낙엽이 쌓여 있어 많은 비가 내릴 때 빗물이 빠지는 속도가 느려질 수 있는 상태로 확인됐어요.",
    findings:
      "배수구 덮개 주변에 이물질이 쌓여 있고, 역류방지 장치는 설치되어 있지 않아요.",
  },
  "기타 구조": { title: "", opinion: "", findings: "" },
};
export const publishedActions = [
  "출입구: 빗물 유입을 줄이는 물막이판 설치를 검토해요.",
  "배수구: 주변을 정리하고 막힘 여부와 배수 상태를 확인해요.",
  "사전점검 및 대피 준비: 호우 전 주변 위험과 대피 경로를 확인하고 필요한 준비물을 챙겨요.",
  "관련 취약지점: 창문·개구부의 창문 차수판 설치를 검토해요.",
];

export function createInitialRecord(published = false): ResultRecord {
  const content: ResultContent = {
    selected: published ? ["출입구", "창문·개구부", "배수구"] : ["출입구"],
    summary:
      "출입구가 낮고 배수구 주변에 이물질이 쌓여 있어 빗물 유입에 대비한 조치가 필요해요.",
    details: structuredClone(feedbackExamples),
    actions: published
      ? [...publishedActions]
      : ["출입구 물막이판 · 관련 취약지점: 출입구"],
    route: "개별 주택",
    memo: "지원사업의 대상·범위 확인 필요",
    notify: true,
    photos: [
      { id: "entrance", name: "출입구.jpg", src: entrance, category: "출입구" },
      ...(published
        ? [
            {
              id: "window",
              name: "창문·개구부.jpg",
              src: entrance,
              category: "창문·개구부" as const,
            },
            {
              id: "drain",
              name: "배수구.jpg",
              src: drain,
              category: "배수구" as const,
            },
          ]
        : []),
    ],
  };

  return {
    draft: content,
    published: published ? structuredClone(content) : null,
    savedAt: "",
  };
}

export const addressExamples = [
  {
    postcode: "14547",
    road: "경기도 부천시 원미구 길주로 210",
    lot: "중동 1156",
    building: "부천시청",
    keywords: ["부천시청"],
  },
  {
    postcode: "14548",
    road: "경기도 부천시 원미구 길주로 234",
    lot: "중동 1157",
    building: "업무시설",
    keywords: ["부천시청"],
  },
  {
    postcode: "14546",
    road: "경기도 부천시 원미구 길주로 180",
    lot: "중동 1161",
    building: "업무시설",
    keywords: ["부천시청"],
  },
];
