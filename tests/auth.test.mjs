import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import vm from "node:vm";
import axios from "axios";
import ts from "typescript";

const root = resolve("src");
const require = createRequire(import.meta.url);
const key = "flout.admin.session";
const session = (overrides = {}) => ({
  accessToken: "test-access-1",
  tokenType: "Bearer",
  expiresIn: 3600,
  expiresAt: new Date(Date.now() + 3600000).toISOString(),
  userId: 2,
  email: "admin@example.com",
  name: "테스트 운영자",
  role: "ADMIN",
  requiresConsent: false,
  refreshToken: "test-refresh-1",
  refreshExpiresIn: 604800,
  refreshExpiresAt: new Date(Date.now() + 604800000).toISOString(),
  ...overrides,
});
const envelope = (result) => ({
  isSuccess: true,
  status: 200,
  code: "USER_200_1",
  message: "성공",
  result,
  timeStamp: "",
});
const ok = (config, result) => ({
  data: envelope(result),
  status: 200,
  statusText: "OK",
  headers: {},
  config,
});
function unauthorized(config, message = "인증 실패") {
  throw new axios.AxiosError(message, "ERR_BAD_REQUEST", config, null, {
    data: { isSuccess: false, message },
    status: 401,
    statusText: "Unauthorized",
    headers: {},
    config,
  });
}
function harness(stored, env = {}) {
  const storage = new Map(
    stored === undefined
      ? []
      : [[key, typeof stored === "string" ? stored : JSON.stringify(stored)]],
  );
  const scripts = [];
  const timers = new Map();
  let timerId = 0;
  class Script extends EventTarget {
    remove() {
      scripts.splice(scripts.indexOf(this), 1);
    }
  }
  const window = {
    setTimeout(fn) {
      timers.set(++timerId, fn);
      return timerId;
    },
  };
  const context = vm.createContext({
    console,
    URL,
    Error,
    Date,
    Promise,
    AbortController,
    window,
    clearTimeout(id) {
      timers.delete(id);
    },
    document: {
      querySelector() {
        return scripts[0];
      },
      createElement() {
        return new Script();
      },
      head: {
        append(script) {
          scripts.push(script);
        },
      },
    },
    sessionStorage: {
      getItem(k) {
        return storage.get(k) ?? null;
      },
      setItem(k, v) {
        storage.set(k, v);
      },
      removeItem(k) {
        storage.delete(k);
      },
    },
  });
  const modules = new Map();
  function load(path) {
    const file = resolve(path);
    if (modules.has(file)) return modules.get(file);
    const exports = {};
    modules.set(file, exports);
    const source = readFileSync(file, "utf8").replaceAll(
      "import.meta.env",
      JSON.stringify({ VITE_API_BASE_URL: "https://auth.invalid", ...env }),
    );
    const code = ts.transpileModule(source, {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2023,
        esModuleInterop: true,
      },
    }).outputText;
    const evaluate = vm.runInContext(
      `(function(exports, require) {${code}\n})`,
      context,
      { filename: file },
    );
    evaluate(exports, (specifier) =>
      specifier.startsWith(".")
        ? load(resolve(dirname(file), specifier + ".ts"))
        : require(specifier),
    );
    return exports;
  }
  return {
    store: load(resolve(root, "auth/session.ts")),
    auth: load(resolve(root, "api/auth.ts")),
    admin: load(resolve(root, "api/admin.ts")),
    http: load(resolve(root, "api/authTransport.ts")).authClient,
    client: load(resolve(root, "api/client.ts")).apiClient,
    google: load(resolve(root, "auth/google.ts")),
    redirect: load(resolve(root, "auth/redirect.ts")),
    storage,
    scripts,
    timers,
    window,
  };
}

