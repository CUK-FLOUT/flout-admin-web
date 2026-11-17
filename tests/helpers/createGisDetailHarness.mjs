import { createApiHarness } from "./createApiHarness.mjs";

// 탭을 전환해도 부모의 메모와 사진 상태가 유지되는지 같은 인스턴스로 확인한다.
export function createGisDetailHarness(
  props,
  source = "src/components/gis/ApplicationDetail.tsx",
) {
  const states = [];
  const refs = [];
  let stateIndex = 0;
  let refIndex = 0;
  let opened = 0;
  let closed = 0;
  const memo = {
    memo: props.record.internalMemo ?? "",
    memoReady: props.record.internalMemo !== undefined,
    saving: false,
    saveError: "",
    saveMessage: "",
    setMemo(value) {
      memo.memo = value;
    },
    saveMemo() {
      return props.onAccept(props.application.id, memo.memo);
    },
  };
  const jsx = (type, props, key) => ({ type, props: props ?? {}, key });
  const overrides = {
    react: {
      useState(initial) {
        const index = stateIndex++;
        if (!(index in states)) states[index] = initial;
        return [
          states[index],
          (value) => {
            states[index] = value;
          },
        ];
      },
      useRef() {
        const index = refIndex++;
        refs[index] ??= {
          current: {
            showModal() {
              opened++;
            },
            close() {
              closed++;
            },
          },
        };
        return refs[index];
      },
    },
    "react/jsx-runtime": { jsx, jsxs: jsx, Fragment: Symbol.for("fragment") },
    "../../pages/GIS/useGisMemo": { useGisMemo: () => memo },
  };
  for (const icon of ["Back", "BasicInfo", "Resident", "Attachment", "Memo"]) {
    for (const prefix of ["../../", "../../../"]) {
      overrides[`${prefix}assets/gis/imgIcon${icon}.svg`] =
        `imgIcon${icon}.svg`;
    }
  }
  const component = createApiHarness({ overrides }).load(source).default;
  function resolve(node) {
    if (node == null || typeof node === "boolean") return [];
    if (Array.isArray(node)) return node.flatMap(resolve);
    if (typeof node !== "object") return [node];
    if (typeof node.type === "function") return resolve(node.type(node.props));
    if (typeof node.type === "symbol") return resolve(node.props.children);
    return [{ ...node, children: resolve(node.props.children) }];
  }
  function render() {
    stateIndex = 0;
    refIndex = 0;
    return resolve(component(props))[0];
  }
  function findAll(tree, predicate) {
    return [
      tree,
      ...(tree.children ?? []).flatMap((child) =>
        typeof child === "object" ? findAll(child, () => true) : [],
      ),
    ].filter(predicate);
  }
  function dom(node) {
    if (typeof node !== "object") return node;
    const attributes = Object.fromEntries(
      Object.entries(node.props).filter(
        ([key, value]) =>
          key !== "children" && key !== "ref" && typeof value !== "function",
      ),
    );
    return { tag: node.type, attributes, children: node.children.map(dom) };
  }
  function text(node) {
    return typeof node === "object"
      ? node.children.map(text).join("")
      : String(node);
  }
  return {
    render,
    findAll,
    dom,
    text,
    memo,
    select(label) {
      findAll(
        render(),
        (node) => node.props.role === "tab" && text(node) === label,
      )[0].props.onClick();
      return render();
    },
    get opened() {
      return opened;
    },
    get closed() {
      return closed;
    },
  };
}
