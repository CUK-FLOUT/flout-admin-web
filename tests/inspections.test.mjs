import { createApiHarness } from "./helpers/createApiHarness.mjs";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { test } from "node:test";
import vm from "node:vm";
import ts from "typescript";
import axios from "axios";

const harness = createApiHarness;
const plain = (value) => JSON.parse(JSON.stringify(value));

test("nine API methods use inspection ID and exact request fields", async () => {
  const h = harness();
  const api = h.load("src/api/inspections.ts");
  await api.getInspections({
    status: "SCHEDULED",
    district: "원미구",
    inspectorUserId: 7,
    visitDate: "2026-11-08",
    keyword: "123",
    page: 2,
    size: 10,
  });
  await api.getInspection(91);
  await api.assignInspection(91, {
    visitDate: "2099-11-08",
    visitTime: "14:00",
    preVisitNotice: "안내",
  });
  await api.getInspectionResult(91);
  const body = {
    summary: "요약",
    vulnerabilities: [],
    recommendedActions: [],
    followUpType: "PUBLIC_AREA",
    internalMemo: "메모",
  };
  await api.saveInspectionDraft(91, body);
  await api.publishInspectionResult(91, body);
  const file = new File(["image"], "photo.jpg", { type: "image/jpeg" });
  await api.uploadInspectionPhotos(91, [file, file]);
  await api.deleteInspectionPhoto(91, 17);
  await api.createPublicIssue({
    inspectionId: 91,
    issueType: "REPEATED_FLOODING",
    description: "문제",
    fieldFindings: "현장",
  });
  assert.deepEqual(
    h.requests.map((r) => [r.method, r.url]),
    [
      ["get", "/api/admin/inspections"],
      ["get", "/api/admin/inspections/91"],
      ["post", "/api/admin/inspections/91/assignment"],
      ["get", "/api/admin/inspections/91/result"],
      ["put", "/api/admin/inspections/91/result/draft"],
      ["post", "/api/admin/inspections/91/result"],
      ["post", "/api/admin/inspections/91/attachments"],
      ["delete", "/api/admin/inspections/91/attachments/17"],
      ["post", "/api/admin/public-issues"],
    ],
  );
  assert.equal(h.requests[0].params.inspectorUserId, 7);
  assert.deepEqual(JSON.parse(h.requests[2].data), {
    visitDate: "2099-11-08",
    visitTime: "14:00",
    preVisitNotice: "안내",
  });
  assert.equal(h.requests[3].data, undefined);
  assert.deepEqual(JSON.parse(h.requests[4].data), body);
  assert.equal(h.requests[6].data.getAll("files").length, 2);
  assert.notEqual(
    h.requests[6].headers.get("Content-Type"),
    "application/json",
  );
});

test("search preserves AND filters, server page index and assignee ID", () => {
  const { inspectionSearch } = harness().load(
    "src/pages/Inspection/apiModel.ts",
  );
  assert.deepEqual(
    plain(
      inspectionSearch(
        new URLSearchParams(
          "stage=배정 대기&district=소사구&assignee=7&visit=2026-11-08&q=123&page=2",
        ),
      ),
    ),
    {
      status: "RECEIVED",
      district: "소사구",
      inspectorUserId: 7,
      visitDate: "2026-11-08",
      keyword: "123",
      page: 2,
      size: 10,
    },
  );
  assert.equal(
    inspectionSearch(new URLSearchParams("page=-2&assignee=김담당")).page,
    0,
  );
  assert.equal(
    inspectionSearch(new URLSearchParams("assignee=김담당")).inspectorUserId,
    undefined,
  );
});

test("list/detail distinguish application ID, receipt and inspection ID and null fields", () => {
  const { inspectionRow, inspectionDetail } = harness().load(
    "src/pages/Inspection/apiModel.ts",
  );
  const row = inspectionRow({
    inspectionId: 91,
    applicationId: 5,
    receiptNo: "000005",
    address: null,
    designated: true,
    preferredVisitDate: null,
    preferredTimeSlot: null,
    inspectorUserId: null,
    inspectorName: null,
    status: "COMPLETED",
  });
  assert.equal(row.inspectionId, 91);
  assert.equal(row.id, "000005");
  assert.equal(row.status, "완료");
  assert.equal(row.visitDate, "");
  assert.equal(row.resultPublished, false);
  const detail = inspectionDetail(
    {
      inspectionId: 91,
      applicationId: 5,
      receiptNo: "000005",
      applicantName: "주민",
      address: "부천",
      detailAddress: null,
      contact: "010",
      preferredVisitDate: null,
      preferredTimeSlot: null,
      inspectorId: null,
      inspectorName: null,
    },
    row,
  );
  assert.equal(detail.status, "완료");
  assert.equal(detail.address, "부천");
});

