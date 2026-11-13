import { loadPollingHook } from "./helpers/loadPollingHook.mjs";
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
        if (specifier.endsWith(".png")) return specifier;
        if (specifier === "../InspectionResults/storage")
          return { readResultsState: () => ({ records: {} }) };
        if (specifier === "./mockData")
          return { createSupportFixtures: () => [] };
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

const root = "/api/admin/support-applications";
const item = {
  supportApplicationId: 201,
  receiptNo: "000002",
  applicantName: "테스트",
  requestedFacility: null,
  landlordConsentStatus: "VERIFIED",
  status: "SUBMITTED",
};
test("목록은 백엔드가 지원하는 검색어와 서버 페이지 정보만 사용한다", async () => {
  const h = harness();
  const api = h.load("src/api/supportApplications.ts");
  h.setResponse(() => ({
    supportApplications: [item],
    page: 2,
    size: 5,
    totalElements: 32,
    totalPages: 7,
  }));
  const page = await api.getSupportApplications("  김  ", 2);
  assert.deepEqual(plain(h.requests[0].params), {
    keyword: "김",
    page: 2,
    size: 5,
  });
  assert.equal(page.totalElements, 32);
  assert.equal(page.totalPages, 7);
  assert.equal(page.supportApplications[0].supportApplicationId, 201);
});
test("통계·상세·검토는 각 경로와 실제 지원 신청 ID로 조회한다", async () => {
  const h = harness();
  const api = h.load("src/api/supportApplications.ts");
  h.setResponse(() => ({ totalCount: 42 }));
  await api.getSupportCounts();
  await api.getSupportDetail(201);
  await api.getSupportReview(201);
  assert.deepEqual(
    h.requests.map((r) => r.url),
    [root + "/status", root + "/201", root + "/201/histories"],
  );
  await assert.rejects(api.getSupportDetail(NaN));
  await assert.rejects(api.getSupportReview(-2));
  assert.equal(h.requests.length, 3);
});
test("승인과 미승인에는 명세 필드만 보내고 잘못된 입력은 요청하지 않는다", async () => {
  const h = harness();
  const api = h.load("src/api/supportApplications.ts");
  h.setResponse(() => ({ status: "APPROVED", supportApplicationId: 201 }));
  await api.approveSupport(201, "  물막이판 지원  ", [true, true, true]);
  assert.deepEqual(JSON.parse(h.requests[0].data), {
    supportScope: "물막이판 지원",
    applicantHousingReviewed: true,
    expertInspectionReviewed: true,
    eligibilityDocumentsReviewed: true,
  });
  await api.rejectSupport(201, "  대상 아님  ");
  assert.deepEqual(JSON.parse(h.requests[1].data), { reason: "대상 아님" });
  await assert.rejects(api.approveSupport(201, "범위", [true, false, true]));
  await assert.rejects(
    api.approveSupport(201, "x".repeat(501), [true, true, true]),
  );
  await assert.rejects(api.rejectSupport(201, " "));
  await assert.rejects(api.rejectSupport(201, "x".repeat(501)));
  assert.equal(h.requests.length, 2);
});
test("네트워크 오류와 서버 거절 메시지를 구분한다", () => {
  const h = harness();
  const api = h.load("src/api/supportApplications.ts");
  assert.match(api.supportError({ isAxiosError: true }), /연결/);
  for (const status of [400, 401, 403, 409, 500])
    assert.equal(
      api.supportError({
        isAxiosError: true,
        response: { status, data: { message: "서버 안내" } },
      }),
      "서버 안내",
    );
  assert.match(
    api.supportError({ isAxiosError: true, response: { status: 500 } }),
    /요청에 실패/,
  );
});
test("접수번호와 지원 신청 ID를 구분하고 null·사업 정보·동의 상태를 매핑한다", () => {
  const h = harness();
  const { mapSupportDetail } = h.load("src/pages/Support/apiMapping.ts");
  const detail = {
    ...item,
    contact: null,
    address: "부천시",
    detailAddress: "101호",
    housingType: null,
    occupancyType: "TENANT",
    recommendedActions: ["배수구 정비"],
    residentRequest: null,
    preferredConstructionDate: null,
    preferredTimeSlot: null,
    inspectionResultPublished: true,
    attachments: [
      { originalName: "동의.pdf", fileUrl: "https://example.test/file" },
    ],
  };
  const a = mapSupportDetail(detail, {
    vulnerabilityTypes: ["출입구"],
    recommendedActions: ["물막이판"],
    supportScope: "설치 지원",
    program: { name: "침수 예방", targetDescription: "관내 주택" },
  });
  assert.equal(a.id, "000002");
  assert.equal(a.apiId, 201);
  assert.equal(a.phone, "미입력");
  assert.equal(a.address, "부천시 101호");
  assert.equal(a.housing, "미입력");
  assert.equal(a.review.consentState, "확인 완료");
  assert.equal(a.review.scope, "설치 지원");
  assert.equal(a.programName, "침수 예방");
  assert.deepEqual(plain(a.vulnerabilities), ["출입구"]);
  const unsafe = mapSupportDetail({
    ...detail,
    attachments: [{ originalName: "파일", fileUrl: "javascript:alert(1)" }],
  });
  assert.equal(unsafe.attachmentUrls["attachment-0"], "");
});
test("현행 서버 지원 상태를 검토 중·승인·미승인으로 표시한다", () => {
  const h = harness();
  const { mapSupport } = h.load("src/pages/Support/apiMapping.ts");
  for (const [status, label] of [
    ["SUBMITTED", "검토 중"],
    ["APPROVED", "승인"],
    ["REJECTED", "미승인"],
  ]) {
    assert.equal(mapSupport({ ...item, status }).status, label);
  }
});

