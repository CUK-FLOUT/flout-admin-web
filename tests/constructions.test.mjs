import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
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
    const file = resolve(/\.tsx?$/.test(path) ? path : existsSync(`${path}.tsx`) ? `${path}.tsx` : `${path}.ts`);
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
const item = {
  constructionId: 91,
  receiptNo: "000005",
  applicantName: "테스트",
  requestedFacility: "물막이판",
  scheduledConstructionDate: null,
  scheduledConstructionTime: null,
  status: "PENDING",
};
const detail = {
  ...item,
  supportApplicationId: 44,
  applicationId: 5,
  supportStatus: "APPROVED",
  supportScope: null,
  preferredConstructionDate: null,
  preferredTimeSlot: null,
  managerId: null,
  managerName: null,
  resultPublished: false,
  finalInstallationResult: null,
  completedAt: null,
  photos: [],
};
const root = "/api/admin/constructions";
test("5 APIs use constructionId, exact bodies, server filters/page and repeated multipart files", async () => {
  const h = harness();
  const api = h.load("src/api/constructions.ts");
  h.respond(() => ({
    isSuccess: true,
    result: {
      constructions: [item],
      page: 2,
      size: 5,
      totalElements: 48,
      totalPages: 10,
    },
  }));
  const page = await api.getConstructions("  김  ", 2, "SCHEDULED");
  assert.equal(page.totalElements, 48);
  assert.equal(page.totalPages, 10);
  assert.deepEqual(plain(h.requests[0].params), {
    keyword: "김",
    page: 2,
    size: 5,
    status: "SCHEDULED",
  });
  const controller = new AbortController();
  await api.getConstructionDetail(91, controller.signal);
  assert.equal(h.requests[1].signal, controller.signal);
  await api.saveConstructionSchedule(91, "2099-12-31", "10:20");
  assert.deepEqual(JSON.parse(h.requests[2].data), {
    constructionDate: "2099-12-31",
    constructionTime: "10:20",
  });
  await api.completeConstruction(91, "  설치와 확인 완료  ");
  assert.deepEqual(JSON.parse(h.requests[3].data), {
    constructionId: 91,
    finalInstallationResult: "설치와 확인 완료",
  });
  const files = [
    new File(["a"], "a.jpg", { type: "image/jpeg" }),
    new File(["b"], "b.png", { type: "image/png" }),
  ];
  await api.uploadConstructionPhotos(91, files);
  assert.deepEqual(
    h.requests.map((r) => [r.method, r.url]),
    [
      ["get", root],
      ["get", `${root}/91`],
      ["post", `${root}/91/schedule`],
      ["post", root],
      ["post", `${root}/91/photos`],
    ],
  );
  assert.equal(h.requests[4].data instanceof FormData, true);
  assert.deepEqual([...h.requests[4].data.keys()], ["files", "files"]);
  assert.equal(h.requests[4].data.getAll("files")[1].name, "b.png");
  assert.notEqual(
    h.requests[4].headers.get("Content-Type"),
    "application/json",
  );
});

test("invalid ID, keyword/page, blank/long result are blocked before requests", async () => {
  const h = harness();
  const api = h.load("src/api/constructions.ts");
  for (const id of [0, -1, 1.5, NaN])
    await assert.rejects(api.getConstructionDetail(id));
  await assert.rejects(api.getConstructions("a".repeat(256), 0));
  await assert.rejects(api.getConstructions("", -1));
  await assert.rejects(api.completeConstruction(91, "  "));
  await assert.rejects(api.completeConstruction(91, "a".repeat(4001)));
  assert.equal(h.requests.length, 0);
});

test("schedule validates calendar/time and past schedules using Korea time", () => {
  const { constructionScheduleError: issue } = harness().load(
    "src/api/constructions.ts",
  );
  const now = Date.parse("2030-01-03T01:00:00Z");
  assert.equal(issue("2030-01-03", "10:01", now), null);
  assert.match(issue("2030-01-03", "09:59", now), /현재 이후/);
  for (const [date, time] of [
    ["2030-02-30", "10:00"],
    ["2030-01-03", "24:00"],
    ["", "10:00"],
  ])
    assert.ok(issue(date, time, now));
});