test("detail uses persisted assignment independently of resident preferences and list state", () => {
  const { inspectionRow, inspectionDetail } = harness().load("src/pages/Inspection/apiModel.ts");
  for (const [status, label] of [["SCHEDULED", "예정"], ["IN_PROGRESS", "진행"], ["COMPLETED", "완료"]]) {
    const row = inspectionRow({ inspectionId: 91, applicationId: 5, receiptNo: "000005", address: "부천", designated: false, preferredVisitDate: "2026-11-20", preferredTimeSlot: "MORNING", inspectorUserId: 7, inspectorName: "담당자", status });
    const response = { inspectionId: 91, applicationId: 5, receiptNo: "000005", applicantName: "주민", address: "부천", detailAddress: null, contact: "010", preferredVisitDate: "2026-11-20", preferredTimeSlot: "MORNING", inspectorId: 7, inspectorName: "담당자", visitDate: "2026-11-21", visitTime: "15:30", preVisitNotice: "저장된 방문 안내" };
    const detail = inspectionDetail(response, row);
    assert.equal(detail.status, label);
    assert.equal(detail.assignee, "담당자");
    assert.equal(detail.requestedDate, "2026-11-20");
    assert.equal(detail.visitDate, "2026-11-21");
    assert.equal(detail.visitTime, "15:30");
    assert.equal(detail.notice, "저장된 방문 안내");
    const empty = inspectionDetail({ ...response, visitDate: null, visitTime: null, preVisitNotice: null }, detail);
    assert.equal(empty.visitDate, "");
    assert.equal(empty.visitTime, "");
    assert.equal(empty.notice, "");
  }
});

test("assignment accepts received or scheduled state, future Korean time and one-time assignment", () => {
  const { validateAssignment } = harness().load(
    "src/pages/Inspection/apiModel.ts",
  );
  const base = {
    inspectorUserId: null,
    status: "예정",
    visitDate: "2099-11-08",
    visitTime: "14:00",
    notice: "방문 안내",
  };
  assert.equal(validateAssignment(base), "");
  assert.equal(validateAssignment({ ...base, status: "대기" }), "");
  assert.match(
    validateAssignment({ ...base, status: "진행" }),
    /접수 또는 예정/,
  );
  assert.match(
    validateAssignment({ ...base, inspectorUserId: 3 }),
    /이미 배정/,
  );
  assert.match(
    validateAssignment({ ...base, visitDate: "2000-01-01" }),
    /현재 이후/,
  );
  assert.match(validateAssignment({ ...base, notice: " " }), /입력/);
});

test("empty result contains no fixture data; payload maps independent actions and optional findings", () => {
  const { emptyResultContent, resultRequest, validateResult } = harness().load(
    "src/pages/InspectionResults/apiContent.ts",
  );
  const content = emptyResultContent();
  assert.equal(content.photos.length, 0);
  assert.equal(content.summary, "");
  assert.equal(validateResult(content, false), "");
  assert.notEqual(validateResult(content, true), "");
  content.selected = ["출입구", "배수구"];
  content.summary = "요약";
  content.memo = "";
  content.photos = [
    { id: "1", name: "현장.jpg", src: "https://example.com/1", category: null },
  ];
  content.details.출입구 = { title: "출입구", opinion: "의견", findings: "" };
  content.details.배수구 = { title: "배수구", opinion: "의견", findings: "" };
  content.actions = ["독립 조치"];
  content.route = "지역·공공";
  assert.equal(validateResult(content, true), "");
  const body = resultRequest(content);
  assert.equal(body.vulnerabilities.length, 2);
  assert.equal(body.vulnerabilities[1].type, "DRAIN");
  assert.equal(body.recommendedActions.length, 1);
  assert.equal(body.followUpType, "PUBLIC_AREA");
  assert.equal("photos" in body, false);
  assert.equal("notify" in body, false);
  content.details.출입구.title = "a".repeat(256);
  assert.match(validateResult(content, false), /255/);
});

test("API rejects unsuccessful envelopes and preserves server error messages", async () => {
  const h = harness();
  const api = h.load("src/api/inspections.ts");
  h.setResponse(() => null);
  await assert.rejects(api.getInspection(1), /응답/);
  const error = new axios.AxiosError(
    "conflict",
    "ERR_BAD_REQUEST",
    undefined,
    null,
    { status: 409, data: { message: "이미 배정된 점검입니다." } },
  );
  assert.equal(api.inspectionError(error), "이미 배정된 점검입니다.");
});

