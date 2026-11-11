import { infrastructureAssets as assets } from "./assets";
import type {
  InfrastructureIssue,
  RelatedResident,
  ReviewStatus,
} from "./types";

export const relatedResidents: RelatedResident[] = [
  {
    id: "000010",
    address: "○○길 ○○호",
    risk: "높음",
    findings: "골목 반복 침수 경험",
  },
  {
    id: "000011",
    address: "○○길 ○○호",
    risk: "주의",
    findings: "주변 배수 상태 확인",
  },
  {
    id: "000012",
    address: "○○길 ○○호",
    risk: "낮음",
    findings: "빗물받이 검토 필요",
  },
];
export function initialInfrastructureIssues(): InfrastructureIssue[] {
  const rows: {
    kind: string;
    count: number;
    history: number | null;
    status: ReviewStatus;
    x: number;
    y: number;
    district: string;
    labelBefore?: boolean;
  }[] = [
    {
      kind: "반복 침수",
      count: 3,
      history: 2,
      status: "검토 중",
      x: 207,
      y: 278,
      district: "원미구",
    },
    {
      kind: "하수 역류",
      count: 4,
      history: 3,
      status: "검토 중",
      x: 374,
      y: 326,
      district: "소사구",
    },
    {
      kind: "도로 배수 불량",
      count: 2,
      history: 1,
      status: "검토 대기",
      x: 258,
      y: 404,
      district: "원미구",
    },
    {
      kind: "빗물받이 막힘",
      count: 5,
      history: null,
      status: "검토 대기",
      x: 579,
      y: 272,
      district: "오정구",
      labelBefore: true,
    },
    {
      kind: "반복 침수",
      count: 1,
      history: 1,
      status: "조치 완료",
      x: 522,
      y: 428,
      district: "원미구",
    },
  ];

  return rows.map((row, i) => ({
    id: "region-" + String(i + 1).padStart(3, "0"),
    code: "지역-" + String(i + 1).padStart(3, "0"),
    number: i + 1,
    district: row.district,
    location:
      i === 0 ? "○○동 ○○로 ○○길" : row.district + " ○○로 " + (i + 1) * 12,
    kind: row.kind,
    description: "빗물받이 막힘 및 주변 도로 배수 상태 확인 필요",
    findings:
      "같은 골목에 배수구 덮개 주변에 이물질이 쌓여 있고, 역류방지 장치는 설치되어 있지 않아요.",
    source: "운영자 등록",
    history: row.history,
    related: Array.from({ length: row.count }, (_, j) => ({
      ...relatedResidents[j % 3],
      id: String(10 + i * 5 + j).padStart(6, "0"),
    })),
    referencePhotos: [
      { id: "reference-a-" + i, name: "현장사진 A", src: assets.drainPhoto },
      { id: "reference-b-" + i, name: "현장사진 B", src: assets.entrancePhoto },
      { id: "reference-c-" + i, name: "현장사진 C", src: assets.entrancePhoto },
    ],
    status: row.status,
    target: "빗물받이",
    requirements:
      "빗물받이 막힘 여부와 주변 도로배수 상태를 현장에서 확인할 필요가 있습니다.",
    action: {
      result: i === 4 ? "빗물받이 이물질 제거 및 배수 상태 확인 완료" : "",
      verified: i === 4,
      photos: [
        { id: "entrance-" + i, name: "출입구.jpg", src: assets.entrancePhoto },
        { id: "drain-" + i, name: "배수구.jpg", src: assets.drainPhoto },
      ],
    },
    marker: { x: row.x, y: row.y, labelBefore: row.labelBefore },
    revision: 0,
  }));
}