test("photo limits reject zero files/empty/wrong type/oversized files before uploading", async () => {
  const h = harness();
  const api = h.load("src/api/constructions.ts");
  const fake = (size, name = "a.jpg", type = "image/jpeg") => ({
    size,
    name,
    type,
  });
  for (const files of [
    [],
    [fake(0)],
    [fake(1, "a.svg", "image/svg+xml")],
    [fake(10 * 1024 ** 2 + 1)],
    Array(9).fill(fake(10 * 1024 ** 2)),
  ]) {
    await assert.rejects(api.uploadConstructionPhotos(91, files));
  }
  assert.equal(h.requests.length, 0);
});

test("network and 400/401/403/404/409/413 errors stay distinct and never become success/empty data", async () => {
  const h = harness();
  const api = h.load("src/api/constructions.ts");
  h.respond(() => ({
    isSuccess: false,
    result: null,
    code: "FAIL",
    message: "저장 거절",
  }));
  await assert.rejects(api.getConstructions("", 0), /저장 거절/);
  assert.match(api.constructionError(new axios.AxiosError("network")), /연결/);
  for (const status of [400, 401, 403, 404, 409, 413]) {
    const error = new axios.AxiosError("failed", null, null, null, {
      status,
      data: { message: `서버 ${status}` },
    });
    assert.equal(api.constructionError(error), `서버 ${status}`);
  }
  assert.equal(
    api.constructionError(
      new axios.AxiosError("failed", null, null, null, {
        status: 500,
        data: { message: "  " },
      }),
    ),
    "시공 요청에 실패했습니다.",
  );
});

test("mapping keeps receipt/application/construction IDs separate; missing values are not invented", () => {
  const { constructionDetailRecord: map, constructionListRecord: row } =
    harness().load("src/pages/Construction/apiMapping.ts");
  const result = map(detail);
  assert.equal(result.id, "91");
  assert.equal(result.receiptNo, "000005");
  assert.equal(result.status, "일정 미등록");
  assert.equal(result.date, "");
  assert.equal(result.published, null);
  assert.equal(result.address, "미제공");
  assert.equal(result.consent, "동의 정보 미제공");
  assert.equal(result.scheduleEditable, true);
  assert.equal(map({ ...detail, managerId: 8 }).scheduleEditable, false);
  for (const [status, label] of [
    ["SCHEDULED", "예정"],
    ["IN_PROGRESS", "진행"],
    ["COMPLETED", "전체 완료"],
  ])
    assert.equal(row({ ...item, status }).status, label);
  const completed = map({
    ...detail,
    status: "COMPLETED",
    resultPublished: true,
    completedAt: "2030-01-03T15:00:00+09:00",
    finalInstallationResult: "설치 완료",
    photos: [
      {
        photoId: 7,
        fileName: "a.jpg",
        url: "https://example.com/photo",
        size: 8,
        contentType: "image/jpeg",
        uploadedAt: "2030-01-03T14:00:00+09:00",
      },
    ],
  });
  assert.equal(completed.published.note, "설치 완료");
  assert.equal(completed.published.photos[0].id, "7");
});

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

test("list and detail load independently, old detail responses are ignored, refresh re-reads server data", async () => {
  const hook = hooks();
  const reads = [],
    detailReads = [];
  const api = {
    getConstructions(...args) {
      const next = deferred();
      reads.push({ args, ...next });
      return next.promise;
    },
    getConstructionDetail(...args) {
      const next = deferred();
      detailReads.push({ args, ...next });
      return next.promise;
    },
    constructionError: (error) => error.message,
  };
  const h = harness({ react: hook.react, "../../api/constructions": api });
  const { useConstructionData } = h.load(
    "src/pages/Construction/useConstructionData.ts",
  );
  let query = { keyword: "", page: 0, selectedId: "91" };
  const render = () => hook.render(() => useConstructionData(query));
  let state = render();
  assert.equal(state.listLoading, true);
  assert.equal(detailReads[0].args[0], 91);
  query = { ...query, selectedId: "92" };
  render();
  assert.equal(detailReads[0].args[1].aborted, true);
  detailReads[0].resolve(detail);
  detailReads[1].resolve({ ...detail, constructionId: 92 });
  await tick();
  state = render();
  assert.equal(state.selected.id, "92");
  assert.equal(state.listLoading, true);
  reads[0].resolve({
    constructions: [item],
    totalElements: 40,
    totalPages: 8,
    page: 0,
    size: 5,
  });
  await tick();
  state = render();
  assert.equal(state.totalElements, 40);
  assert.equal(state.records[0].id, "91");
  state.refresh("92");
  render();
  assert.equal(reads.length, 2);
  reads[1].reject(new Error("목록 조회 실패"));
  await tick();
  state = render();
  assert.equal(state.listLoading, false);
  assert.match(state.error, /목록 조회 실패/);
  hook.unmount();
  assert.equal(detailReads.at(-1).args[1].aborted, true);
});