test("upload rejects empty, oversized and unsupported files before network", async () => {
  const h = harness();
  const api = h.load("src/api/inspections.ts");
  await assert.rejects(api.uploadInspectionPhotos(1, []));
  await assert.rejects(
    api.uploadInspectionPhotos(1, [
      new File(["x"], "a.gif", { type: "image/gif" }),
    ]),
  );
  await assert.rejects(
    api.uploadInspectionPhotos(1, [{ type: "image/jpeg", size: 10485761 }]),
  );
  await assert.rejects(
    api.uploadInspectionPhotos(
      1,
      Array(9).fill({ type: "image/jpeg", size: 10485760 }),
    ),
    /80MiB/,
  );
  assert.equal(h.requests.length, 0);
});

test("direct access locates status using inspection ID across server pages", async () => {
  const h = harness();
  h.setResponse((config) => {
    if (config.url.endsWith("/91"))
      return {
        inspectionId: 91,
        applicationId: 5,
        receiptNo: "000005",
        address: "부천",
        applicantName: "주민",
        inspectorId: null,
        contact: "010",
      };
    return {
      inspections: config.params.page
        ? [
            {
              inspectionId: 91,
              applicationId: 5,
              receiptNo: "000005",
              status: "IN_PROGRESS",
              inspectorName: null,
            },
          ]
        : [],
      totalPages: 2,
    };
  });
  const { loadInspection } = h.load("src/pages/Inspection/loadInspection.ts");
  const detail = await loadInspection(91);
  assert.equal(detail.status, "진행");
  assert.equal(h.requests.length, 3);
  assert.equal(h.requests[1].params.keyword, "000005");
});

test("direct access does not invent status when list cannot locate inspection", async () => {
  const h = harness();
  h.setResponse((config) =>
    config.url.endsWith("/91")
      ? { inspectionId: 91, receiptNo: "000005" }
      : { inspections: [], totalPages: 0 },
  );
  const { loadInspection } = h.load("src/pages/Inspection/loadInspection.ts");
  await assert.rejects(loadInspection(91), /현재 점검 상태/);
  await assert.rejects(loadInspection(-1), /점검 ID/);
});

test("requests carry cancellation signal and no mock fallback on HTTP failure", async () => {
  const h = harness();
  const api = h.load("src/api/inspections.ts");
  const controller = new AbortController();
  await api.getInspections({ page: 0 }, controller.signal);
  assert.equal(h.requests[0].signal, controller.signal);
  h.setResponse(() => {
    throw new Error("server unavailable");
  });
  await assert.rejects(api.getInspection(91), /server unavailable/);
});

test("inspection errors distinguish network failure from HTTP failure without a usable message", () => {
  const { inspectionError } = harness().load("src/api/inspections.ts");
  const network = new axios.AxiosError("Network Error", "ERR_NETWORK");
  assert.equal(
    inspectionError(network),
    "서버에 연결하지 못했습니다. 잠시 후 다시 시도해 주세요.",
  );
  for (const body of [
    undefined,
    null,
    "server error",
    {},
    { message: "" },
    { message: "  " },
    { message: 123 },
  ]) {
    const http = new axios.AxiosError(
      "Request failed",
      "ERR_BAD_RESPONSE",
      undefined,
      null,
      { status: 500, data: body },
    );
    assert.equal(
      inspectionError(http),
      "현장점검 요청에 실패했습니다. 다시 시도해 주세요.",
    );
  }
  const forbidden = new axios.AxiosError(
    "Forbidden",
    "ERR_BAD_REQUEST",
    undefined,
    null,
    {
      status: 403,
      data: { message: "본인 관할 지역의 점검만 조회할 수 있습니다." },
    },
  );
  assert.equal(
    inspectionError(forbidden),
    "본인 관할 지역의 점검만 조회할 수 있습니다.",
  );
  assert.equal(inspectionError(new Error("입력 오류")), "입력 오류");
  assert.equal(inspectionError(null), "요청을 처리하지 못했습니다.");
});

test("결과가 없는 정상 응답은 null이고 조회 실패는 빈 초안으로 대체하지 않는다", async () => {
  const h = harness();
  const api = h.load("src/api/inspections.ts");
  h.setResponse(() => null);
  assert.equal(await api.getInspectionResult(91), null);
  h.setResponse(() => {
    throw new Error("Forbidden");
  });
  await assert.rejects(api.getInspectionResult(91), /Forbidden/);
});

