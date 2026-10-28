import type { SupportApplication, SupportStatus } from "./types";
const recommendations = ["출입구 물막이판", "배수구 배수상태 정비", "사전점검 및 대비 준비"];
function application(id: string, resident: string, status: SupportStatus, required: boolean, complete: boolean): SupportApplication {
  return {
    id, resident, status, phone: "010-****-" + id.slice(-4), district: "원미구",
    address: "○○길 12", housing: "반지하", ownership: "세입자",
    request: "출입구 물막이판", residentNote: "출입구 통행이 가능하도록 설치 위치를 확인해 주세요.",
    preferred: "2026.10.21 · 오전(9~12시)",
    documents: required ? ["지원 신청서.pdf", "임대인 동의서.pdf"] : ["지원 신청서.pdf"],
    vulnerabilities: ["출입구", "배수구"], recommendations: [...recommendations],
    inspectionSummary: "출입구가 낮고 배수구 주변에 이물질이 쌓여 있어 빗물 유입에 대비한 조치가 필요합니다.",
    inspectionPublished: true,
    review: {
      checks: complete ? [true, true, true] : [true, true, false],
      consentRequired: required ? "필요" : "불필요",
      consentState: required ? (complete ? "확인 완료" : "확인 중") : "불필요",
      scope: complete ? "출입구 물막이판 설치" : "", memo: "", notify: false,
    },
    rejectionReason: status === "미승인" ? "지원 검토 결과를 확인해 주세요." : "",
    reviewedAt: complete ? "2026-10-21T10:00:00+09:00" : "",
    constructionRegistered: status === "승인",
  };
}
export function createSupportFixtures(): SupportApplication[] {
  const first = [
    application("000002", "이○○", "검토 중", true, false),
    application("000010", "강○○", "검토 중", false, false),
    { ...application("000003", "박○○", "승인", true, true), address: "○○로 24" },
    { ...application("000004", "최○○", "미승인", false, true), address: "○○길 30", request: "배수시설 개선" },
    { ...application("000007", "한○○", "승인", true, true), address: "○○길 42" },
  ];
  const owner = application("000005", "정○○", "검토 중", false, false);
  owner.ownership = "소유자";
  owner.address = "○○로 48";
  owner.documents = [];
  owner.preferred = "2026.10.21 · 상관없음";
  owner.review = { checks: [false, false, false], consentRequired: "검토 필요", consentState: "미확인", scope: "", memo: "", notify: true };
  first.push(owner);
  // 관할 전체 통계(42/16/8/21)를 재현하는 Mock 신청. 첫 5행은 Figma와 동일합니다.
  for (let i = 0; i < 36; i++) {
    const status: SupportStatus = i < 13 ? "검토 중" : i < 32 ? "승인" : "미승인";
    const a = application(String(101 + i).padStart(6, "0"), ["김○○", "박○○", "최○○", "정○○"][i % 4], status, i < 7, status !== "검토 중");
    a.address = "○○로 " + (60 + i);
    a.district = ["원미구", "소사구", "오정구"][i % 3];
    first.push(a);
  }
  return first;
}