async function workspace(record, apiOverrides = {}) {
  const react = { useEffect() {}, useRef: () => ({ current: false }) };
  const requests = [],
    navigations = [];
  let params = new URLSearchParams();
  const data = {
    noteDrafts: { current: new Map() },
    selected: record,
    records: [record],
    revision: 0,
    totalElements: 1,
    totalPages: 1,
    error: "",
    listLoading: false,
    detailLoading: false,
    refreshes: 0,
    setError(error) {
      data.error = error;
    },
    refresh() {
      data.refreshes++;
    },
  };
  const api = {
    constructionError: (error) => error.message,
    constructionScheduleError: () => null,
    validateConstructionPhotos: harness().load("src/api/constructions.ts")
      .validateConstructionPhotos,
    saveConstructionSchedule: async (...args) => {
      requests.push(["schedule", ...args]);
    },
    completeConstruction: async (...args) => {
      requests.push(["complete", ...args]);
    },
    uploadConstructionPhotos: async (...args) => {
      requests.push(["upload", ...args]);
      return {
        photos: [
          { photoId: 8, fileName: "new.jpg", url: "https://example.com/new" },
        ],
      };
    },
    ...apiOverrides,
  };
  const jsx = (type, props) => ({ type, props: props || {} });
  const overrides = {
    react,
    "react/jsx-runtime": { jsx, jsxs: jsx },
    "react-router-dom": {
      useParams: () => ({ requestId: record.id }),
      useSearchParams: () => [params],
      useNavigate: () => (to) => {
        navigations.push(to);
        params = new URLSearchParams(to.search);
      },
    },
    "../../api/constructions": api,
    "./useConstructionData": { useConstructionData: () => data },
    "./draftStorage": {
      readConstructionDraft: async () => null,
      writeConstructionDraft: async () => {},
    },
    "./model": { displayDate: (value) => value },
    "../../components/construction/styles": {
      constructionFocus: "",
      constructionSecondary: "",
    },
  };
  for (const name of [
    "ConstructionBadge",
    "ConstructionDetail",
    "ConstructionDialogs",
    "ConstructionEmpty",
  ])
    overrides[`../../components/construction/${name}`] = name;
  const Component = harness(overrides).load(
    "src/pages/Construction/ConstructionManagement.tsx",
  ).default;
  const rootNode = Component();
  const hook = hooks();
  Object.assign(react, hook.react);
  const render = () =>
    hook.render(() => rootNode.type({ ...rootNode.props, data }));
  function find(node, type) {
    if (!node || typeof node !== "object") return undefined;
    if (node.type === type) return node.props;
    const children = [node.props?.children].flat(Infinity);
    return children.map((child) => find(child, type)).find(Boolean);
  }
  render();
  await tick();
  render();

  return {
    data,
    requests,
    navigations,
    render,
    unmount: hook.unmount,
    panel: () => find(render(), "ConstructionDetail"),
    dialog: () => find(render(), "ConstructionDialogs"),
  };
}

test("workspace prevents double schedule submission and preserves draft on API failure", async () => {
  const record = harness()
    .load("src/pages/Construction/apiMapping.ts")
    .constructionDetailRecord(detail);
  const pending = deferred();
  let saves = 0;
  const w = await workspace(record, {
    saveConstructionSchedule: () => {
      saves++;
      return pending.promise;
    },
  });
  const panel = w.panel();
  panel.onChange({ ...panel.draft, date: "2099-12-31", time: "10:00" });
  const ready = w.panel();
  ready.onSchedule();
  ready.onSchedule();
  assert.equal(saves, 1);
  assert.equal(w.panel().busy, true);
  pending.reject(new Error("일정 저장 거절"));
  await tick();
  assert.equal(w.panel().busy, false);
  assert.equal(w.panel().draft.date, "2099-12-31");
  assert.equal(w.data.refreshes, 0);
  assert.equal(w.data.error, "일정 저장 거절");
  w.unmount();
});