const savedResult = {
  inspectionId: 91,
  resultId: 7,
  resultStatus: "DRAFT",
  summary: "침수 위험",
  internalMemo: "내부 메모",
  vulnerabilities: [
    {
      type: "DRAIN",
      title: "배수구",
      expertOpinion: "정비 필요",
      fieldFindings: "이물질",
    },
  ],
  recommendedActions: [{ description: "청소" }],
  followUpType: "PUBLIC_AREA",
  photos: [
    {
      photoId: 17,
      fileName: "현장.jpg",
      url: "https://example.com/photo",
      size: 100,
      contentType: "image/jpeg",
    },
  ],
};

test("서버 결과의 순서·사진 ID·메모를 화면과 재저장 본문에 보존한다", () => {
  const { resultContent, resultRequest, validateResult } = harness().load(
    "src/pages/InspectionResults/apiContent.ts",
  );
  const content = resultContent(savedResult);
  assert.deepEqual(plain(content.selected), ["배수구"]);
  assert.equal(content.details.배수구.findings, "이물질");
  assert.equal(content.photos[0].id, "17");
  assert.equal(content.memo, "내부 메모");
  assert.deepEqual(plain(resultRequest(content)), {
    summary: savedResult.summary,
    vulnerabilities: savedResult.vulnerabilities,
    recommendedActions: savedResult.recommendedActions,
    followUpType: "PUBLIC_AREA",
    internalMemo: "내부 메모",
  });
  assert.equal(validateResult({ ...content, memo: "" }, true), "");
  assert.match(validateResult({ ...content, photos: [] }, true), /현장사진/);
  assert.equal(resultContent({ ...savedResult, followUpType: null }).route, "");
  const duplicate = resultContent({
    ...savedResult,
    vulnerabilities: [
      ...savedResult.vulnerabilities,
      { ...savedResult.vulnerabilities[0], title: "다른 배수구", fieldFindings: "별도 확인" },
    ],
  });
  assert.equal(duplicate.feedbackEntries.length, 2);
  assert.equal(duplicate.feedbackEntries[1].feedback.findings, "별도 확인");
  assert.deepEqual(plain(resultRequest(duplicate).vulnerabilities), [
    ...savedResult.vulnerabilities,
    { ...savedResult.vulnerabilities[0], title: "다른 배수구", fieldFindings: "별도 확인" },
  ]);
});

test("지역 문제의 한글 유형과 점검 ID를 실제 요청으로 변환하고 유효하지 않은 요청은 차단한다", async () => {
  const h = harness();
  const { publicIssueRequest } = h.load(
    "src/pages/InspectionResults/apiContent.ts",
  );
  const api = h.load("src/api/inspections.ts");
  const labels = {
    "반복 침수": "REPEATED_FLOODING",
    "하수 역류": "SEWAGE_BACKFLOW",
    "도로 배수 불량": "POOR_ROAD_DRAINAGE",
    "빗물받이 막힘": "BLOCKED_STORM_DRAIN",
  };
  for (const [kind, code] of Object.entries(labels)) {
    const body = publicIssueRequest(91, {
      location: " 부천시 ",
      kind,
      description: " 문제 ",
      findings: " 현장 ",
    });
    assert.equal(body.inspectionId, 91);
    assert.equal(body.issueType, code);
    assert.equal(body.address, "부천시");
    await api.createPublicIssue(body);
  }
  assert.equal(
    publicIssueRequest(91, {
      location: "",
      kind: "반복 침수",
      description: "문제",
      findings: "현장",
    }).address,
    undefined,
  );
  await assert.rejects(
    api.createPublicIssue({
      inspectionId: 91,
      issueType: "NO",
      description: "문제",
      fieldFindings: "현장",
    }),
    /유형/,
  );
  await assert.rejects(
    api.createPublicIssue({
      inspectionId: 91,
      issueType: "REPEATED_FLOODING",
      description: " ",
      fieldFindings: "현장",
    }),
    /문제 내용/,
  );
  await assert.rejects(api.deleteInspectionPhoto(91, NaN), /사진 ID/);
  assert.equal(h.requests.length, 4);
});

