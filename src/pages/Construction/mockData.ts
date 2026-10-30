import completedPhoto from "../../assets/gis/imgJpg.png";
import type { ConstructionCandidate, ConstructionRecord, ConstructionStatus } from "./types";
function record(id: string, resident: string, address: string, status: ConstructionStatus): ConstructionRecord {
  const finished = status === "완료" || status === "전체 완료";
  const scheduled = status !== "일정 미등록";
  const photos = [{id: "example-" + id, name: "완료사진.jpg", src: completedPhoto}];
  const installation = {completionDate: finished ? "2026-10-21" : "", note: finished ? "출입구 물막이판 설치 · 개폐 및 통행 확인 완료" : "", photos};
  return {
    id, resident, address, facility: "출입구 물막이판", scope: "승인된 시설 설치",
    consent: "필요 · 확인 완료", preferred: "2026.10.21 · 오전(9~12시)", status,
    date: scheduled ? "2026-10-21" : "", time: scheduled ? "10:00" : "",
    draft: {date: scheduled ? "2026-10-21" : "", time: scheduled ? "10:00" : "", ...structuredClone(installation), verified: status === "전체 완료"},
    published: finished ? installation : null, revision: 0,
  };
}
export function createConstructionFixtures(): ConstructionRecord[] {
  return [
    record("000003", "박○○", "○○로 24", "진행"),
    record("000007", "한○○", "○○길 42", "예정"),
    record("000012", "전○○", "○○로 90", "예정"),
    record("000008", "홍○○", "○○로 84", "전체 완료"),
    record("000009", "신○○", "○○로 96", "완료"),
  ];
}
export const exampleCandidate: ConstructionCandidate = {
  id: "000013", resident: "임○○", address: "○○길 108", facility: "출입구 물막이판",
  scope: "승인된 시설 설치", consent: "불필요 · 자가 거주", preferred: "미입력",
  eligible: true,
};
