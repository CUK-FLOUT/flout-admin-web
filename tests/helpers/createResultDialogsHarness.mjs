import { createApiHarness } from "./createApiHarness.mjs";

export function resultDialogProps(kind = "region") {
  return {
    kind,
    application: { id: "000091", resident: "김주민", address: " 부천시 주소 " },
    content: {
      summary: " 문제 내용 ",
      selected: ["배수구"],
      details: {
        배수구: { title: "배수구", opinion: "", findings: " 현장 확인 " },
      },
      actions: [" 물막이판 설치 "],
    },
    setDialog() {},
    onActions() {},
    async onRegion() {
      return true;
    },
  };
}

// 브라우저 효과는 기존 공통 모달에 맡기고, 폼의 상태·이벤트를 검증한다.
export function createResultDialogsHarness(
  props = resultDialogProps(),
  source = "src/components/inspection-results/ResultsDialogs.tsx",
) {
  let index = 0;
  let changed = false;
  const slots = [];
  const jsx = (type, props) => ({ type, props: props ?? {} });
  const Component = createApiHarness({
    overrides: {
      react: {
        useState(initial) {
          const slot = index++;
          if (!(slot in slots))
            slots[slot] = typeof initial === "function" ? initial() : initial;
          return [
            slots[slot],
            (value) => {
              const next =
                typeof value === "function" ? value(slots[slot]) : value;
              changed ||= !Object.is(next, slots[slot]);
              slots[slot] = next;
            },
          ];
        },
      },
      "react/jsx-runtime": { jsx, jsxs: jsx, Fragment: Symbol.for("fragment") },
      "./ResultDialog": "ResultDialog",
      "./ResultFeedback": { GrowingTextarea: "GrowingTextarea" },
    },
  }).load(source).default;
  function expand(node) {
    if (node == null || typeof node === "boolean") return [];
    if (Array.isArray(node)) return node.flatMap(expand);
    if (typeof node !== "object") return [node];
    if (typeof node.type === "function") return expand(node.type(node.props));
    if (typeof node.type === "symbol") return expand(node.props.children);
    return [{ ...node, children: expand(node.props.children) }];
  }
  function render() {
    let tree;
    let attempts = 0;
    do {
      changed = false;
      index = 0;
      tree = expand(Component(props))[0];
      if (++attempts > 10) throw new Error("폼 재렌더링이 종료되지 않습니다.");
    } while (changed);
    return tree;
  }
  function findAll(node, predicate) {
    if (typeof node !== "object") return [];
    return [
      node,
      ...node.children.flatMap((child) => findAll(child, predicate)),
    ].filter(predicate);
  }
  function text(node) {
    return typeof node === "object"
      ? node.children.map(text).join("")
      : String(node);
  }
  function dom(node) {
    if (typeof node !== "object") return node;
    return {
      tag: node.type,
      attributes: Object.fromEntries(
        Object.entries(node.props).filter(
          ([key, value]) => key !== "children" && typeof value !== "function",
        ),
      ),
      children: node.children.map(dom),
    };
  }
  return { props, render, findAll, text, dom };
}