function editorHarness(overrides = {}) {
  const slots = [],
    effects = [],
    calls = [];
  let index = 0,
    generation = 1,
    params = new URLSearchParams();
  const api = {
    getInspectionResult: async () => savedResult,
    saveInspectionDraft: async () => ({ resultStatus: "DRAFT" }),
    publishInspectionResult: async () => ({ inspectionStatus: "COMPLETED" }),
    validateRecommendedFacilities: async () => ({ hasFacilities: true, facilities: ["물막이판"] }),
    uploadInspectionPhotos: async () => ({
      photos: [
        { photoId: 18, fileName: "추가.png", url: "https://example.com/18" },
      ],
    }),
    deleteInspectionPhoto: async () => ({ photoId: 17 }),
    createPublicIssue: async () => ({ publicIssueId: 2 }),
    inspectionError: (e) => e.message,
    ...overrides,
  };
  for (const name of Object.keys(api)) {
    if (name === "inspectionError") continue;
    const fn = api[name];
    api[name] = (...args) => {
      calls.push({ name, args });
      return fn(...args);
    };
  }
  const module = { exports: {} };
  const source = ts.transpileModule(
    readFileSync(
      "src/pages/InspectionResults/useInspectionResultEditor.ts",
      "utf8",
    ),
    {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2023,
      },
    },
  ).outputText;
  vm.runInNewContext(source, {
    module,
    exports: module.exports,
    AbortController,
    structuredClone,
    URLSearchParams,
    Error,
    require(name) {
      if (name === "react")
        return {
          useState(initial) {
            const i = index++;
            if (!(i in slots))
              slots[i] = typeof initial === "function" ? initial() : initial;
            return [
              slots[i],
              (v) => {
                slots[i] = typeof v === "function" ? v(slots[i]) : v;
              },
            ];
          },
          useRef(initial) {
            const i = index++;
            return (slots[i] ??= { current: initial });
          },
          useEffect(effect, deps) {
            const i = index++,
              old = slots[i];
            if (!old || deps.some((v, j) => v !== old.deps[j]))
              effects.push(() => {
                old?.cleanup?.();
                slots[i] = { deps, cleanup: effect() };
              });
          },
        };
      if (name === "react-router-dom")
        return {
          useSearchParams: () => [
            params,
            (p) => {
              params = p;
            },
          ],
        };
      if (name.endsWith("/session"))
        return { getSessionGeneration: () => generation };
      if (name.endsWith("/inspections")) return api;
      return harness().load(`src/pages/InspectionResults/${name.slice(2)}`);
    },
  });
  function render(inspectionId = 91) {
    index = 0;
    const result = module.exports.default({ inspectionId, status: "대기" });
    for (const effect of effects.splice(0)) effect();
    return result;
  }
  return {
    render,
    calls,
    params: () => params,
    remount: () => {
      for (const value of slots) value?.cleanup?.();
      slots.length = 0;
      effects.length = 0;
    },
    changeSession: () => {
      generation++;
    },
    unmount: () => {
      for (const value of slots) value?.cleanup?.();
    },
  };
}
const settle = () => new Promise(setImmediate);

test("초안 조회 후 사진 삭제·업로드·임시저장·공개는 서버 요청과 동기화된다", async () => {
  const h = editorHarness();
  assert.equal(h.render().busy, true);
  await settle();
  assert.equal(h.render().loaded, true);
  assert.equal(h.render().draft.photos.length, 1);
  await h.render().removePhoto("17");
  assert.equal(h.render().draft.photos.length, 0);
  await h
    .render()
    .upload({
      target: {
        files: [new File(["x"], "추가.png", { type: "image/png" })],
        value: "file",
      },
    });
  assert.equal(h.render().draft.photos[0].id, "18");
  await h.render().persist(false);
  assert.equal(h.params().get("dialog"), "draft-saved");
  await h.render().persist(true);
  assert.equal(h.params().get("dialog"), "published");
  assert.equal(h.render().readOnly, true);
  assert.equal(
    h.calls.some((c) => c.name === "changeInspectionStatus"),
    false,
  );
  assert.deepEqual(
    h.calls.filter((c) => c.name === "deleteInspectionPhoto")[0].args,
    [91, 17],
  );
});

test("조회 실패는 저장과 업로드를 막고 재시도로 정상 결과를 불러온다", async () => {
  let fail = true;
  const h = editorHarness({
    getInspectionResult: async () => {
      if (fail) throw new Error("조회 실패");
      return null;
    },
  });
  h.render();
  await settle();
  assert.equal(h.render().loaded, false);
  assert.equal(h.render().error, "조회 실패");
  await h.render().persist(false);
  assert.equal(h.calls.length, 1);
  fail = false;
  h.render().retry();
  h.render();
  await settle();
  assert.equal(h.render().loaded, true);
  assert.equal(h.render().draft.photos.length, 0);
});

