export const jsx = (type, props) => ({ type, props: props ?? {} });

export function findJsxNodes(
  node,
  predicate,
  { expandComponents = false } = {},
) {
  const find = (child) => findJsxNodes(child, predicate, { expandComponents });
  if (Array.isArray(node)) return node.flatMap(find);
  if (!node || typeof node !== "object") return [];
  if (expandComponents && typeof node.type === "function") {
    return find(node.type(node.props));
  }
  return [...(predicate(node) ? [node] : []), ...find(node.props?.children)];
}