test("email sends exact request without Authorization and stores both ADMIN tokens together", async () => {
  const h = harness();
  const next = session();
  h.http.defaults.adapter = async (config) => {
    assert.equal(config.url, "/api/auth/admin/login");
    assert.deepEqual(JSON.parse(config.data), {
      email: "admin@example.com",
      password: " plain password ",
    });
    assert.equal(config.headers.get("Authorization"), undefined);
    return ok(config, next);
  };
  await h.auth.loginAdmin({
    email: " admin@example.com ",
    password: " plain password ",
  });
  assert.equal(h.store.getSession().accessToken, next.accessToken);
  assert.equal(JSON.parse(h.storage.get(key)).refreshToken, next.refreshToken);
});

test("invalid email, required inputs and specified maximum lengths never call API", async () => {
  const h = harness();
  h.http.defaults.adapter = () => {
    assert.fail("API must not be called");
  };
  for (const input of [
    { email: "bad", password: "p" },
    { email: "a@b.com", password: " " },
    { email: "a".repeat(101) + "@b.com", password: "p" },
    { email: "a@b.com", password: "p".repeat(65) },
  ]) {
    await assert.rejects(h.auth.loginAdmin(input));
  }
});

test("backend errors are preserved and non-ADMIN responses cannot establish a session", async () => {
  const h = harness();
  let calls = 0;
  h.http.defaults.adapter = async (config) => {
    calls++;
    return unauthorized(config, "이메일 또는 비밀번호가 올바르지 않습니다.");
  };
  await assert.rejects(
    h.auth.loginAdmin({ email: "a@b.com", password: "p" }),
    /이메일 또는 비밀번호/,
  );
  assert.equal(calls, 1);
  h.http.defaults.adapter = async (config) =>
    ok(config, session({ role: "RESIDENT" }));
  await assert.rejects(
    h.auth.loginAdmin({ email: "a@b.com", password: "p" }),
    /관리자/,
  );
  assert.equal(h.store.getSession(), null);
});

test("reload restores valid session, expired access can refresh, expired or malformed storage is removed", () => {
  assert.equal(harness(session()).store.getSession().userId, 2);
  const expiredAccess = harness(
    session({ expiresAt: new Date(Date.now() - 1000).toISOString() }),
  );
  assert.equal(
    expiredAccess.store.isAccessValid(expiredAccess.store.getSession()),
    false,
  );
  assert.ok(expiredAccess.store.getSession());
  for (const stored of [
    "bad-json",
    session({ refreshExpiresAt: new Date(Date.now() - 1000).toISOString() }),
    session({ role: "RESIDENT" }),
    session({ expiresAt: "invalid" }),
  ]) {
    const h = harness(stored);
    assert.equal(h.store.getSession(), null);
    assert.equal(h.storage.has(key), false);
  }
});

test("simultaneous 401s and late old-token responses share one rotation and retry once with new token", async () => {
  const h = harness(session());
  let refreshes = 0;
  const counts = new Map();
  let finishRefresh;
  const gate = new Promise((resolve) => {
    finishRefresh = resolve;
  });
  h.http.defaults.adapter = async (config) => {
    refreshes++;
    assert.deepEqual(JSON.parse(config.data), {
      refreshToken: "test-refresh-1",
    });
    assert.equal(config.headers.get("Authorization"), undefined);
    await gate;
    return ok(
      config,
      session({ accessToken: "test-access-2", refreshToken: "test-refresh-2" }),
    );
  };
  h.client.defaults.adapter = async (config) => {
    counts.set(config.url, (counts.get(config.url) ?? 0) + 1);
    if (config.headers.get("Authorization") === "Bearer test-access-1") {
      if (config.url === "/late") await gate;
      return unauthorized(config);
    }
    assert.equal(config.headers.get("Authorization"), "Bearer test-access-2");
    return ok(config, {});
  };
  const requests = ["/a", "/b", "/late"].map((url) => h.client.get(url));
  await new Promise((resolve) => setImmediate(resolve));
  finishRefresh();
  await Promise.all(requests);
  assert.equal(refreshes, 1);
  assert.deepEqual([...counts.values()], [2, 2, 2]);
  assert.equal(JSON.parse(h.storage.get(key)).refreshToken, "test-refresh-2");
});

