import type { Application } from "./types";

export const initialApplications: Application[] = [
  ["000001", "○○로 00", "김○○", "높음", "접수", 207, 278, "중동"],
  ["000002", "○○길 12", "이○○", "주의", "지원 검토 중", 374, 325, "중동"],
  ["000003", "○○로 24", "박○○", "높음", "시공 진행", 258, 402, "원미동"],
  ["000004", "○○길 30", "최○○", "낮음", "지원 미승인", 483, 271, "상동"],
  ["000005", "○○로 48", "정○○", "주의", "점검 완료", 522, 426, "상동"],
  ["000006", "○○길 60", "윤○○", "높음", "접수", 421, 210, "중동"],
].map((row, i) => ({
  id: String(row[0]),
  number: i + 1,
  address: String(row[1]),
  resident: String(row[2]),
  risk: row[3] as Application["risk"],
  status: row[4] as Application["status"],
  district: String(row[7]),
  marker: {
    x: Number(row[5]),
    y: Number(row[6]),
    labelBefore: i === 3,
  },
  phone: "010-1234-1234",
  memo: "",
  history: ["주민 신청이 등록되었습니다."],
  visitDate: "2026.09.07",
  visitTime: "오전 9~12시",
  reason: "최근 배수구 역류가 있어 점검을 희망합니다.",
  houseType: "반지하",
  tenure: "세입자",
  inflow: "화장실·배수구",
  facilities: "기존 시설 없음",
  floodHistory: "침수 경험 있음",
}));

export const emptyFilters = {
  district: "",
  risk: "",
  status: "",
  search: "",
};