test("workspace selects photos locally and uploads only on confirmed completion", async () => {
  const record = harness()
    .load("src/pages/Construction/apiMapping.ts")
    .constructionDetailRecord({
      ...detail,
      status: "SCHEDULED",
      scheduledConstructionDate: "2099-12-31",
      scheduledConstructionTime: "10:00:00",
      managerId: 7,
      photos: [
        {
          photoId: 3,
          fileName: "existing.jpg",
          url: "https://example.com/old",
        },
      ],
    });
  const completion = deferred();
  const calls = [];
  const w = await workspace(record, {
    completeConstruction: (...args) => {
      calls.push(args);
      return completion.promise;
    },
  });
  let panel = w.panel();
  panel.onChange({ ...panel.draft, note: "설치와 작동 확인 완료" });
  w.panel().onUpload([new File(["a"], "new.jpg", { type: "image/jpeg" })]);
  await tick();
  panel = w.panel();
  assert.equal(panel.draft.note, "설치와 작동 확인 완료");
  assert.equal(panel.draft.photos[0].id, "3");
  assert.match(panel.draft.photos[1].id, /^pending-/);
  assert.equal(panel.draft.photos[1].file.name, "new.jpg");
  assert.equal(w.requests.length, 0);
  panel.onFinish();
  let dialog = w.dialog();
  assert.equal(dialog.kind, "completion-review");
  assert.equal(dialog.application.published.note, "설치와 작동 확인 완료");
  dialog.onConfirm();
  assert.equal(calls.length, 0);
  dialog.onChecked(true);
  dialog = w.dialog();
  dialog.onConfirm();
  dialog.onConfirm();
  await tick();
  assert.equal(w.requests.length, 1);
  assert.equal(w.requests[0][0], "upload");
  assert.deepEqual(calls, [[91, "설치와 작동 확인 완료"]]);
  completion.resolve({ status: "COMPLETED" });
  await tick();
  assert.equal(w.data.refreshes, 1);
  assert.equal(w.dialog().kind, "overall-saved");
  w.unmount();
});

test("missing schedule/photos and already completed records never send a completion request", async () => {
  const map = harness().load(
    "src/pages/Construction/apiMapping.ts",
  ).constructionDetailRecord;
  for (const source of [
    detail,
    {
      ...detail,
      status: "SCHEDULED",
      scheduledConstructionDate: "2099-12-31",
      scheduledConstructionTime: "10:00",
    },
  ]) {
    const w = await workspace(map(source));
    const panel = w.panel();
    panel.onChange({ ...panel.draft, note: "결과" });
    w.panel().onFinish();
    assert.equal(w.requests.length, 0);
    assert.ok(w.data.error);
    w.unmount();
  }
  const w = await workspace(
    map({ ...detail, status: "COMPLETED", resultPublished: true }),
  );
  w.panel().onFinish();
  assert.equal(w.dialog().kind, "completed-view");
  assert.equal(w.requests.length, 0);
  w.unmount();
});

test("unmounting during completion never navigates an inactive workspace", async () => {
  const record = harness()
    .load("src/pages/Construction/apiMapping.ts")
    .constructionDetailRecord({
      ...detail,
      status: "SCHEDULED",
      scheduledConstructionDate: "2099-12-31",
      scheduledConstructionTime: "10:00",
      photos: [
        { photoId: 3, fileName: "photo.jpg", url: "https://example.com/photo" },
      ],
    });
  const pending = deferred();
  const w = await workspace(record, {
    completeConstruction: () => pending.promise,
  });
  const panel = w.panel();
  panel.onChange({ ...panel.draft, note: "설치 완료" });
  w.panel().onFinish();
  w.dialog().onChecked(true);
  w.dialog().onConfirm();
  const previous = w.navigations.length;
  w.unmount();
  pending.resolve({ status: "COMPLETED" });
  await tick();
  assert.equal(w.navigations.length, previous);
});