test("expired access refreshes before protected requests and rotation rejects reused refresh token", async () => {
  const h = harness(
    session({ expiresAt: new Date(Date.now() - 1000).toISOString() }),
  );
  let refreshes = 0;
  h.http.defaults.adapter = async (config) => {
    refreshes++;
    return ok(
      config,
      session({ accessToken: "test-access-2", refreshToken: "test-refresh-2" }),
    );
  };
  h.client.defaults.adapter = async (config) => {
    assert.equal(config.headers.get("Authorization"), "Bearer test-access-2");
    return ok(config, {});
  };
  await Promise.all([h.client.get("/a"), h.client.get("/b")]);
  assert.equal(refreshes, 1);
  h.http.defaults.adapter = async (config) =>
    ok(config, session({ refreshToken: "test-refresh-2" }));
  await assert.rejects(h.auth.refreshSession(), /새로운 인증 토큰/);
  assert.equal(h.store.getSession(), null);
});

test("failed refresh clears session and rejects every waiting request without loops", async () => {
  const h = harness(session());
  let refreshes = 0;
  h.client.defaults.adapter = async (config) => unauthorized(config);
  h.http.defaults.adapter = async (config) => {
    refreshes++;
    return unauthorized(config);
  };
  const results = await Promise.allSettled([
    h.client.get("/a"),
    h.client.get("/b"),
  ]);
  assert.ok(results.every((result) => result.status === "rejected"));
  assert.equal(refreshes, 1);
  assert.equal(h.store.getSession(), null);
  assert.equal(h.storage.has(key), false);
});

test("second protected 401 clears auth after exactly one retry; authentication endpoints never refresh", async () => {
  const h = harness(session());
  let refreshes = 0;
  let attempts = 0;
  h.http.defaults.adapter = async (config) => {
    refreshes++;
    return ok(
      config,
      session({ accessToken: "test-access-2", refreshToken: "test-refresh-2" }),
    );
  };
  h.client.defaults.adapter = async (config) => {
    attempts++;
    return unauthorized(config);
  };
  await assert.rejects(h.client.get("/protected"));
  assert.equal(attempts, 2);
  assert.equal(refreshes, 1);
  assert.equal(h.store.getSession(), null);
  h.store.setSession(session());
  h.client.defaults.adapter = async (config) => {
    assert.equal(config.headers.get("Authorization"), undefined);
    return unauthorized(config);
  };
  await assert.rejects(h.client.post("/api/auth/admin/login", {}));
  assert.equal(refreshes, 1);
  assert.ok(h.store.getSession());
});

test("old refresh cannot overwrite or clear a newer login session", async () => {
  const h = harness(session());
  let complete;
  h.http.defaults.adapter = (config) =>
    new Promise((resolve) => {
      complete = () =>
        resolve(
          ok(
            config,
            session({ accessToken: "stale", refreshToken: "stale-refresh" }),
          ),
        );
    });
  const pending = h.auth.refreshSession();
  await new Promise((resolve) => setImmediate(resolve));
  h.store.setSession(
    session({
      accessToken: "fresh-login",
      refreshToken: "fresh-login-refresh",
    }),
  );
  complete();
  await assert.rejects(pending, /인증 정보가 변경/);
  assert.equal(h.store.getSession().accessToken, "fresh-login");
});

test("401 from an older login cannot replay a mutation under a newer login of the same administrator", async () => {
  const h = harness(session());
  let rejectRequest;
  let calls = 0;
  h.client.defaults.adapter = (config) => {
    calls++;
    return new Promise((_, reject) => {
      rejectRequest = () => {
        try {
          unauthorized(config);
        } catch (error) {
          reject(error);
        }
      };
    });
  };
  const request = h.client.post("/protected", { change: true });
  await new Promise((resolve) => setImmediate(resolve));
  h.store.setSession(
    session({
      accessToken: "fresh-login",
      refreshToken: "fresh-login-refresh",
    }),
  );
  rejectRequest();
  await assert.rejects(request);
  assert.equal(calls, 1);
  assert.equal(h.store.getSession().accessToken, "fresh-login");
});