function reviewHarness(overrides = {}) {
  const cleanups = [];
  let index = 0;
  const slots = [];
  let params = new URLSearchParams("dialog=approve");
  const api = {
    approveSupport: async () => ({ status: "APPROVED" }),
    rejectSupport: async () => ({ status: "REJECTED" }),
    supportError: (e) => e.message,
    ...overrides,
  };
  const initial = {
    id: "000002",
    apiId: 201,
    serverStatus: "SUBMITTED",
    reviewLoaded: true,
    status: "검토 중",
    resident: "테스트",
    address: "부천시",
    ownership: "소유자",
    review: {
      checks: [true, true, true],
      scope: "물막이판",
      memo: "",
      notify: false,
    },
  };
  const module = { exports: {} };
  const jsx = (type, props) => ({ type, props: props || {} });
  const source = ts.transpileModule(
    readFileSync("src/pages/Support/SupportReview.tsx", "utf8"),
    {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        jsx: ts.JsxEmit.ReactJSX,
        target: ts.ScriptTarget.ES2023,
      },
    },
  ).outputText;
  vm.runInNewContext(
    source + "\nmodule.exports.screen = SupportReviewScreen;",
    {
      module,
      exports: module.exports,
      structuredClone,
      URLSearchParams,
      require(name) {
        if (name === "react/jsx-runtime") return { jsx, jsxs: jsx };
        if (name === "react")
          return {
            useState(value) {
              const i = index++;
              if (!(i in slots))
                slots[i] = typeof value === "function" ? value() : value;
              return [
                slots[i],
                (value) => {
                  slots[i] =
                    typeof value === "function" ? value(slots[i]) : value;
                },
              ];
            },
            useEffect(effect) {
              const i = index++;
              if (!(i in slots)) {
                slots[i] = true;
                cleanups.push(effect());
              }
            },
            useRef(value) {
              const i = index++;
              return (slots[i] ??= { current: value });
            },
          };
        if (name === "react-router-dom")
          return {
            Link: "Link",
            useParams: () => ({ requestId: "201" }),
            useSearchParams: () => [
              params,
              (p) => {
                params = p;
              },
            ],
          };
        if (name.endsWith("/supportApplications")) return api;
        if (name === "./model") return { approvalIssue: () => null };
        return {
          __esModule: true,
          default: name,
          supportSecondary: "",
          supportFocus: "",
        };
      },
    },
  );
  const nodes = (tree) => {
    if (!tree || typeof tree !== "object") return [];
    return [tree, ...[tree.props?.children].flat(Infinity).flatMap(nodes)];
  };
  function render() {
    index = 0;
    return nodes(module.exports.screen({ initial }));
  }
  return {
    render,
    dialog: () =>
      render().find((n) => String(n.type).endsWith("/SupportDialogs")),
    params: () => params,
    unmount: () => cleanups.forEach((cleanup) => cleanup?.()),
  };
}
test("승인 연속 클릭은 한 요청만 보내고 저장 중 닫기를 막으며 서버 성공 후 완료 모달을 연다", async () => {
  let resolve,
    calls = 0;
  const h = reviewHarness({
    approveSupport: () => {
      calls++;
      return new Promise((r) => {
        resolve = r;
      });
    },
  });
  const dialog = h.dialog();
  const flight = dialog.props.onConfirm();
  await dialog.props.onConfirm();
  assert.equal(calls, 1);
  h.dialog().props.onClose();
  assert.equal(h.params().get("dialog"), "approve");
  resolve({ status: "APPROVED" });
  await flight;
  assert.equal(h.dialog().props.kind, "approved");
  assert.equal(h.dialog().props.application.serverStatus, "APPROVED");
});
test("승인 실패는 완료 상태로 바꾸지 않고 서버 오류를 표시한다", async () => {
  const h = reviewHarness({
    approveSupport: async () => {
      throw new Error("미승인");
    },
  });
  await h.dialog().props.onConfirm();
  const dialog = h.dialog();
  assert.equal(dialog.props.kind, "approve");
  assert.equal(dialog.props.application.serverStatus, "SUBMITTED");
  assert.equal(dialog.props.error, "미승인");
  assert.equal(dialog.props.busy, false);
});