test("공개본은 읽기 전용이며 삭제 실패 시 기존 사진을 유지한다", async () => {
  const published = editorHarness({
    getInspectionResult: async () => ({
      ...savedResult,
      resultStatus: "PUBLISHED",
    }),
  });
  published.render();
  await settle();
  assert.equal(published.render().readOnly, true);
  await published.render().removePhoto("17");
  await published.render().persist(false);
  assert.equal(published.calls.length, 1);
  const h = editorHarness({
    deleteInspectionPhoto: async () => {
      throw new Error("공개 사진은 삭제 불가");
    },
  });
  h.render();
  await settle();
  await h.render().removePhoto("17");
  assert.equal(h.render().draft.photos.length, 1);
  assert.match(h.render().error, /삭제 불가/);
});

test("등록 중 중복 요청과 닫기를 막고 서버 성공 시 기존 완료 모달을 연다", async () => {
  let resolve;
  const h = editorHarness({
    createPublicIssue: () =>
      new Promise((r) => {
        resolve = r;
      }),
  });
  h.render();
  await settle();
  h.render().setDialog("region");
  const issue = {
    location: "부천시",
    postcode: "",
    kind: "반복 침수",
    description: "문제",
    findings: "현장",
  };
  const pending = h.render().registerRegion(issue);
  assert.equal(await h.render().registerRegion(issue), false);
  h.render().setDialog(null);
  assert.equal(h.params().get("dialog"), "region");
  resolve({ publicIssueId: 2 });
  await pending;
  assert.equal(h.params().get("dialog"), "region-saved");
  assert.equal(h.calls.filter((c) => c.name === "createPublicIssue").length, 1);
});

test("화면 이탈 후 공개 응답은 완료 모달을 열지 않는다", async () => {
  let resolve;
  const h = editorHarness({
    publishInspectionResult: () =>
      new Promise((r) => {
        resolve = r;
      }),
  });
  h.render();
  await settle();
  const pending = h.render().persist(true);
  await settle();
  h.unmount();
  resolve({ inspectionStatus: "COMPLETED" });
  await pending;
  assert.equal(h.params().get("dialog"), null);
});

test("주소 검색은 ADMIN 클라이언트로 검색어와 1부터 시작하는 페이지를 전달하고 빈 페이지의 다음 이동 정보를 보존한다", async () => {
  const h = harness();
  const api = h.load("src/api/inspections.ts");
  const response = {
    addresses: [], currentPage: 2, countPerPage: 10, hasMore: true, nextPage: 3,
  };
  h.setResponse(() => response);
  const controller = new AbortController();
  assert.deepEqual(plain(await api.searchInspectionAddresses("  지봉로  ", 2, controller.signal)), response);
  assert.equal(h.requests[0].url, "/api/resident/addresses/search");
  assert.deepEqual(plain(h.requests[0].params), {keyword: "지봉로", currentPage: 2});
  assert.equal(h.requests[0].signal, controller.signal);
  await assert.rejects(api.searchInspectionAddresses(" "));
  await assert.rejects(api.searchInspectionAddresses("가".repeat(101)));
  await assert.rejects(api.searchInspectionAddresses("지봉로", 0));
  assert.equal(h.requests.length, 1);
  h.setResponse(() => ({
    ...response, addresses: [{roadAddress: "도로명", jibunAddress: "지번", buildingName: null, zipCode: "14662"}],
    currentPage: 3, hasMore: false, nextPage: null,
  }));
  const selected = await api.searchInspectionAddresses("지봉로", 3);
  assert.equal(selected.addresses[0].roadAddress, "도로명");
  assert.equal(selected.addresses[0].zipCode, "14662");
});

test("점검별 미저장 초안을 복원하고 저장·세션 변경 후에는 이전 초안을 적용하지 않는다", async () => {
  const h = editorHarness();
  h.render(91);
  await settle();
  h.render(91).update("summary", "미저장 91");
  h.remount();
  h.render(91);
  await settle();
  assert.equal(h.render(91).draft.summary, "미저장 91");
  h.render(92);
  await settle();
  h.render(92).update("summary", "미저장 92");
  h.render(91);
  await settle();
  assert.equal(h.render(91).draft.summary, "미저장 91");
  await h.render(91).persist(false);
  h.render(92);
  await settle();
  assert.equal(h.render(92).draft.summary, "미저장 92");
  h.render(91);
  await settle();
  assert.equal(h.render(91).draft.summary, savedResult.summary);
  h.changeSession();
  h.render(92);
  await settle();
  assert.equal(h.render(92).draft.summary, savedResult.summary);
});

