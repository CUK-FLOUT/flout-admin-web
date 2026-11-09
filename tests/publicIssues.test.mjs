import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { test } from "node:test";
import vm from "node:vm";
import ts from "typescript";
import axios from "axios";
import { randomUUID } from "node:crypto";

const plain = (value) => JSON.parse(JSON.stringify(value));
function harness(overrides = {}, environment = {}) {
  const client = axios.create({
    headers: { "Content-Type": "application/json" },
  });
  const requests = [];
  let response = () => ({ isSuccess: true, result: {} });
  client.defaults.adapter = async (config) => {
    requests.push(config);
    return {
      data: await response(config),
      status: 200,
      statusText: "OK",
      headers: {},
      config,
    };
  };
  const modules = new Map();
  function load(path) {
    const file = resolve(/\.tsx?$/.test(path) ? path : `${path}.ts`);
    if (modules.has(file)) return modules.get(file);
    const module = { exports: {} };
    const source = ts.transpileModule(readFileSync(file, "utf8"), {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        jsx: ts.JsxEmit.ReactJSX,
        target: ts.ScriptTarget.ES2023,
        esModuleInterop: true,
      },
    }).outputText;
    vm.runInNewContext(source, {
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
      URLSearchParams,
      URL,
      crypto: { randomUUID },
      ...environment,
      require(name) {
        if (name in overrides) return overrides[name];
        if (name === "axios") return axios;
        if (name === "./client") return { apiClient: client };
        return load(resolve(dirname(file), name));
      },
    });
    modules.set(file, module.exports);
    return module.exports;
  }
  return {
    load,
    requests,
    respond(fn) {
      response = fn;
    },
  };
}
function hooks() {
  const slots = [],
    effects = [];
  let index = 0,
    pending = [];
  const react = {
    useState(initial) {
      const i = index++;
      if (!(i in slots))
        slots[i] = typeof initial === "function" ? initial() : initial;
      return [
        slots[i],
        (value) => {
          slots[i] = typeof value === "function" ? value(slots[i]) : value;
        },
      ];
    },
    useRef(initial) {
      const i = index++;
      return (slots[i] ||= { current: initial });
    },
    useEffect(effect, deps) {
      const i = index++;
      if (
        !effects[i] ||
        deps.some((dep, n) => !Object.is(dep, effects[i].deps[n]))
      ) {
        pending.push(() => {
          effects[i]?.cleanup?.();
          effects[i] = { deps, cleanup: effect() };
        });
      }
    },
  };
  return {
    react,
    render(fn) {
      index = 0;
      const result = fn();
      const run = pending;
      pending = [];
      run.forEach((effect) => effect());
      return result;
    },
    unmount() {
      effects.forEach((effect) => effect?.cleanup?.());
    },
  };
}
const tick = () => new Promise((resolve) => setImmediate(resolve));
const deferred = () => {
  let resolve, reject;
  const promise = new Promise((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
};

const root = "/api/admin/public-issues";
const filters = {
  district: "원미구",
  status: "UNDER_REVIEW",
  issueType: "BLOCKED_STORM_DRAIN",
  keyword: "  길주로  ",
};
const item = {
  publicIssueId: 9,
  issueType: "BLOCKED_STORM_DRAIN",
  relatedApplicationCount: 8,
  floodHistoryCount: 3,
  status: "UNDER_REVIEW",
};
const page = {
  publicIssues: [item],
  page: 0,
  size: 5,
  totalPages: 3,
  totalElements: 12,
};
const counts = {
  registeredCount: 12,
  pendingOrUnderReviewCount: 6,
  actionInProgressCount: 4,
  completedCount: 2,
};
const detail = {
  publicIssueId: 9,
  issueType: "BLOCKED_STORM_DRAIN",
  status: "UNDER_REVIEW",
  address: "부천시 원미구 길주로 210",
  latitude: 37.5,
  longitude: 126.76,
  description: "막힘",
  fieldFindings: "퇴적물",
  createdAt: "2030-01-01T10:00:00+09:00",
  source: {
    inspectionId: 81,
    applicationId: 3,
    receiptNo: "000003",
    applicantName: "테스트",
  },
  referenceInformation: {
    relatedApplicationCount: 8,
    floodHistoryCount: 3,
    relatedApplications: [],
  },
  review: {
    reviewId: 4,
    reviewTarget: "빗물받이",
    reviewStatus: "UNDER_REVIEW",
    inspectionNotes: "확인 필요",
    reviewReason: "기존 사유",
    reviewerUserId: 2,
    reviewerName: "담당",
    reviewedAt: null,
  },
  publicFacility: null,
  actions: [],
};
const completed = {
  publicIssueId: 9,
  actionId: 71,
  reviewId: 4,
  operatorUserId: 2,
  actionDescription: "정비 완료",
  actionStatus: "COMPLETED",
  reviewStatus: "COMPLETED",
  publicIssueStatus: "COMPLETED",
  completedAt: "2030-01-01T10:00:00+09:00",
};
const images = {
  publicIssueId: 9,
  actionId: 71,
  images: [
    {
      imageId: 31,
      imageUrl: "https://example.com/photo.jpg",
      uploadedAt: "2030-01-01T10:00:00+09:00",
    },
  ],
};
function response(config) {
  if (config.url.endsWith("/images")) return images;
  if (config.url.endsWith("/actions")) return completed;
  if (config.url.endsWith("/review"))
    return {
      ...detail.review,
      ...JSON.parse(config.data),
      publicIssueId: 9,
      publicIssueStatus: "UNDER_REVIEW",
    };
  if (config.url.endsWith("/status")) return counts;
  if (config.url.endsWith("resident-applications"))
    return {
      publicIssueId: 9,
      totalCount: 1,
      applications: [
        {
          applicationId: 3,
          receiptNo: "000003",
          address: detail.address,
          vulnerabilityGrade: null,
          fieldFindings: null,
        },
      ],
    };
  if (config.url === "/api/admin/map/public-issues")
    return {
      markers: [
        {
          publicIssueId: 9,
          latitude: 37.5,
          longitude: 126.76,
          status: "UNDER_REVIEW",
        },
      ],
    };
  if (config.url === root) return page;
  return detail;
}
function apiHarness() {
  const h = harness();
  h.respond((config) => ({ isSuccess: true, result: response(config) }));
  return { ...h, api: h.load("src/api/publicIssues.ts") };
}

test("8 APIs use actual Swagger methods, exact filters/IDs and multipart files", async () => {
  const h = apiHarness(),
    api = h.api;
  await api.getPublicIssues(filters, 2);
  await api.getPublicIssueCounts(filters);
  await api.getPublicIssueMap(filters);
  await api.getPublicIssue(9);
  await api.getPublicIssueApplications(9);
  const body = {
    reviewTarget: "빗물받이",
    reviewStatus: "UNDER_REVIEW",
    inspectionNotes: "정비 필요",
    reviewReason: "기존 사유",
  };
  await api.savePublicIssueReview(9, body);
  const action = await api.completePublicIssueAction(9, "  정비 완료  ");
  const file = new File(["image"], "photo.jpg", { type: "image/jpeg" });
  await api.uploadPublicIssueImages(9, action.actionId, [file, file]);
  assert.deepEqual(
    h.requests.map((r) => [r.method, r.url]),
    [
      ["get", root],
      ["get", `${root}/status`],
      ["get", "/api/admin/map/public-issues"],
      ["get", `${root}/9`],
      ["get", `${root}/9/resident-applications`],
      ["post", `${root}/9/review`],
      ["post", `${root}/9/actions`],
      ["post", `${root}/9/actions/71/images`],
    ],
  );
  assert.deepEqual(plain(h.requests[0].params), {
    ...filters,
    keyword: "길주로",
    page: 2,
    size: 5,
  });
  assert.equal(h.requests[1].params.status, undefined);
  assert.equal(h.requests[2].params.page, undefined);
  assert.equal(h.requests[2].params.status, "UNDER_REVIEW");
  assert.deepEqual(JSON.parse(h.requests[5].data), body);
  assert.deepEqual(JSON.parse(h.requests[6].data), {
    actionDescription: "정비 완료",
  });
  assert.equal(h.requests[7].data instanceof FormData, true);
  assert.deepEqual([...h.requests[7].data.keys()], ["files", "files"]);
  assert.notEqual(
    h.requests[7].headers.get("Content-Type"),
    "application/json",
  );
});

test("invalid queries, IDs, required fields, review states and photos are blocked before API calls", async () => {
  const h = apiHarness(),
    api = h.api;
  for (const id of [0, -1, 1.5, NaN])
    await assert.rejects(api.getPublicIssue(id));
  await assert.rejects(api.getPublicIssues({ keyword: "a".repeat(256) }, 0));
  await assert.rejects(
    api.getPublicIssues({ keyword: "", status: "unknown" }, 0),
  );
  await assert.rejects(api.getPublicIssues({ keyword: "" }, -1));
  await assert.rejects(
    api.savePublicIssueReview(9, {
      reviewTarget: " ",
      inspectionNotes: "내용",
      reviewStatus: "PENDING",
    }),
  );
  await assert.rejects(
    api.savePublicIssueReview(9, {
      reviewTarget: "시설",
      inspectionNotes: "내용",
      reviewStatus: "COMPLETED",
    }),
  );
  await assert.rejects(api.completePublicIssueAction(9, " "));
  for (const files of [
    [],
    [new File([], "empty.jpg", { type: "image/jpeg" })],
    [{ size: 10 * 1024 ** 2 + 1, name: "large.jpg", type: "image/jpeg" }],
    [new File(["svg"], "image.svg", { type: "image/svg+xml" })],
  ])
    await assert.rejects(api.uploadPublicIssueImages(9, 71, files));
  assert.equal(h.requests.length, 0);
});

test("server errors stay errors, sensitive 500 details are hidden and unknown response enums/IDs fail", async () => {
  const h = apiHarness(),
    api = h.api;
  h.respond(() => ({ isSuccess: false, message: "거절", result: null }));
  await assert.rejects(api.getPublicIssues({ keyword: "" }, 0), /거절/);
  assert.match(api.publicIssueError(new axios.AxiosError("failed")), /연결/);
  assert.equal(
    api.publicIssueError(
      new axios.AxiosError("failed", null, null, null, {
        status: 403,
        data: { message: "관할 권한 없음" },
      }),
    ),
    "관할 권한 없음",
  );
  assert.doesNotMatch(
    api.publicIssueError(
      new axios.AxiosError("failed", null, null, null, {
        status: 500,
        data: { message: "secret.sql" },
      }),
    ),
    /secret/,
  );
  h.respond(() => ({
    isSuccess: true,
    result: { ...page, publicIssues: [{ ...item, status: "UNKNOWN" }] },
  }));
  await assert.rejects(api.getPublicIssues({ keyword: "" }, 0), /알 수 없는/);
  h.respond(() => ({
    isSuccess: true,
    result: { ...completed, publicIssueId: 99 },
  }));
  await assert.rejects(api.completePublicIssueAction(9, "완료"), /응답/);
});

test("mapping uses server counts/statuses and actual coordinates, never demo locations or invented residents", () => {
  const h = harness(),
    map = h.load("src/pages/Infrastructure/apiMapping.ts");
  const row = map.publicIssueRecord(item);
  assert.equal(row.id, "9");
  assert.equal(row.number, 9);
  assert.equal(row.status, "검토 중");
  assert.equal(row.relatedCount, 8);
  assert.equal(row.related.length, 0);
  assert.equal(row.history, 3);
  assert.deepEqual(
    plain(
      map.infrastructureApiFilters({
        query: " 검색 ",
        district: "잘못된 값",
        status: "알 수 없음",
        kind: "없는 유형",
      }),
    ),
    { keyword: "검색" },
  );
  const location = h.load(
    "src/pages/Infrastructure/mapLocations.ts",
  ).getInfrastructureLocation;
  assert.equal(location({ ...row, id: "region-001" }), undefined);
  const marker = map.publicIssueMapRecord({
    publicIssueId: 9,
    latitude: 37.5,
    longitude: 126.76,
    status: "COMPLETED",
  });
  assert.equal(location(marker).latitude, 37.5);
  assert.equal(
    location({
      ...marker,
      coordinates: { latitude: Infinity, longitude: 126 },
    }),
    undefined,
  );
  const record = map.publicIssueDetailRecord(detail);
  assert.equal(record.reviewId, 4);
  assert.equal(record.requirements, "확인 필요");
  assert.equal(record.referencePhotos.length, 0);
});

function dataHarness() {
  const hook = hooks(),
    calls = { list: [], counts: [], map: [], detail: [], related: [] };
  const api = { publicIssueError: (cause) => cause.message };
  for (const [key, name] of [
    ["list", "getPublicIssues"],
    ["counts", "getPublicIssueCounts"],
    ["map", "getPublicIssueMap"],
    ["detail", "getPublicIssue"],
    ["related", "getPublicIssueApplications"],
  ])
    api[name] = (...args) => {
      const request = deferred();
      calls[key].push({ ...request, args });
      return request.promise;
    };
  const { useInfrastructureData } = harness({
    react: hook.react,
    "../../api/publicIssues": api,
  }).load("src/pages/Infrastructure/useInfrastructureData.ts");
  let query = { filters: { keyword: "" }, page: 0 },
    id;
  return {
    calls,
    render: () => hook.render(() => useInfrastructureData(query, id)),
    query(value) {
      query = value;
    },
    detail(value) {
      query = undefined;
      id = value;
    },
    unmount: hook.unmount,
  };
}

test("list renders without waiting for stats/map, page changes only reload the list and stale responses are ignored", async () => {
  const h = dataHarness();
  h.render();
  h.calls.list[0].resolve(page);
  await tick();
  let state = h.render();
  assert.equal(state.loading, false);
  assert.equal(state.records[0].id, "9");
  assert.equal(state.counts, undefined);
  h.query({ filters: { keyword: "" }, page: 1 });
  h.render();
  assert.equal(h.calls.list.length, 2);
  assert.equal(h.calls.map.length, 1);
  assert.equal(h.calls.counts.length, 1);
  h.query({ filters: { keyword: "새 검색" }, page: 0 });
  h.render();
  assert.equal(h.calls.list[1].args[2].aborted, true);
  h.calls.list[1].resolve({
    ...page,
    publicIssues: [{ ...item, publicIssueId: 99 }],
  });
  h.calls.list[2].resolve({
    ...page,
    publicIssues: [{ ...item, publicIssueId: 10 }],
  });
  await tick();
  state = h.render();
  assert.equal(state.records[0].id, "10");
  h.unmount();
});

test("related request failures do not erase the detail, and successful completion state survives a refresh failure", async () => {
  const h = dataHarness();
  h.detail("9");
  h.render();
  h.calls.detail[0].resolve(detail);
  h.calls.related[0].reject(new Error("주민 신청 조회 실패"));
  await tick();
  let state = h.render();
  assert.equal(state.issue.id, "9");
  assert.match(state.relatedError, /조회 실패/);
  state.applyCompletion(completed);
  state = h.render();
  assert.equal(state.issue.status, "조치 완료");
  state.refresh();
  h.render();
  h.calls.detail[1].reject(new Error("갱신 실패"));
  await tick();
  state = h.render();
  assert.equal(state.issue.status, "조치 완료");
  assert.match(state.error, /갱신 실패/);
  h.unmount();
});

function reviewWorkspace(apiOverrides = {}, original = detail) {
  const hook = hooks();
  const react = hook.react;
  const mapping = harness().load("src/pages/Infrastructure/apiMapping.ts");
  const data = {
    issue: mapping.publicIssueDetailRecord(original),
    related: [],
    relatedLoading: false,
    relatedError: undefined,
    error: "",
    detailLoading: false,
    refreshes: 0,
    reviews: 0,
    completions: 0,
    setError(value) {
      data.error = value;
    },
    refresh() {
      data.refreshes++;
    },
    applyReview(saved) {
      data.reviews++;
      data.issue = {
        ...data.issue,
        target: saved.reviewTarget,
        requirements: saved.inspectionNotes,
        status: "검토 중",
        reviewId: saved.reviewId,
      };
    },
    applyCompletion(saved) {
      data.completions++;
      data.issue = {
        ...data.issue,
        status: "조치 완료",
        actionId: saved.actionId,
        action: {
          ...data.issue.action,
          result: saved.actionDescription,
          verified: true,
        },
      };
    },
  };
  const requests = [],
    navigations = [];
  let params = new URLSearchParams();
  const api = {
    getPublicIssue: async () => original,
    publicIssueError: (cause) => cause.message,
    validatePublicIssueImages: apiHarness().api.validatePublicIssueImages,
    savePublicIssueReview: async (id, body) => {
      requests.push(["review", id, body]);
      return {
        ...body,
        publicIssueId: id,
        reviewId: 4,
        publicIssueStatus: "UNDER_REVIEW",
      };
    },
    completePublicIssueAction: async (id, result) => {
      requests.push(["complete", id, result]);
      return completed;
    },
    uploadPublicIssueImages: async (...args) => {
      requests.push(["images", ...args]);
      return images;
    },
    ...apiOverrides,
  };
  const jsx = (type, props) => ({ type, props: props || {} });
  const overrides = {
    react,
    "react/jsx-runtime": { jsx, jsxs: jsx },
    "react-router-dom": {
      useParams: () => ({ issueId: "9" }),
      useSearchParams: () => [params],
      Link: "Link",
      useNavigate: () => (to) => {
        navigations.push(to);
        params = new URLSearchParams(to.search);
      },
    },
    "../../api/publicIssues": api,
    "./useInfrastructureData": { useInfrastructureData: () => data },
    "./model": {
      facilityDraft: (issue) => ({
        target: issue.target,
        requirements: issue.requirements,
        status: issue.status === "검토 대기" ? "검토 대기" : "검토 중",
        ...issue.action,
      }),
    },
    "./assets": { infrastructureAssets: {} },
    "../../components/infrastructure/styles": {},
    "../../components/infrastructure/InfrastructureDialogs": "Dialogs",
    "./InfrastructureReviewPanel": "Panel",
    "./InfrastructureReferencePanels": {
      FacilityReferenceInformation: "Reference",
      RelatedApplications: "Related",
    },
  };
  const Component = harness(overrides).load(
    "src/pages/Infrastructure/InfrastructureReview.tsx",
  ).default;
  const rootNode = Component();
  const render = () =>
    hook.render(() => rootNode.type({ issue: data.issue, data }));
  const find = (node, type) =>
    node && typeof node === "object"
      ? node.type === type
        ? node.props
        : [node.props?.children]
            .flat(Infinity)
            .map((child) => find(child, type))
            .find(Boolean)
      : undefined;
  return {
    data,
    requests,
    render,
    panel: () => find(render(), "Panel"),
    dialog: () => find(render(), "Dialogs"),
    unmount: hook.unmount,
  };
}

function prepareAction(w) {
  w.panel().onUpdate("result", "정비 완료");
  w.panel().onUpdate("verified", true);
  w.panel().onComplete();
}

test("review requests block duplicates, preserve input/photos on failure and never show a success dialog", async () => {
  const pending = deferred();
  let calls = 0;
  const w = reviewWorkspace({
    savePublicIssueReview: () => {
      calls++;
      return pending.promise;
    },
  });
  w.panel().onUpdate("target", "수정한 검토 대상");
  await w
    .panel()
    .onUpload([new File(["image"], "a.jpg", { type: "image/jpeg" })]);
  const panel = w.panel();
  panel.onSave(true);
  panel.onSave(true);
  assert.equal(calls, 1);
  assert.equal(w.panel().busy, true);
  pending.reject(new Error("저장 실패"));
  await tick();
  assert.equal(w.panel().draft.target, "수정한 검토 대상");
  assert.equal(w.panel().draft.photos.length, 1);
  assert.equal(w.data.reviews, 0);
  assert.equal(w.dialog(), undefined);
  assert.match(w.data.error, /저장 실패/);
  w.unmount();
});

test("completion precedes photo upload and a photo-only retry never completes the action twice", async () => {
  let uploads = 0;
  const w = reviewWorkspace({
    uploadPublicIssueImages: async (...args) => {
      w.requests.push(["images", ...args]);
      if (++uploads === 1) throw new Error("업로드 실패");
      return images;
    },
  });
  await w
    .panel()
    .onUpload([new File(["image"], "a.jpg", { type: "image/jpeg" })]);
  assert.equal(w.requests.length, 0);
  prepareAction(w);
  const confirm = w.dialog();
  confirm.onConfirm();
  confirm.onConfirm();
  await tick();
  assert.deepEqual(
    w.requests.map((r) => r[0]),
    ["complete", "images"],
  );
  assert.equal(w.requests[1][2], 71);
  assert.equal(w.data.issue.status, "조치 완료");
  assert.match(w.data.error, /조치 완료는 처리되었습니다/);
  assert.equal(w.panel().draft.photos[0].file.name, "a.jpg");
  w.dialog().onConfirm();
  await tick();
  assert.deepEqual(
    w.requests.map((r) => r[0]),
    ["complete", "images", "images"],
  );
  assert.equal(w.panel().draft.photos[0].id, "31");
  assert.equal(w.dialog(), undefined);
  w.unmount();
});

test("missing review or failed completion never uploads photos or marks an issue completed", async () => {
  const missing = reviewWorkspace({}, { ...detail, review: null });
  prepareAction(missing);
  assert.equal(missing.requests.length, 0);
  assert.match(missing.data.error, /검토 내용을 먼저/);
  missing.unmount();
  const w = reviewWorkspace({
    completePublicIssueAction: async () => {
      throw new Error("완료 거절");
    },
  });
  await w
    .panel()
    .onUpload([new File(["image"], "a.jpg", { type: "image/jpeg" })]);
  prepareAction(w);
  w.dialog().onConfirm();
  await tick();
  assert.equal(w.data.issue.status, "검토 중");
  assert.equal(w.data.completions, 0);
  assert.equal(w.requests.length, 0);
  assert.match(w.data.error, /완료 거절/);
  w.unmount();
});

test("late mutation success never changes an inactive workspace or navigates away from another page", async () => {
  const pending = deferred();
  const w = reviewWorkspace({ savePublicIssueReview: () => pending.promise });
  w.panel().onSave(true);
  w.unmount();
  pending.resolve({
    publicIssueId: 9,
    reviewId: 4,
    publicIssueStatus: "UNDER_REVIEW",
  });
  await tick();
  assert.equal(w.data.reviews, 0);
  assert.equal(w.data.refreshes, 0);
});

test("map overlays use actual response coordinates, link to publicIssueId and clean up listeners", () => {
  const elements = [],
    overlays = [];
  const document = {
    createElement() {
      const listeners = new Map();
      const element = {
        children: [],
        listeners,
        setAttribute() {},
        append(...nodes) {
          this.children.push(...nodes);
        },
        addEventListener(name, fn) {
          listeners.set(name, fn);
        },
        removeEventListener(name) {
          listeners.delete(name);
        },
      };
      elements.push(element);
      return element;
    },
  };
  const maps = {
    LatLng: class {
      constructor(lat, lng) {
        this.lat = lat;
        this.lng = lng;
      }
    },
    CustomOverlay: class {
      constructor(options) {
        this.options = options;
        overlays.push(this);
      }
      setMap(value) {
        this.map = value;
      }
    },
    event: { preventMap() {} },
  };
  const h = harness(
    {
      "../../pages/Infrastructure/assets": {
        infrastructureAssets: {
          waitingPin: "waiting.svg",
          reviewPin: "review.svg",
          completedPin: "done.svg",
        },
      },
    },
    { document },
  );
  const issue = h
    .load("src/pages/Infrastructure/apiMapping.ts")
    .publicIssueMapRecord({
      publicIssueId: 9,
      latitude: 37.5,
      longitude: 126.76,
      status: "COMPLETED",
    });
  let selected;
  const remove = h
    .load("src/components/infrastructure/infrastructureMarkers.ts")
    .addInfrastructureMarker({
      maps,
      map: {},
      issue,
      isSelected: true,
      onSelect: (id) => {
        selected = id;
      },
    });
  assert.equal(overlays[0].options.position.lat, 37.5);
  assert.equal(overlays[0].options.position.lng, 126.76);
  elements[0].listeners.get("click")();
  assert.equal(selected, "9");
  remove();
  assert.equal(elements[0].listeners.size, 0);
  assert.equal(overlays[0].map, null);
});

test("review reasons are trimmed while null and absent values remain unset", async () => {
  const h = apiHarness();
  for (const reason of ["  기존 사유  ", null, undefined]) {
    await h.api.savePublicIssueReview(9, {
      reviewTarget: " 대상 ",
      inspectionNotes: " 확인 ",
      reviewStatus: "PENDING",
      reviewReason: reason,
    });
    const body = JSON.parse(h.requests.at(-1).data);
    assert.equal(body.reviewReason, reason == null ? reason : reason.trim());
    assert.equal(body.reviewTarget, "대상");
  }
});

test("an existing unfinished action still sends the entered completion result", async () => {
  const w = reviewWorkspace(
    {},
    {
      ...detail,
      actions: [
        {
          actionId: 50,
          status: "IN_PROGRESS",
          actionDescription: "작업 중",
          images: [],
        },
      ],
    },
  );
  prepareAction(w);
  w.dialog().onConfirm();
  await tick();
  assert.equal(w.requests[0][0], "complete");
  assert.equal(w.requests[0][2], "정비 완료");
  assert.equal(w.data.completions, 1);
  w.unmount();
});

test("completed photos preserve verification and use the latest server action ID without duplicate image IDs", async () => {
  const w = reviewWorkspace(
    {},
    {
      ...detail,
      status: "COMPLETED",
      actions: [
        {
          actionId: 50,
          status: "COMPLETED",
          actionDescription: "완료",
          images: [],
        },
      ],
    },
  );
  w.panel();
  w.data.issue = {
    ...w.data.issue,
    actionId: 72,
    action: {
      ...w.data.issue.action,
      photos: [{ id: "31", src: "https://example.com/old.jpg", name: "사진" }],
    },
  };
  w.panel();
  await w
    .panel()
    .onUpload([new File(["image"], "a.jpg", { type: "image/jpeg" })]);
  assert.equal(w.panel().draft.verified, true);
  w.panel().onUpdate(
    "photos",
    w.panel().draft.photos.filter((p) => !p.file),
  );
  assert.equal(w.panel().draft.verified, true);
  await w
    .panel()
    .onUpload([new File(["image"], "a.jpg", { type: "image/jpeg" })]);
  w.panel().onComplete();
  await tick();
  assert.equal(w.requests[0][0], "images");
  assert.equal(w.requests[0][2], 72);
  assert.equal(w.panel().draft.photos.filter((p) => p.id === "31").length, 1);
  w.unmount();
});

test("uncertain completion never resends until server state is confirmed", async () => {
  let completions = 0,
    lookups = 0;
  const w = reviewWorkspace({
    completePublicIssueAction: async () => {
      completions++;
      throw new Error("응답 유실");
    },
    getPublicIssue: async () => {
      lookups++;
      if (lookups < 2) throw new Error("연결 실패");
      return {
        ...detail,
        status: "COMPLETED",
        actions: [{ actionId: 71, status: "COMPLETED" }],
      };
    },
  });
  prepareAction(w);
  w.dialog().onConfirm();
  await tick();
  assert.equal(completions, 1);
  assert.match(w.data.error, /완료 여부를 확인하지/);
  w.dialog().onConfirm();
  await tick();
  assert.equal(completions, 1);
  assert.equal(lookups, 2);
  assert.match(w.data.error, /서버의 조치 완료/);
  w.dialog().onConfirm();
  await tick();
  assert.equal(completions, 1);
  w.unmount();
});

test("detail IDs are normalized but mismatched server IDs remain hidden", async () => {
  const h = dataHarness();
  h.detail("009");
  h.render();
  h.calls.detail[0].resolve(detail);
  await tick();
  assert.equal(h.render().issue.id, "9");
  h.detail("10");
  assert.equal(h.render().issue, undefined);
  h.unmount();
});
