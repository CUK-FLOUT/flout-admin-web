import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import vm from "node:vm";
import ts from "typescript";

function mount() {
  const slots = [],
    effects = [],
    listeners = new Map(),
    requests = [];
  let index = 0,
    tree;
  class Node {}
  const jsx = (type, props) => ({ type, props: props || {} });
  const module = { exports: {} };
  const code = ts.transpileModule(
    readFileSync("src/components/layout/ProfileMenu.tsx", "utf8"),
    {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        jsx: ts.JsxEmit.ReactJSX,
      },
    },
  ).outputText;
  vm.runInNewContext(code, {
    module,
    exports: module.exports,
    Node,
    Error,
    document: {
      addEventListener: (name, fn) => listeners.set(name, fn),
      removeEventListener: (name, fn) => {
        if (listeners.get(name) === fn) listeners.delete(name);
      },
    },
    require(name) {
      if (name === "react/jsx-runtime") return { jsx, jsxs: jsx };
      if (name === "react")
        return {
          useId: () => "profile-test",
          useRef: (initial) => (slots[index++] ??= { current: initial }),
          useState(initial) {
            const i = index++;
            if (!(i in slots)) slots[i] = initial;
            return [
              slots[i],
              (value) => {
                slots[i] =
                  typeof value === "function" ? value(slots[i]) : value;
              },
            ];
          },
          useEffect(setup, deps) {
            const i = index++,
              previous = slots[i];
            if (
              !previous ||
              deps.some((value, j) => value !== previous.deps[j])
            )
              effects.push(() => {
                previous?.cleanup?.();
                slots[i] = { deps, cleanup: setup() };
              });
          },
        };
      if (name.endsWith("/api/auth"))
        return {
          logoutAdmin: () =>
            new Promise((resolve, reject) =>
              requests.push({ resolve, reject }),
            ),
        };
      return {};
    },
  });
  function find(predicate, node) {
    if (Array.isArray(node))
      return node.map((item) => find(predicate, item)).find(Boolean);
    if (!node || typeof node !== "object") return undefined;
    if (predicate(node)) return node;
    return find(predicate, node.props?.children);
  }
  function render() {
    index = 0;
    tree = module.exports.default({ name: "테스트 운영자" });
    effects.splice(0).forEach((effect) => effect());
  }
  function trigger() {
    return find(
      (node) =>
        node.type === "button" && node.props["aria-haspopup"] === "menu",
      tree,
    ).props;
  }
  function menu() {
    return find((node) => node.props.role === "menu", tree);
  }
  function item() {
    return find((node) => node.props.role === "menuitem", tree).props;
  }
  function open() {
    trigger().onClick();
    render();
  }
  render();
  return {
    render,
    open,
    trigger,
    menu,
    item,
    requests,
    outside: () => listeners.get("pointerdown")?.({ target: new Node() }),
    blur: () =>
      tree.props.onBlur({
        currentTarget: { contains: () => false },
        relatedTarget: null,
      }),
    escape: () =>
      tree.props.onKeyDown({
        key: "Escape",
        preventDefault() {},
        stopPropagation() {},
      }),
    alert: () => find((node) => node.props.role === "alert", tree),
    unmount: () => slots.forEach((slot) => slot?.cleanup?.()),
    listenerCount: () => listeners.size,
  };
}
const settle = () => new Promise(setImmediate);

test("pending logout survives every dismissal path and exposes failure with retry", async () => {
  const h = mount();
  h.open();
  h.item().onClick();
  h.render();
  assert.equal(h.trigger()["aria-disabled"], true);
  for (const dismiss of [
    h.outside,
    h.blur,
    h.escape,
    () => h.trigger().onClick(),
  ]) {
    dismiss();
    h.render();
    assert(h.menu(), "Pending logout must keep its failure/retry UI visible");
  }
  h.item().onClick();
  assert.equal(h.requests.length, 1);
  h.requests[0].reject(new Error("서버 연결 실패"));
  await settle();
  h.render();
  assert(h.menu());
  assert.equal(h.alert().props.children, "서버 연결 실패");
  assert.equal(h.item()["aria-disabled"], false);
  h.item().onClick();
  h.render();
  assert.equal(h.requests.length, 2);
  h.requests[1].resolve();
  await settle();
  h.render();
  assert.equal(h.menu(), undefined);
  assert.equal(h.listenerCount(), 0);
  h.unmount();
});

test("idle menu retains outside, blur, Escape and trigger dismissal with listener cleanup", () => {
  const h = mount();
  for (const dismiss of [
    h.outside,
    h.blur,
    h.escape,
    () => h.trigger().onClick(),
  ]) {
    h.open();
    assert(h.menu());
    assert.equal(h.listenerCount(), 1);
    dismiss();
    h.render();
    assert.equal(h.menu(), undefined);
    assert.equal(h.listenerCount(), 0);
  }
  h.open();
  h.unmount();
  assert.equal(h.listenerCount(), 0);
});