test("취약지점 enum 네 종류를 한글로 표시하며 이미 한글인 값은 유지한다", () => {
  const h = harness();
  const { mapSupportDetail } = h.load("src/pages/Support/apiMapping.ts");
  const a = mapSupportDetail(
    { ...item, attachments: [] },
    {
      vulnerabilityTypes: [
        "ENTRANCE",
        "WINDOW_OPENING",
        "DRAIN",
        "OTHER_STRUCTURE",
        "출입구",
      ],
      landlordConsentRequired: true,
    },
  );
  assert.deepEqual(plain(a.vulnerabilities), [
    "출입구",
    "창문/개구부",
    "배수구",
    "기타 구조",
    "출입구",
  ]);
});

test("동의 필요 여부는 상세의 동의 상태가 아니라 검토 응답의 boolean을 따른다", () => {
  const h = harness();
  const { mapSupportDetail } = h.load("src/pages/Support/apiMapping.ts");
  const review = { vulnerabilityTypes: [], landlordConsentRequired: false };
  assert.equal(
    mapSupportDetail(
      { ...item, landlordConsentStatus: "PENDING", attachments: [] },
      review,
    ).review.consentRequired,
    "불필요",
  );
  assert.equal(
    mapSupportDetail(
      { ...item, landlordConsentStatus: "NOT_REQUIRED", attachments: [] },
      { ...review, landlordConsentRequired: true },
    ).review.consentRequired,
    "필요",
  );
});

test("API 신청은 동의 확인 상태와 파일명으로 승인 요청을 막지 않고 서버가 최종 검증한다", () => {
  const h = harness();
  const { mapSupport } = h.load("src/pages/Support/apiMapping.ts");
  const { approvalIssue } = h.load("src/pages/Support/model.ts");
  const a = {
    ...mapSupport({ ...item, landlordConsentStatus: "PENDING" }),
    inspectionPublished: true,
    reviewLoaded: true,
  };
  const draft = {
    ...a.review,
    checks: [true, true, true],
    scope: "물막이판 설치",
  };
  assert.equal(approvalIssue(a, draft), null);
  assert.match(
    approvalIssue(a, { ...draft, checks: [true, false, true] }),
    /모두 확인/,
  );
  assert.match(approvalIssue(a, { ...draft, scope: " " }), /지원 범위/);
  assert.match(
    approvalIssue({ ...a, serverStatus: "APPROVED" }, draft),
    /현재 상태/,
  );
});

test("기존 Mock 신청의 동의 검증은 그대로 유지한다", () => {
  const h = harness();
  const { mapSupport } = h.load("src/pages/Support/apiMapping.ts");
  const { approvalIssue } = h.load("src/pages/Support/model.ts");
  const a = {
    ...mapSupport({ ...item, landlordConsentStatus: "PENDING" }),
    apiId: undefined,
    inspectionPublished: true,
    reviewLoaded: true,
  };
  assert.match(
    approvalIssue(a, {
      ...a.review,
      checks: [true, true, true],
      scope: "설치",
    }),
    /동의 자료/,
  );
});

