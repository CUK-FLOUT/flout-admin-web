import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import vm from "node:vm";
import ts from "typescript";

function mount(iso, visibilityState = "visible") {
  let now = Date.parse(iso), state, mounted = false, cleanup, timerId = 0;
  const timers = new Map(), listeners = new Map(), exports = {};
  const document = {
    visibilityState,
    addEventListener: (name, listener) => listeners.set(name, listener),
    removeEventListener(name, listener) {
      if (listeners.get(name) === listener) listeners.delete(name);
    },
  };
  const jsx = (type, props) => ({ type, props });
  vm.runInNewContext(ts.transpileModule(readFileSync("src/components/layout/WorkClock.tsx", "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
  }).outputText, {
    exports, document, Date: class extends Date { static now() { return now; } }, Intl,
    window: {
      setInterval(fn) { timers.set(++timerId, fn); return timerId; },
      clearInterval: (id) => timers.delete(id),
    },
    require(name) {
      if (name === "react/jsx-runtime") return { jsx, jsxs: jsx };
      if (name === "react") return {
        useState(initial) {
          if (state === undefined) state = initial();
          return [state, (next) => { state = next; }];
        },
        useEffect(setup) { if (!mounted) { cleanup = setup(); mounted = true; } },
      };
      throw new Error(name);
    },
  });
  return {
    render: () => exports.default(), timers, listeners,
    advance(ms) { now += ms; },
    tick() { for (const timer of [...timers.values()]) timer(); },
    visibility(value) { document.visibilityState = value; listeners.get("visibilitychange")?.(); },
    unmount() { cleanup?.(); },
  };
}
const text = (view) => view.render().props.children.join("");

test("clock renders Korean time and rolls over at Korean midnight", () => {
  const view = mount("2026-12-31T14:59:59Z");
  assert.equal(text(view), "업무일자: 2026-12-31 23:59:59");
  assert.equal(view.render().props.dateTime, "2026-12-31T14:59:59.000Z");
  assert.equal(view.timers.size, 1);
  view.advance(1000); view.tick();
  assert.equal(text(view), "업무일자: 2027-01-01 00:00:00");
});

test("clock uses current wall time after delayed ticks, rather than counting seconds", () => {
  const view = mount("2026-11-13T01:00:00Z"); view.render();
  view.advance(65000); view.tick();
  assert.equal(text(view), "업무일자: 2026-11-13 10:01:05");
});

test("hidden tab stops ticking; return syncs immediately without duplicate timers; unmount cleans up", () => {
  const view = mount("2026-11-13T01:00:00Z"); view.render();
  view.visibility("hidden"); assert.equal(view.timers.size, 0);
  view.advance(3600000); view.visibility("visible");
  assert.equal(text(view), "업무일자: 2026-11-13 11:00:00");
  view.visibility("visible"); assert.equal(view.timers.size, 1);
  view.unmount(); assert.equal(view.timers.size, 0); assert.equal(view.listeners.size, 0);
});

test("initially hidden tab waits for visibility before starting its timer", () => {
  const view = mount("2026-11-13T01:00:00Z", "hidden"); view.render();
  assert.equal(view.timers.size, 0);
  view.advance(5000); view.visibility("visible");
  assert.equal(text(view), "업무일자: 2026-11-13 10:00:05");
  assert.equal(view.timers.size, 1);
});