function scheduledRecord() {
  return harness()
    .load("src/pages/Construction/apiMapping.ts")
    .constructionDetailRecord({
      ...detail,
      status: "SCHEDULED",
      scheduledConstructionDate: "2099-12-31",
      scheduledConstructionTime: "10:00",
    });
}
function confirmWorkspace(w) {
  const panel = w.panel();
  panel.onChange({ ...panel.draft, note: "설치 확인 완료" });
  w.panel().onFinish();
  w.dialog().onChecked(true);
  w.dialog().onConfirm();
}

test("local deletion sends no API request and only retained files are uploaded", async () => {
  const w = await workspace(scheduledRecord());
  const files = [
    new File(["a"], "remove.jpg", { type: "image/jpeg" }),
    new File(["b"], "keep.png", { type: "image/png" }),
  ];
  w.panel().onUpload(files);
  const removed = w.panel().draft.photos[0];
  w.panel().onRemovePhoto(removed.id);
  assert.deepEqual(plain(w.panel().draft.photos.map((photo) => photo.name)), [
    "keep.png",
  ]);
  assert.equal(w.requests.length, 0);
  confirmWorkspace(w);
  await tick();
  assert.deepEqual(
    w.requests.map((request) => request[0]),
    ["upload", "complete"],
  );
  assert.deepEqual(plain(w.requests[0][2].map((file) => file.name)), [
    "keep.png",
  ]);
  w.unmount();
});

test("upload failure blocks completion and preserves removable selections", async () => {
  let completed = false;
  const w = await workspace(scheduledRecord(), {
    uploadConstructionPhotos: async () => {
      throw new Error("사진 업로드 실패");
    },
    completeConstruction: async () => {
      completed = true;
    },
  });
  w.panel().onUpload([new File(["a"], "a.jpg", { type: "image/jpeg" })]);
  confirmWorkspace(w);
  await tick();
  assert.equal(completed, false);
  assert.equal(w.data.error, "사진 업로드 실패");
  assert.equal(w.panel().draft.photos[0].file.name, "a.jpg");
  w.panel().onRemovePhoto(w.panel().draft.photos[0].id);
  assert.equal(w.panel().draft.photos.length, 0);
  w.unmount();
});

test("completion failure after successful upload retries completion without uploading twice", async () => {
  let completed = 0;
  const w = await workspace(scheduledRecord(), {
    completeConstruction: async () => {
      if (++completed === 1) throw new Error("일시 오류");
    },
  });
  w.panel().onUpload([new File(["a"], "a.jpg", { type: "image/jpeg" })]);
  confirmWorkspace(w);
  await tick();
  assert.match(w.data.error, /사진 업로드는 완료/);
  assert.equal(w.panel().draft.photos[0].file, undefined);
  assert.equal(
    w.requests.filter((request) => request[0] === "upload").length,
    1,
  );
  w.dialog().onConfirm();
  await tick();
  assert.equal(completed, 2);
  assert.equal(
    w.requests.filter((request) => request[0] === "upload").length,
    1,
  );
  assert.equal(w.dialog().kind, "overall-saved");
  w.unmount();
});

function fakeDraftDatabase() {
  const databases = new Map();
  return {
    open(name) {
      const db = {
        createObjectStore() {
          databases.set(name, new Map());
        },
        transaction() {
          const transaction = {
            objectStore() {
              const values = databases.get(name);
              return {
                get(key) {
                  const request = {};
                  queueMicrotask(() => {
                    request.result = values.get(key);
                    request.onsuccess?.();
                  });
                  return request;
                },
                put(value, key) {
                  values.set(key, value);
                  queueMicrotask(() => transaction.oncomplete?.());
                },
                delete(key) {
                  values.delete(key);
                  queueMicrotask(() => transaction.oncomplete?.());
                },
              };
            },
          };
          return transaction;
        },
      };
      const request = { result: db };
      queueMicrotask(() => {
        if (!databases.has(name)) request.onupgradeneeded?.();
        request.onsuccess?.();
      });
      return request;
    },
  };
}

