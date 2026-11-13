import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";

const exports = {};
const jsx = (type, props) => ({ type, props });
vm.runInNewContext(ts.transpileModule(readFileSync("src/components/common/Pagination.tsx", "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
}).outputText, { exports, require: () => ({ jsx, jsxs: jsx }) });
function nodes(tree) {
  return tree && typeof tree === "object" ? [tree, ...[tree.props?.children].flat(Infinity).flatMap(nodes)] : [];
}
function render(page, totalPages, disabled = false) {
  const calls = [];
  const tree = exports.default({ page, totalPages, disabled, onPageChange: (next) => calls.push(next) });
  const buttons = nodes(tree).filter((node) => node.type === "button");
  return { tree, buttons, calls, numbered: buttons.filter((button) => /^\d+페이지$/.test(button.props["aria-label"])) };
}

test("only real pages are displayed for empty, single, and two-page results", () => {
  for (const total of [0, -1, NaN, Infinity]) assert.equal(render(1, total).tree, null);
  for (const total of [1, 2]) {
    const view = render(1, total);
    assert.deepEqual(view.numbered.map((b) => b.props.children), Array.from({ length: total }, (_, i) => i + 1));
    assert.equal(view.buttons[0].props.disabled, true);
    assert.equal(view.buttons.at(-1).props.disabled, total === 1);
  }
});

test("three-page window follows current page, including all pages after page 3", () => {
  for (const [page, expected] of [[1, [1, 2, 3]], [4, [3, 4, 5]], [8, [6, 7, 8]]]) {
    const view = render(page, 8);
    assert.deepEqual(view.numbered.map((b) => b.props.children), expected);
    assert.deepEqual(view.numbered.filter((b) => b.props["aria-current"] === "page").map((b) => b.props.children), [page]);
    assert.equal(view.buttons.at(-1).props.disabled, page === 8);
  }
});

test("arrows and direct selection emit valid one-based targets and skip the active page", () => {
  const view = render(4, 8);
  view.buttons[0].props.onClick();
  view.buttons.at(-1).props.onClick();
  for (const button of view.numbered) button.props.onClick();
  assert.deepEqual(view.calls, [3, 5, 3, 5]);
  for (const page of [1, 8]) {
    const edge = render(page, 8);
    const disabledArrow = page === 1 ? edge.buttons[0] : edge.buttons.at(-1);
    disabledArrow.props.onClick();
    assert.deepEqual(edge.calls, []);
  }
});

test("busy pagination suppresses all requests and out-of-range recovery stays valid", () => {
  const view = render(4, 8, true);
  for (const button of view.buttons) {
    assert.equal(button.props.disabled, true);
    assert.equal(button.props.type, "button");
    button.props.onClick();
  }
  assert.deepEqual(view.calls, []);
  const shrunk = render(8, 2);
  shrunk.buttons[0].props.onClick();
  assert.deepEqual(shrunk.calls, [2]);
});

test("related applications beyond page 3 keep row slicing and direct page navigation", () => {
  const related = { exports: {} };
  const renderJsx = (type, props) => typeof type === "function" ? type(props) : jsx(type, props);
  vm.runInNewContext(ts.transpileModule(readFileSync("src/pages/Infrastructure/InfrastructureReferencePanels.tsx", "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
  }).outputText, {
    exports: related.exports,
    require: (name) => name === "react/jsx-runtime" ? { jsx: renderJsx, jsxs: renderJsx }
      : name.endsWith("/Pagination") ? exports : {},
  });
  const calls = [];
  const tree = related.exports.RelatedApplications({
    issue: { related: Array.from({ length: 15 }, (_, i) => ({ id: String(i + 1), address: "부천", risk: "낮음", findings: "확인" })) },
    page: 4, totalPages: 5, onPageChange: (next) => calls.push(next),
  });
  const rendered = nodes(tree);
  assert.deepEqual(rendered.filter((node) => node.type === "td" && typeof node.props.children === "string" && /^\d+$/.test(node.props.children)).map((node) => node.props.children), ["10", "11", "12"]);
  rendered.find((node) => node.props?.["aria-label"] === "5페이지").props.onClick();
  assert.deepEqual(calls, [5]);
});
