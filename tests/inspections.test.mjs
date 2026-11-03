import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { test } from "node:test";
import vm from "node:vm";
import ts from "typescript";
import axios from "axios";

function harness() {
  const client = axios.create({
    headers: { "Content-Type": "application/json" },
  });
  const requests = [];
  let respond = () => ({});
  client.defaults.adapter = async (config) => {
    requests.push(config);
    return {
      data: { isSuccess: true, result: respond(config), message: "성공" },
      status: 200,
      statusText: "OK",
      headers: {},
      config,
    };
  };
  const modules = new Map();
  function load(path) {
    const file = resolve(path.endsWith(".ts") ? path : `${path}.ts`);
    if (modules.has(file)) return modules.get(file);
    const module = { exports: {} };
    const source = ts.transpileModule(readFileSync(file, "utf8"), {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2023,
        esModuleInterop: true,
      },
    }).outputText;
    const context = vm.createContext({
      module,
      exports: module.exports,
      FormData,
      AbortController,
      Date,
      Error,
      Number,
      Map,
      Object,
      Promise,
      structuredClone,
      require(specifier) {
        if (specifier === "axios") return axios;
        if (specifier === "./client") return { apiClient: client };
        return load(resolve(dirname(file), specifier));
      },
    });
    vm.runInContext(source, context);
    modules.set(file, module.exports);
    return module.exports;
  }
  return {
    load,
    requests,
    setResponse(fn) {
      respond = fn;
    },
  };
}
const plain = (value) => JSON.parse(JSON.stringify(value));

test("seven API methods use inspection ID and exact request fields", async () => {
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
  await api.changeInspectionStatus(91, "COMPLETED");
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
  assert.deepEqual(
    h.requests.map((r) => [r.method, r.url]),
    [
      ["get", "/api/admin/inspections"],
      ["get", "/api/admin/inspections/91"],
      ["post", "/api/admin/inspections/91/assignment"],
      ["patch", "/api/admin/inspections/91/status"],
      ["put", "/api/admin/inspections/91/result/draft"],
      ["post", "/api/admin/inspections/91/result"],
      ["post", "/api/admin/inspections/91/attachments"],
    ],
  );
  assert.equal(h.requests[0].params.inspectorUserId, 7);
  assert.deepEqual(JSON.parse(h.requests[2].data), {
    visitDate: "2099-11-08",
    visitTime: "14:00",
    preVisitNotice: "안내",
  });
  assert.deepEqual(JSON.parse(h.requests[3].data), { status: "COMPLETED" });
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

test("assignment requires scheduled state, future Korean time and one-time assignment", () => {
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
  assert.match(validateAssignment({ ...base, status: "대기" }), /예정/);
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
  content.memo = "내부메모";
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