test("draft storage survives module reload with File data, serializes updates, scopes by operator and removes completed drafts", async () => {
  const indexedDB = fakeDraftDatabase();
  let userId = 7;
  const makeStore = () =>
    harness(
      { "../../auth/session": { getSession: () => ({ userId }) } },
      { indexedDB },
    ).load("src/pages/Construction/draftStorage.ts");
  const store = makeStore();
  const draft = {
    ...scheduledRecord().draft,
    note: "남길 메모",
    photos: [
      {
        id: "local-1",
        name: "local.jpg",
        src: "blob:expired",
        file: new File(["image"], "local.jpg", { type: "image/jpeg" }),
      },
    ],
  };
  const first = store.writeConstructionDraft("91", draft);
  const last = store.writeConstructionDraft("91", {
    ...draft,
    note: "최신 메모",
  });
  await Promise.all([first, last]);
  const reloaded = makeStore();
  const restored = await reloaded.readConstructionDraft("91");
  assert.equal(restored.note, "최신 메모");
  assert.equal(await restored.photos[0].file.text(), "image");
  assert.equal(restored.photos[0].src, undefined);
  userId = 8;
  assert.equal(await reloaded.readConstructionDraft("91"), null);
  userId = 7;
  await reloaded.writeConstructionDraft("91", null);
  assert.equal(await makeStore().readConstructionDraft("91"), null);
});

test("restored drafts regenerate photo URLs; schedule refresh preserves pending photos and other-record edits", async () => {
  const store = new Map();
  const draft = {
    ...scheduledRecord().draft,
    date: "2099-12-30",
    time: "11:00",
    note: "편집 내용",
    photos: [
      {
        id: "pending",
        name: "image.jpg",
        file: new File(["image"], "image.jpg", { type: "image/jpeg" }),
      },
    ],
  };
  store.set("91", draft);
  const persistence = {
    readConstructionDraft: async (id) => store.get(id) || null,
    writeConstructionDraft: async (id, value) => {
      store.set(id, value);
    },
  };
  const mount = (record) => {
    const hook = hooks();
    let currentRecord = record;
    const errors = [];
    const error = (value) => errors.push(value);
    const h = harness({ react: hook.react, "./draftStorage": persistence });
    const { useConstructionDraft } = h.load(
      "src/pages/Construction/useConstructionDraft.ts",
    );
    return {
      render: () =>
        hook.render(() => useConstructionDraft(currentRecord, error)),
      unmount: hook.unmount,
      update(value) {
        currentRecord = value;
      },
      errors,
    };
  };
  const record = {
    ...scheduledRecord(),
    date: "2099-12-31",
    time: "10:00",
    scheduleEditable: false,
  };
  const first = mount(record);
  first.render();
  await tick();
  let state = first.render();
  const previousUrl = state.draft.photos[0].src;
  assert.match(previousUrl, /^blob:/);
  assert.equal(state.draft.date, "2099-12-31");
  assert.equal(state.draft.note, "편집 내용");
  first.update({ ...record, revision: 1 });
  first.render();
  state = first.render();
  assert.equal(state.draft.photos[0].src, previousUrl);
  first.unmount();
  const second = mount(record);
  second.render();
  await tick();
  state = second.render();
  assert.notEqual(state.draft.photos[0].src, previousUrl);
  assert.equal(state.draft.photos[0].file.name, "image.jpg");
  second.unmount();
});

test("refresh for an old mutation does not refetch or clear the currently selected construction", async () => {
  const hook = hooks();
  const listReads = [],
    detailReads = [];
  const api = {
    getConstructions: async (...args) => {
      listReads.push(args);
      return { constructions: [item], totalElements: 1, totalPages: 1 };
    },
    getConstructionDetail: async (id) => {
      detailReads.push(id);
      return { ...detail, constructionId: id };
    },
    constructionError: (error) => error.message,
  };
  const { useConstructionData } = harness({
    react: hook.react,
    "../../api/constructions": api,
  }).load("src/pages/Construction/useConstructionData.ts");
  const render = () =>
    hook.render(() =>
      useConstructionData({ keyword: "", page: 0, selectedId: "92" }),
    );
  render();
  await tick();
  let state = render();
  const selected = state.selected;
  state.refresh("91");
  state = render();
  assert.equal(state.selected, selected);
  await tick();
  render();
  assert.deepEqual(detailReads, [92]);
  assert.equal(listReads.length, 2);
  hook.unmount();
});

