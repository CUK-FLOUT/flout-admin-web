import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";

const row = {
  applicationId: 5,
  receiptNo: "000005",
  address: "부천시 원미구",
  riskLevel: "HIGH",
  floodExperience: "YES",
  requestReason: null,
  nearbyApplicationCount: 0,
  designated: false,
};
const detail = {
  ...row,
  applicantName: "테스트",
  detailAddress: null,
  internalMemo: "이전 메모",
  inspectionNeed: "우선점검 권장",
};
const deferred = () => {
  let resolve;
  const promise = new Promise((r) => (resolve = r));
  return { promise, resolve };
};
function mount(overrides = {}, requestId = "5", search = "") {
  let index = 0,
    dirty = true,
    tree,
    params = new URLSearchParams(search);
  const slots = [],
    pending = [],
    reads = [],
    orders = [];
  const api = {
    getPriorityInspections: async (query) => {
      reads.push(query);
      return {
        applications: [row],
        page: 0,
        size: 10,
        totalElements: 1,
        totalPages: 1,
      };
    },
    getPriorityInspection: async () => ({ ...detail }),
    getPriorityDesignation: async () => true,
    getPriorityOrder: async () => [],
    setPriorityDesignation: async () => ({}),
    savePriorityInternalMemo: async () => ({
      applicationId: 5,
      internalMemo: "새 메모",
    }),
    priorityError: (e) => e.message,
    ...overrides,
  };
  const jsx = (type, props) => ({ type, props: props || {} });
  const utilsSource = ts.transpileModule(
    readFileSync("src/pages/Priority/priorityUtils.ts", "utf8"),
    { compilerOptions: { module: ts.ModuleKind.CommonJS } },
  ).outputText;
  const utils = { exports: {} };
  vm.runInNewContext(utilsSource, { module: utils, exports: utils.exports });
  const module = { exports: {} };
  const source = ts.transpileModule(
    readFileSync("src/pages/Priority/PriorityManagement.tsx", "utf8"),
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
    AbortController,
    URLSearchParams,
    Promise,
    require(name) {
      if (name === "react/jsx-runtime") return { jsx, jsxs: jsx };
      if (name === "react")
        return {
          useState(initial) {
            const i = index++;
            if (!(i in slots))
              slots[i] = typeof initial === "function" ? initial() : initial;
            return [
              slots[i],
              (value) => {
                slots[i] =
                  typeof value === "function" ? value(slots[i]) : value;
                dirty = true;
              },
            ];
          },
          useRef(initial) {
            const i = index++;
            return (slots[i] ??= { current: initial });
          },
          useEffect(effect, deps) {
            const i = index++,
              previous = slots[i];
            if (
              !previous ||
              deps.some((d, j) => !Object.is(d, previous.deps[j]))
            ) {
              pending.push(() => {
                previous?.cleanup?.();
                slots[i] = { deps, cleanup: effect() };
              });
            }
          },
        };
      if (name === "react-router-dom")
        return {
          useParams: () => ({ requestId }),
          useNavigate: () => () => {},
          useSearchParams: () => [
            params,
            (next) => {
              params = next;
              dirty = true;
            },
          ],
        };
      if (name.endsWith("api/priorityInspections")) return api;
      if (name === "./priorityUtils") return utils.exports;
      if (name === "./orderApi")
        return {
          commitPriorityOrder: async (...args) => {
            orders.push(args);
            return { saved: true };
          },
        };
      if (name.includes("components/priority/"))
        return { __esModule: true, default: name.split("/").pop() };
      throw new Error(name);
    },
  });
  async function flush() {
    for (let i = 0; i < 15; i++) {
      await new Promise((resolve) => setImmediate(resolve));
      if (dirty) {
        dirty = false;
        index = 0;
        tree = module.exports.default();
        pending.splice(0).forEach((fn) => fn());
      }
    }
  }
  function find(type) {
    let found;
    function visit(node) {
      if (Array.isArray(node)) return node.forEach(visit);
      if (!node || typeof node !== "object") return;
      if (node.type === type) found = node;
      visit(node.props?.children);
    }
    visit(tree);
    return found?.props;
  }
  return {
    flush,
    find,
    reads,
    orders,
    setSearch(value) {
      params = new URLSearchParams(value);
      dirty = true;
    },
  };
}

test("현재 목록에 없는 상세도 별도 조회한 지정 상태를 사용한다", async () => {
  const h = mount({
    getPriorityInspections: async () => ({
      applications: [],
      page: 0,
      totalElements: 0,
      totalPages: 0,
    }),
  });
  await h.flush();
  const selected = h.find("PriorityDetail").application;
  assert.equal(selected.designated, true);
  assert.equal(selected.designationKnown, true);
});