test("Google requires configuration and sends GIS credential only as idToken to backend", async () => {
  await assert.rejects(
    harness().auth.startGoogleLogin(),
    /VITE_GOOGLE_CLIENT_ID/,
  );
  const h = harness(undefined, {
    VITE_GOOGLE_CLIENT_ID: "test.apps.googleusercontent.com",
  });
  let callback;
  h.window.google = {
    accounts: {
      id: {
        initialize(options) {
          callback = options.callback;
        },
        prompt() {
          queueMicrotask(() =>
            callback({ credential: "test-google-id-token" }),
          );
        },
        cancel() {},
      },
    },
  };
  h.http.defaults.adapter = async (config) => {
    assert.equal(config.url, "/api/auth/admin/google");
    assert.deepEqual(JSON.parse(config.data), {
      idToken: "test-google-id-token",
    });
    assert.equal(config.headers.get("Authorization"), undefined);
    return ok(config, session());
  };
  await h.auth.startGoogleLogin();
  assert.ok(h.store.getSession());
  assert.equal(h.timers.size, 0);
});

test("Google cancellation and SDK failures release pending state for retry", async () => {
  const h = harness(undefined, { VITE_GOOGLE_CLIENT_ID: "test-client" });
  const failed = h.google.requestGoogleIdToken();
  assert.equal(h.scripts.length, 1);
  h.scripts[0].dispatchEvent(new Event("error"));
  await assert.rejects(failed, /불러오지/);
  assert.equal(h.scripts.length, 0);
  let cancellations = 0;
  h.window.google = {
    accounts: {
      id: {
        initialize() {},
        prompt() {},
        cancel() {
          cancellations++;
        },
      },
    },
  };
  const controller = new AbortController();
  const pending = h.google.requestGoogleIdToken(controller.signal);
  await new Promise((resolve) => setImmediate(resolve));
  controller.abort();
  await assert.rejects(pending, /취소/);
  assert.equal(cancellations, 1);
  assert.equal(h.timers.size, 0);
  const timeout = h.google.requestGoogleIdToken();
  await new Promise((resolve) => setImmediate(resolve));
  [...h.timers.values()][0]();
  await assert.rejects(timeout, /완료하지/);
  assert.equal(h.timers.size, 0);
});

test("ADMIN requiresConsent stays false and never enables a resident consent flow", async () => {
  for (const requiresConsent of [true, undefined, "false"]) {
    const h = harness();
    h.http.defaults.adapter = async (config) =>
      ok(config, session({ requiresConsent }));
    await assert.rejects(
      h.auth.loginAdmin({ email: "admin@example.com", password: "p" }),
      /동의 상태/,
    );
    assert.equal(h.store.getSession(), null);
  }
  const h = harness();
  h.http.defaults.adapter = async (config) => ok(config, session());
  await h.auth.loginAdmin({ email: "admin@example.com", password: "p" });
  assert.equal(h.store.getSession().requiresConsent, false);
});

test("all specified Google failures preserve server messages without attempting JWT refresh", async () => {
  for (const [status, code, message] of [
    [401, "USER_401_2", "구글 인증 정보가 올바르지 않습니다."],
    [403, "USER_403_1", "구글 로그인이 허용되지 않은 계정입니다."],
    [409, "USER_409_2", "기존 계정에 구글 계정 연결이 필요합니다."],
    [503, "USER_503_1", "구글 로그인 설정이 필요합니다."],
  ]) {
    const h = harness(session(), { VITE_GOOGLE_CLIENT_ID: "test-client" });
    const original = h.store.getSession();
    let callback;
    let requests = 0;
    h.window.google = {
      accounts: {
        id: {
          initialize(options) {
            callback = options.callback;
          },
          prompt() {
            queueMicrotask(() => callback({ credential: "test-id-token" }));
          },
          cancel() {},
        },
      },
    };
    h.http.defaults.adapter = async (config) => {
      requests++;
      assert.equal(config.url, "/api/auth/admin/google");
      assert.equal(config.headers.get("Authorization"), undefined);
      throw new axios.AxiosError("Rejected", "ERR_BAD_REQUEST", config, null, {
        status,
        data: { isSuccess: false, code, message, result: null },
        headers: {},
        config,
      });
    };
    await assert.rejects(
      h.auth.startGoogleLogin(),
      (error) =>
        error.message === message &&
        error.code === code &&
        error.status === status,
    );
    assert.equal(requests, 1);
    assert.strictEqual(h.store.getSession(), original);
  }
});