function pageHarness() {
  const hook = hooks();
  let params = new URLSearchParams("tab=진행&keyword=김&page=3");
  const requests = [],
    navigations = [];
  const record = scheduledRecord();
  const data = {
    selected: record,
    records: [],
    revision: 0,
    totalPages: 2,
    totalElements: 6,
    listLoading: false,
    listError: undefined,
  };
  const navigate = (to, options) => {
    navigations.push({ to, options });
    params = new URLSearchParams(to.search);
  };
  const jsx = (type, props, key) => ({ type, props, key });
  const overrides = {
    react: hook.react,
    "react/jsx-runtime": { jsx, jsxs: jsx },
    "react-router-dom": {
      useParams: () => ({ requestId: "91" }),
      useSearchParams: () => [params],
      useNavigate: () => navigate,
    },
    "./useConstructionData": {
      useConstructionData: (query) => {
        requests.push(query);
        return data;
      },
    },
    "./useConstructionDraft": {},
    "./draftStorage": {},
    "./model": {},
    "../../components/construction/styles": {},
  };
  for (const name of [
    "ConstructionBadge",
    "ConstructionDetail",
    "ConstructionDialogs",
    "ConstructionEmpty",
  ])
    overrides[`../../components/construction/${name}`] = name;
  const Component = harness(overrides).load(
    "src/pages/Construction/ConstructionManagement.tsx",
  ).default;
  return {
    data,
    requests,
    navigations,
    render: () => hook.render(Component),
    unmount: hook.unmount,
  };
}

test("out-of-range page is replaced and re-queried while URL filters and stable workspace key are retained", () => {
  const page = pageHarness();
  const first = page.render();
  assert.equal(page.navigations.length, 1);
  assert.equal(page.navigations[0].options.replace, true);
  assert.equal(
    new URLSearchParams(page.navigations[0].to.search).get("page"),
    "2",
  );
  assert.equal(
    new URLSearchParams(page.navigations[0].to.search).get("keyword"),
    "김",
  );
  const next = page.render();
  assert.equal(page.requests.at(-1).page, 1);
  page.data.revision++;
  assert.equal(page.render().key, next.key);
  assert.equal(next.key, first.key);
  page.unmount();
  for (const state of [{ listLoading: true }, { listError: "서버 오류" }]) {
    const blocked = pageHarness();
    Object.assign(blocked.data, state);
    blocked.render();
    assert.equal(blocked.navigations.length, 0);
    blocked.unmount();
  }
});

test("installation dialog locks its result textarea only while a request is busy", () => {
  const jsx = (type, props) => ({ type, props });
  const overrides = {
    react: { useRef: () => ({ current: null }) },
    "react/jsx-runtime": { jsx, jsxs: jsx },
    "../../support/SupportDialog": "Dialog",
    "../../../pages/Construction/model": { displayDate: (value) => value },
    "../ConstructionBadge": "Badge",
    "../ConstructionImage": "Image",
    "../styles": {},
    "./ConstructionDialogShared": { Row: "Row", fit: "" },
  };
  const Component = harness(overrides).load(
    "src/components/construction/dialogs/ConstructionInstallationDialogs.tsx",
  ).default;
  const find = (node) =>
    node?.type === "textarea"
      ? node
      : [node?.props?.children]
          .flat(Infinity)
          .map((child) =>
            typeof child === "object" && child ? find(child) : undefined,
          )
          .find(Boolean);
  const record = scheduledRecord();
  for (const busy of [true, false]) {
    const tree = Component({
      kind: "installation",
      application: record,
      draft: record.draft,
      busy,
    });
    assert.equal(find(tree).props.readOnly, busy);
  }
});

test("server refresh retains unsaved date/time and local files for a still-unassigned construction", () => {
  const { mergeConstructionDraft } = harness({
    react: {},
    "./draftStorage": {},
  }).load("src/pages/Construction/useConstructionDraft.ts");
  const record = harness()
    .load("src/pages/Construction/apiMapping.ts")
    .constructionDetailRecord({ ...detail, constructionId: 92 });
  const draft = {
    ...record.draft,
    date: "2099-12-31",
    time: "11:30",
    note: "다른 시공 편집 중",
    photos: [
      {
        id: "pending-b",
        name: "b.jpg",
        src: "blob:preview",
        file: new File(["b"], "b.jpg", { type: "image/jpeg" }),
      },
    ],
  };
  const merged = mergeConstructionDraft({ ...record, revision: 2 }, draft);
  assert.equal(merged.date, draft.date);
  assert.equal(merged.time, draft.time);
  assert.equal(merged.note, draft.note);
  assert.equal(merged.photos[0].file, draft.photos[0].file);
});

