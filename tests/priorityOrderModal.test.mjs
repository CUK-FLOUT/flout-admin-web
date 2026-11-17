import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";

function render(
  order = ["A", "B", "C"],
  { openerConnected = true, busy = false, loading = false } = {},
) {
  const effects = [];
  const moves = [];
  const announcements = [];
  let cancelled = 0,
    saved = 0,
    restoredFocus = false,
    focusTarget = null;
  const frames = new Map();
  let frameId = 0;
  class Element {
    constructor() {
      this.style = { overflow: "auto", scrollbarGutter: "" };
      this.isConnected = true;
      this.clientWidth = 1440;
      this.offsetWidth = 1440;
    }
    focus() {
      restoredFocus = true;
      focusTarget = this;
    }
  }
  const html = new Element(),
    body = new Element(),
    main = new Element();
  main.style.scrollbarGutter = "stable";
  const opener = new Element(),
    trigger = new Element();
  opener.isConnected = openerConnected;
  const viewport = {
    scrollTop: 0,
    getBoundingClientRect() {
      return { top: 100, bottom: 300 };
    },
  };
  let capturedPointer = null;
  let hitId = null;
  const dialog = {
    setPointerCapture(id) {
      capturedPointer = id;
    },
    hasPointerCapture(id) {
      return capturedPointer === id;
    },
    releasePointerCapture() {
      capturedPointer = null;
    },
    open: false,
    showModal() {
      this.open = true;
    },
    close() {
      this.open = false;
    },
    querySelector() {
      return viewport;
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
    window: {
      innerWidth: 1440,
      requestAnimationFrame(callback) {
        const id = ++frameId;
        frames.set(id, callback);
        return id;
      },
      cancelAnimationFrame(id) {
        frames.delete(id);
      },
    },
    document: {
      elementFromPoint() {
        return {
          closest() {
            return hitId ? { dataset: { orderId: hitId } } : null;
          },
        };
      },
      documentElement: html,
      body,
      activeElement: opener,
      querySelector(selector) {
        return selector === "main" ? main : trigger;
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
            return [value, (next) => announcements.push(next)];
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
    busy,
    loading,
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
    setHit(id) {
      hitId = id;
    },
    captured() {
      return capturedPointer;
    },
    nodes,
    moves,
    announcements,
    effects,
    html,
    body,
    main,
    dialog,
    opener,
    trigger,
    viewport,
    frames,
    runFrame() {
      const [id, callback] = frames.entries().next().value;
      frames.delete(id);
      callback();
    },
    get focusTarget() {
      return focusTarget;
    },
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

test("disconnected opener restores focus to a persistent control", () => {
  const h = render(undefined, { openerConnected: false });
  const cleanup = h.effects[0]();
  cleanup();
  assert.equal(h.focusTarget, h.trigger);
});

test("connected opener keeps the original focus restoration", () => {
  const h = render();
  h.effects[0]()();
  assert.equal(h.focusTarget, h.opener);
});

test("holding a pointer at the edge keeps scrolling until release, cancel or unmount", () => {
  const h = render();
  const cleanup = h.effects[0]();
  const handle = h.nodes.find((n) => n.props["aria-label"] === "A 순서 변경");
  const down = {
    pointerType: "touch",
    pointerId: 1,
    clientY: 290,
    preventDefault() {},
    currentTarget: {
      setPointerCapture() {
        throw new Error("row must not capture");
      },
    },
  };
  handle.props.onPointerDown(down);
  h.runFrame();
  assert.equal(h.viewport.scrollTop, 24);
  h.runFrame();
  assert.equal(h.viewport.scrollTop, 48);
  h.tree.props.onPointerUp({ pointerId: 1 });
  assert.equal(h.frames.size, 0);
  handle.props.onPointerDown(down);
  h.tree.props.onPointerCancel({ pointerId: 1 });
  assert.equal(h.frames.size, 0);
  handle.props.onPointerDown(down);
  cleanup();
  assert.equal(h.frames.size, 0);
});

test("native drag auto-scroll also stops after drop and dragend", () => {
  const h = render();
  const handle = h.nodes.find((n) => n.props["aria-label"] === "A 순서 변경");
  const event = { clientY: 290, dataTransfer: { setData() {} } };
  handle.props.onDragStart(event);
  h.runFrame();
  assert.equal(h.viewport.scrollTop, 24);
  handle.props.onDragEnd();
  assert.equal(h.frames.size, 0);
  handle.props.onDragStart(event);
  h.nodes
    .find((n) => n.props["data-order-id"] === "C")
    .props.onDrop({ preventDefault() {} });
  assert.equal(h.frames.size, 0);
});

test("busy movement changes neither order nor the live announcement", () => {
  const h = render(undefined, { busy: true });
  const handle = h.nodes.find((n) => n.props["aria-label"] === "A 순서 변경");
  handle.props.onKeyDown({ key: "ArrowDown", preventDefault() {} });
  assert.equal(h.moves.length, 0);
  assert.equal(h.announcements.length, 0);
});

test("loading keeps the modal closable while save remains disabled", () => {
  const h = render(undefined, { loading: true });
  h.tree.props.onCancel({ preventDefault() {} });
  assert.equal(h.cancelled, 1);
  assert.equal(
    h.nodes.find(
      (n) => n.type === "button" && n.props.children === "선정 순서 저장",
    ).props.disabled,
    true,
  );
  assert.equal(
    h.nodes.find((n) => n.props["aria-label"] === "선정 순서 변경 닫기").props
      .disabled,
    false,
  );
});

test("native drag survives pointer cancellation before drop", () => {
  const h = render();
  const handle = h.nodes.find((n) => n.props["aria-label"] === "A 순서 변경");
  handle.props.onDragStart({ clientY: 100, dataTransfer: { setData() {} } });
  h.tree.props.onPointerCancel({ pointerId: 1 });
  h.tree.props.onLostPointerCapture({
    pointerId: 1,
    target: h.dialog,
    currentTarget: h.dialog,
  });
  h.nodes
    .find((n) => n.props["data-order-id"] === "C")
    .props.onDrop({ preventDefault() {} });
  assert.deepEqual(h.moves, [
    ["A", 1],
    ["A", 1],
  ]);
  assert.equal(h.frames.size, 0);
});

test("native drag scrolls upward over the sticky header and stops on dragend", () => {
  const h = render();
  const handle = h.nodes.find((n) => n.props["aria-label"] === "A 순서 변경");
  handle.props.onDragStart({ clientY: 200, dataTransfer: { setData() {} } });
  h.viewport.scrollTop = 100;
  h.nodes
    .find((n) => n.props["data-order-scroll"] !== undefined)
    .props.onDragOver({ clientY: 110, preventDefault() {} });
  h.runFrame();
  assert.equal(h.viewport.scrollTop, 76);
  handle.props.onDragEnd();
  assert.equal(h.frames.size, 0);
});

test("header rejects native drop and clears the previous row highlight", () => {
  const h = render();
  h.nodes
    .find((n) => n.props["aria-label"] === "A 순서 변경")
    .props.onDragStart({ clientY: 200, dataTransfer: { setData() {} } });
  h.nodes
    .find((n) => n.props["data-order-id"] === "B")
    .props.onDragOver({ clientY: 200, dataTransfer: {}, preventDefault() {} });
  let prevented = false;
  const dataTransfer = {};
  const header = h.nodes.find((n) => n.type === "thead");
  header.props.onDragOver({
    clientY: 110,
    dataTransfer,
    stopPropagation() {},
    preventDefault() {
      prevented = true;
    },
  });
  assert.equal(dataTransfer.dropEffect, "none");
  assert.equal(prevented, false);
  assert.equal(h.announcements.at(-1), null);
  header.props.onDrop({ preventDefault() {}, stopPropagation() {} });
  assert.equal(h.moves.length, 0);
  assert.equal(h.frames.size, 0);
});

test("touch and pen use stable dialog capture through consecutive moves", () => {
  for (const pointerType of ["touch", "pen"]) {
    const h = render();
    const handle = h.nodes.find((n) => n.props["aria-label"] === "A 순서 변경");
    handle.props.onPointerDown({
      pointerType,
      pointerId: 7,
      clientY: 200,
      preventDefault() {},
    });
    assert.equal(h.captured(), 7);
    h.setHit("B");
    h.tree.props.onPointerMove({ pointerId: 7, clientX: 50, clientY: 200 });
    h.tree.props.onLostPointerCapture({
      pointerId: 7,
      target: {},
      currentTarget: h.dialog,
    });
    h.setHit("C");
    h.tree.props.onPointerMove({ pointerId: 7, clientX: 50, clientY: 250 });
    assert.equal(h.moves.length, 3);
    h.tree.props.onPointerUp({ pointerId: 7 });
    assert.equal(h.captured(), null);
    assert.equal(h.frames.size, 0);
    h.tree.props.onPointerMove({ pointerId: 7, clientX: 50, clientY: 200 });
    assert.equal(h.moves.length, 3);
  }
});