test("지정 후 상세 재조회는 진행 중인 메모 PATCH 완료를 기다린다", async () => {
  const patch = deferred();
  let memo = "이전 메모",
    details = 0;
  const h = mount({
    getPriorityInspection: async () => {
      details++;
      return { ...detail, internalMemo: memo };
    },
    savePriorityInternalMemo: () => patch.promise,
  });
  await h.flush();
  h.find("PriorityDetail").onMemo("새 메모");
  await h.flush();
  h.find("PriorityDetail").onSaveMemo();
  await h.flush();
  const designation = h.find("PriorityModals").onDesignate();
  await h.flush();
  assert.equal(details, 1);
  memo = "새 메모";
  patch.resolve({ applicationId: 5, internalMemo: memo });
  await designation;
  await h.flush();
  assert.equal(details, 2);
  assert.equal(h.find("PriorityDetail").memo, "새 메모");
});

test("조회 중 닫기는 즉시 로딩을 해제하고 늦은 응답을 무시한다", async () => {
  const order = deferred();
  const h = mount({ getPriorityOrder: () => order.promise });
  await h.flush();
  h.find("PriorityDetail").onOrder();
  await h.flush();
  assert.equal(h.find("PriorityModals").busy, false);
  assert.equal(h.find("PriorityModals").orderLoading, true);
  h.find("PriorityModals").onClose();
  await h.flush();
  assert.equal(h.find("PriorityModals").orderLoading, false);
  assert.equal(h.find("PriorityModals").dialog, "");
  order.resolve([{ ...row, designated: true, selectionOrder: 1 }]);
  await h.flush();
  assert.equal(h.find("PriorityModals").eligible.length, 0);
});

test("알 수 없는 risk/status는 실제 요청과 순서 저장에서 필터로 취급하지 않는다", async () => {
  const h = mount(
    {
      getPriorityOrder: async () => [
        { ...row, designated: true, selectionOrder: 1 },
      ],
    },
    "5",
    "risk=unknown&status=unknown&page=3",
  );
  await h.flush();
  assert.equal(h.reads[0].riskLevel, undefined);
  assert.equal(h.reads[0].designated, undefined);
  h.find("PriorityDetail").onOrder();
  await h.flush();
  await h.find("PriorityModals").onSaveOrder();
  await h.flush();
  assert.equal(h.orders.length, 1);
  assert.equal(h.orders[0][2], false);
});

test("복수 체크는 상세 선택과 독립적이고 전체 applicationId를 한 번에 지정한다", async () => {
  const calls = [];
  const gate = deferred();
  let designated = false;
  const h = mount({
    getPriorityInspections: async () => ({
      applications: [
        row,
        { ...row, applicationId: 6, receiptNo: "000006" },
      ].map((item) => ({ ...item, designated })),
      page: 0,
      totalElements: 2,
      totalPages: 1,
    }),
    setPriorityDesignation: async (...args) => {
      calls.push(args);
      await gate.promise;
      designated = true;
    },
  });
  await h.flush();
  h.find("PriorityList").onToggle(5);
  await h.flush();
  h.find("PriorityList").onToggle(6);
  await h.flush();
  assert.deepEqual(Array.from(h.find("PriorityList").checkedIds), [5, 6]);
  h.find("PriorityList").onToggle(5);
  await h.flush();
  assert.deepEqual(Array.from(h.find("PriorityList").checkedIds), [6]);
  h.find("PriorityList").onToggle(5);
  await h.flush();
  h.find("PriorityList").onBulkDesignate();
  await h.flush();
  assert.equal(h.find("PriorityModals").bulkCount, 2);
  const submit = h.find("PriorityModals").onDesignate;
  const pending = submit();
  await submit();
  assert.equal(calls.length, 1);
  assert.deepEqual(Array.from(calls[0][0]), [6, 5]);
  assert.equal(calls[0][1], true);
  gate.resolve();
  await pending;
  await h.flush();
  assert.equal(h.find("PriorityList").checkedIds.length, 0);
  assert(h.find("PriorityList").filtered.every((item) => item.designated));
});

test("일괄 지정 실패 시 선택을 유지하고 완료 창을 표시하지 않는다", async () => {
  const h = mount({
    setPriorityDesignation: async () => {
      throw new Error("지정 실패");
    },
  });
  await h.flush();
  h.find("PriorityList").onToggle(5);
  await h.flush();
  h.find("PriorityList").onBulkDesignate();
  await h.flush();
  await h.find("PriorityModals").onDesignate();
  await h.flush();
  assert.equal(h.find("PriorityModals").dialog, "designate");
  assert.equal(h.find("PriorityModals").error, "지정 실패");
  assert.deepEqual(Array.from(h.find("PriorityList").checkedIds), [5]);
  assert.equal(h.find("PriorityList").filtered[0].designated, false);
});

test("페이지·필터 변경 후 이전 페이지로 돌아와도 체크 선택을 복원하지 않는다", async () => {
  const h = mount();
  await h.flush();
  h.find("PriorityList").onToggle(5);
  await h.flush();
  assert.equal(h.find("PriorityList").checkedIds.length, 1);
  h.setSearch("page=1");
  await h.flush();
  assert.equal(h.find("PriorityList").checkedIds.length, 0);
  h.setSearch("");
  await h.flush();
  assert.equal(h.find("PriorityList").checkedIds.length, 0);
  h.find("PriorityList").onToggle(5);
  await h.flush();
  h.setSearch("risk=높음");
  await h.flush();
  assert.equal(h.find("PriorityList").checkedIds.length, 0);
});
