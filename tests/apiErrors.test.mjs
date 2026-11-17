import assert from "node:assert/strict";
import test from "node:test";
import axios from "axios";
import { createApiHarness } from "./helpers/createApiHarness.mjs";

const cases = [
  [
    "constructions",
    "constructionError",
    "시공 요청에 실패했습니다.",
    "시공 요청에 실패했습니다.",
  ],
  [
    "supportApplications",
    "supportError",
    "지원 신청 요청에 실패했습니다.",
    "지원 신청 요청에 실패했습니다.",
  ],
  [
    "gisApplications",
    "gisError",
    "GIS 요청에 실패했습니다.",
    "GIS 요청을 처리하지 못했습니다.",
  ],
  [
    "priorityInspections",
    "priorityError",
    "우선점검 요청에 실패했습니다. 다시 시도해 주세요.",
    "요청을 처리하지 못했습니다.",
  ],
  [
    "inspections",
    "inspectionError",
    "현장점검 요청에 실패했습니다. 다시 시도해 주세요.",
    "요청을 처리하지 못했습니다.",
  ],
  [
    "publicIssues",
    "publicIssueError",
    "공공인프라 요청에 실패했습니다.",
    "공공인프라 요청에 실패했습니다.",
  ],
];
const responseError = (status, data) =>
  new axios.AxiosError("HTTP failure", null, null, null, { status, data });

for (const [file, name, fallback, unknown] of cases) {
  test(`${file}: 공통 오류 처리 후에도 도메인 문구와 서버 메시지 원문을 유지한다`, () => {
    const errorMessage = createApiHarness().load(`src/api/${file}.ts`)[name];
    assert.equal(errorMessage(new Error("입력 검증 실패")), "입력 검증 실패");
    assert.equal(errorMessage(null), unknown);
    assert.equal(errorMessage("알 수 없는 오류"), unknown);
    assert.equal(
      errorMessage(new axios.AxiosError("network")),
      "서버에 연결하지 못했습니다. 잠시 후 다시 시도해 주세요.",
    );
    // 도메인별 중복 검사를 모으되 HTTP 상태·빈 메시지 조합의 검증 범위는 유지한다.
    for (const status of [400, 401, 403, 404, 409, 413, 500]) {
      const serverFallback =
        file === "publicIssues" && status >= 500
          ? "공공인프라 요청을 처리하지 못했습니다. 잠시 후 다시 시도해 주세요."
          : null;
      for (const payload of [
        undefined,
        null,
        "text",
        3,
        [],
        {},
        { message: 7 },
        { message: "" },
        { message: "  " },
        { message: " \t " },
        { message: "\n\t" },
      ]) {
        assert.equal(
          errorMessage(responseError(status, payload)),
          serverFallback ?? fallback,
        );
      }
      for (const message of [
        "서버 안내",
        "  충돌 안내 원문  ",
        "본인 관할 지역의 점검만 조회할 수 있습니다.",
        "관할 권한 없음",
      ]) {
        assert.equal(
          errorMessage(responseError(status, { message })),
          serverFallback ?? message,
        );
      }
    }
  });
}