test("한국어 필터를 서버 코드로 변환해 검색·페이지와 함께 전달한다", async () => {
  const h = harness();
  const { supportSearchFilters } = h.load("src/pages/Support/apiMapping.ts");
  const api = h.load("src/api/supportApplications.ts");
  h.setResponse(() => ({
    supportApplications: [],
    page: 1,
    size: 5,
    totalElements: 12,
    totalPages: 3,
  }));
  const filters = supportSearchFilters({
    district: "원미구",
    status: "검토 중",
    consent: "필요 · 확인 완료",
    q: "김",
  });
  const controller = new AbortController();
  const page = await api.getSupportApplications(
    " 김 ",
    1,
    filters,
    controller.signal,
  );
  assert.deepEqual(plain(h.requests[0].params), {
    keyword: "김",
    page: 1,
    size: 5,
    district: "원미구",
    status: "REVIEWING",
    landlordConsentStatus: "VERIFIED",
  });
  assert.equal(h.requests[0].signal, controller.signal);
  assert.equal(page.totalElements, 12);
  assert.equal(page.totalPages, 3);
});

test("필터 초기화는 선택 조건을 요청에서 제외하고 모든 실제 옵션을 매핑한다", async () => {
  const h = harness();
  const { supportSearchFilters } = h.load("src/pages/Support/apiMapping.ts");
  const api = h.load("src/api/supportApplications.ts");
  const base = { district: "", status: "", consent: "", q: "" };
  assert.deepEqual(plain(supportSearchFilters(base)), {});
  for (const [status, code] of [
    ["검토 중", "REVIEWING"],
    ["승인", "APPROVED"],
    ["미승인", "REJECTED"],
  ])
    assert.equal(supportSearchFilters({ ...base, status }).status, code);
  for (const [consent, code] of [
    ["불필요", "NOT_REQUIRED"],
    ["필요 · 확인 중", "PENDING"],
    ["필요 · 확인 완료", "VERIFIED"],
  ])
    assert.equal(
      supportSearchFilters({ ...base, consent }).landlordConsentStatus,
      code,
    );
  for (const district of ["원미구", "소사구", "오정구"])
    assert.equal(
      supportSearchFilters({ ...base, district }).district,
      district,
    );
  assert.deepEqual(
    plain(
      supportSearchFilters({
        ...base,
        district: "알수없음",
        status: "toString",
        consent: "필요 · 자료 요청",
      }),
    ),
    {},
  );
  h.setResponse(() => ({
    supportApplications: [],
    page: 0,
    size: 5,
    totalElements: 0,
    totalPages: 0,
  }));
  await api.getSupportApplications("", 0, supportSearchFilters(base));
  assert.deepEqual(plain(h.requests[0].params), {
    keyword: "",
    page: 0,
    size: 5,
  });
});

test("상세·검토 응답의 거주층을 한글로 표시하며 미입력을 반지하로 추정하지 않는다", () => {
  const h = harness();
  const { mapSupportDetail } = h.load("src/pages/Support/apiMapping.ts");
  const detail = {
    ...item,
    attachments: [],
    address: "부천시",
    detailAddress: "지하 1층",
    housingType: null,
  };
  for (const [housingType, label] of [
    ["SEMI_BASEMENT", "반지하/지하"],
    ["FIRST_FLOOR", "1층"],
    ["SECOND_FLOOR_OR_ABOVE", "2층 이상"],
  ]) {
    assert.equal(mapSupportDetail({ ...detail, housingType }).housing, label);
    assert.equal(
      mapSupportDetail(detail, {
        housingType,
        vulnerabilityTypes: [],
        landlordConsentRequired: true,
      }).housing,
      label,
    );
  }
  assert.equal(mapSupportDetail(detail).housing, "미입력");
  assert.equal(
    mapSupportDetail({ ...detail, housingType: "UNKNOWN" }).housing,
    "미입력",
  );
  assert.equal(
    mapSupportDetail(
      { ...detail, housingType: "FIRST_FLOOR" },
      {
        housingType: null,
        vulnerabilityTypes: [],
        landlordConsentRequired: true,
      },
    ).housing,
    "미입력",
  );
});