test("refresh network, server and permission errors do not masquerade as an expired refresh token", async () => {
  for (const status of [undefined, 403, 500, 503]) {
    const h = harness(session());
    const original = h.store.getSession();
    h.http.defaults.adapter = async (config) => {
      throw new axios.AxiosError(
        "Unavailable",
        "ERR_NETWORK",
        config,
        null,
        status === undefined
          ? undefined
          : {
              status,
              data: {
                code: status === 403 ? "COMMON_403_1" : "COMMON_500_1",
                message: "일시적 오류",
              },
              headers: {},
              config,
            },
      );
    };
    await assert.rejects(h.auth.refreshSession());
    assert.strictEqual(h.store.getSession(), original);
    assert.ok(h.storage.has(key));
  }
  const h = harness(session());
  h.http.defaults.adapter = async (config) => {
    throw new axios.AxiosError("Expired", "ERR_BAD_REQUEST", config, null, {
      status: 401,
      data: {
        code: "USER_401_4",
        message: "리프레시 토큰이 유효하지 않거나 만료되었습니다.",
      },
      headers: {},
      config,
    });
  };
  await assert.rejects(h.auth.refreshSession(), /리프레시 토큰/);
  assert.equal(h.store.getSession(), null);
});

test("account profile uses authenticated GET, handles null jurisdiction, and shares one request", async () => {
  const h = harness(session());
  let calls = 0;
  h.client.defaults.adapter = async (config) => {
    calls++;
    assert.equal(config.method, "get");
    assert.equal(config.url, "/api/admin/me");
    assert.equal(config.data, undefined);
    assert.equal(config.params, undefined);
    assert.equal(config.headers.get("Authorization"), "Bearer test-access-1");
    return ok(config, { name: "김담당", jurisdiction: null });
  };
  const first = h.admin.getAdminProfile();
  const second = h.admin.getAdminProfile();
  assert.strictEqual(first, second);
  const profile = await first;
  assert.equal(profile.name, "김담당");
  assert.equal(profile.jurisdiction, null);
  assert.equal(calls, 1);
  assert.equal(h.store.getSession().email, "admin@example.com");
});

test("profile 401 shares existing refresh flow, while 403/500/network errors keep auth", async () => {
  const h = harness(session());
  let refreshes = 0;
  h.http.defaults.adapter = async (config) => {
    refreshes++;
    return ok(
      config,
      session({ accessToken: "new-access", refreshToken: "new-refresh" }),
    );
  };
  h.client.defaults.adapter = async (config) => {
    if (config.headers.get("Authorization") === "Bearer test-access-1")
      return unauthorized(config);
    return ok(config, { name: "최신 담당자", jurisdiction: "부천시" });
  };
  assert.equal((await h.admin.getAdminProfile()).jurisdiction, "부천시");
  assert.equal(refreshes, 1);
  for (const status of [403, 500, undefined]) {
    const other = harness(session());
    const original = other.store.getSession();
    other.client.defaults.adapter = async (config) => {
      throw new axios.AxiosError(
        "Unavailable",
        "ERR_NETWORK",
        config,
        null,
        status === undefined
          ? undefined
          : {
              status,
              data: { message: "계정 조회 실패" },
              headers: {},
              config,
            },
      );
    };
    await assert.rejects(other.admin.getAdminProfile());
    assert.strictEqual(other.store.getSession(), original);
  }
});

