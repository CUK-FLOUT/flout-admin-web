import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";

function mount(file, props) {
  const hooks = [];
  let cursor = 0, now = 1000;
  const jsx = (type, props) => ({ type, props });
  const exports = {};
  const react = {
    useState(initial) {
      const index = cursor++;
      if (!(index in hooks)) hooks[index] = initial;
      return [hooks[index], (value) => { hooks[index] = typeof value === "function" ? value(hooks[index]) : value; }];
    },
    useRef(initial) {
      const index = cursor++;
      if (!(index in hooks)) hooks[index] = { current: initial };
      return hooks[index];
    },
    useId: () => "filter", useEffect: () => {},
  };
  const source = ts.transpileModule(readFileSync(file, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  vm.runInNewContext(source, {
    exports, Date: { now: () => now }, window: { innerHeight: 900, innerWidth: 1440 }, document: { body: {} },
    require: (name) => name === "react" ? react : name === "react-dom" ? { createPortal: (node) => node } : name === "react/jsx-runtime" ? { jsx, jsxs: jsx } : { default: () => null },
  });
  return { render() { cursor = 0; return exports.default(props); }, advance() { now += 1000; } };
}
function nodes(tree) {
  return tree && typeof tree === "object" ? [tree, ...[tree.props?.children].flat(Infinity).flatMap(nodes)] : [];
}
function dropdown() {
  const changed = [];
  const view = mount("src/components/common/FilterSelect.tsx", {
    label: "지역", value: "all", options: [
      { value: "all", label: "전체" }, { value: "a", label: "Alpha" },
      { value: "b", label: "Alpine" }, { value: "c", label: "Beta" }, { value: "s", label: "소사구" },
    ], onChange: (value) => changed.push(value),
  });
  const button = () => nodes(view.render()).find((node) => node.type === "button");
  const active = () => button().props["aria-activedescendant"];
  function key(key, extra = {}) {
    let prevented = false;
    button().props.onKeyDown({ key, nativeEvent: {}, preventDefault() { prevented = true; }, stopPropagation() {}, ...extra });
    return prevented;
  }
  return { view, button, active, key, changed };
}
test("문자 탐색: 접두사 누적·반복 순환·시간 만료·한글 조합", () => {
  const d = dropdown();
  d.key("a"); assert.equal(d.active(), "filter-1");
  d.key("l"); d.key("p"); d.key("i"); assert.equal(d.active(), "filter-2");
  d.view.advance(); d.key("a"); assert.equal(d.active(), "filter-1");
  d.key("a"); assert.equal(d.active(), "filter-2");
  d.view.advance(); d.key("b"); assert.equal(d.active(), "filter-3");
  d.view.advance(); d.button().props.onCompositionEnd({ data: "소" }); assert.equal(d.active(), "filter-4");
  d.key("x", { ctrlKey: true }); assert.equal(d.active(), "filter-4");
  d.key("a", { nativeEvent: { isComposing: true } }); assert.equal(d.active(), "filter-4");
});
test("Tab·Shift+Tab은 활성 옵션 확정 후 기본 포커스 이동 유지", () => {
  for (const shiftKey of [false, true]) {
    const d = dropdown(); d.key("ArrowDown"); d.key("End");
    let focusCalls = 0;
    d.button().props.ref.current = { focus() { focusCalls++; } };
    assert.equal(d.key("Tab", { shiftKey }), false);
    assert.deepEqual(d.changed, ["s"]); assert.equal(d.active(), undefined); assert.equal(focusCalls, 0);
  }
});
test("방향키·Home·End·Enter·Escape 및 닫힌 메뉴 Tab 유지", () => {
  const d = dropdown(); d.key("Tab"); assert.deepEqual(d.changed, []);
  d.key("ArrowDown"); d.key("End"); d.key("ArrowUp"); assert.equal(d.active(), "filter-3");
  d.key("Home"); assert.equal(d.active(), "filter-0");
  d.key("End"); d.key("Enter"); assert.deepEqual(d.changed, ["s"]);
  d.key("ArrowDown"); d.key("Escape"); assert.equal(d.active(), undefined); assert.deepEqual(d.changed, ["s"]);
});
test("초기화는 상위 수락 시에만 폼에 적용", () => {
  for (const accepted of [false, true]) {
    const calls = [];
    const view = mount("src/components/inspection/InspectionFilters.tsx", {
      filterKey: "", params: new URLSearchParams(), inspectors: [], onSearch() {},
      onReset() { calls.push("parent"); return accepted; },
    });
    const button = nodes(view.render()).find((node) => node.type === "button" && node.props.children === "초기화");
    button.props.onClick({ currentTarget: { form: { reset() { calls.push("form"); } } } });
    assert.deepEqual(calls, accepted ? ["parent", "form"] : ["parent"]);
  }
});
