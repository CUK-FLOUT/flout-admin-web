export type PriorityRisk = "높음" | "주의" | "낮음";
export type PriorityApplication = {
  id: string;
  resident: string;
  address: string;
  district: string;
  risk: PriorityRisk;
  floodExperience: "있음" | "없음" | "모름";
  reason: string;
  nearby: number;
  designated: boolean;
  assigned: boolean;
  memo: string;
};

export const initialPriorityApplications: PriorityApplication[] = [
  [
    "000001",
    "김○○",
    "○○로 00",
    "중동",
    "높음",
    "있음",
    "최근 배수구 역류",
    3,
    true,
    false,
  ],
  [
    "000011",
    "이○○",
    "○○길 10",
    "상동",
    "주의",
    "있음",
    "미입력",
    2,
    true,
    false,
  ],
  [
    "000052",
    "박○○",
    "○○로 52",
    "원미동",
    "낮음",
    "모름",
    "미입력",
    1,
    true,
    true,
  ],
  [
    "000006",
    "윤○○",
    "○○길 60",
    "중동",
    "높음",
    "있음",
    "미입력",
    5,
    false,
    false,
  ],
  [
    "000034",
    "정○○",
    "○○로 34",
    "상동",
    "높음",
    "있음",
    "과거 침수 이력",
    4,
    false,
    false,
  ],
  [
    "000028",
    "최○○",
    "○○길 28",
    "중동",
    "주의",
    "없음",
    "배수 불량 의심",
    2,
    false,
    false,
  ],
  [
    "000039",
    "김○○",
    "○○로 39",
    "원미동",
    "주의",
    "모름",
    "장마철 침수 우려",
    1,
    false,
    false,
  ],
  [
    "000045",
    "이○○",
    "○○길 45",
    "중동",
    "낮음",
    "없음",
    "주변 지대 높음",
    0,
    false,
    false,
  ],
  [
    "000047",
    "박○○",
    "○○로 47",
    "상동",
    "낮음",
    "있음",
    "과거 작은 침수",
    0,
    false,
    false,
  ],
  [
    "000020",
    "정○○",
    "○○길 20",
    "원미동",
    "낮음",
    "없음",
    "배수구 점검 요청",
    1,
    false,
    false,
  ],
].map(
  ([
    id,
    resident,
    address,
    district,
    risk,
    floodExperience,
    reason,
    nearby,
    designated,
    assigned,
  ]) => ({
    id: String(id),
    resident: String(resident),
    address: String(address),
    district: String(district),
    risk: risk as PriorityRisk,
    floodExperience: floodExperience as PriorityApplication["floodExperience"],
    reason: String(reason),
    nearby: Number(nearby),
    designated: Boolean(designated),
    assigned: Boolean(assigned),
    memo: "출입구쪽 누수가 발견되어 조치 필요",
  }),
);

export const priorityStorageKey = "flout-priority-mock-v1";
export type PrioritySnapshot = {
  applications: PriorityApplication[];
  order: string[];
};
export function readPrioritySnapshot(): PrioritySnapshot {
  const fallback = {
    applications: initialPriorityApplications.map((a) => ({ ...a })),
    order: ["000001", "000011"],
  };

  try {
    const parsed: unknown = JSON.parse(
      localStorage.getItem(priorityStorageKey) || "null",
    );

    if (
      !parsed ||
      typeof parsed !== "object" ||
      !("applications" in parsed) ||
      !("order" in parsed)
    )
      return fallback;
    const { applications, order } = parsed as PrioritySnapshot;

    if (
      !Array.isArray(applications) ||
      applications.length !== 10 ||
      !Array.isArray(order)
    )
      return fallback;
    if (
      !applications.every(
        (a) =>
          initialPriorityApplications.some((base) => base.id === a.id) &&
          typeof a.designated === "boolean" &&
          typeof a.memo === "string",
      )
    )
      return fallback;

    return {
      applications: fallback.applications.map((base) => ({
        ...base,
        designated: applications.find((a) => a.id === base.id)!.designated,
        memo: applications.find((a) => a.id === base.id)!.memo,
      })),
      order: [
        ...new Set(
          order.filter(
            (id) =>
              typeof id === "string" &&
              applications.some(
                (a) => a.id === id && a.designated && !a.assigned,
              ),
          ),
        ),
      ],
    };
  } catch {
    return fallback;
  }
}
