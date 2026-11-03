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

const root = "/api/admin/priority-inspections";
test("목록은 서버 검색 조건과 0 기반 페이지 및 false 지정 여부를 유지한다", async () => {
  const h = harness();
  const api = h.load("src/api/priorityInspections.ts");
  h.setResponse(() => ({
    applications: [],
    page: 2,
    size: 10,
    totalElements: 30,
    totalPages: 3,
  }));
  const result = await api.getPriorityInspections({
    keyword: "길주로",
    district: "원미구",
    riskLevel: "CAUTION",
    designated: false,
    page: 2,
    size: 10,
  });
  assert.equal(h.requests[0].url, root);
  assert.equal(h.requests[0].params.designated, false);
  assert.equal(h.requests[0].params.page, 2);
  assert.equal(h.requests[0].params.keyword, "길주로");
  assert.equal(result.totalElements, 30);
});
test("상세는 applicationId로 조회하며 null 필드를 유지한다", async () => {
  const h = harness();
  const api = h.load("src/api/priorityInspections.ts");
  h.setResponse(() => ({
    applicationId: 53,
    receiptNo: "000053",
    detailAddress: null,
    internalMemo: null,
  }));
  const detail = await api.getPriorityInspection(53);
  assert.equal(h.requests[0].url, root + "/53");
  assert.equal(detail.internalMemo, null);
});
test("지정과 취소는 같은 엔드포인트에 정확한 boolean을 전송한다", async () => {
  const h = harness();
  const api = h.load("src/api/priorityInspections.ts");
  await api.setPriorityDesignation([53, 91], true);
  await api.setPriorityDesignation([53], false);
  assert.deepEqual(JSON.parse(h.requests[0].data), {
    applicationIds: [53, 91],
    designated: true,
  });
  assert.deepEqual(JSON.parse(h.requests[1].data), {
    applicationIds: [53],
    designated: false,
  });
});
test("빈 배열 중복 잘못된 ID 및 500건 초과 지정은 요청 전에 차단한다", async () => {
  const h = harness();
  const api = h.load("src/api/priorityInspections.ts");
  for (const ids of [
    [],
    [1, 1],
    [0],
    [-1],
    [1.5],
    [NaN],
    Array.from({ length: 501 }, (_, i) => i + 1),
  ])
    await assert.rejects(api.setPriorityDesignation(ids, true));
  assert.equal(h.requests.length, 0);
});
test("전체 순서 조회에는 검색 필터 페이지 파라미터가 없다", async () => {
  const h = harness();
  const api = h.load("src/api/priorityInspections.ts");
  h.setResponse(() => ({
    applications: [
      { applicationId: 91, selectionOrder: 1 },
      { applicationId: 53, selectionOrder: 3 },
    ],
  }));
  const order = await api.getPriorityOrder();
  assert.equal(h.requests[0].url, root + "/order");
  assert.equal(h.requests[0].params, undefined);
  assert.equal(order[1].selectionOrder, 3);
});
test("저장은 검색 화면 밖의 전체 ID까지 변경된 순서 그대로 전송한다", async () => {
  const h = harness();
  const { commitPriorityOrder } = h.load("src/pages/Priority/orderApi.ts");
  const result = await commitPriorityOrder([91, 53, 200], [53, 91, 200], false);
  assert.equal(result.saved, true);
  assert.equal(h.requests.length, 1);
  assert.deepEqual(JSON.parse(h.requests[0].data), {
    applicationIds: [91, 53, 200],
  });
});
test("검색 필터 활성화 및 전체 ID 누락은 PUT 없이 거부한다", async () => {
  const h = harness();
  const { commitPriorityOrder } = h.load("src/pages/Priority/orderApi.ts");
  await assert.rejects(
    commitPriorityOrder([1, 2], [1, 2], true),
    /검색어와 필터/,
  );
  await assert.rejects(commitPriorityOrder([1], [1, 2], false), /전체 대상/);
  await assert.rejects(commitPriorityOrder([1, 1], [1, 2], false));
  assert.equal(h.requests.length, 0);
});
test("409는 전체 순서 GET을 한 번 재조회하고 PUT을 자동 재전송하지 않는다", async () => {
  const h = harness();
  const { commitPriorityOrder } = h.load("src/pages/Priority/orderApi.ts");
  h.setResponse((config) => {
    if (config.method === "put")
      throw new axios.AxiosError("conflict", "ERR_BAD_REQUEST", config, null, {
        status: 409,
        data: { code: "PRIORITY_INSPECTION_409_2", message: "대상 변경" },
      });
    return {
      applications: [
        { applicationId: 9, receiptNo: "000009", selectionOrder: 1 },
      ],
    };
  });
  const result = await commitPriorityOrder([1, 2], [1, 2], false);
  assert.equal(result.saved, false);
  assert.equal(result.applications[0].applicationId, 9);
  assert.deepEqual(
    h.requests.map((r) => r.method),
    ["put", "get"],
  );
  assert.equal(h.requests[1].params, undefined);
});
test("400 401 403은 재시도하거나 순서 재조회하지 않고 서버 메시지를 유지한다", async () => {
  for (const status of [400, 401, 403]) {
    const h = harness();
    const api = h.load("src/api/priorityInspections.ts");
    const { commitPriorityOrder } = h.load("src/pages/Priority/orderApi.ts");
    h.setResponse((config) => {
      throw new axios.AxiosError("error", "ERR_BAD_REQUEST", config, null, {
        status,
        data: { message: "서버 안내" },
      });
    });
    await assert.rejects(
      commitPriorityOrder([1], [1], false),
      (error) => api.priorityError(error) === "서버 안내",
    );
    assert.equal(h.requests.length, 1);
  }
});
test("응답 없는 연결 실패와 서버 오류를 빈 목록으로 처리하지 않는다", async () => {
  const h = harness();
  const api = h.load("src/api/priorityInspections.ts");
  assert.match(api.priorityError(new axios.AxiosError("network")), /연결/);
  assert.match(
    api.priorityError(
      new axios.AxiosError("server", "ERR_BAD_RESPONSE", undefined, null, {
        status: 500,
        data: {},
      }),
    ),
    /요청에 실패/,
  );
});