test("consent label uses explicit need/submission booleans without assuming missing values are false", () => {
  const { constructionConsentLabel: label } = harness().load(
    "src/pages/Construction/apiMapping.ts",
  );
  assert.equal(label(false, false), "불필요");
  assert.equal(label(false, true), "불필요");
  assert.equal(label(true, true), "필요 · 확인 완료");
  assert.equal(label(true, false), "필요 · 미확인");
  assert.throws(() => label(undefined, false), /응답/);
  assert.throws(() => label(true, undefined), /응답/);
});

function consentHook() {
  const hook = hooks();
  const reads = [];
  const api = {
    getConstructions: async () => ({
      constructions: [item],
      totalElements: 1,
      totalPages: 1,
    }),
    getConstructionDetail: async (id) => ({
      ...detail,
      constructionId: id,
      supportApplicationId: id + 100,
    }),
    constructionError: (error) => error.message,
  };
  const support = {
    getSupportDetail(id, signal) {
      const next = deferred();
      reads.push({ id, signal, ...next });
      return next.promise;
    },
  };
  const { useConstructionData } = harness({
    react: hook.react,
    "../../api/constructions": api,
    "../../api/supportApplications": support,
  }).load("src/pages/Construction/useConstructionData.ts");
  let selectedId = "91";
  return {
    reads,
    render: () =>
      hook.render(() =>
        useConstructionData({ keyword: "", page: 0, selectedId }),
      ),
    select(id) {
      selectedId = id;
    },
    unmount: hook.unmount,
  };
}

test("construction consent reads the linked support ID and updates independently of detail loading", async () => {
  const h = consentHook();
  h.render();
  await tick();
  let state = h.render();
  assert.equal(h.reads[0].id, 191);
  assert.equal(state.selected.id, "91");
  assert.equal(state.detailLoading, false);
  assert.equal(state.selected.consent, "동의 정보 조회 중");
  h.reads[0].resolve({
    supportApplicationId: 191,
    landlordConsentRequired: true,
    landlordConsentDocumentSubmitted: true,
  });
  await tick();
  state = h.render();
  assert.equal(state.selected.consent, "필요 · 확인 완료");
  assert.equal(state.error, "");
  h.unmount();
});

test("late consent responses cannot affect another construction; failed consent preserves its detail", async () => {
  const h = consentHook();
  h.render();
  await tick();
  h.render();
  h.select("92");
  h.render();
  await tick();
  h.render();
  assert.equal(h.reads[0].signal.aborted, true);
  h.reads[0].resolve({
    supportApplicationId: 191,
    landlordConsentRequired: false,
    landlordConsentDocumentSubmitted: false,
  });
  h.reads[1].reject(new Error("권한 오류"));
  await tick();
  const state = h.render();
  assert.equal(state.selected.id, "92");
  assert.equal(state.selected.consent, "동의 정보 조회 실패");
  assert.match(state.error, /임대인 동의.*권한 오류/);
  h.unmount();
});

test("consent metadata update preserves locally edited schedule and newly uploaded photo state", async () => {
  const hook = hooks();
  const onError = () => {};
  const { useConstructionDraft } = harness({
    react: hook.react,
    "./draftStorage": {
      readConstructionDraft: async () => null,
      writeConstructionDraft: async () => {},
    },
  }).load("src/pages/Construction/useConstructionDraft.ts");
  let record = harness()
    .load("src/pages/Construction/apiMapping.ts")
    .constructionDetailRecord(detail);
  const render = () => hook.render(() => useConstructionDraft(record, onError));
  render();
  await tick();
  let state = render();
  state.setDraft({
    ...state.draft,
    date: "2099-12-31",
    time: "11:30",
    note: "입력 내용",
    photos: [
      { id: "uploaded", name: "image.jpg", src: "https://example.com/new" },
    ],
  });
  render();
  record = { ...record, consent: "필요 · 확인 완료" };
  render();
  state = render();
  assert.equal(state.draft.date, "2099-12-31");
  assert.equal(state.draft.note, "입력 내용");
  assert.equal(state.draft.photos[0].id, "uploaded");
  hook.unmount();
});