function listHookHarness(countsPromise, recordApi = {}) {
  const slots = [],
    pending = [],
    reads = [];
  let index = 0;
  const module = { exports: {} };
  const api = {
    getSupportApplications(keyword, page, filters, signal) {
      return new Promise((resolve) =>
        reads.push({ keyword, page, filters, signal, resolve }),
      );
    },
    ...recordApi,
    getSupportCounts: () =>
      countsPromise ?? Promise.resolve({ totalCount: 42 }),
    supportError: (e) => e.message,
  };
  const source = ts.transpileModule(
    readFileSync("src/pages/Support/useSupportApi.ts", "utf8"),
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
    Promise,
    require: function require(name) {
      if (name.endsWith("/usePagePolling"))
        return loadPollingHook(require("react"));
      if (name === "react")
        return {
          useState(initial) {
            const i = index++;
            if (!(i in slots)) slots[i] = initial;
            return [
              slots[i],
              (v) => {
                slots[i] = typeof v === "function" ? v(slots[i]) : v;
              },
            ];
          },
          useEffect(effect, deps) {
            const i = index++;
            const previous = slots[i];
            if (!previous || deps.some((v, j) => v !== previous.deps[j])) {
              pending.push(() => {
                previous?.cleanup?.();
                slots[i] = { deps, cleanup: effect() };
              });
            }
          },
        };
      if (name.endsWith("/supportApplications")) return api;
      return harness().load("src/pages/Support/apiMapping.ts");
    },
  });
  function render(filters = {}, page = 0, revision = 0) {
    index = 0;
    const result = module.exports.useSupportList("김", page, revision, filters);
    for (const effect of pending.splice(0)) effect();
    return result;
  }
  return {
    render,
    reads,
    record(id) {
      index = 0;
      const result = module.exports.useSupportRecord(id, true);
      for (const effect of pending.splice(0)) effect();
      return result;
    },
  };
}
test("필터·페이지 변경은 서버 재조회로 이어지고 이전 응답이 최신 결과를 덮어쓰지 않는다", async () => {
  const h = listHookHarness();
  h.render({ district: "원미구" });
  h.reads[0].resolve({
    supportApplications: [item],
    totalElements: 30,
    totalPages: 6,
  });
  await new Promise(setImmediate);
  assert.equal(h.render({ district: "원미구" }).page.totalElements, 30);
  assert.equal(
    h.render({ district: "소사구", status: "APPROVED" }, 1).loading,
    true,
  );
  // The first request already settled; the still-pending request below must be cancelled.
  assert.equal(h.reads.length, 2);
  assert.equal(h.reads[1].page, 1);
  assert.deepEqual(plain(h.reads[1].filters), {
    district: "소사구",
    status: "APPROVED",
  });
  h.render({}, 0);
  assert.equal(h.reads[1].signal.aborted, true);
  h.reads[2].resolve({
    supportApplications: [],
    totalElements: 0,
    totalPages: 0,
  });
  h.reads[1].resolve({
    supportApplications: [item],
    totalElements: 100,
    totalPages: 20,
  });
  await new Promise(setImmediate);
  assert.equal(h.render().page.totalElements, 0);
  assert.equal(h.render().counts.totalCount, 42);
});

test("공백 오류 메시지는 기본 문구를 사용하고 유효한 원문은 보존한다", () => {
  const { supportError } = harness().load("src/api/supportApplications.ts");
  for (const message of ["", "  ", "\n\t"]) {
    assert.equal(
      supportError({ isAxiosError: true, response: { data: { message } } }),
      "지원 신청 요청에 실패했습니다.",
    );
  }
  assert.equal(
    supportError({
      isAxiosError: true,
      response: { data: { message: " 원문 " } },
    }),
    " 원문 ",
  );
});

test("거주 형태와 동의 검토 매핑은 미입력과 모순된 상태를 구분한다", () => {
  const { mapSupportDetail } = harness().load(
    "src/pages/Support/apiMapping.ts",
  );
  for (const [occupancyType, expected] of [
    ["OWNER", "소유자"],
    ["TENANT", "세입자"],
    ["ETC", "기타"],
    [null, "미입력"],
    ["OTHER", "미입력"],
  ]) {
    assert.equal(
      mapSupportDetail({ ...item, occupancyType, attachments: [] }).ownership,
      expected,
    );
  }
  const a = mapSupportDetail(
    { ...item, landlordConsentStatus: "NOT_REQUIRED", attachments: [] },
    { landlordConsentRequired: true },
  );
  assert.equal(a.review.consentRequired, "필요");
  assert.equal(a.review.consentState, "미확인");
});