test("profile result from an older login cannot be used by a newer session", async () => {
  const h = harness(session());
  let complete;
  h.client.defaults.adapter = (config) =>
    new Promise((resolve) => {
      complete = () =>
        resolve(ok(config, { name: "이전 담당자", jurisdiction: "이전 관할" }));
    });
  const old = h.admin.getAdminProfile();
  await new Promise((resolve) => setImmediate(resolve));
  h.store.setSession(
    session({ accessToken: "new-login", refreshToken: "new-login-refresh" }),
  );
  complete();
  await assert.rejects(old, /인증 정보가 변경/);
  h.client.defaults.adapter = async (config) =>
    ok(config, { name: "새 담당자", jurisdiction: "새 관할" });
  assert.equal((await h.admin.getAdminProfile()).name, "새 담당자");
});

test("loaded GIS script without accounts.id is removed and a fresh script is used on retry", async () => {
  const h = harness(undefined, { VITE_GOOGLE_CLIENT_ID: "test-client" });
  const first = h.google.requestGoogleIdToken();
  const oldScript = h.scripts[0];
  oldScript.dispatchEvent(new Event("load"));
  await assert.rejects(first, /초기화하지/);
  assert.equal(h.scripts.length, 0);
  assert.equal(h.timers.size, 0);
  const second = h.google.requestGoogleIdToken();
  assert.equal(h.scripts.length, 1);
  assert.notStrictEqual(h.scripts[0], oldScript);
  h.scripts[0].dispatchEvent(new Event("error"));
  await assert.rejects(second, /불러오지/);
});

test("both token lifetimes must be finite positive numbers", () => {
  const h = harness();
  for (const field of ["expiresIn", "refreshExpiresIn"]) {
    for (const value of [Infinity, -Infinity, NaN, 0, -1, "3600"]) {
      assert.throws(() => h.store.parseSession(session({ [field]: value })));
    }
  }
  assert.equal(h.store.parseSession(session()).expiresIn, 3600);
});

test("login return path preserves internal pathname, query and hash while rejecting unsafe destinations", () => {
  const { getLoginDestination } = harness().redirect;
  assert.equal(
    getLoginDestination({ from: "/inspection/000001?tab=results#memo" }),
    "/inspection/000001?tab=results#memo",
  );
  assert.equal(
    getLoginDestination({ from: "/gis?next=https://example.com#map" }),
    "/gis?next=https://example.com#map",
  );
  for (const from of [
    "//evil.example",
    "https://evil.example",
    "javascript:alert(1)",
    "/\\evil.example",
    "/%2f%2fevil.example",
    "/%5cevil.example",
    "/%0aevil",
    "/login",
    "/signup/",
    "/gis/../login",
    "/%6cogin",
    "/%zz",
    " /gis",
    null,
    { pathname: "/gis" },
  ]) {
    assert.equal(getLoginDestination({ from }), "/");
  }
  assert.equal(getLoginDestination(undefined), "/");
});