test("같은 유형의 두 취약지점 편집이 다른 항목을 덮어쓰지 않는다", async () => {
  const h = editorHarness({getInspectionResult: async () => ({
    ...savedResult, vulnerabilities: [...savedResult.vulnerabilities,
      {...savedResult.vulnerabilities[0], title: "두번째 배수구"}],
  })});
  h.render();
  await settle();
  h.render().updateFeedback(1, {title: "두번째 수정", opinion: "별도 의견", findings: "별도 확인"});
  await h.render().persist(false);
  const request = h.calls.find(c => c.name === "saveInspectionDraft").args[1];
  assert.equal(request.vulnerabilities.length, 2);
  assert.equal(request.vulnerabilities[0].title, savedResult.vulnerabilities[0].title);
  assert.equal(request.vulnerabilities[1].title, "두번째 수정");
});

test("known inspection row avoids a failing list search when opening detail", async () => {
  const h = harness();
  h.setResponse((config) => {
    if (!config.url.endsWith("/91")) throw new Error("list search unavailable");
    return {
      inspectionId: 91, applicationId: 5, receiptNo: "000005",
      applicantName: "주민", address: "부천시", inspectorId: null,
    };
  });
  const { loadInspection } = h.load("src/pages/Inspection/loadInspection.ts");
  const result = await loadInspection(91, undefined, {
    inspectionId: 91, applicationId: 5, receiptNo: "000005",
    status: "IN_PROGRESS", inspectorName: null,
  });
  assert.equal(result.status, "진행");
  assert.equal(h.requests.length, 1);
  assert.equal(h.requests[0].url, "/api/admin/inspections/91");
});


test("result navigation round-trip preserves applied filters, page and selected inspection", () => {
  const { inspectionResultPath, inspectionManagementPath } = harness().load("src/pages/Inspection/resultNavigation.ts");
  const original = new URLSearchParams({
    stage: "진행", district: "원미구", assignee: "23", visit: "2026-11-13",
    q: "부천 & 101호", page: "2", selected: "91", dialog: "assignment-saved", target: "예정",
  });
  const result = new URL(inspectionResultPath(91, original), "https://example.com");
  assert.equal(result.pathname, "/inspection/91/results");
  result.searchParams.set("dialog", "actions");
  result.searchParams.set("addressQuery", "다른 주소");
  result.searchParams.set("mode", "edit");
  const back = new URL(inspectionManagementPath("91", result.searchParams), result.origin);
  assert.equal(back.pathname, "/inspection/91");
  for (const key of ["stage", "district", "assignee", "visit", "q", "page"])
    assert.equal(back.searchParams.get(key), original.get(key));
  for (const key of ["dialog", "target", "selected", "addressQuery", "mode"])
    assert.equal(back.searchParams.has(key), false);
  assert.equal(original.get("dialog"), "assignment-saved");
});

test("direct result entry returns to its inspection without relying on browser history", () => {
  const { inspectionManagementPath, inspectionResultPath } = harness().load("src/pages/Inspection/resultNavigation.ts");
  assert.equal(inspectionManagementPath("91", new URLSearchParams()), "/inspection/91");
  assert.equal(inspectionResultPath(91, new URLSearchParams()), "/inspection/91/results");
});

test("invalid inspection IDs and editor-only parameters safely fall back to the inspection list", () => {
  const { inspectionManagementPath, inspectionResultPath } = harness().load("src/pages/Inspection/resultNavigation.ts");
  const params = new URLSearchParams({ page: "2", returnTo: "https://evil.example", dialog: "published" });
  for (const id of [undefined, "https://evil.example", "//evil.example", "-1", "0", "NaN", "9007199254740992"])
    assert.equal(inspectionManagementPath(id, params), "/inspection?page=2");
  assert.equal(inspectionResultPath(undefined, params), "/inspection?page=2");
});

test("navigation blocks mutations but stays available during result loading and after failure", async () => {
  let reject;
  const h = editorHarness({ saveInspectionDraft: () => new Promise((_, no) => { reject = no; }) });
  assert.equal(h.render().saving, false);
  await settle();
  const pending = h.render().persist(false);
  assert.equal(h.render().saving, true);
  reject(new Error("저장 실패"));
  await pending;
  assert.equal(h.render().saving, false);
  assert.equal(h.render().error, "저장 실패");
});

