import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import vm from "node:vm";
import ts from "typescript";

const settle = async () => {
  for (let i = 0; i < 20; i++) await Promise.resolve();
};
const deferred = () => {
  let resolve, reject;
  const promise = new Promise((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
};

function harness() {
  let now = 0,
    sequence = 0,
    index = 0;
  let session = { refreshExpiresAt: "2099-01-01T00:00:00Z" },
    generation = 0;
  const timers = new Map(),
    slots = [],
    effects = [],
    listeners = new Set();
  const document = new EventTarget();
  document.visibilityState = "visible";
  const clock = {
    setTimeout(callback, delay) {
      const id = ++sequence;
      timers.set(id, { time: now + delay, callback });
      return id;
    },
    clearTimeout(id) {
      timers.delete(id);
    },
  };
  const react = {
    useState(initial) {
      const i = index++;
      if (!slots[i])
        slots[i] = {
          value: typeof initial === "function" ? initial() : initial,
        };
      return [
        slots[i].value,
        (next) => {
          slots[i].value =
            typeof next === "function" ? next(slots[i].value) : next;
        },
      ];
    },
    useRef(initial) {
      const i = index++;
      return (slots[i] ??= { current: initial });
    },
    useEffectEvent(callback) {
      const i = index++;
      if (!slots[i]) {
        const slot = { callback };
        slot.event = (...args) => slot.callback(...args);
        slots[i] = slot;
      }
      slots[i].callback = callback;
      return slots[i].event;
    },
    useEffect(setup, deps) {
      const i = index++;
      const previous = slots[i];
      if (
        !previous ||
        deps.some((value, i) => !Object.is(value, previous.deps[i]))
      ) {
        previous?.cleanup?.();
        slots[i] = { deps };
        effects.push(() => {
          slots[i].cleanup = setup();
        });
      }
    },
  };
  const modules = new Map();
  function load(path) {
    if (modules.has(path)) return modules.get(path);
    const module = { exports: {} };
    const code = ts.transpileModule(readFileSync(path, "utf8"), {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2023,
      },
    }).outputText;
    vm.runInNewContext(code, {
      module,
      exports: module.exports,
      ...clock,
      document,
      AbortController,
      Date,
      require(name) {
        if (name === "react") return react;
        if (name === "../auth/session")
          return {
            getSession: () => session,
            getSessionGeneration: () => generation,
            subscribeSession: (callback) => {
              listeners.add(callback);
              return () => listeners.delete(callback);
            },
          };
        if (name === "./pagePolling") return load("src/hooks/pagePolling.ts");
        throw new Error(name);
      },
    });
    modules.set(path, module.exports);
    return module.exports;
  }
  const { usePagePolling } = load("src/hooks/usePagePolling.ts");
  return {
    core: load("src/hooks/pagePolling.ts").createPagePolling,
    render(props) {
      index = 0;
      const result = usePagePolling({
        errorMessage: (error) => error.message,
        ...props,
      });
      effects.splice(0).forEach((effect) => effect());
      return result;
    },
    async advance(ms = 0) {
      const end = now + ms;
      for (;;) {
        const next = [...timers]
          .filter(([, timer]) => timer.time <= end)
          .sort((a, b) => a[1].time - b[1].time)[0];
        if (!next) break;
        now = next[1].time;
        timers.delete(next[0]);
        next[1].callback();
        await settle();
      }
      now = end;
      await settle();
    },
    visibility(value) {
      document.visibilityState = value;
      document.dispatchEvent(new Event("visibilitychange"));
    },
    auth(next, rotate = false) {
      session = next;
      if (!rotate) generation++;
      listeners.forEach((listener) => listener());
    },
    dispose() {
      slots.forEach((slot) => slot.cleanup?.());
    },
    timerCount: () => timers.size,
    subscriptionCount: () => listeners.size,
  };
}

test("initial request, 30-second repeat and unchanged data retain the same reference", async () => {
  const h = harness();
  let calls = 0;
  const props = {
    queryKey: "page=2&district=소사구",
    load: async () => {
      calls++;
      return { ids: [2, 3] };
    },
  };
  assert.equal(h.render(props).loading, true);
  await h.advance();
  const first = h.render(props);
  assert.equal(first.loading, false);
  await h.advance(29999);
  assert.equal(calls, 1);
  await h.advance(1);
  assert.equal(calls, 2);
  assert.equal(h.render(props).data, first.data);
  h.dispose();
  assert.equal(h.timerCount(), 0);
});

test("slow requests never overlap even after several intervals or refresh events", async () => {
  const h = harness(),
    wait = deferred();
  let calls = 0;
  const polling = h.core({
    allowed: () => true,
    request: async () => {
      calls++;
      await wait.promise;
    },
  });
  polling.refresh();
  await h.advance(90000);
  polling.refresh();
  polling.refresh();
  assert.equal(calls, 1);
  wait.resolve();
  await settle();
  assert.equal(calls, 1);
  await h.advance(30000);
  assert.equal(calls, 2);
  polling.dispose();
});

test("hidden tabs suspend requests, resume immediately and clean up on navigation", async () => {
  const h = harness();
  let calls = 0;
  const props = { queryKey: "gis", load: async () => ++calls };
  h.render(props);
  await h.advance();
  h.visibility("hidden");
  await h.advance(120000);
  assert.equal(calls, 1);
  h.visibility("visible");
  await settle();
  assert.equal(calls, 2);
  h.dispose();
  h.visibility("visible");
  await h.advance(120000);
  assert.equal(calls, 2);
  assert.equal(h.subscriptionCount(), 0);
});

test("hidden in-flight request is aborted and cannot overwrite resumed data", async () => {
  const h = harness(),
    wait = deferred();
  let calls = 0,
    signal;
  const props = {
    queryKey: "gis",
    load: (s) => {
      signal = s;
      return ++calls === 1 ? wait.promise : Promise.resolve("latest");
    },
  };
  h.render(props);
  await h.advance();
  h.visibility("hidden");
  assert.equal(signal.aborted, true);
  h.visibility("visible");
  assert.equal(calls, 1);
  wait.resolve("old");
  await settle();
  assert.equal(calls, 2);
  assert.equal(h.render(props).data, "latest");
  h.dispose();
});

test("query changes cancel stale responses and keep the requested filters/page", async () => {
  const h = harness(),
    old = deferred();
  let signal;
  h.render({
    queryKey: "page=1",
    load: (s) => {
      signal = s;
      return old.promise;
    },
  });
  await h.advance();
  const next = { queryKey: "page=2&risk=HIGH", load: async () => "page2" };
  h.render(next);
  assert.equal(signal.aborted, true);
  await h.advance();
  old.resolve("page1");
  await settle();
  assert.equal(h.render(next).data, "page2");
  h.dispose();
});

test("failures retain successful data, back off and recover without loading flicker", async () => {
  const h = harness();
  let calls = 0;
  const props = {
    queryKey: "support",
    load: async () => {
      calls++;
      if (calls === 2 || calls === 3) throw new Error("offline");
      return calls;
    },
  };
  h.render(props);
  await h.advance();
  await h.advance(30000);
  const failed = h.render(props);
  assert.equal(failed.data, 1);
  assert.equal(failed.loading, false);
  assert.match(failed.error, /offline/);
  await h.advance(59999);
  assert.equal(calls, 2);
  await h.advance(1);
  assert.equal(calls, 3);
  await h.advance(120000);
  assert.equal(h.render(props).data, 4);
  assert.equal(h.render(props).error, "");
  h.dispose();
});

test("selection/modal pause cancels polling and resume refreshes without clearing data", async () => {
  const h = harness();
  let calls = 0;
  const props = { queryKey: "priority", load: async () => ++calls };
  h.render(props);
  await h.advance();
  h.render({ ...props, paused: true });
  await h.advance(90000);
  assert.equal(calls, 1);
  assert.equal(h.render({ ...props, paused: true }).data, 1);
  h.render(props);
  await h.advance();
  assert.equal(calls, 2);
  h.dispose();
});

test("logout aborts pending data, rejects late responses and removes scheduled work", async () => {
  const h = harness(),
    wait = deferred();
  let signal,
    calls = 0;
  const props = {
    queryKey: "inspection",
    load: (s) => {
      signal = s;
      calls++;
      return wait.promise;
    },
  };
  h.render(props);
  await h.advance();
  h.auth(null);
  assert.equal(signal.aborted, true);
  wait.resolve("private data");
  await settle();
  assert.equal(h.render(props).data, undefined);
  await h.advance(120000);
  assert.equal(calls, 1);
  h.dispose();
});

test("token rotation does not trigger another business request", async () => {
  const h = harness();
  let calls = 0;
  const props = { queryKey: "stats", load: async () => ++calls };
  h.render(props);
  await h.advance();
  h.auth({ refreshExpiresAt: "2099-01-01T00:00:00Z" }, true);
  await h.advance(1000);
  assert.equal(calls, 1);
  h.dispose();
});

test("StrictMode setup/cleanup probe cannot dispatch the deferred initial request", async () => {
  const h = harness();
  let calls = 0;
  h.render({ queryKey: "gis", load: async () => ++calls });
  h.dispose();
  await h.advance();
  assert.equal(calls, 0);
});

test("explicit refresh after saving runs once while modal polling stays paused", async () => {
  const h = harness();
  let calls = 0;
  const props = { queryKey: "priority", load: async () => ++calls };
  h.render(props);
  await h.advance();
  h.render({ ...props, paused: true });
  h.render({ ...props, paused: true, revision: 1 });
  await h.advance();
  assert.equal(calls, 2);
  await h.advance(120000);
  assert.equal(calls, 2);
  assert.equal(h.render({ ...props, paused: true, revision: 1 }).data, 2);
  h.dispose();
});

test("expired refresh sessions cannot dispatch a polling request", async () => {
  const h = harness();
  let calls = 0;
  h.auth({ refreshExpiresAt: "2000-01-01T00:00:00Z" });
  h.render({ queryKey: "expired", load: async () => ++calls });
  await h.advance(120000);
  assert.equal(calls, 0);
  h.dispose();
});