test("기존 목록 페이지네이션은 로딩이 끝난 후 표시되며 서버 페이지로 이동한다", () => {
  const module = { exports: {} };
  const jsx = (type, props) => ({ type, props: props || {} });
  const source = ts.transpileModule(
    readFileSync("src/components/priority/PriorityList.tsx", "utf8"),
    {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        jsx: ts.JsxEmit.ReactJSX,
        target: ts.ScriptTarget.ES2023,
      },
    },
  ).outputText;
  vm.runInNewContext(source, {
    module,
    exports: module.exports,
    require(name) {
      if (name === "react/jsx-runtime") return { jsx, jsxs: jsx };
      if (name.endsWith(".svg")) return { default: name };
      throw new Error(name);
    },
  });
  const pages = [];
  const tree = module.exports.default({
    filtered: [
      { id: "000011", risk: "높음", floodExperience: "있음", designated: true },
    ],
    loading: false,
    total: 50,
    page: 1,
    totalPages: 5,
    ordering: false,
    onPage: (p) => pages.push(p),
  });
  function nodes(node) {
    if (!node || typeof node !== "object") return [];
    if (Array.isArray(node)) return node.flatMap(nodes);
    return [node, ...[node.props?.children].flat().flatMap(nodes)];
  }
  const rendered = nodes(tree);
  assert.ok(rendered.some((n) => n.type === "nav"));
  const next = rendered.find((n) => n.props["aria-label"] === "다음 페이지");
  assert.equal(next.props.disabled, false);
  next.props.onClick();
  assert.deepEqual(pages, [2]);
  assert.equal(
    rendered.find((n) => n.props["aria-label"] === "2페이지").props[
      "aria-current"
    ],
    "page",
  );
});

test("내부 메모는 신청 ID 경로에 원문을 PATCH하고 서버의 정리된 값을 사용한다", async () => {
  const h = harness();
  const api = h.load("src/api/priorityInspections.ts");
  h.setResponse(() => ({ applicationId: 53, internalMemo: "방문 전 연락" }));
  const saved = await api.savePriorityInternalMemo(53, " 방문 전 연락 ");
  assert.equal(h.requests[0].method, "patch");
  assert.equal(h.requests[0].url, "/api/admin/applications/53/internal-memo");
  assert.deepEqual(JSON.parse(h.requests[0].data), {
    internalMemo: " 방문 전 연락 ",
  });
  assert.equal(saved.internalMemo, "방문 전 연락");
});

test("빈 메모와 공백 메모 삭제 시 서버 null 응답을 보존한다", async () => {
  const h = harness();
  const api = h.load("src/api/priorityInspections.ts");
  h.setResponse(() => ({ applicationId: 53, internalMemo: null }));
  for (const value of ["", "   "]) {
    const saved = await api.savePriorityInternalMemo(53, value);
    assert.equal(saved.internalMemo, null);
  }
  assert.equal(h.requests.length, 2);
});

test("메모 길이는 trim 전 2000자까지 허용하며 초과 및 잘못된 입력은 요청하지 않는다", async () => {
  const h = harness();
  const api = h.load("src/api/priorityInspections.ts");
  await api.savePriorityInternalMemo(1, "가".repeat(2000));
  for (const value of [" ".repeat(2001), "가".repeat(2001), null, undefined])
    await assert.rejects(api.savePriorityInternalMemo(1, value));
  await assert.rejects(api.savePriorityInternalMemo(0, "메모"));
  assert.equal(h.requests.length, 1);
});

test("메모 저장 실패 시 성공으로 처리하지 않고 서버 오류를 보존한다", async () => {
  const h = harness();
  const api = h.load("src/api/priorityInspections.ts");
  h.setResponse((config) => {
    throw new axios.AxiosError("forbidden", "ERR_BAD_REQUEST", config, null, {
      status: 403,
      data: { message: "본인 관할 지역의 신청만 수정할 수 있습니다." },
    });
  });
  await assert.rejects(api.savePriorityInternalMemo(53, "메모"), (error) =>
    api.priorityError(error).includes("관할"),
  );
  assert.equal(h.requests.length, 1);
});