test("시설 사전 검증은 기존 예방조치 원문만 전달하고 잘못된 입력·응답을 거부한다", async () => {
  const h = harness();
  const api = h.load("src/api/inspections.ts");
  const descriptions = ["출입구에 물막이판 설치를 권장합니다.", "배수구 주변을 정리해 주세요."];
  h.setResponse(() => ({ hasFacilities: true, facilities: ["출입구 물막이판"] }));
  assert.equal((await api.validateRecommendedFacilities(descriptions)).hasFacilities, true);
  assert.equal(h.requests[0].url, "/api/admin/inspections/recommended-facilities/validate");
  assert.equal(h.requests[0].method, "post");
  assert.deepEqual(JSON.parse(h.requests[0].data), { descriptions });
  for (const values of [[], [" "], ["x".repeat(4001)], Array(21).fill("내용")])
    await assert.rejects(api.validateRecommendedFacilities(values));
  assert.equal(h.requests.length, 1);
  h.setResponse(() => ({ hasFacilities: false, facilities: [] }));
  assert.equal((await api.validateRecommendedFacilities(descriptions)).hasFacilities, false);
  h.setResponse(() => ({ hasFacilities: true, facilities: [] }));
  await assert.rejects(api.validateRecommendedFacilities(descriptions), /검증 응답/);
});

test("시설이 없으면 공개를 멈추고 명시적으로 그대로 공개를 선택한 경우만 공개한다", async () => {
  const h = editorHarness({ validateRecommendedFacilities: async () => ({ hasFacilities: false, facilities: [] }) });
  h.render();
  await settle();
  const descriptions = [...h.render().draft.actions];
  await h.render().persist(true);
  assert.equal(h.render().facilityWarning, true);
  assert.equal(h.render().readOnly, false);
  assert.deepEqual(plain(h.calls.find(c => c.name === "validateRecommendedFacilities").args), [descriptions]);
  assert.equal(h.calls.some(c => c.name === "publishInspectionResult"), false);
  await h.render().confirmFacilityPublish();
  assert.equal(h.render().facilityWarning, false);
  assert.equal(h.render().readOnly, true);
  assert.equal(h.calls.filter(c => c.name === "publishInspectionResult").length, 1);
  assert.equal(h.calls.filter(c => c.name === "validateRecommendedFacilities").length, 1);
});

test("시설명 수정 후 공개할 때 재검증하며 경고 취소만으로 공개하지 않는다", async () => {
  let found = false;
  const h = editorHarness({ validateRecommendedFacilities: async () => ({ hasFacilities: found, facilities: found ? ["물막이판"] : [] }) });
  h.render();
  await settle();
  await h.render().persist(true);
  h.render().editFacilityActions();
  assert.equal(h.render().facilityWarning, false);
  assert.equal(h.params().get("dialog"), "actions");
  h.render().update("actions", ["출입구에 물막이판 설치"]);
  found = true;
  await h.render().persist(true);
  assert.equal(h.calls.filter(c => c.name === "validateRecommendedFacilities").length, 2);
  assert.equal(h.calls.filter(c => c.name === "publishInspectionResult").length, 1);
});

test("검증 실패는 미추출 경고로 바꾸지 않으며 임시 저장은 검증하지 않는다", async () => {
  const h = editorHarness({ validateRecommendedFacilities: async () => { throw new Error("검증 서버 연결 실패"); } });
  h.render();
  await settle();
  await h.render().persist(false);
  assert.equal(h.calls.some(c => c.name === "validateRecommendedFacilities"), false);
  await h.render().persist(true);
  assert.equal(h.render().facilityWarning, false);
  assert.match(h.render().error, /검증 서버 연결 실패/);
  assert.equal(h.calls.some(c => c.name === "publishInspectionResult"), false);
});

test("검증 중 중복 요청과 화면 이탈 후 공개를 차단한다", async () => {
  let resolve;
  const h = editorHarness({ validateRecommendedFacilities: () => new Promise(r => { resolve = r; }) });
  h.render();
  await settle();
  const pending = h.render().persist(true);
  await h.render().persist(true);
  assert.equal(h.calls.filter(c => c.name === "validateRecommendedFacilities").length, 1);
  h.unmount();
  resolve({ hasFacilities: true, facilities: ["물막이판"] });
  await pending;
  assert.equal(h.calls.some(c => c.name === "publishInspectionResult"), false);
});

test("경고 이후 입력이 바뀌면 이전 검증 결과로 공개하지 않는다", async () => {
  const h = editorHarness({ validateRecommendedFacilities: async () => ({ hasFacilities: false, facilities: [] }) });
  h.render();
  await settle();
  await h.render().persist(true);
  h.render().update("actions", ["변경된 예방조치"]);
  await h.render().confirmFacilityPublish();
  assert.equal(h.calls.some(c => c.name === "publishInspectionResult"), false);
  assert.match(h.render().error, /다시 검증/);
});
