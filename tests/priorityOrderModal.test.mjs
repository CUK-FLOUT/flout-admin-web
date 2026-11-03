import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";

function render(order = ["A", "B", "C"]) {
  const effects = [];
  const moves = [];
  let cancelled = 0,
    saved = 0,
    restoredFocus = false;
  class Element {
    constructor() {
      this.style = { overflow: "auto", scrollbarGutter: "" };
      this.clientWidth = 1440;
      this.offsetWidth = 1440;
    }
    focus() {
      restoredFocus = true;
    }
  }
  const html = new Element(),
    body = new Element(),
    main = new Element();
  main.style.scrollbarGutter = "stable";
  const dialog = {
    open: false,
    showModal() {
      this.open = true;
    },
    close() {
      this.open = false;
    },
    querySelector() {
      return null;
    },
  };
  let refIndex = 0;
  const jsx = (type, props, key) => ({ type, props: props || {}, key });
  const mod = { exports: {} };
  const source = ts.transpileModule(
    readFileSync("src/components/priority/PriorityOrderModal.tsx", "utf8"),
    {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        jsx: ts.JsxEmit.ReactJSX,
        target: ts.ScriptTarget.ES2023,
      },
    },
  ).outputText;
  vm.runInNewContext(source, {
    module: mod,
    exports: mod.exports,
    HTMLElement: Element,
    window: { innerWidth: 1440 },
    document: {
      documentElement: html,
      body,
      activeElement: new Element(),
      querySelector() {
        return main;
      },
    },
    require(name) {
      if (name.endsWith(".svg")) return { default: name };
      if (name === "react/jsx-runtime") return { jsx, jsxs: jsx };
      if (name === "react")
        return {
          useEffect(fn) {
            effects.push(fn);
          },
          useRef(value) {
            return { current: refIndex++ === 0 ? dialog : value };
          },
          useState(value) {
            return [value, () => {}];
          },
        };
      throw new Error(name);
    },
  });
  const applications = order.map((id) => ({
    id,
    risk: "높음",
    floodExperience: "있음",
    reason: "요청",
    nearby: 1,
  }));
  const tree = mod.exports.default({
    applications,
    order,
    onMove: (id, delta) => moves.push([id, delta]),
    onCancel: () => cancelled++,
    onSave: () => saved++,
  });
  const nodes = [];
  function walk(node) {
    if (Array.isArray(node)) return node.forEach(walk);
    if (!node || typeof node !== "object") return;
    nodes.push(node);
    walk(node.props.children);
  }
  walk(tree);
  return {
    tree,
    nodes,
    moves,
    effects,
    html,
    body,
    main,
    dialog,
    get cancelled() {
      return cancelled;
    },
    get saved() {
      return saved;
    },
    get restoredFocus() {
      return restoredFocus;
    },
  };
}

test("non-adjacent drag inserts the entry rather than swapping unrelated entries", () => {
  const h = render();
  const handle = h.nodes.find((n) => n.props["aria-label"] === "A 순서 변경");
  handle.props.onDragStart({ dataTransfer: { setData() {} } });
  const target = h.nodes.find((n) => n.props["data-order-id"] === "C");
  target.props.onDrop({ preventDefault() {} });
  assert.deepEqual(h.moves, [
    ["A", 1],
    ["A", 1],
  ]);
});

test("keyboard respects first and last boundaries; cancel, escape and save are independent", () => {
  const h = render();
  const first = h.nodes.find((n) => n.props["aria-label"] === "A 순서 변경");
  first.props.onKeyDown({ key: "ArrowUp", preventDefault() {} });
  assert.equal(h.moves.length, 0);
  first.props.onKeyDown({ key: "ArrowDown", preventDefault() {} });
  assert.deepEqual(h.moves, [["A", 1]]);
  h.nodes
    .find((n) => n.type === "button" && n.props.children === "취소")
    .props.onClick();
  h.tree.props.onCancel({ preventDefault() {} });
  assert.equal(h.cancelled, 2);
  assert.equal(h.saved, 0);
  h.nodes
    .find((n) => n.type === "button" && n.props.children === "선정 순서 저장")
    .props.onClick();
  assert.equal(h.saved, 1);
});

test("scroll locks and focus are restored exactly after modal closes", () => {
  const h = render();
  const cleanup = h.effects[0]();
  assert.equal(h.dialog.open, true);
  assert.equal(h.main.style.overflow, "hidden");
  assert.equal(h.html.style.scrollbarGutter, "");
  cleanup();
  assert.equal(h.dialog.open, false);
  assert.equal(h.main.style.overflow, "auto");
  assert.equal(h.main.style.scrollbarGutter, "stable");
  assert.equal(h.body.style.overflow, "auto");
  assert.equal(h.restoredFocus, true);
});