test("동일한 파일명도 고유 문서 키로 각각의 URL을 보존한다", () => {
  const { mapSupportDetail } = harness().load(
    "src/pages/Support/apiMapping.ts",
  );
  const a = mapSupportDetail({
    ...item,
    attachments: [
      { originalName: "동의서.pdf", fileUrl: "https://example.com/1" },
      { originalName: "동의서.pdf", fileUrl: "https://example.com/2" },
    ],
  });
  assert.equal(new Set(a.attachmentKeys).size, 2);
  assert.equal(a.attachmentUrls[a.attachmentKeys[0]], "https://example.com/1");
  assert.equal(a.attachmentUrls[a.attachmentKeys[1]], "https://example.com/2");
});

test("검토 정보를 받기 전에는 API 신청 승인을 차단한다", () => {
  const h = harness();
  const { mapSupportDetail } = h.load("src/pages/Support/apiMapping.ts");
  const { approvalIssue } = h.load("src/pages/Support/model.ts");
  const a = mapSupportDetail({ ...item, attachments: [] });
  assert.match(
    approvalIssue(a, {
      ...a.review,
      checks: [true, true, true],
      scope: "시설",
    }),
    /검토 정보를/,
  );
});

test("통계 응답을 기다리지 않고 도착한 목록을 표시한다", async () => {
  const h = listHookHarness(new Promise(() => {}));
  h.render();
  h.reads[0].resolve({
    supportApplications: [item],
    totalElements: 1,
    totalPages: 1,
  });
  await new Promise(setImmediate);
  assert.equal(h.render().loading, false);
  assert.equal(h.render().page.totalElements, 1);
  assert.equal(h.render().counts, undefined);
});

test("승인 요청 중 언마운트되면 완료 모달을 열지 않는다", async () => {
  let complete;
  const h = reviewHarness({
    approveSupport: () =>
      new Promise((resolve) => {
        complete = resolve;
      }),
  });
  const pending = h.dialog().props.onConfirm();
  h.unmount();
  complete({ status: "APPROVED" });
  await pending;
  assert.equal(h.params().get("dialog"), "approve");
});

test("검토 조회가 실패해도 상세를 표시하고 승인 준비 상태는 유지하지 않는다", async () => {
  let detailResolve, reviewReject;
  const h = listHookHarness(undefined, {
    getSupportDetail: () =>
      new Promise((resolve) => {
        detailResolve = resolve;
      }),
    getSupportReview: () =>
      new Promise((resolve, reject) => {
        reviewReject = reject;
      }),
  });
  h.record(201);
  detailResolve({ ...item, attachments: [] });
  await new Promise(setImmediate);
  assert.ok(h.record(201).application);
  assert.equal(h.record(201).application.reviewLoaded, false);
  reviewReject(new Error("검토 조회 실패"));
  await new Promise(setImmediate);
  assert.ok(h.record(201).application);
  assert.equal(h.record(201).error, "");
  assert.equal(h.record(201).reviewError, "검토 조회 실패");
  assert.equal(h.record(201).application.reviewLoaded, false);
});


test("지원 현황은 최신 rejectedCount를 포함한 네 집계값과 0건을 그대로 반환한다", async () => {
  const h = harness();
  const api = h.load("src/api/supportApplications.ts");
  for (const counts of [
    { totalCount: 21, reviewingCount: 4, rejectedCount: 6, approvedCount: 11 },
    { totalCount: 15, reviewingCount: 4, rejectedCount: 0, approvedCount: 11 },
    { totalCount: 0, reviewingCount: 0, rejectedCount: 0, approvedCount: 0 },
  ]) {
    h.setResponse(() => counts);
    const controller = new AbortController();
    assert.deepEqual(plain(await api.getSupportCounts(controller.signal)), counts);
    assert.equal(h.requests.at(-1).url, root + "/status");
    assert.equal(h.requests.at(-1).method, "get");
    assert.equal(h.requests.at(-1).signal, controller.signal);
  }
});