function guardHarness(initialSession, refresh) {
  let current = initialSession;
  let effect;
  let focus;
  let nextTimer = 0;
  const timers = new Map();
  const errors = [];
  const location = {
    pathname: "/inspection/000001",
    search: "?tab=results",
    hash: "#memo",
  };
  const isAccessValid = (value) =>
    value !== null &&
    Date.parse(value.expiresAt) > Date.now() &&
    Date.parse(value.refreshExpiresAt) > Date.now();
  const exports = {};
  const source = readFileSync(resolve(root, "auth/RequireAdmin.tsx"), "utf8");
  const code = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2023,
      jsx: ts.JsxEmit.ReactJSX,
    },
  }).outputText;
  vm.runInNewContext(code, {
    exports,
    Error,
    Date,
    Promise,
    require(specifier) {
      if (specifier === "react")
        return {
          useEffect(callback) {
            effect = callback;
          },
          useState() {
            return [null, (value) => errors.push(value)];
          },
          useSyncExternalStore(_subscribe, snapshot) {
            return snapshot();
          },
        };
      if (specifier === "react-router-dom")
        return {
          Navigate: "Navigate",
          Outlet: "Outlet",
          useLocation: () => location,
        };
      if (specifier === "../api/auth") return { refreshSession: refresh };
      if (specifier === "./session")
        return {
          getSession: () => current,
          isAccessValid,
          subscribeSession() {},
        };
      return require(specifier);
    },
    window: {
      setTimeout(fn, delay) {
        const id = ++nextTimer;
        timers.set(id, { fn, delay });
        return id;
      },
      addEventListener(event, callback) {
        assert.equal(event, "focus");
        focus = callback;
      },
      removeEventListener(event, callback) {
        assert.equal(event, "focus");
        if (focus === callback) focus = undefined;
      },
    },
    clearTimeout(id) {
      timers.delete(id);
    },
  });
  const output = exports.default();
  const cleanup = effect();
  return {
    output,
    timers,
    errors,
    setSession(value) {
      current = value;
    },
    focus() {
      focus?.();
    },
    unmount() {
      cleanup?.();
    },
    async runNext() {
      const entry = timers.entries().next().value;
      assert.ok(entry, "expected a scheduled timer");
      const [id, item] = entry;
      timers.delete(id);
      item.fn();
      await new Promise((resolve) => setImmediate(resolve));
    },
  };
}

test("unauthenticated guard passes pathname, query and hash through login state", () => {
  const h = guardHarness(null, () =>
    assert.fail("must not refresh without a session"),
  );
  assert.equal(h.output.props.to, "/login");
  assert.equal(
    h.output.props.state.from,
    "/inspection/000001?tab=results#memo",
  );
  assert.equal(h.timers.size, 0);
});

test("transient refresh failures retry with capped backoff and clean up on unmount", async () => {
  let calls = 0;
  const h = guardHarness(
    session({ expiresAt: new Date(Date.now() - 1000).toISOString() }),
    async () => {
      calls++;
      throw new Error("network unavailable");
    },
  );
  assert.equal([...h.timers.values()][0].delay, 0);
  for (const delay of [1000, 2000, 4000, 8000, 16000, 30000, 30000]) {
    await h.runNext();
    assert.equal(h.timers.size, 1);
    assert.equal([...h.timers.values()][0].delay, delay);
  }
  assert.equal(calls, 7);
  h.unmount();
  assert.equal(h.timers.size, 0);
  h.focus();
  assert.equal(calls, 7);
});

test("cleared or replaced sessions never schedule further refresh retries", async () => {
  for (const next of [null, session({ accessToken: "new-login" })]) {
    let h;
    h = guardHarness(
      session({ expiresAt: new Date(Date.now() - 1000).toISOString() }),
      async () => {
        h.setSession(next);
        throw new Error("auth changed");
      },
    );
    await h.runNext();
    assert.equal(h.timers.size, 0);
    assert.equal(h.errors.length, 0);
    h.unmount();
  }
});

test("focus keeps the existing expiry check and does not create concurrent retries", async () => {
  const valid = guardHarness(session(), () =>
    assert.fail("must not refresh valid access on focus"),
  );
  valid.focus();
  valid.unmount();
  let calls = 0;
  let fail;
  const h = guardHarness(
    session({ expiresAt: new Date(Date.now() - 1000).toISOString() }),
    () => {
      calls++;
      return new Promise((_, reject) => {
        fail = reject;
      });
    },
  );
  await h.runNext();
  h.focus();
  assert.equal(calls, 1);
  fail(new Error("network unavailable"));
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(h.timers.size, 1);
  h.focus();
  assert.equal(calls, 2);
  assert.equal(h.timers.size, 0);
  h.unmount();
  fail(new Error("network unavailable"));
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(h.timers.size, 0);
});
